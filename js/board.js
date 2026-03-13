(function () {
  var SIZE = Reversi.BOARD_SIZE;
  var EMPTY = Reversi.EMPTY;
  var BLACK = Reversi.BLACK;
  var WHITE = Reversi.WHITE;
  var DIRS = Reversi.DIRECTIONS;

  function Board(sourceGrid) {
    if (sourceGrid) {
      this.grid = sourceGrid.map(function (row) { return row.slice(); });
    } else {
      this.grid = [];
      for (var r = 0; r < SIZE; r++) {
        this.grid.push(new Array(SIZE).fill(EMPTY));
      }
      var mid = SIZE / 2;
      this.grid[mid - 1][mid - 1] = WHITE;
      this.grid[mid - 1][mid] = BLACK;
      this.grid[mid][mid - 1] = BLACK;
      this.grid[mid][mid] = WHITE;
    }
  }

  Board.prototype.clone = function () {
    return new Board(this.grid);
  };

  Board.prototype.isOnBoard = function (r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  };

  Board.prototype.getFlips = function (row, col, player) {
    if (this.grid[row][col] !== EMPTY) return [];
    var opponent = player === BLACK ? WHITE : BLACK;
    var allFlips = [];

    for (var d = 0; d < DIRS.length; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1];
      var flips = [];
      var r = row + dr, c = col + dc;

      while (this.isOnBoard(r, c) && this.grid[r][c] === opponent) {
        flips.push([r, c]);
        r += dr;
        c += dc;
      }

      if (flips.length > 0 && this.isOnBoard(r, c) && this.grid[r][c] === player) {
        allFlips = allFlips.concat(flips);
      }
    }
    return allFlips;
  };

  Board.prototype.isValidMove = function (row, col, player) {
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return false;
    return this.getFlips(row, col, player).length > 0;
  };

  Board.prototype.getValidMoves = function (player) {
    var moves = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (this.isValidMove(r, c, player)) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  };

  Board.prototype.makeMove = function (row, col, player) {
    var flips = this.getFlips(row, col, player);
    if (flips.length === 0) return null;
    this.grid[row][col] = player;
    for (var i = 0; i < flips.length; i++) {
      this.grid[flips[i][0]][flips[i][1]] = player;
    }
    return flips;
  };

  Board.prototype.getScore = function () {
    var black = 0, white = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === BLACK) black++;
        else if (this.grid[r][c] === WHITE) white++;
      }
    }
    return { black: black, white: white };
  };

  Board.prototype.countPieces = function () {
    var count = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (this.grid[r][c] !== EMPTY) count++;
      }
    }
    return count;
  };

  Board.prototype.isFull = function () {
    return this.countPieces() === SIZE * SIZE;
  };

  Board.prototype.isGameOver = function () {
    if (this.isFull()) return true;
    return this.getValidMoves(BLACK).length === 0 &&
           this.getValidMoves(WHITE).length === 0;
  };

  Reversi.Board = Board;
})();
