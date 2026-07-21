(function() {
  var state = {
    clientId: null,
    device: null,
    roomCode: null,
    peers: {},
    selectedPeer: null,
    pendingFiles: [],
    pendingTarget: null,
    transferCounter: 0,
    activeTransfers: {}
  };

  document.addEventListener('DOMContentLoaded', function() {
    initSignaling();
    Device.init(function(device) {
      state.device = device;
      showDevice();

      var params = new URLSearchParams(location.search);
      var roomParam = params.get('room');
      if (roomParam) {
        Signaling.connect();
      }
    });
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

  function initSignaling() {
    Signaling.on('connected', function() {
      UI.showToast('Connected to server', 'success');
      var dot = document.querySelector('.status-dot');
      if (dot) dot.classList.add('connected');
      var label = document.getElementById('connectionStatus');
      if (label) label.textContent = 'Online';
    });

    Signaling.on('disconnected', function() {
      UI.showToast('Disconnected from server', 'error');
      var dot = document.querySelector('.status-dot');
      if (dot) dot.classList.remove('connected');
      var label = document.getElementById('connectionStatus');
      if (label) label.textContent = 'Offline';
    });

    Signaling.on('welcome', function(msg) {
      state.clientId = msg.clientId;
      var params = new URLSearchParams(location.search);
      var roomParam = params.get('room');
      if (roomParam) {
        var cleanCode = roomParam.trim().toUpperCase();
        document.getElementById('inviteRoomCode').textContent = cleanCode;
        UI.showModal('inviteModal');

        document.getElementById('inviteAcceptBtn').onclick = function() {
          UI.hideModal('inviteModal');
          Signaling.connect(function() {
            Signaling.send({ type: 'join-room', roomId: cleanCode, deviceInfo: state.device });
          });
          history.replaceState(null, '', location.pathname);
        };

        document.getElementById('inviteDeclineBtn').onclick = function() {
          UI.hideModal('inviteModal');
          history.replaceState(null, '', location.pathname);
        };
      }
    });

    Signaling.on('room-created', function(msg) {
      state.roomCode = msg.roomId;
      document.getElementById('roomCode').textContent = msg.roomId;
      document.getElementById('roomActions').classList.add('hidden');
      document.getElementById('roomInfo').classList.remove('hidden');
      var emptyState = document.getElementById('emptyState');
      if (emptyState) emptyState.classList.add('hidden');
      document.getElementById('peersSection').classList.remove('hidden');
      UI.showToast('Room created: ' + msg.roomId, 'success');
    });

    Signaling.on('room-joined', function(msg) {
      state.roomCode = msg.roomId;
      document.getElementById('roomCode').textContent = msg.roomId;
      document.getElementById('roomActions').classList.add('hidden');
      document.getElementById('roomInfo').classList.remove('hidden');
      var emptyState = document.getElementById('emptyState');
      if (emptyState) emptyState.classList.add('hidden');
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
      autoSelectSinglePeer();
    });

    Signaling.on('peer-joined', function(msg) {
      state.peers[msg.peerId] = { id: msg.peerId, name: msg.name, platform: msg.platform, icon: msg.icon };
      refreshPeers();
      UI.playSound('connect');
      UI.showToast(msg.name + ' joined', 'success');
      WebRTC.connectTo(msg.peerId);
      autoSelectSinglePeer();
    });

    Signaling.on('peer-left', function(msg) {
      var peer = state.peers[msg.peerId];
      delete state.peers[msg.peerId];
      WebRTC.closePeer(msg.peerId);
      refreshPeers();
      UI.playSound('disconnect');
      if (peer) UI.showToast(peer.name + ' left', 'warning');
      if (state.selectedPeer === msg.peerId) state.selectedPeer = null;
      autoSelectSinglePeer();
    });

    Signaling.on('peer-renamed', function(msg) {
      if (state.peers[msg.peerId]) {
        state.peers[msg.peerId].name = msg.newName;
        refreshPeers();
      }
    });

    Signaling.on('transfer-request', function(msg) {
      UI.playSound('transfer');
      var singleMode = Object.keys(state.peers).length <= 2;
      if (singleMode) {
        Signaling.send({ type: 'transfer-response', targetId: msg.fromId, accepted: true });
        UI.showToast('Receiving from ' + msg.fromName + '...', 'info');
      } else {
        UI.showTransferRequest(msg.fromName, msg.files || [], msg.totalSize || 0,
          function() {
            Signaling.send({ type: 'transfer-response', targetId: msg.fromId, accepted: true });
            UI.showToast('Transfer accepted', 'success');
          },
          function() {
            Signaling.send({ type: 'transfer-response', targetId: msg.fromId, accepted: false });
          }
        );
      }
    });

    Signaling.on('transfer-response', function(msg) {
      if (msg.accepted && state.pendingFiles.length > 0) {
        var id = ++state.transferCounter;
        state.activeTransfers[msg.fromId] = id;
        var totalSize = state.pendingFiles.reduce(function(s, f) { return s + f.size; }, 0);
        UI.addTransferItem(id, state.pendingFiles[0].name, state.pendingFiles.length, totalSize);
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
      state.activeTransfers[d.peerId] = id;
      UI.addTransferItem(id, d.fileName, d.totalFiles, d.fileSize);
    });

    Transfer.on('file-received', function(d) {
      UI.showToast('Received: ' + d.fileName, 'success');
    });

    Transfer.on('progress', function(p) {
      var id = state.activeTransfers[p.peerId];
      if (id) {
        UI.updateTransferProgress(id, p.percent, p.speedText);
      }
    });

    Transfer.on('file-sent', function(p) {
      var id = state.activeTransfers[p.peerId];
      if (id) {
        UI.updateTransferProgress(id, 100, 'Done');
      }
    });

    Transfer.on('transfer-complete', function(d) {
      var id = state.activeTransfers[d.peerId];
      if (id) {
        UI.updateTransferProgress(id, 100, 'Done');
        delete state.activeTransfers[d.peerId];
      }
      UI.showToast('Transfer complete!', 'success');
      UI.playSound('transfer');
    });
  }

  function setupButtons() {
    document.getElementById('createRoomBtn').addEventListener('click', function() {
      if (state.roomCode) return UI.showToast('Already in a room', 'warning');
      if (!Signaling.isConnected()) {
        UI.showToast('Initializing connection...', 'info');
        Signaling.connect(function() {
          Signaling.send({ type: 'create-room', deviceInfo: state.device });
        });
      } else {
        Signaling.send({ type: 'create-room', deviceInfo: state.device });
      }
    });

    document.getElementById('joinRoomBtn').addEventListener('click', function() {
      var code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
      if (!code) return UI.showToast('Enter a room code', 'warning');
      if (!Signaling.isConnected()) {
        UI.showToast('Initializing connection...', 'info');
        Signaling.connect(function() {
          Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
        });
      } else {
        Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
      }
    });

    document.getElementById('roomCodeInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var code = this.value.trim().toUpperCase();
        if (code) {
          if (!Signaling.isConnected()) {
            UI.showToast('Initializing connection...', 'info');
            Signaling.connect(function() {
              Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
            });
          } else {
            Signaling.send({ type: 'join-room', roomId: code, deviceInfo: state.device });
          }
        }
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

    document.getElementById('sendMediaBtn').addEventListener('click', function() {
      UI.hideModal('actionModal');
      var input = document.getElementById('mediaInput');
      if (input) input.click();
    });

    document.getElementById('sendDocsBtn').addEventListener('click', function() {
      UI.hideModal('actionModal');
      var input = document.getElementById('fileInput');
      if (input) input.click();
    });

    document.getElementById('cancelActionBtn').addEventListener('click', function() {
      UI.hideModal('actionModal');
    });

    document.getElementById('fileInput').addEventListener('change', function() {
      if (this.files.length > 0) handleFiles(Array.from(this.files));
      this.value = '';
    });

    document.getElementById('mediaInput').addEventListener('change', function() {
      if (this.files.length > 0) handleFiles(Array.from(this.files));
      this.value = '';
    });

    [document.getElementById('transferModal'), document.getElementById('renameModal'), document.getElementById('qrModal'), document.getElementById('inviteModal'), document.getElementById('actionModal')].forEach(function(el) {
      if (!el) return;
      el.addEventListener('click', function(e) {
        if (e.target === el) {
          UI.hideModal(el.id);
          if (el.id === 'inviteModal') {
            history.replaceState(null, '', location.pathname);
          }
        }
      });
    });
  }

  function setupDragDrop() {
    var zone = document.getElementById('dropZone');
    var overlay = document.getElementById('dragOverlay');
    var counter = 0;

    document.addEventListener('dragenter', function(e) {
      e.preventDefault();
      counter++;
      if (zone) zone.classList.add('active');
      if (overlay) overlay.classList.remove('hidden');
    });

    document.addEventListener('dragleave', function(e) {
      e.preventDefault();
      counter--;
      if (counter <= 0) {
        counter = 0;
        if (zone) zone.classList.remove('active');
        if (overlay) overlay.classList.add('hidden');
      }
    });

    document.addEventListener('dragover', function(e) {
      e.preventDefault();
    });

    document.addEventListener('drop', function(e) {
      e.preventDefault();
      counter = 0;
      if (zone) zone.classList.remove('active');
      if (overlay) overlay.classList.add('hidden');
      if (e.dataTransfer.files.length > 0) handleFiles(Array.from(e.dataTransfer.files));
    });
  }

  function handleFiles(files) {
    if (!state.roomCode) return UI.showToast('Create or join a room first', 'warning');
    var keys = Object.keys(state.peers);
    if (keys.length === 0) return UI.showToast('No peers connected', 'warning');

    var targetId = state.selectedPeer || keys[0];
    var target = state.peers[targetId];
    var total = files.reduce(function(s, f) { return s + f.size; }, 0);

    var singleMode = keys.length <= 1;
    if (singleMode) {
      state.pendingFiles = files;
      state.pendingTarget = targetId;
      Signaling.send({
        type: 'transfer-request', targetId: targetId,
        files: files.map(function(f) { return { name: f.name, size: f.size, mimeType: f.type }; }),
        totalSize: total
      });
      UI.showToast('Sending to ' + target.name + '...', 'info');
    } else {
      UI.showTransferRequest(
        target ? target.name : 'Peer',
        files.map(function(f) { return { name: f.name, size: f.size }; }),
        total,
        function() {
          state.pendingFiles = files;
          state.pendingTarget = targetId;
          Signaling.send({
            type: 'transfer-request', targetId: targetId,
            files: files.map(function(f) { return { name: f.name, size: f.size, mimeType: f.type }; }),
            totalSize: total
          });
          UI.showToast('Request sent to ' + (target ? target.name : 'peer'), 'info');
        },
        function() {}
      );
    }
  }

  function autoSelectSinglePeer() {
    var keys = Object.keys(state.peers);
    if (keys.length === 1 && !state.selectedPeer) {
      state.selectedPeer = keys[0];
      refreshPeers();
    }
  }

  function leaveRoom() {
    Signaling.send({ type: 'leave-room' });
    WebRTC.disconnectAll();
    state.roomCode = null;
    state.peers = {};
    state.selectedPeer = null;
    document.getElementById('roomActions').classList.remove('hidden');
    document.getElementById('roomInfo').classList.add('hidden');
    var emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.classList.remove('hidden');
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
