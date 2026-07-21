(function() {
  function generate(container, text, size) {
    size = size || 200;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var modules = encode(text);
    var count = modules.length;
    var mSize = size / count;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (modules[r][c]) {
          ctx.fillStyle = '#1a1a2e';
          ctx.beginPath();
          ctx.roundRect(c * mSize + 0.5, r * mSize + 0.5, mSize - 1, mSize - 1, 1);
          ctx.fill();
        }
      }
    }

    var grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(6,214,160,0.15)');
    grad.addColorStop(1, 'rgba(123,97,255,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    container.innerHTML = '';
    container.appendChild(canvas);
    return canvas;
  }

  function encode(text) {
    var data = utf8(text);
    var len = data.length;
    var version = len <= 17 ? 1 : len <= 32 ? 2 : len <= 53 ? 3 : 4;
    var size = version * 4 + 17;
    var grid = makeGrid(size);
    placeFinders(grid, size);
    placeTiming(grid, size);
    placeData(grid, data, size, version);
    applyMask(grid, size);
    return grid;
  }

  function utf8(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 128) bytes.push(c);
      else if (c < 2048) { bytes.push(192 | (c >> 6)); bytes.push(128 | (c & 63)); }
      else { bytes.push(224 | (c >> 12)); bytes.push(128 | ((c >> 6) & 63)); bytes.push(128 | (c & 63)); }
    }
    return bytes;
  }

  function makeGrid(size) {
    var g = [];
    for (var i = 0; i < size; i++) { g[i] = []; for (var j = 0; j < size; j++) g[i][j] = 0; }
    return g;
  }

  function placeFinders(grid, size) {
    [[0,0],[0,size-7],[size-7,0]].forEach(function(pos) {
      var r = pos[0], c = pos[1];
      for (var dr = 0; dr < 7; dr++) {
        for (var dc = 0; dc < 7; dc++) {
          var outer = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          var inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          grid[r+dr][c+dc] = (outer || inner) ? 1 : 0;
        }
      }
      for (var i = 0; i < 8; i++) {
        if (r+7 < size && c+i < size) grid[r+7][c+i] = 0;
        if (r+i < size && c+7 < size) grid[r+i][c+7] = 0;
      }
    });
  }

  function placeTiming(grid, size) {
    for (var i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0 ? 1 : 0;
      grid[i][6] = i % 2 === 0 ? 1 : 0;
    }
  }

  function placeData(grid, data, size, version) {
    var bits = [];
    bits.push(1, 0);
    var modeBits = [0, 1, 0, 0];
    modeBits.forEach(function(b) { bits.push(b); });

    var lenBits = version <= 1 ? 8 : 16;
    var len = data.length;
    for (var i = lenBits - 1; i >= 0; i--) bits.push((len >> i) & 1);

    data.forEach(function(b) {
      for (var i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    });

    var pad = [236, 17];
    var pi = 0;
    while (bits.length < size * size) { bits.push((pad[pi] >> 7) & 1); bits.push((pad[pi] >> 6) & 1); pi = (pi + 1) % 2; }

    var row = size - 1, col = size - 1, dir = -1;
    var idx = 0;
    while (col >= 0) {
      if (col === 6) col--;
      if (row < 0 || row >= size) { dir = -dir; row += dir; col -= 2; if (col < 0) break; continue; }
      grid[row][col] = idx < bits.length ? bits[idx] : 0;
      grid[row][col - 1] = (idx + 1) < bits.length ? bits[idx + 1] : 0;
      idx += 2;
      row += dir;
    }
  }

  function applyMask(grid, size) {
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if ((r + c) % 2 === 0) grid[r][c] ^= 1;
      }
    }
  }

  function renderTo(container, text, size) {
    return generate(container, text, size);
  }

  window.QR = { generate: generate, renderTo: renderTo };
})();
