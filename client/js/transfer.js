(function() {
    var CHUNK_SIZE = 64 * 1024;
    var transfers = {};
    var handlers = {};

    function emit(event, data) {
        if (!handlers[event]) return;
        var list = handlers[event];
        for (var i = 0; i < list.length; i++) {
            try {
                list[i](data);
            } catch (e) {
                console.error('Transfer handler error:', e);
            }
        }
    }

    function on(event, handler) {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
    }

    function off(event, handler) {
        if (!handlers[event]) return;
        if (!handler) {
            delete handlers[event];
            return;
        }
        var list = handlers[event];
        for (var i = list.length - 1; i >= 0; i--) {
            if (list[i] === handler) list.splice(i, 1);
        }
        if (list.length === 0) delete handlers[event];
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    function formatSpeed(bytesPerSecond) {
        if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s';
        if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
        return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
    }

    function sendFiles(peerId, files) {
        var channel = window.WebRTC ? window.WebRTC.getDataChannel(peerId) : null;
        if (!channel || channel.readyState !== 'open') {
            emit('error', { peerId: peerId, message: 'Data channel not open' });
            return false;
        }

        var fileArray = Array.isArray(files) ? files : [files];

        var state = {
            files: fileArray,
            currentFile: 0,
            chunkOffset: 0,
            progress: 0,
            speed: 0,
            startTime: Date.now(),
            totalSent: 0,
            fileSent: 0,
            channel: channel
        };

        transfers[peerId] = state;

        sendFileMeta(peerId, state);
        return true;
    }

    function sendFileMeta(peerId, state) {
        var file = state.files[state.currentFile];
        var meta = {
            type: 'file-meta',
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            totalFiles: state.files.length,
            fileIndex: state.currentFile
        };

        state.channel.send(JSON.stringify(meta));

        state.fileSent = 0;
        state.chunkOffset = 0;

        emit('send-start', {
            peerId: peerId,
            fileName: file.name,
            fileSize: file.size,
            totalFiles: state.files.length,
            fileIndex: state.currentFile
        });

        readAndSendChunk(peerId);
    }

    function readAndSendChunk(peerId) {
        var state = transfers[peerId];
        if (!state) return;

        var file = state.files[state.currentFile];

        if (state.chunkOffset >= file.size) {
            state.channel.send(JSON.stringify({ type: 'file-end', fileIndex: state.currentFile }));

            state.totalSent += file.size;

            emit('file-sent', {
                peerId: peerId,
                fileName: file.name,
                fileIndex: state.currentFile,
                totalFiles: state.files.length
            });

            state.currentFile++;
            state.fileSent = 0;

            if (state.currentFile < state.files.length) {
                sendFileMeta(peerId, state);
            } else {
                delete transfers[peerId];
                emit('transfer-complete', { peerId: peerId });
            }
            return;
        }

        var end = Math.min(state.chunkOffset + CHUNK_SIZE, file.size);
        var slice = file.slice(state.chunkOffset, end);

        var header = JSON.stringify({
            type: 'file-chunk',
            fileIndex: state.currentFile
        });
        var headerBytes = new TextEncoder().encode(header);
        var headerLenBuffer = new ArrayBuffer(4);
        var headerLenView = new DataView(headerLenBuffer);
        headerLenView.setUint32(0, headerBytes.length, false);

        var totalLen = 4 + headerBytes.length + (end - state.chunkOffset);
        var buffer = new ArrayBuffer(totalLen);
        var uint8 = new Uint8Array(buffer);
        uint8.set(new Uint8Array(headerLenBuffer), 0);
        uint8.set(headerBytes, 4);

        var reader = new FileReader();
        reader.onload = function() {
            uint8.set(new Uint8Array(reader.result), 4 + headerBytes.length);

            try {
                state.channel.send(buffer);
            } catch (e) {
                emit('error', { peerId: peerId, message: 'Failed to send chunk' });
                return;
            }

            state.chunkOffset = end;
            state.fileSent = Math.min(end, file.size);

            var totalForFile = file.size;
            var percent = totalForFile > 0 ? (state.fileSent / totalForFile * 100) : 0;

            var elapsed = (Date.now() - state.startTime) / 1000;
            var totalBytes = state.totalSent + state.fileSent;
            state.speed = elapsed > 0 ? totalBytes / elapsed : 0;

            emit('progress', {
                peerId: peerId,
                fileName: file.name,
                fileIndex: state.currentFile,
                totalFiles: state.files.length,
                percent: Math.min(percent, 100),
                sent: state.fileSent,
                total: totalForFile,
                speed: state.speed,
                speedFormatted: formatSpeed(state.speed)
            });

            setTimeout(function() {
                readAndSendChunk(peerId);
            }, 0);
        };

        reader.readAsArrayBuffer(slice);
    }

    function handleIncomingData(peerId, data) {
        if (data.type === 'file-meta') {
            var incoming = getIncomingState(peerId);

            if (data.fileIndex === 0 || incoming.files.length <= data.fileIndex) {
                incoming.files[data.fileIndex] = {
                    name: data.name,
                    size: data.size,
                    mimeType: data.mimeType,
                    parts: [],
                    received: 0
                };
            }

            incoming.totalFiles = data.totalFiles;
            incoming.currentFile = data.fileIndex;

            emit('receive-start', {
                peerId: peerId,
                fileName: data.name,
                fileSize: data.size,
                totalFiles: data.totalFiles,
                fileIndex: data.fileIndex
            });

        } else if (data.type === 'file-chunk') {
            var incoming = getIncomingState(peerId);
            var fileIdx = data.fileIndex !== undefined ? data.fileIndex : incoming.currentFile;
            var fileInfo = incoming.files[fileIdx];

            if (fileInfo) {
                fileInfo.parts.push(data.chunk);
                fileInfo.received += data.chunk.byteLength || data.chunk.length || 0;

                var elapsed = (Date.now() - incoming.startTime) / 1000;
                var speed = elapsed > 0 ? incoming.totalReceived / elapsed : 0;
                incoming.totalReceived += data.chunk.byteLength || data.chunk.length || 0;

                var percent = fileInfo.size > 0 ? (fileInfo.received / fileInfo.size * 100) : 0;

                emit('progress', {
                    peerId: peerId,
                    fileName: fileInfo.name,
                    fileIndex: fileIdx,
                    totalFiles: incoming.totalFiles,
                    percent: Math.min(percent, 100),
                    received: fileInfo.received,
                    total: fileInfo.size,
                    speed: speed,
                    speedFormatted: formatSpeed(speed)
                });
            }

        } else if (data.type === 'file-end') {
            var incoming = getIncomingState(peerId);
            var fileIdx = data.fileIndex !== undefined ? data.fileIndex : incoming.currentFile;
            var fileInfo = incoming.files[fileIdx];

            if (fileInfo) {
                var blob = new Blob(fileInfo.parts, { type: fileInfo.mimeType });

                emit('file-received', {
                    peerId: peerId,
                    fileName: fileInfo.name,
                    fileSize: blob.size,
                    fileIndex: fileIdx,
                    totalFiles: incoming.totalFiles,
                    blob: blob
                });

                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = fileInfo.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setTimeout(function() {
                    URL.revokeObjectURL(url);
                }, 5000);

                if (fileIdx + 1 >= incoming.totalFiles) {
                    delete incoming.files;
                    delete incomingState[peerId];
                    emit('transfer-complete', { peerId: peerId });
                }
            }

        } else if (data.type === 'text') {
            emit('text-received', {
                peerId: peerId,
                text: data.text
            });
        }
    }

    var incomingState = {};

    function getIncomingState(peerId) {
        if (!incomingState[peerId]) {
            incomingState[peerId] = {
                files: {},
                totalFiles: 0,
                currentFile: 0,
                startTime: Date.now(),
                totalReceived: 0
            };
        }
        return incomingState[peerId];
    }

    function cancelTransfer(peerId) {
        delete transfers[peerId];
        delete incomingState[peerId];
    }

    window.Transfer = {
        sendFiles: sendFiles,
        handleIncomingData: handleIncomingData,
        formatSize: formatSize,
        formatSpeed: formatSpeed,
        cancelTransfer: cancelTransfer,
        on: on,
        off: off
    };
})();