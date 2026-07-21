(function() {
  var CHUNK = 64 * 1024;
  var handlers = {};
  var incoming = {};

  function emit(event, data) {
    if (handlers[event]) handlers[event].forEach(function(h) { h(data); });
  }

  function on(event, handler) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(handler);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  function formatSpeed(bps) {
    if (bps < 1024) return bps.toFixed(0) + ' B/s';
    if (bps < 1048576) return (bps / 1024).toFixed(1) + ' KB/s';
    return (bps / 1048576).toFixed(1) + ' MB/s';
  }

  var BUFFER_HIGH = 1 * 1024 * 1024;

  function sendFiles(peerId, files) {
    var ch = WebRTC.getChannel(peerId);
    if (!ch || ch.readyState !== 'open') return false;

    var headerEncoder = new TextEncoder();

    var state = {
      peerId: peerId,
      files: files,
      idx: 0,
      offset: 0,
      sent: 0,
      start: Date.now(),
      channel: ch,
      headerEncoder: headerEncoder,
      cachedHeaders: {}
    };

    sendMeta(state);
    return true;
  }

  function getChunkHeader(state, fileIndex) {
    if (!state.cachedHeaders[fileIndex]) {
      var json = JSON.stringify({ type: 'file-chunk', fileIndex: fileIndex });
      var encoded = state.headerEncoder.encode(json);
      var lenBuf = new ArrayBuffer(4);
      new DataView(lenBuf).setUint32(0, encoded.length, false);
      state.cachedHeaders[fileIndex] = { encoded: encoded, lenBuf: lenBuf };
    }
    return state.cachedHeaders[fileIndex];
  }

  function sendMeta(state) {
    var file = state.files[state.idx];
    state.channel.send(JSON.stringify({
      type: 'file-meta',
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalFiles: state.files.length,
      fileIndex: state.idx
    }));
    state.offset = 0;
    state.fileSent = 0;
    pumpChunks(state);
  }

  function pumpChunks(state) {
    var file = state.files[state.idx];

    if (state.offset >= file.size) {
      state.channel.send(JSON.stringify({ type: 'file-end', fileIndex: state.idx }));
      state.sent += file.size;
      emit('file-sent', { peerId: state.peerId, fileName: file.name, fileIndex: state.idx });
      state.idx++;
      if (state.idx < state.files.length) {
        sendMeta(state);
      } else {
        emit('transfer-complete', { peerId: state.peerId });
      }
      return;
    }

    if (state.channel.bufferedAmount > BUFFER_HIGH) {
      var onLow = function() {
        state.channel.removeEventListener('bufferedamountlow', onLow);
        pumpChunks(state);
      };
      state.channel.addEventListener('bufferedamountlow', onLow);
      return;
    }

    sendSingleChunk(state);
  }

  function sendSingleChunk(state) {
    var file = state.files[state.idx];
    var end = Math.min(state.offset + CHUNK, file.size);
    var slice = file.slice(state.offset, end);
    var header = getChunkHeader(state, state.idx);

    var reader = new FileReader();
    reader.onload = function() {
      var payload = new Uint8Array(reader.result);
      var total = 4 + header.encoded.length + payload.length;
      var buf = new ArrayBuffer(total);
      var out = new Uint8Array(buf);
      out.set(new Uint8Array(header.lenBuf), 0);
      out.set(header.encoded, 4);
      out.set(payload, 4 + header.encoded.length);

      try {
        state.channel.send(buf);
      } catch (e) {
        emit('error', { message: 'Send failed: ' + e.message });
        return;
      }

      state.offset = end;
      state.fileSent = end;
      var pct = file.size > 0 ? (state.fileSent / file.size * 100) : 0;
      var elapsed = (Date.now() - state.start) / 1000;
      var speed = elapsed > 0 ? (state.sent + state.fileSent) / elapsed : 0;

      emit('progress', {
        peerId: state.peerId,
        fileName: file.name, fileIndex: state.idx, totalFiles: state.files.length,
        percent: Math.min(pct, 100), speed: speed, speedText: formatSpeed(speed)
      });

      pumpChunks(state);
    };
    reader.onerror = function() {
      emit('error', { message: 'File read error at offset ' + state.offset });
    };
    reader.readAsArrayBuffer(slice);
  }

  function handleMessage(peerId, msg) {
    if (msg.type === 'file-meta') {
      var s = getIncoming(peerId);
      s.files[msg.fileIndex] = {
        name: msg.name, size: msg.size, mimeType: msg.mimeType,
        chunks: [], received: 0, finalized: false
      };
      s.totalFiles = msg.totalFiles;
      s.currentFile = msg.fileIndex;
      emit('receive-start', {
        peerId: peerId, fileName: msg.name, fileSize: msg.size,
        fileIndex: msg.fileIndex, totalFiles: msg.totalFiles
      });
    } else if (msg.type === 'file-end') {
      var s = getIncoming(peerId);
      var fi = s.files[msg.fileIndex];
      if (fi && !fi.finalized) {
        fi.finalized = true;
        downloadFile(peerId, fi, msg.fileIndex, s);
      }
    }
  }

  function downloadFile(peerId, fi, fileIndex, session) {
    var blob = new Blob(fi.parts, { type: fi.mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fi.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 30000);

    fi.parts = [];
    fi.chunks = [];

    emit('file-received', { peerId: peerId, fileName: fi.name, fileIndex: fileIndex });

    if (fileIndex + 1 >= session.totalFiles) {
      delete incoming[peerId];
      emit('transfer-complete', { peerId: peerId });
    }
  }

  function handleChunk(peerId, fileIndex, chunk) {
    var s = getIncoming(peerId);
    var fi = s.files[fileIndex];
    if (fi && !fi.finalized) {
      fi.parts.push(chunk);
      fi.received += chunk.byteLength || 0;
      s.totalReceived = (s.totalReceived || 0) + (chunk.byteLength || 0);
      var pct = fi.size > 0 ? (fi.received / fi.size * 100) : 0;
      var elapsed = (Date.now() - s.start) / 1000;
      var speed = elapsed > 0 ? s.totalReceived / elapsed : 0;
      emit('progress', {
        peerId: peerId, fileName: fi.name, fileIndex: fileIndex,
        percent: Math.min(pct, 100), speed: speed, speedText: formatSpeed(speed)
      });
    }
  }

  function getIncoming(peerId) {
    if (!incoming[peerId]) {
      incoming[peerId] = { files: {}, totalFiles: 0, currentFile: 0, start: Date.now(), totalReceived: 0 };
    }
    return incoming[peerId];
  }

  window.Transfer = { sendFiles: sendFiles, handleMessage: handleMessage, handleChunk: handleChunk, formatSize: formatSize, formatSpeed: formatSpeed, on: on };
})();
