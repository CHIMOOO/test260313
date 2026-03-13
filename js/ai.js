(function () {
  var SIZE = Reversi.BOARD_SIZE;
  var BLACK = Reversi.BLACK;
  var WHITE = Reversi.WHITE;
  var EMPTY = Reversi.EMPTY;

  /*
   * 位置权重矩阵：角最高价值，角旁最危险，边次之
   * 这是经典Othello策略的核心——控制角和边
   */
  var WEIGHTS = [
    [120, -20,  20,   5,   5,  20, -20, 120],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [120, -20,  20,   5,   5,  20, -20, 120]
  ];

  var CORNERS = [[0, 0], [0, 7], [7, 0], [7, 7]];

  var CORNER_ADJACENTS = {
    '0,0': [[0, 1], [1, 0], [1, 1]],
    '0,7': [[0, 6], [1, 6], [1, 7]],
    '7,0': [[6, 0], [6, 1], [7, 1]],
    '7,7': [[6, 6], [6, 7], [7, 6]]
  };

  function AI(difficulty) {
    this.maxDepth = difficulty.depth;
    this.player = WHITE;
    this.opponent = BLACK;
  }

  AI.prototype.evaluate = function (board) {
    var myPieces = 0, oppPieces = 0;
    var positionScore = 0;
    var totalPieces = 0;

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var cell = board.grid[r][c];
        if (cell === this.player) {
          myPieces++;
          positionScore += WEIGHTS[r][c];
          totalPieces++;
        } else if (cell === this.opponent) {
          oppPieces++;
          positionScore -= WEIGHTS[r][c];
          totalPieces++;
        }
      }
    }

    // 动态调整角旁权重：如果角已被占，角旁就不危险了
    for (var i = 0; i < CORNERS.length; i++) {
      var cr = CORNERS[i][0], cc = CORNERS[i][1];
      var key = cr + ',' + cc;
      if (board.grid[cr][cc] !== EMPTY) {
        var adjs = CORNER_ADJACENTS[key];
        for (var j = 0; j < adjs.length; j++) {
          var ar = adjs[j][0], ac = adjs[j][1];
          if (board.grid[ar][ac] === this.player) positionScore += 40;
          else if (board.grid[ar][ac] === this.opponent) positionScore -= 40;
        }
      }
    }

    // 行动力：可用走法数量
    var myMobility = board.getValidMoves(this.player).length;
    var oppMobility = board.getValidMoves(this.opponent).length;
    var mobilityScore = 0;
    if (myMobility + oppMobility > 0) {
      mobilityScore = 100 * (myMobility - oppMobility) / (myMobility + oppMobility);
    }

    // 角占有率
    var cornerScore = 0;
    for (var k = 0; k < CORNERS.length; k++) {
      var cor = board.grid[CORNERS[k][0]][CORNERS[k][1]];
      if (cor === this.player) cornerScore += 25;
      else if (cor === this.opponent) cornerScore -= 25;
    }

    // 稳定子估计：沿边的连续己方棋子（从角出发）
    var stabilityScore = this.estimateStability(board);

    // 不同阶段的权重分配
    var phase = totalPieces / 64;
    var w_pos, w_mob, w_corner, w_stab, w_piece;

    if (phase < 0.33) {
      w_pos = 5; w_mob = 15; w_corner = 30; w_stab = 10; w_piece = 0;
    } else if (phase < 0.66) {
      w_pos = 5; w_mob = 10; w_corner = 30; w_stab = 15; w_piece = 2;
    } else {
      w_pos = 0; w_mob = 5; w_corner = 30; w_stab = 20; w_piece = 15;
    }

    var pieceScore = 0;
    if (myPieces + oppPieces > 0) {
      pieceScore = 100 * (myPieces - oppPieces) / (myPieces + oppPieces);
    }

    return w_pos * positionScore +
           w_mob * mobilityScore +
           w_corner * cornerScore +
           w_stab * stabilityScore +
           w_piece * pieceScore;
  };

  AI.prototype.estimateStability = function (board) {
    var score = 0;
    var edges = [
      { start: [0, 0], dir: [0, 1], len: 8 },
      { start: [7, 0], dir: [0, 1], len: 8 },
      { start: [0, 0], dir: [1, 0], len: 8 },
      { start: [0, 7], dir: [1, 0], len: 8 }
    ];

    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];
      var r = edge.start[0], c = edge.start[1];
      for (var i = 0; i < edge.len; i++) {
        var pr = r + i * edge.dir[0], pc = c + i * edge.dir[1];
        var cell = board.grid[pr][pc];
        if (cell === EMPTY) break;
        if (cell === this.player) score += 10;
        else { score -= 10; break; }
      }
    }
    return score;
  };

  AI.prototype.minimax = function (board, depth, alpha, beta, maximizing) {
    if (depth === 0 || board.isGameOver()) {
      return { score: this.evaluate(board), move: null };
    }

    var player = maximizing ? this.player : this.opponent;
    var moves = board.getValidMoves(player);

    if (moves.length === 0) {
      return this.minimax(board, depth - 1, alpha, beta, !maximizing);
    }

    // 走法排序优化：优先考虑角和边
    moves.sort(function (a, b) {
      return WEIGHTS[b[0]][b[1]] - WEIGHTS[a[0]][a[1]];
    });

    var bestMove = moves[0];

    if (maximizing) {
      var maxScore = -Infinity;
      for (var i = 0; i < moves.length; i++) {
        var clone = board.clone();
        clone.makeMove(moves[i][0], moves[i][1], player);
        var result = this.minimax(clone, depth - 1, alpha, beta, false);
        if (result.score > maxScore) {
          maxScore = result.score;
          bestMove = moves[i];
        }
        alpha = Math.max(alpha, result.score);
        if (beta <= alpha) break;
      }
      return { score: maxScore, move: bestMove };
    } else {
      var minScore = Infinity;
      for (var j = 0; j < moves.length; j++) {
        var clone2 = board.clone();
        clone2.makeMove(moves[j][0], moves[j][1], player);
        var result2 = this.minimax(clone2, depth - 1, alpha, beta, true);
        if (result2.score < minScore) {
          minScore = result2.score;
          bestMove = moves[j];
        }
        beta = Math.min(beta, result2.score);
        if (beta <= alpha) break;
      }
      return { score: minScore, move: bestMove };
    }
  };

  AI.prototype.getBestMove = function (board) {
    // 终局阶段加深搜索
    var pieces = board.countPieces();
    var depth = this.maxDepth;
    if (pieces > 52) depth = Math.max(depth, 10);
    else if (pieces > 48) depth = Math.max(depth, 8);

    var result = this.minimax(board, depth, -Infinity, Infinity, true);
    return result.move;
  };

  Reversi.AI = AI;
})();
