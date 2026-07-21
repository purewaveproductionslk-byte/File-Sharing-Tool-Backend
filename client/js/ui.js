(function() {
  function showToast(msg, type) {
    type = type || 'info';
    var c = document.getElementById('toastContainer');
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = msg;
    c.appendChild(t);
    t.addEventListener('click', function() { t.remove(); });
    setTimeout(function() { t.remove(); }, 4000);
  }

  function toggleTheme() {
    var dark = document.body.getAttribute('data-theme') !== 'light';
    document.body.setAttribute('data-theme', dark ? 'light' : 'dark');
  }

  function showModal(id) {
    var m = document.getElementById(id);
    if (m) { m.classList.remove('hidden'); m.style.display = 'flex'; }
  }

  function hideModal(id) {
    var m = document.getElementById(id);
    if (m) { m.classList.add('hidden'); m.style.display = ''; }
  }

  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }

  function deviceIconSVG(type) {
    var color = type === 'phone' ? '#00f5d4' : type === 'tablet' ? '#8b5cf6' : '#ec4899';
    if (type === 'phone') return '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
    if (type === 'tablet') return '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
    if (type === 'laptop') return '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>';
    return '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  }

  function updatePeerGrid(peers, selectedId) {
    var grid = document.getElementById('peersGrid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!peers || peers.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;grid-column:1/-1;text-align:center">No peers yet. Share the room code.</p>';
      return;
    }
    peers.forEach(function(p) {
      var card = document.createElement('div');
      card.className = 'peer-card' + (p.id === selectedId ? ' selected' : '');
      card.innerHTML = '<div class="peer-icon">' + deviceIconSVG(p.icon) + '</div>' +
        '<span class="peer-name">' + esc(p.name) + '</span>' +
        '<span class="peer-platform">' + esc(p.platform) + '</span>';
      card.addEventListener('click', function() {
        if (window.App) App.selectPeer(p.id);
        document.querySelectorAll('.peer-card').forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');
      });
      grid.appendChild(card);
    });
  }

  function showTransferRequest(fromName, files, totalSize, onAccept, onReject) {
    var html = '';
    files.forEach(function(f) {
      html += '<div class="modal-file-item"><span class="name">' + esc(f.name) + '</span><span class="size">' + formatSize(f.size) + '</span></div>';
    });
    document.getElementById('transferFrom').textContent = fromName + ' wants to send you:';
    document.getElementById('transferFiles').innerHTML = html;
    document.getElementById('transferSize').textContent = 'Total: ' + formatSize(totalSize);
    showModal('transferModal');

    var acceptBtn = document.getElementById('acceptBtn');
    var rejectBtn = document.getElementById('rejectBtn');
    var closeHandler = function() {
      hideModal('transferModal');
      acceptBtn.onclick = null;
      rejectBtn.onclick = null;
    };
    acceptBtn.onclick = function() { closeHandler(); if (onAccept) onAccept(); };
    rejectBtn.onclick = function() { closeHandler(); if (onReject) onReject(); };
  }

  function addTransferItem(id, fileName, total, totalSize) {
    var panel = document.getElementById('transferPanel');
    var list = document.getElementById('transferList');
    panel.classList.remove('hidden');
    var item = document.createElement('div');
    item.className = 'transfer-item';
    item.id = 'tr-' + id;
    var sizeInfo = total > 1 ? ' (' + total + ' files)' : '';
    var totalInfo = totalSize ? ' - ' + formatSize(totalSize) : '';
    item.innerHTML = '<div class="file-info"><span class="file-name">' + esc(fileName) + sizeInfo + '</span><span class="file-status">0%' + totalInfo + '</span></div><div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>';
    list.appendChild(item);
  }

  function updateTransferProgress(id, pct, speedText) {
    var item = document.getElementById('tr-' + id);
    if (!item) return;
    item.querySelector('.progress-fill').style.width = pct + '%';
    item.querySelector('.file-status').textContent = Math.round(pct) + '% ' + (speedText || '');
    if (pct >= 100) {
      item.querySelector('.file-status').textContent = 'Complete';
      item.querySelector('.progress-fill').style.background = 'var(--brand-primary)';
    }
  }

  function removeTransferItem(id) {
    var item = document.getElementById('tr-' + id);
    if (item) item.remove();
  }

  function playSound(type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.08;
      var freqs = type === 'connect' ? [523, 659, 784] : type === 'disconnect' ? [784, 659, 523] : [880, 1109];
      var t = ctx.currentTime;
      freqs.forEach(function(f, i) { osc.frequency.setValueAtTime(f, t + i * 0.1); });
      gain.gain.exponentialRampToValueAtTime(0.001, t + freqs.length * 0.1 + 0.1);
      osc.start(t);
      osc.stop(t + freqs.length * 0.1 + 0.1);
    } catch {}
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  window.UI = {
    showToast: showToast, toggleTheme: toggleTheme, showModal: showModal, hideModal: hideModal,
    formatSize: formatSize, updatePeerGrid: updatePeerGrid, showTransferRequest: showTransferRequest,
    addTransferItem: addTransferItem, updateTransferProgress: updateTransferProgress,
    removeTransferItem: removeTransferItem, playSound: playSound
  };
})();
