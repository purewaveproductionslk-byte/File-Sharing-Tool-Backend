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

  function sendFiles(peerId, files) {
    var ch = WebRTC.getChannel(peerId);
    if (!ch || ch.readyState !== 'open') return false;

    var state = { files: files, idx: 0, offset: 0, sent: 0, start: Date.now(), channel: ch };

    sendMeta(state);
    return true;
  }

  function sendMeta(state) {
    var file = state.files[state.idx];
    state.channel.send(JSON.stringify({
      type: 'file-meta', name: file.name, size: file.size, mimeType: file.type || 'application/octet-stream',
      totalFiles: state.files.length, fileIndex: state.idx
    }));
    state.offset = 0;
    state.fileSent = 0;
    sendChunk(state);
  }

  function sendChunk(state) {
    var file = state.files[state.idx];
    if (state.offset >= file.size) {
      state.channel.send(JSON.stringify({ type: 'file-end', fileIndex: state.idx }));
      state.sent += file.size;
      emit('file-sent', { fileName: file.name, fileIndex: state.idx });
      state.idx++;
      if (state.idx < state.files.length) {
        sendMeta(state);
      } else {
        emit('transfer-complete');
      }
      return;
    }

    var end = Math.min(state.offset + CHUNK, file.size);
    var slice = file.slice(state.offset, end);

    var header = new TextEncoder().encode(JSON.stringify({ type: 'file-chunk', fileIndex: state.idx }));
    var lenBuf = new ArrayBuffer(4);
    new DataView(lenBuf).setUint32(0, header.length, false);

    var reader = new FileReader();
    reader.onload = function() {
      var total = 4 + header.length + reader.result.byteLength;
      var buf = new ArrayBuffer(total);
      var u8 = new Uint8Array(buf);
      u8.set(new Uint8Array(lenBuf), 0);
      u8.set(header, 4);
      u8.set(new Uint8Array(reader.result), 4 + header.length);

      try {
        state.channel.send(buf);
      } catch (e) {
        emit('error', { message: 'Send failed' });
        return;
      }

      state.offset = end;
      state.fileSent = end;
      var pct = file.size > 0 ? (state.fileSent / file.size * 100) : 0;
      var elapsed = (Date.now() - state.start) / 1000;
      var speed = elapsed > 0 ? (state.sent + state.fileSent) / elapsed : 0;

      emit('progress', {
        fileName: file.name, fileIndex: state.idx, totalFiles: state.files.length,
        percent: Math.min(pct, 100), speed: speed, speedText: formatSpeed(speed)
      });

      setTimeout(function() { sendChunk(state); }, 0);
    };
    reader.readAsArrayBuffer(slice);
  }

  function handleMessage(peerId, msg) {
    if (msg.type === 'file-meta') {
      var s = getIncoming(peerId);
      s.files[msg.fileIndex] = { name: msg.name, size: msg.size, mimeType: msg.mimeType, parts: [], received: 0 };
      s.totalFiles = msg.totalFiles;
      s.currentFile = msg.fileIndex;
      emit('receive-start', { peerId: peerId, fileName: msg.name, fileSize: msg.size, fileIndex: msg.fileIndex, totalFiles: msg.totalFiles });
    } else if (msg.type === 'file-end') {
      var s = getIncoming(peerId);
      var fi = s.files[msg.fileIndex];
      if (fi) {
        var blob = new Blob(fi.parts, { type: fi.mimeType });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fi.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
        emit('file-received', { peerId: peerId, fileName: fi.name, fileIndex: msg.fileIndex });
        if (msg.fileIndex + 1 >= s.totalFiles) {
          delete incoming[peerId];
          emit('transfer-complete');
        }
      }
    }
  }

  function handleChunk(peerId, fileIndex, chunk) {
    var s = getIncoming(peerId);
    var fi = s.files[fileIndex];
    if (fi) {
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
