var Reversi = window.Reversi || {};

Reversi.BOARD_SIZE = 8;
Reversi.EMPTY = 0;
Reversi.BLACK = 1;
Reversi.WHITE = 2;

Reversi.DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1]
];

Reversi.DIFFICULTY = {
  EASY:   { depth: 2, name: '简单' },
  MEDIUM: { depth: 4, name: '中等' },
  HARD:   { depth: 6, name: '困难' }
};
