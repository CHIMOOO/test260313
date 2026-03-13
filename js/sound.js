(function () {
  var ctx = null;

  function getCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    return ctx;
  }

  function playTone(freq, duration, type, volume) {
    var c = getCtx();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.1, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  var Sound = {
    place: function () {
      playTone(600, 0.08, 'sine', 0.15);
      setTimeout(function () { playTone(800, 0.06, 'sine', 0.08); }, 40);
    },

    flip: function () {
      playTone(400, 0.1, 'triangle', 0.06);
    },

    invalid: function () {
      playTone(200, 0.15, 'square', 0.08);
    },

    win: function () {
      var delays = [0, 120, 240, 360, 500];
      var freqs = [523, 659, 784, 1047, 1319];
      delays.forEach(function (d, i) {
        setTimeout(function () { playTone(freqs[i], 0.3, 'sine', 0.12); }, d);
      });
    },

    lose: function () {
      playTone(300, 0.3, 'sawtooth', 0.06);
      setTimeout(function () { playTone(200, 0.4, 'sawtooth', 0.05); }, 200);
    },

    aiMove: function () {
      playTone(500, 0.06, 'sine', 0.1);
      setTimeout(function () { playTone(700, 0.08, 'sine', 0.12); }, 50);
    }
  };

  Reversi.Sound = Sound;
})();
