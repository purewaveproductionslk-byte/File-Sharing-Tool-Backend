(function() {
  var pcs = {};
  var channels = {};
  var handlers = {};
  var config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    sdpSemantics: 'unified-plan'
  };

  function emit(event, data) {
    if (handlers[event]) handlers[event].forEach(function(h) { h(data); });
  }

  function on(event, handler) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(handler);
  }

  function sendSignal(targetId, signal) {
    Signaling.send({ type: 'signal', targetId: targetId, signal: signal });
  }

  function createPeer(peerId, initiator) {
    closePeer(peerId);
    var pc = new RTCPeerConnection(config);
    pcs[peerId] = pc;

    pc.onicecandidate = function(e) {
      if (e.candidate) sendSignal(peerId, { type: 'ice-candidate', candidate: e.candidate });
    };

    pc.onconnectionstatechange = function() {
      if (pc.connectionState === 'connected') emit('connected', { peerId: peerId });
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        emit('disconnected', { peerId: peerId });
        delete pcs[peerId];
        delete channels[peerId];
      }
    };

    pc.ondatachannel = function(e) { setupChannel(peerId, e.channel); };

    if (initiator) {
      var ch = pc.createDataChannel('files', {
        ordered: true,
        maxRetransmits: 0
      });
      setupChannel(peerId, ch);
    }

    return pc;
  }

  function setupChannel(peerId, ch) {
    ch.binaryType = 'arraybuffer';
    ch.bufferedAmountLowThreshold = 64 * 1024;

    ch.onopen = function() {
      channels[peerId] = ch;
      emit('channel-open', { peerId: peerId });
    };

    ch.onclose = function() {
      delete channels[peerId];
      emit('channel-close', { peerId: peerId });
    };

    var headerDecoder = new TextDecoder();

    ch.onmessage = function(e) {
      var data = e.data;
      if (data instanceof ArrayBuffer) {
        processBinaryChunk(peerId, data, headerDecoder);
        return;
      }
      var msg;
      try { msg = JSON.parse(data); } catch (err) { return; }
      if (msg.type === 'file-meta' || msg.type === 'file-end') {
        Transfer.handleMessage(peerId, msg);
      }
    };
  }

  function processBinaryChunk(peerId, buffer, decoder) {
    if (buffer.byteLength < 4) return;
    var view = new DataView(buffer);
    var headerLen = view.getUint32(0, false);
    if (4 + headerLen > buffer.byteLength) return;
    var headerStr = decoder.decode(new Uint8Array(buffer, 4, headerLen));
    try {
      var json = JSON.parse(headerStr);
      if (json.type === 'file-chunk') {
        var payload = buffer.slice(4 + headerLen);
        Transfer.handleChunk(peerId, json.fileIndex, payload);
      }
    } catch (err) {}
  }

  function connectTo(peerId) {
    var pc = createPeer(peerId, true);
    pc.createOffer().then(function(offer) {
      return pc.setLocalDescription(offer);
    }).then(function() {
      sendSignal(peerId, { type: 'offer', sdp: pc.localDescription });
    }).catch(function() {});
  }

  function handleSignal(msg) {
    var peerId = msg.peerId || msg.fromId;
    var signal = msg.signal;
    if (!signal) return;

    if (signal.type === 'offer') {
      var pc = createPeer(peerId, false);
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
        if (pc.iceQueue) {
          pc.iceQueue.forEach(function(cand) {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(function() {});
          });
          pc.iceQueue = [];
        }
        return pc.createAnswer();
      }).then(function(ans) {
        return pc.setLocalDescription(ans);
      }).then(function() {
        sendSignal(peerId, { type: 'answer', sdp: pc.localDescription });
      }).catch(function() {});
    } else if (signal.type === 'answer') {
      var pc = pcs[peerId];
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
          if (pc.iceQueue) {
            pc.iceQueue.forEach(function(cand) {
              pc.addIceCandidate(new RTCIceCandidate(cand)).catch(function() {});
            });
            pc.iceQueue = [];
          }
        }).catch(function() {});
      }
    } else if (signal.type === 'ice-candidate') {
      var pc = pcs[peerId];
      if (pc && signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(function() {});
        } else {
          if (!pc.iceQueue) pc.iceQueue = [];
          pc.iceQueue.push(signal.candidate);
        }
      }
    }
  }

  function closePeer(peerId) {
    if (channels[peerId]) { try { channels[peerId].close(); } catch (err) {} delete channels[peerId]; }
    if (pcs[peerId]) { try { pcs[peerId].close(); } catch (err) {} delete pcs[peerId]; }
  }

  function disconnectAll() {
    Object.keys(pcs).forEach(closePeer);
  }

  function getChannel(peerId) { return channels[peerId] || null; }

  Signaling.on('signal', handleSignal);

  window.WebRTC = { connectTo: connectTo, closePeer: closePeer, disconnectAll: disconnectAll, getChannel: getChannel, on: on };
})();
