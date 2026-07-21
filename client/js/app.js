(function() {
  var state = {
    clientId: null,
    device: null,
    roomCode: null,
    peers: {},
    selectedPeerId: null,
    pendingFiles: []
  };

  document.addEventListener('DOMContentLoaded', function() {
    state.device = Device.init();
    showDeviceInfo();
    connectSignaling();
    setupEventListeners();
    setupDragDrop();
    registerServiceWorker();
  });

  function showDeviceInfo() {
    var nameEl = document.getElementById('deviceName');
    var platformEl = document.getElementById('devicePlatform');
    if (nameEl) nameEl.textContent = state.device.name;
    if (platformEl) platformEl.textContent = state.device.platform;
  }

  function connectSignaling() {
    Signaling.connect();

    Signaling.on('connected', function() {
      UI.showToast('Connected to server', 'success');
      var dot = document.querySelector('.status-dot');
      if (dot) dot.classList.add('connected');
    });

    Signaling.on('disconnected', function() {
      UI.showToast('Disconnected from server', 'error');
      var dot = document.querySelector('.status-dot');
      if (dot) dot.classList.remove('connected');
    });

    Signaling.on('welcome', function(msg) {
      state.clientId = msg.clientId;
      Signaling.send({ type: 'create-room', deviceInfo: state.device });
    });

    Signaling.on('room-created', function(msg) {
      state.roomCode = msg.roomId;
      showRoomInfo(msg.roomId);
      UI.showToast('Room created: ' + msg.roomId, 'success');
    });

    Signaling.on('room-joined', function(msg) {
      state.roomCode = msg.roomId;
      showRoomInfo(msg.roomId);
      UI.showToast('Joined room: ' + msg.roomId, 'success');
    });

    Signaling.on('room-peers', function(msg) {
      state.peers = {};
      if (msg.peers) {
        msg.peers.forEach(function(p) {
          state.peers[p.peerId] = { id: p.peerId, name: p.name, platform: p.platform, icon: p.icon };
        });
      }
      updatePeersUI();
    });

    Signaling.on('peer-joined', function(msg) {
      state.peers[msg.peerId] = { id: msg.peerId, name: msg.name, platform: msg.platform, icon: msg.icon };
      updatePeersUI();
      UI.playSound('connect');
      UI.showToast(msg.name + ' joined', 'success');
      WebRTC.connectToPeer(msg.peerId);
    });

    Signaling.on('peer-left', function(msg) {
      var peer = state.peers[msg.peerId];
      delete state.peers[msg.peerId];
      WebRTC.disconnectPeer(msg.peerId);
      updatePeersUI();
      UI.playSound('disconnect');
      if (peer) UI.showToast(peer.name + ' left', 'warning');
    });

    Signaling.on('peer-renamed', function(msg) {
      if (state.peers[msg.peerId]) {
        state.peers[msg.peerId].name = msg.newName;
        updatePeersUI();
      }
    });

    Signaling.on('signal', function(msg) {
      WebRTC.handleSignal({ peerId: msg.fromId, signal: msg.signal });
    });

    Signaling.on('transfer-request', function(msg) {
      var fromName = msg.fromName || 'Unknown';
      var files = msg.files || [];
      var totalSize = msg.totalSize || 0;
      UI.playSound('transfer');
      UI.showTransferRequest(
        fromName, files, totalSize,
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
        Transfer.sendFiles(msg.fromId, state.pendingFiles);
        state.pendingFiles = [];
      } else if (!msg.accepted) {
        state.pendingFiles = [];
        UI.showToast('Transfer declined', 'warning');
      }
    });

    Signaling.on('text-received', function(msg) {
      UI.showToast(msg.fromName + ': ' + msg.text, 'info');
    });

    Signaling.on('room-expired', function(msg) {
      state.roomCode = null;
      state.peers = {};
      WebRTC.disconnectAll();
      hideRoomInfo();
      UI.showToast('Room expired', 'warning');
    });

    Signaling.on('error', function(msg) {
      UI.showToast(msg.message || 'An error occurred', 'error');
    });

    WebRTC.on('peer-connected', function(msg) {
      UI.showToast('Connected to peer', 'success');
    });

    WebRTC.on('data-channel-open', function(msg) {
      UI.showToast('Data channel ready', 'success');
    });

    Transfer.on('progress', function(msg) {
      UI.showToast('Transfer: ' + msg.fileName + ' ' + Math.round(msg.percent) + '%', 'info');
    });

    Transfer.on('file-sent', function(msg) {
      UI.showToast('Sent: ' + msg.fileName, 'success');
    });

    Transfer.on('transfer-complete', function() {
      UI.showToast('Transfer complete!', 'success');
    });
  }

  function setupEventListeners() {
    var createBtn = document.getElementById('createRoom');
    var joinBtn = document.getElementById('joinRoom');
    var joinCodeInput = document.getElementById('roomCode');
    var leaveBtn = document.getElementById('leaveRoom');
    var showQRBtn = document.getElementById('showQR');
    var editNameBtn = document.getElementById('editDeviceName');
    var fileInput = document.getElementById('fileInput');

    if (createBtn) createBtn.addEventListener('click', function() {
      if (state.roomCode) {
        UI.showToast('Already in a room', 'warning');
        return;
      }
      Signaling.send({ type: 'create-room', deviceInfo: state.device });
    });

    if (joinBtn) joinBtn.addEventListener('click', function() {
      var code = joinCodeInput ? joinCodeInput.value.trim() : '';
      if (!code) {
        UI.showToast('Enter a room code', 'warning');
        return;
      }
      Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
    });

    if (joinCodeInput) joinCodeInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var code = joinCodeInput.value.trim();
        if (code) Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
      }
    });

    if (leaveBtn) leaveBtn.addEventListener('click', function() {
      Signaling.send({ type: 'leave-room' });
      WebRTC.disconnectAll();
      state.roomCode = null;
      state.peers = {};
      state.selectedPeerId = null;
      hideRoomInfo();
      UI.showToast('Left room', 'info');
    });

    if (showQRBtn) showQRBtn.addEventListener('click', function() {
      if (state.roomCode) UI.showQRCode(state.roomCode);
    });

    if (editNameBtn) editNameBtn.addEventListener('click', function() {
      var nameEl = document.getElementById('deviceName');
      if (nameEl) {
        var currentName = nameEl.textContent;
        var newName = prompt('Enter new device name:', currentName);
        if (newName && newName.trim()) {
          state.device.name = newName.trim();
          nameEl.textContent = newName.trim();
          Signaling.send({ type: 'rename', name: newName.trim() });
        }
      }
    });

    if (fileInput) fileInput.addEventListener('change', function() {
      if (fileInput.files.length > 0) handleFileSelection(Array.from(fileInput.files));
    });
  }

  function setupDragDrop() {
    var dropZone = document.getElementById('dropZone');
    var dragCounter = 0;

    document.addEventListener('dragenter', function(e) {
      e.preventDefault();
      dragCounter++;
      if (dropZone) dropZone.classList.add('active');
    });

    document.addEventListener('dragleave', function(e) {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (dropZone) dropZone.classList.remove('active');
      }
    });

    document.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    document.addEventListener('drop', function(e) {
      e.preventDefault();
      dragCounter = 0;
      if (dropZone) dropZone.classList.remove('active');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelection(Array.from(e.dataTransfer.files));
      }
    });
  }

  function handleFileSelection(files) {
    if (!state.roomCode) {
      UI.showToast('Create a room first', 'warning');
      return;
    }
    var peerKeys = Object.keys(state.peers);
    if (peerKeys.length === 0) {
      UI.showToast('No peers connected', 'warning');
      return;
    }
    if (!state.selectedPeerId) {
      if (peerKeys.length === 1) {
        state.selectedPeerId = peerKeys[0];
      } else {
        UI.showToast('Select a peer to send files to', 'info');
        return;
      }
    }
    var targetId = state.selectedPeerId;
    var targetPeer = state.peers[targetId];
    var totalSize = files.reduce(function(s, f) { return s + f.size; }, 0);

    UI.showTransferRequest(
      targetPeer ? targetPeer.name : 'Peer',
      files.map(function(f) { return { name: f.name, size: f.size }; }),
      totalSize,
      function() {
        state.pendingFiles = files;
        Signaling.send({
          type: 'transfer-request',
          targetId: targetId,
          files: files.map(function(f) { return { name: f.name, size: f.size, mimeType: f.type }; }),
          totalSize: totalSize
        });
        UI.showToast('Transfer request sent', 'info');
      },
      function() {}
    );
  }

  function showRoomInfo(roomId) {
    var roomInfo = document.getElementById('roomInfo');
    var currentRoom = document.getElementById('currentRoom');
    var peersSection = document.getElementById('peersSection');
    if (roomInfo) roomInfo.classList.remove('hidden');
    if (currentRoom) currentRoom.textContent = roomId;
    if (peersSection) peersSection.classList.remove('hidden');
  }

  function hideRoomInfo() {
    var roomInfo = document.getElementById('roomInfo');
    var peersSection = document.getElementById('peersSection');
    var peers = document.getElementById('peers');
    if (roomInfo) roomInfo.classList.add('hidden');
    if (peersSection) peersSection.classList.add('hidden');
    if (peers) peers.innerHTML = '';
  }

  function updatePeersUI() {
    var peerArray = Object.values(state.peers).map(function(p) {
      return { id: p.id, name: p.name, deviceType: p.icon || 'desktop', platform: p.platform || 'Unknown', selected: p.id === state.selectedPeerId };
    });
    UI.updatePeerGrid(peerArray);
  }

  function selectPeer(peerId) {
    state.selectedPeerId = peerId;
    updatePeersUI();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    }
  }

  window.App = {
    selectPeer: selectPeer,
    getState: function() { return state; }
  };
})();
