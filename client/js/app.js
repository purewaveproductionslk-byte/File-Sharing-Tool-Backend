(function() {
  var state = {
    clientId: null,
    device: null,
    roomCode: null,
    peers: {},
    selectedPeer: null,
    pendingFiles: [],
    transferCounter: 0
  };

  document.addEventListener('DOMContentLoaded', function() {
    state.device = Device.init();
    showDevice();
    connectSignaling();
    setupButtons();
    setupDragDrop();
    registerSW();
  });

  function showDevice() {
    var nameEl = document.getElementById('deviceName');
    var platEl = document.getElementById('devicePlatform');
    if (nameEl) nameEl.textContent = state.device.name;
    if (platEl) platEl.textContent = state.device.platform;
  }

  function connectSignaling() {
    Signaling.connect();

    Signaling.on('connected', function() {
      UI.showToast('Connected', 'success');
      document.querySelector('.status-dot').classList.add('connected');
    });

    Signaling.on('disconnected', function() {
      UI.showToast('Disconnected', 'error');
      document.querySelector('.status-dot').classList.remove('connected');
    });

    Signaling.on('welcome', function(msg) {
      state.clientId = msg.clientId;
      Signaling.send({ type: 'create-room', deviceInfo: state.device });
    });

    Signaling.on('room-created', function(msg) {
      state.roomCode = msg.roomId;
      document.getElementById('roomCode').textContent = msg.roomId;
      document.getElementById('roomActions').classList.add('hidden');
      document.getElementById('roomInfo').classList.remove('hidden');
      document.getElementById('peersSection').classList.remove('hidden');
      UI.showToast('Room created', 'success');
    });

    Signaling.on('room-joined', function(msg) {
      state.roomCode = msg.roomId;
      document.getElementById('roomCode').textContent = msg.roomId;
      document.getElementById('roomActions').classList.add('hidden');
      document.getElementById('roomInfo').classList.remove('hidden');
      document.getElementById('peersSection').classList.remove('hidden');
      UI.showToast('Joined room: ' + msg.roomId, 'success');
    });

    Signaling.on('room-peers', function(msg) {
      state.peers = {};
      if (msg.peers) {
        msg.peers.forEach(function(p) {
          state.peers[p.peerId] = { id: p.peerId, name: p.name, platform: p.platform, icon: p.icon };
        });
      }
      refreshPeers();
    });

    Signaling.on('peer-joined', function(msg) {
      state.peers[msg.peerId] = { id: msg.peerId, name: msg.name, platform: msg.platform, icon: msg.icon };
      refreshPeers();
      UI.playSound('connect');
      UI.showToast(msg.name + ' joined', 'success');
      WebRTC.connectTo(msg.peerId);
    });

    Signaling.on('peer-left', function(msg) {
      var peer = state.peers[msg.peerId];
      delete state.peers[msg.peerId];
      WebRTC.closePeer(msg.peerId);
      refreshPeers();
      UI.playSound('disconnect');
      if (peer) UI.showToast(peer.name + ' left', 'warning');
    });

    Signaling.on('peer-renamed', function(msg) {
      if (state.peers[msg.peerId]) {
        state.peers[msg.peerId].name = msg.newName;
        refreshPeers();
      }
    });

    Signaling.on('signal', function(msg) {
      WebRTC.handleSignal({ peerId: msg.fromId, signal: msg.signal });
    });

    Signaling.on('transfer-request', function(msg) {
      UI.playSound('transfer');
      UI.showTransferRequest(msg.fromName, msg.files || [], msg.totalSize || 0,
        function() {
          Signaling.send({ type: 'transfer-response', targetId: msg.fromId, accepted: true });
          UI.showToast('Transfer accepted', 'success');
        },
        function() {
          Signaling.send({ type: 'transfer-response', targetId: msg.fromId, accepted: false });
        }
      );
    });

    Signaling.on('transfer-response', function(msg) {
      if (msg.accepted && state.pendingFiles.length > 0) {
        var id = ++state.transferCounter;
        UI.addTransferItem(id, state.pendingFiles[0].name, state.pendingFiles.length);
        Transfer.on('progress', function(p) { UI.updateTransferProgress(id, p.percent, p.speedText); });
        Transfer.on('file-sent', function() { UI.updateTransferProgress(id, 100, 'Done'); });
        Transfer.sendFiles(msg.fromId, state.pendingFiles);
        state.pendingFiles = [];
      } else if (!msg.accepted) {
        state.pendingFiles = [];
        UI.showToast('Transfer declined', 'warning');
      }
    });

    Signaling.on('room-expired', function() {
      leaveRoom();
      UI.showToast('Room expired', 'warning');
    });

    Signaling.on('error', function(msg) {
      UI.showToast(msg.message || 'Error', 'error');
    });

    Transfer.on('receive-start', function(d) {
      var id = ++state.transferCounter;
      UI.addTransferItem(id, d.fileName, d.totalFiles);
    });

    Transfer.on('file-received', function(d) {
      UI.showToast('Received: ' + d.fileName, 'success');
    });

    Transfer.on('transfer-complete', function() {
      UI.showToast('Transfer complete!', 'success');
    });
  }

  function setupButtons() {
    document.getElementById('createRoomBtn').addEventListener('click', function() {
      if (state.roomCode) return UI.showToast('Already in a room', 'warning');
      Signaling.send({ type: 'create-room', deviceInfo: state.device });
    });

    document.getElementById('joinRoomBtn').addEventListener('click', function() {
      var code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
      if (!code) return UI.showToast('Enter a room code', 'warning');
      Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
    });

    document.getElementById('roomCodeInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var code = this.value.trim().toUpperCase();
        if (code) Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
      }
    });

    document.getElementById('leaveRoomBtn').addEventListener('click', leaveRoom);

    document.getElementById('copyCodeBtn').addEventListener('click', function() {
      if (state.roomCode) {
        navigator.clipboard.writeText(state.roomCode).then(function() { UI.showToast('Copied!', 'success'); });
      }
    });

    document.getElementById('qrBtn').addEventListener('click', function() {
      if (!state.roomCode) return;
      var url = location.origin + '?room=' + state.roomCode;
      QR.renderTo(document.getElementById('qrCanvas'), url, 220);
      document.getElementById('qrText').textContent = state.roomCode;
      UI.showModal('qrModal');
    });

    document.getElementById('closeQRBtn').addEventListener('click', function() { UI.hideModal('qrModal'); });

    document.getElementById('editNameBtn').addEventListener('click', function() {
      document.getElementById('renameInput').value = state.device.name;
      UI.showModal('renameModal');
    });

    document.getElementById('renameSaveBtn').addEventListener('click', function() {
      var name = document.getElementById('renameInput').value.trim();
      if (name) {
        state.device.name = name;
        document.getElementById('deviceName').textContent = name;
        Signaling.send({ type: 'rename', name: name });
      }
      UI.hideModal('renameModal');
    });

    document.getElementById('renameCancelBtn').addEventListener('click', function() { UI.hideModal('renameModal'); });

    document.getElementById('closeTransfersBtn').addEventListener('click', function() {
      document.getElementById('transferPanel').classList.add('hidden');
    });

    document.getElementById('fileInput').addEventListener('change', function() {
      if (this.files.length > 0) handleFiles(Array.from(this.files));
      this.value = '';
    });

    [document.getElementById('transferModal'), document.getElementById('renameModal'), document.getElementById('qrModal')].forEach(function(el) {
      el.addEventListener('click', function(e) { if (e.target === el) UI.hideModal(el.id); });
    });
  }

  function setupDragDrop() {
    var zone = document.getElementById('dropZone');
    var counter = 0;

    document.addEventListener('dragenter', function(e) { e.preventDefault(); counter++; zone.classList.add('active'); });
    document.addEventListener('dragleave', function(e) { e.preventDefault(); counter--; if (counter <= 0) { counter = 0; zone.classList.remove('active'); } });
    document.addEventListener('dragover', function(e) { e.preventDefault(); });
    document.addEventListener('drop', function(e) {
      e.preventDefault(); counter = 0; zone.classList.remove('active');
      if (e.dataTransfer.files.length > 0) handleFiles(Array.from(e.dataTransfer.files));
    });
  }

  function handleFiles(files) {
    if (!state.roomCode) return UI.showToast('Create a room first', 'warning');
    var keys = Object.keys(state.peers);
    if (keys.length === 0) return UI.showToast('No peers connected', 'warning');
    if (!state.selectedPeer) {
      if (keys.length === 1) state.selectedPeer = keys[0];
      else return UI.showToast('Select a peer first', 'info');
    }
    var target = state.peers[state.selectedPeer];
    var total = files.reduce(function(s, f) { return s + f.size; }, 0);

    UI.showTransferRequest(
      target ? target.name : 'Peer',
      files.map(function(f) { return { name: f.name, size: f.size }; }),
      total,
      function() {
        state.pendingFiles = files;
        Signaling.send({
          type: 'transfer-request', targetId: state.selectedPeer,
          files: files.map(function(f) { return { name: f.name, size: f.size, mimeType: f.type }; }),
          totalSize: total
        });
        UI.showToast('Request sent', 'info');
      },
      function() {}
    );
  }

  function leaveRoom() {
    Signaling.send({ type: 'leave-room' });
    WebRTC.disconnectAll();
    state.roomCode = null;
    state.peers = {};
    state.selectedPeer = null;
    document.getElementById('roomActions').classList.remove('hidden');
    document.getElementById('roomInfo').classList.add('hidden');
    document.getElementById('peersSection').classList.add('hidden');
    document.getElementById('peersGrid').innerHTML = '';
    UI.showToast('Left room', 'info');
  }

  function refreshPeers() {
    var arr = Object.values(state.peers);
    UI.updatePeerGrid(arr.map(function(p) {
      return { id: p.id, name: p.name, icon: p.icon || 'desktop', platform: p.platform || '' };
    }), state.selectedPeer);
  }

  function registerSW() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function() {});
  }

  window.App = {
    selectPeer: function(id) { state.selectedPeer = id; },
    getState: function() { return state; }
  };
})();
