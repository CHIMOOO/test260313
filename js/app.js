(function () {
  var BLACK = Reversi.BLACK;
  var WHITE = Reversi.WHITE;
  var DIFFICULTY = Reversi.DIFFICULTY;
  var Board = Reversi.Board;
  var AI = Reversi.AI;
  var Sound = Reversi.Sound;

  function App() {
    this.board = new Board();
    this.currentPlayer = BLACK;
    this.ai = new AI(DIFFICULTY.MEDIUM);
    this.isProcessing = false;
    this.lastMove = null;
    this.gameOver = false;

    var self = this;
    this.renderer = new Reversi.Renderer(function (r, c) {
      self.handleClick(r, c);
    });

    this._bindEvents();
    this._update();
  }

  App.prototype._bindEvents = function () {
    var self = this;

    document.getElementById('new-game').addEventListener('click', function () {
      self.newGame();
    });

    var diffBtns = document.querySelectorAll('.diff-btn');
    for (var i = 0; i < diffBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          for (var j = 0; j < diffBtns.length; j++) {
            diffBtns[j].classList.remove('active');
          }
          btn.classList.add('active');
          self.ai = new AI(DIFFICULTY[btn.dataset.level]);
          self.newGame();
        });
      })(diffBtns[i]);
    }
  };

  App.prototype.newGame = function () {
    this.board = new Board();
    this.currentPlayer = BLACK;
    this.isProcessing = false;
    this.lastMove = null;
    this.gameOver = false;
    this.renderer.clearOverlay();
    this.renderer.clearLog();
    this._update();
  };

  App.prototype.handleClick = function (row, col) {
    if (this.isProcessing || this.gameOver) return;
    if (this.currentPlayer !== BLACK) return;

    if (!this.board.isValidMove(row, col, BLACK)) {
      Sound.invalid();
      return;
    }

    this._executeMove(row, col, BLACK);
  };

  App.prototype._executeMove = function (row, col, player) {
    this.isProcessing = true;
    var self = this;
    var flips = this.board.makeMove(row, col, player);
    this.lastMove = [row, col];

    if (player === BLACK) Sound.place();
    else Sound.aiMove();

    this.renderer.placePiece(row, col, player, function () {
      self.renderer.animateFlips(flips, player, function () {
        self.renderer.updateScore(self.board.getScore());
        self.renderer.logMove(player, row, col, flips.length);
        self._nextTurn();
      });
    });
  };

  App.prototype._nextTurn = function () {
    this.currentPlayer = this.currentPlayer === BLACK ? WHITE : BLACK;

    if (this.board.isGameOver()) {
      this._endGame();
      return;
    }

    var moves = this.board.getValidMoves(this.currentPlayer);

    if (moves.length === 0) {
      this.currentPlayer = this.currentPlayer === BLACK ? WHITE : BLACK;
      var skipMsg = this.currentPlayer === BLACK
        ? '白棋无路可走，轮到你'
        : '你无路可走，AI继续';
      this.renderer.setStatus(skipMsg);
    }

    if (this.currentPlayer === WHITE) {
      this._aiMove();
    } else {
      this.isProcessing = false;
      this._update();
    }
  };

  App.prototype._aiMove = function () {
    var self = this;
    this.renderer.setStatus('AI 正在思考...');
    this.renderer.setThinking(true);

    setTimeout(function () {
      var move = self.ai.getBestMove(self.board);
      self.renderer.setThinking(false);

      if (move) {
        self._executeMove(move[0], move[1], WHITE);
      } else {
        self._nextTurn();
      }
    }, 400);
  };

  App.prototype._endGame = function () {
    this.gameOver = true;
    this.isProcessing = true;
    var score = this.board.getScore();
    var msg;

    if (score.black > score.white) {
      msg = '你赢了！ ' + score.black + ' : ' + score.white;
    } else if (score.white > score.black) {
      msg = 'AI 获胜 ' + score.white + ' : ' + score.black;
    } else {
      msg = '平局！ ' + score.black + ' : ' + score.white;
    }

    this.renderer.setStatus(msg);
    this.renderer.render(this.board, [], this.lastMove);
    this.renderer.showGameOver(score);
  };

  App.prototype._update = function () {
    var validMoves = this.board.getValidMoves(this.currentPlayer);
    var showHints = this.currentPlayer === BLACK && !this.isProcessing ? validMoves : [];
    this.renderer.render(this.board, showHints, this.lastMove);
    this.renderer.updateScore(this.board.getScore());

    if (this.currentPlayer === BLACK && !this.isProcessing && !this.gameOver) {
      this.renderer.setStatus('轮到你了（黑棋） · 可走 ' + validMoves.length + ' 步');
    }
  };

  new App();
})();
