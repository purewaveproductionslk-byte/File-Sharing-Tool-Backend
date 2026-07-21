(function () {
  var state = {
    socket: null,
    roomCode: null,
    device: null,
    peers: {},
    selectedPeerId: null,
    pendingFiles: [],
    incomingTransfers: {}
  };

  document.addEventListener('DOMContentLoaded', function () {
    state.device = window.Device ? Device.init() : { id: generateId(), name: getDeviceName(), type: getDeviceType(), platform: navigator.platform };
    var nameEl = document.getElementById('device-name');
    if (nameEl) {
      nameEl.textContent = state.device.name;
      nameEl.contentEditable = true;
      nameEl.spellcheck = false;
      nameEl.addEventListener('blur', function () {
        var newName = nameEl.textContent.trim();
        if (newName && newName !== state.device.name) {
          state.device.name = newName;
          if (state.socket && state.socket.connected) {
            state.socket.emit('rename-device', { name: newName });
          }
        } else {
          nameEl.textContent = state.device.name;
        }
      });
      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
      });
    }
    connectSignaling();
    setupEventListeners();
    setupDragDrop();
    registerServiceWorker();
  });

  function generateId() {
    return 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function getDeviceName() {
    var ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android Device';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
    return 'My Computer';
  }

  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/android|iPhone|iPod/i.test(ua)) return 'phone';
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  function connectSignaling() {
    var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var url = window.location.hostname + ':3001';
    if (window.io) {
      state.socket = io(url, { transports: ['websocket', 'polling'] });
    } else {
      state.socket = new WebSocket(protocol + '//' + url);
      state.socket.emit = function (event, data) {
        state.socket.send(JSON.stringify({ event: event, data: data }));
      };
      state.socket.on = function (event, callback) {
        state.socket.addEventListener('message', function (msg) {
          var parsed = JSON.parse(msg.data);
          if (parsed.event === event) callback(parsed.data);
        });
      };
    }
    state.socket.on('connect', function () {
      if (window.UI) UI.showToast('Connected to server', 'success');
      state.socket.emit('register', state.device);
    });
    state.socket.on('disconnect', function () {
      if (window.UI) UI.showToast('Disconnected from server', 'error');
    });
    state.socket.on('room-created', function (data) {
      state.roomCode = data.code;
      var codeEl = document.getElementById('room-code');
      if (codeEl) codeEl.textContent = data.code;
      if (window.UI) {
        UI.showModal('room-modal');
        UI.showToast('Room created: ' + data.code, 'success');
      }
    });
    state.socket.on('room-joined', function (data) {
      state.roomCode = data.code;
      var codeEl = document.getElementById('room-code');
      if (codeEl) codeEl.textContent = data.code;
      if (data.peers) {
        data.peers.forEach(function (p) { state.peers[p.id] = p; });
      }
      if (window.UI) {
        UI.updatePeerGrid(Object.values(state.peers));
        UI.showToast('Joined room: ' + data.code, 'success');
      }
      updateRoomUI(true);
    });
    state.socket.on('room-peers', function (data) {
      if (data && data.peers) {
        state.peers = {};
        data.peers.forEach(function (p) { state.peers[p.id] = p; });
        if (window.UI) UI.updatePeerGrid(Object.values(state.peers));
      }
    });
    state.socket.on('peer-joined', function (data) {
      state.peers[data.id] = data;
      if (window.UI) {
        UI.updatePeerGrid(Object.values(state.peers));
        UI.playSound('connect');
        UI.showToast(data.name + ' joined', 'success');
      }
      if (window.WebRTC) WebRTC.connect(data.id, true);
    });
    state.socket.on('peer-left', function (data) {
      var peer = state.peers[data.id];
      delete state.peers[data.id];
      if (window.WebRTC) WebRTC.disconnect(data.id);
      if (window.UI) {
        UI.updatePeerGrid(Object.values(state.peers));
        UI.playSound('disconnect');
        if (peer) UI.showToast(peer.name + ' left', 'warning');
      }
    });
    state.socket.on('peer-renamed', function (data) {
      if (state.peers[data.id]) {
        state.peers[data.id].name = data.name;
        if (window.UI) UI.updatePeerGrid(Object.values(state.peers));
      }
    });
    state.socket.on('signal', function (data) {
      if (window.WebRTC) WebRTC.handleSignal(data);
    });
    state.socket.on('transfer-request', function (data) {
      handleIncomingTransfer(data);
    });
    state.socket.on('transfer-accepted', function (data) {
      if (window.Transfer && state.pendingFiles.length > 0) {
        Transfer.sendFiles(data.peerId, state.pendingFiles);
        state.pendingFiles = [];
      }
    });
    state.socket.on('transfer-rejected', function () {
      state.pendingFiles = [];
      if (window.UI) UI.showToast('Transfer declined', 'warning');
    });
    if (window.WebRTC) {
      WebRTC.on('signal', function (data) {
        if (state.socket) state.socket.emit('signal', data);
      });
    }
  }

  function setupEventListeners() {
    var createBtn = document.getElementById('create-room-btn');
    var joinBtn = document.getElementById('join-room-btn');
    var joinCodeInput = document.getElementById('join-code-input');
    var joinSubmitBtn = document.getElementById('join-submit-btn');
    var leaveBtn = document.getElementById('leave-room-btn');
    var shareBtn = document.getElementById('share-room-btn');
    var fileInput = document.getElementById('file-input');
    var sendBtn = document.getElementById('send-files-btn');
    var themeBtn = document.getElementById('theme-toggle');
    if (createBtn) createBtn.addEventListener('click', createRoom);
    if (joinBtn) joinBtn.addEventListener('click', function () {
      if (window.UI) UI.showModal('join-modal');
    });
    if (joinSubmitBtn && joinCodeInput) {
      joinSubmitBtn.addEventListener('click', function () {
        var code = joinCodeInput.value.trim();
        if (code) joinRoom(code);
      });
      joinCodeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var code = joinCodeInput.value.trim();
          if (code) joinRoom(code);
        }
      });
    }
    if (leaveBtn) leaveBtn.addEventListener('click', leaveRoom);
    if (shareBtn) shareBtn.addEventListener('click', function () {
      if (state.roomCode && window.UI) UI.showQRCode(state.roomCode);
    });
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files.length > 0) handleFileSelection(Array.from(fileInput.files));
      });
    }
    if (sendBtn) sendBtn.addEventListener('click', function () {
      var fileInput = document.getElementById('file-input');
      if (fileInput && fileInput.files.length > 0) {
        handleFileSelection(Array.from(fileInput.files));
      }
    });
    if (themeBtn) themeBtn.addEventListener('click', function () { if (window.UI) UI.toggleTheme(); });
    var codeCopyBtn = document.getElementById('copy-room-code');
    if (codeCopyBtn) {
      codeCopyBtn.addEventListener('click', function () {
        if (state.roomCode) {
          navigator.clipboard.writeText(state.roomCode).then(function () {
            if (window.UI) UI.showToast('Room code copied', 'success');
          });
        }
      });
    }
  }

  function setupDragDrop() {
    var dragOverlay = document.getElementById('drag-overlay');
    var dragCounter = 0;
    document.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dragCounter++;
      if (dragOverlay) dragOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (dragOverlay) dragOverlay.classList.remove('active');
      }
    });
    document.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      dragCounter = 0;
      if (dragOverlay) dragOverlay.classList.remove('active');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelection(Array.from(e.dataTransfer.files));
      }
    });
  }

  function createRoom() {
    if (state.socket) state.socket.emit('create-room', state.device);
  }

  function joinRoom(code) {
    if (state.socket) state.socket.emit('join-room', { code: code, device: state.device });
    if (window.UI) UI.hideModal('join-modal');
  }

  function leaveRoom() {
    if (state.socket) state.socket.emit('leave-room');
    if (window.WebRTC) WebRTC.disconnectAll();
    state.roomCode = null;
    state.peers = {};
    state.selectedPeerId = null;
    if (window.UI) {
      UI.updatePeerGrid([]);
      UI.showToast('Left room', 'info');
    }
    updateRoomUI(false);
  }

  function updateRoomUI(inRoom) {
    var lobby = document.getElementById('lobby-section');
    var room = document.getElementById('room-section');
    if (lobby) lobby.style.display = inRoom ? 'none' : 'flex';
    if (room) room.style.display = inRoom ? 'flex' : 'none';
  }

  function handleFileSelection(files) {
    if (!state.roomCode) {
      if (window.UI) UI.showToast('Join or create a room first', 'warning');
      return;
    }
    var peerKeys = Object.keys(state.peers);
    if (peerKeys.length === 0) {
      if (window.UI) UI.showToast('No peers connected', 'warning');
      return;
    }
    if (peerKeys.length === 1 && state.selectedPeerId) {
      var targetId = state.selectedPeerId;
      var peer = state.peers[targetId];
      var totalSize = files.reduce(function (sum, f) { return sum + f.size; }, 0);
      if (window.UI) {
        UI.showTransferRequest(
          state.device.name,
          files.map(function (f) { return { name: f.name, size: f.size }; }),
          totalSize,
          function () {
            state.socket.emit('transfer-request', {
              targetId: targetId,
              files: files.map(function (f) { return { name: f.name, size: f.size, type: f.type }; }),
              totalSize: totalSize
            });
            state.pendingFiles = files;
            if (window.UI) UI.showToast('Transfer request sent', 'info');
          },
          function () {}
        );
      }
      return;
    }
    if (!state.selectedPeerId) {
      if (window.UI) UI.showToast('Select a peer to send files to', 'info');
    }
  }

  function handleIncomingTransfer(data) {
    var fromPeer = state.peers[data.fromId];
    var fromName = fromPeer ? fromPeer.name : 'Unknown';
    var totalSize = data.files.reduce(function (sum, f) { return sum + f.size; }, 0);
    if (window.UI) {
      UI.playSound('transfer');
      UI.showTransferRequest(
        fromName,
        data.files,
        totalSize,
        function () {
          state.socket.emit('transfer-accepted', { fromId: data.fromId });
          if (window.Transfer) Transfer.prepareReceive(data.fromId, data.files);
          if (window.UI) UI.showToast('Transfer accepted', 'success');
        },
        function () {
          state.socket.emit('transfer-rejected', { fromId: data.fromId });
        }
      );
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  }

  window.App = {
    selectPeer: function (peerId) {
      state.selectedPeerId = peerId;
    },
    getState: function () {
      return state;
    },
    sendFiles: function (files) {
      handleFileSelection(files);
    }
  };
})();