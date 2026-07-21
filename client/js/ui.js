(function () {
  const BRAND = { emerald: '#06d6a0', purple: '#7b61ff', pink: '#ff6b9d' };

  function showToast(message, type) {
    if (!type) type = 'info';
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    const colors = { info: BRAND.purple, success: BRAND.emerald, error: BRAND.pink, warning: BRAND.pink };
    toast.innerHTML = '<span class="toast-icon">' + getToastIcon(type) + '</span><span class="toast-msg">' + escapeHtml(message) + '</span>';
    toast.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 20px;border-radius:12px;color:#fff;font-family:Inter,sans-serif;font-size:14px;font-weight:500;background:' + colors[type] + ';box-shadow:0 8px 32px rgba(0,0,0,0.4);transform:translateX(120%);transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s;opacity:0;cursor:pointer;max-width:380px;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.15);z-index:10000;';
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.style.transform = 'translateX(0)'; toast.style.opacity = '1'; });
    toast.addEventListener('click', function () { dismissToast(toast); });
    setTimeout(function () { dismissToast(toast); }, 4000);
  }

  function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:10px;z-index:9999;pointer-events:none;';
    document.body.appendChild(c);
    return c;
  }

  function dismissToast(toast) {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(function () { toast.remove(); }, 400);
  }

  function getToastIcon(type) {
    const icons = {
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    return icons[type] || icons.info;
  }

  function escapeHtml(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function toggleTheme() {
    var body = document.body;
    var isDark = body.getAttribute('data-theme') !== 'light';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    var icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.innerHTML = isDark ? getMoonSVG() : getSunSVG();
  }

  function getSunSVG() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  }

  function getMoonSVG() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i >= units.length) i = units.length - 1;
    var size = bytes / Math.pow(1024, i);
    return (size % 1 === 0 ? size : size.toFixed(1)) + ' ' + units[i];
  }

  function formatSpeed(bytesPerSec) {
    return formatFileSize(bytesPerSec) + '/s';
  }

  function showModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('active');
    modal.style.display = 'flex';
    requestAnimationFrame(function () { modal.style.opacity = '1'; });
  }

  function hideModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(function () {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }, 300);
  }

  function updatePeerGrid(peers) {
    var grid = document.getElementById('peers');
    if (!grid) return;
    grid.innerHTML = '';
    if (!peers || peers.length === 0) {
      grid.innerHTML = '<div class="empty-peers"><p>No peers connected</p><p class="sub">Share the room code to invite others</p></div>';
      return;
    }
    peers.forEach(function (peer) {
      var card = document.createElement('div');
      card.className = 'peer-card' + (peer.selected ? ' selected' : '');
      card.setAttribute('data-peer-id', peer.id);
      card.innerHTML = getDeviceIcon(peer.deviceType) +
        '<div class="peer-info">' +
        '<span class="peer-name">' + escapeHtml(peer.name) + '</span>' +
        '<span class="peer-platform">' + escapeHtml(peer.platform || 'Unknown') + '</span>' +
        '</div>' +
        '<div class="peer-status connected"></div>';
      card.addEventListener('click', function () {
        selectPeer(peer.id);
      });
      grid.appendChild(card);
    });
  }

  function getDeviceIcon(type) {
    var icons = {
      phone: '<svg class="device-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + BRAND.emerald + '" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
      tablet: '<svg class="device-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + BRAND.purple + '" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
      desktop: '<svg class="device-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + BRAND.pink + '" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
    };
    return icons[type] || icons.desktop;
  }

  function selectPeer(peerId) {
    if (window.App && window.App.selectPeer) {
      window.App.selectPeer(peerId);
    }
    var cards = document.querySelectorAll('.peer-card');
    cards.forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-peer-id') === peerId);
    });
  }

  function showTransferRequest(fromName, files, totalSize, onAccept, onReject) {
    var modal = document.getElementById('transfer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'transfer-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    var fileList = files.map(function (f) {
      return '<div class="transfer-file-item"><span class="file-name">' + escapeHtml(f.name) + '</span><span class="file-size">' + formatFileSize(f.size) + '</span></div>';
    }).join('');
    modal.innerHTML = '<div class="modal-content transfer-request-modal">' +
      '<div class="modal-header"><h3>Transfer Request</h3><button class="modal-close" id="tr-close">&times;</button></div>' +
      '<div class="modal-body">' +
      '<div class="transfer-request-info"><span class="request-from">' + escapeHtml(fromName) + '</span> wants to send you files</div>' +
      '<div class="transfer-file-list">' + fileList + '</div>' +
      '<div class="transfer-total-size">Total: ' + formatFileSize(totalSize) + '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-reject" id="tr-reject">Decline</button>' +
      '<button class="btn btn-accept" id="tr-accept">Accept</button>' +
      '</div></div>';
    modal.style.display = 'flex';
    requestAnimationFrame(function () { modal.style.opacity = '1'; });
    document.getElementById('tr-accept').addEventListener('click', function () {
      hideModal('transfer-modal');
      if (onAccept) onAccept();
    });
    document.getElementById('tr-reject').addEventListener('click', function () {
      hideModal('transfer-modal');
      if (onReject) onReject();
    });
    document.getElementById('tr-close').addEventListener('click', function () {
      hideModal('transfer-modal');
      if (onReject) onReject();
    });
  }

  function updateTransferProgress(fileIndex, fileName, progress, speed, total) {
    var panel = document.getElementById('transfer-panel');
    if (!panel) return;
    panel.classList.add('active');
    panel.style.display = 'block';
    var existingBar = panel.querySelector('[data-file-index="' + fileIndex + '"]');
    if (!existingBar) {
      existingBar = document.createElement('div');
      existingBar.className = 'transfer-progress-item';
      existingBar.setAttribute('data-file-index', fileIndex);
      existingBar.innerHTML =
        '<div class="progress-file-info"><span class="progress-file-name">' + escapeHtml(fileName) + '</span><span class="progress-file-percent">0%</span></div>' +
        '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:0%;background:linear-gradient(90deg,' + BRAND.emerald + ',' + BRAND.purple + ')"></div></div>' +
        '<div class="progress-file-speed">0 B/s</div>';
      panel.querySelector('.transfer-progress-list').appendChild(existingBar);
    }
    var pct = Math.min(100, Math.round(progress));
    var fill = existingBar.querySelector('.progress-bar-fill');
    var pctLabel = existingBar.querySelector('.progress-file-percent');
    var speedLabel = existingBar.querySelector('.progress-file-speed');
    fill.style.width = pct + '%';
    pctLabel.textContent = pct + '%';
    speedLabel.textContent = formatSpeed(speed || 0);
    if (pct >= 100) {
      fill.style.background = BRAND.emerald;
      speedLabel.textContent = 'Complete';
    }
  }

  function showQRCode(roomCode) {
    var modal = document.getElementById('qr-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'qr-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    var url = window.location.origin + '/join/' + roomCode;
    var qrSize = 200;
    modal.innerHTML = '<div class="modal-content qr-modal-content">' +
      '<div class="modal-header"><h3>Scan to Join</h3><button class="modal-close" id="qr-close">&times;</button></div>' +
      '<div class="modal-body qr-body">' +
      '<div class="qr-code-container"><canvas id="qr-canvas" width="' + qrSize + '" height="' + qrSize + '"></canvas></div>' +
      '<div class="qr-room-code">Room: <strong>' + escapeHtml(roomCode) + '</strong></div>' +
      '<div class="qr-url">' + escapeHtml(url) + '</div>' +
      '</div></div>';
    modal.style.display = 'flex';
    requestAnimationFrame(function () { modal.style.opacity = '1'; });
    drawQRCode(document.getElementById('qr-canvas'), url, qrSize);
    document.getElementById('qr-close').addEventListener('click', function () { hideModal('qr-modal'); });
  }

  function drawQRCode(canvas, text, size) {
    var ctx = canvas.getContext('2d');
    var moduleCount = 25;
    var moduleSize = size / moduleCount;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    var data = simpleQRData(text, moduleCount);
    for (var r = 0; r < moduleCount; r++) {
      for (var c = 0; c < moduleCount; c++) {
        if (data[r * moduleCount + c]) {
          ctx.fillStyle = '#1a1a2e';
          var x = c * moduleSize;
          var y = r * moduleSize;
          if (isFinderPattern(r, c, moduleCount)) {
            drawFinderModule(ctx, r, c, moduleCount, moduleSize);
          } else {
            ctx.beginPath();
            ctx.roundRect(x + 0.5, y + 0.5, moduleSize - 1, moduleSize - 1, 2);
            ctx.fill();
          }
        }
      }
    }
    var grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, BRAND.emerald + '30');
    grad.addColorStop(0.5, BRAND.purple + '20');
    grad.addColorStop(1, BRAND.pink + '30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  function simpleQRData(text, size) {
    var data = [];
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        var inFinder = isFinderPattern(r, c, size);
        var inTiming = (r === 6 || c === 6) && !inFinder;
        if (inFinder || inTiming) {
          data.push(1);
        } else {
          hash = ((hash * 1103515245 + 12345) & 0x7fffffff);
          data.push((hash % 3) === 0 ? 1 : 0);
        }
      }
    }
    return data;
  }

  function isFinderPattern(r, c, size) {
    var patterns = [[0, 0], [0, size - 7], [size - 7, 0]];
    for (var i = 0; i < patterns.length; i++) {
      var pr = patterns[i][0], pc = patterns[i][1];
      if (r >= pr && r < pr + 7 && c >= pc && c < pc + 7) return true;
    }
    return false;
  }

  function drawFinderModule(ctx, r, c, moduleCount, moduleSize) {
    var patterns = [[0, 0], [0, moduleCount - 7], [moduleCount - 7, 0]];
    for (var i = 0; i < patterns.length; i++) {
      var pr = patterns[i][0], pc = patterns[i][1];
      if (r >= pr && r < pr + 7 && c >= pc && c < pc + 7) {
        var lr = r - pr, lc = c - pc;
        var isOuter = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        var isInner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        var x = c * moduleSize, y = r * moduleSize;
        ctx.fillStyle = (isOuter || isInner) ? '#1a1a2e' : '#ffffff';
        ctx.fillRect(x, y, moduleSize, moduleSize);
        return;
      }
    }
  }

  function playSound(type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.1;
      var freqs = {
        connect: [523.25, 659.25, 783.99],
        disconnect: [783.99, 659.25, 523.25],
        transfer: [880, 1108.73]
      };
      var notes = freqs[type] || freqs.info;
      var time = ctx.currentTime;
      notes.forEach(function (freq, i) {
        osc.frequency.setValueAtTime(freq, time + i * 0.12);
      });
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + notes.length * 0.12 + 0.1);
      osc.start(time);
      osc.stop(time + notes.length * 0.12 + 0.1);
    } catch (e) {}
  }

  window.UI = {
    showToast: showToast,
    toggleTheme: toggleTheme,
    formatFileSize: formatFileSize,
    formatSpeed: formatSpeed,
    showModal: showModal,
    hideModal: hideModal,
    updatePeerGrid: updatePeerGrid,
    showTransferRequest: showTransferRequest,
    updateTransferProgress: updateTransferProgress,
    showQRCode: showQRCode,
    playSound: playSound
  };
})();