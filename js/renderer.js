(function () {
  var SIZE = Reversi.BOARD_SIZE;
  var EMPTY = Reversi.EMPTY;
  var BLACK = Reversi.BLACK;
  var COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  function Renderer(onCellClick) {
    this.boardEl = document.getElementById('board');
    this.blackScoreEl = document.getElementById('black-score');
    this.whiteScoreEl = document.getElementById('white-score');
    this.statusEl = document.getElementById('status');
    this.logEl = document.getElementById('move-log');
    this.onCellClick = onCellClick;
    this.cells = [];
    this.moveCount = 0;
    this._createBoard();
  }

  Renderer.prototype._createBoard = function () {
    this.boardEl.innerHTML = '';
    this.cells = [];
    var self = this;

    for (var r = 0; r < SIZE; r++) {
      var rowCells = [];
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        (function (row, col) {
          cell.addEventListener('click', function () {
            self.onCellClick(row, col);
          });
        })(r, c);
        this.boardEl.appendChild(cell);
        rowCells.push(cell);
      }
      this.cells.push(rowCells);
    }
  };

  Renderer.prototype.render = function (board, validMoves, lastMove) {
    validMoves = validMoves || [];
    var validSet = {};
    for (var v = 0; v < validMoves.length; v++) {
      validSet[validMoves[v][0] + ',' + validMoves[v][1]] = true;
    }

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var cell = this.cells[r][c];
        cell.className = 'cell';
        cell.innerHTML = '';

        if (board.grid[r][c] !== EMPTY) {
          var piece = document.createElement('div');
          piece.className = 'piece ' + (board.grid[r][c] === BLACK ? 'black' : 'white');
          cell.appendChild(piece);
        }

        if (validSet[r + ',' + c]) {
          cell.classList.add('valid');
          var dot = document.createElement('div');
          dot.className = 'hint-dot';
          cell.appendChild(dot);
        }

        if (lastMove && lastMove[0] === r && lastMove[1] === c) {
          cell.classList.add('last-move');
        }
      }
    }
  };

  Renderer.prototype.placePiece = function (row, col, player, callback) {
    var cell = this.cells[row][col];
    cell.innerHTML = '';
    cell.classList.add('last-move');
    var piece = document.createElement('div');
    piece.className = 'piece ' + (player === BLACK ? 'black' : 'white') + ' pop-in';
    cell.appendChild(piece);

    setTimeout(function () {
      piece.classList.remove('pop-in');
      if (callback) callback();
    }, 250);
  };

  Renderer.prototype.animateFlips = function (flips, player, callback) {
    if (!flips || flips.length === 0) {
      if (callback) callback();
      return;
    }

    var self = this;
    var completed = 0;
    var total = flips.length;
    var colorClass = player === BLACK ? 'black' : 'white';

    flips.forEach(function (flip, idx) {
      var cell = self.cells[flip[0]][flip[1]];
      var piece = cell.querySelector('.piece');
      if (!piece) {
        completed++;
        if (completed >= total && callback) callback();
        return;
      }

      setTimeout(function () {
        piece.classList.add('flipping');
        Reversi.Sound.flip();

        setTimeout(function () {
          piece.className = 'piece ' + colorClass;
          piece.classList.add('flip-land');
          setTimeout(function () {
            piece.classList.remove('flip-land');
            completed++;
            if (completed >= total && callback) callback();
          }, 200);
        }, 200);
      }, idx * 50);
    });
  };

  Renderer.prototype.updateScore = function (score) {
    this.blackScoreEl.textContent = score.black;
    this.whiteScoreEl.textContent = score.white;

    var blackItem = document.querySelector('.player-black');
    var whiteItem = document.querySelector('.player-white');
    blackItem.classList.toggle('winning', score.black > score.white);
    whiteItem.classList.toggle('winning', score.white > score.black);
  };

  Renderer.prototype.setStatus = function (text) {
    this.statusEl.textContent = text;
  };

  Renderer.prototype.setThinking = function (thinking) {
    this.statusEl.classList.toggle('thinking', thinking);
    this.boardEl.classList.toggle('ai-thinking', thinking);
  };

  Renderer.prototype.logMove = function (player, row, col, flipCount) {
    this.moveCount++;
    var who = player === BLACK ? '黑' : '白';
    var pos = COL_LABELS[col] + (row + 1);
    var entry = document.createElement('div');
    entry.className = 'log-entry ' + (player === BLACK ? 'log-black' : 'log-white');
    entry.textContent = this.moveCount + '. ' + who + ' ' + pos + ' (翻' + flipCount + '子)';
    this.logEl.appendChild(entry);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  };

  Renderer.prototype.clearLog = function () {
    this.logEl.innerHTML = '';
    this.moveCount = 0;
  };

  Renderer.prototype.showGameOver = function (score) {
    var overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    var msg;
    if (score.black > score.white) {
      msg = '你赢了！';
      overlay.classList.add('win');
      Reversi.Sound.win();
    } else if (score.white > score.black) {
      msg = 'AI 获胜';
      overlay.classList.add('lose');
      Reversi.Sound.lose();
    } else {
      msg = '平局！';
    }

    overlay.innerHTML =
      '<div class="game-over-content">' +
        '<div class="game-over-title">' + msg + '</div>' +
        '<div class="game-over-score">' + score.black + ' : ' + score.white + '</div>' +
        '<div class="game-over-hint">点击"新游戏"重新开始</div>' +
      '</div>';

    document.querySelector('.board-wrapper').appendChild(overlay);
  };

  Renderer.prototype.clearOverlay = function () {
    var overlay = document.querySelector('.game-over-overlay');
    if (overlay) overlay.remove();
  };

  Reversi.Renderer = Renderer;
})();
