(function() {
    var peerConnections = {};
    var dataChannels = {};
    var handlers = {};

    var config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    function emit(event, data) {
        if (!handlers[event]) return;
        var list = handlers[event];
        for (var i = 0; i < list.length; i++) {
            try {
                list[i](data);
            } catch (e) {
                console.error('WebRTC handler error:', e);
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

    function sendSignal(targetId, signal) {
        if (window.Signaling) {
            window.Signaling.send({
                type: 'signal',
                targetId: targetId,
                signal: signal
            });
        }
    }

    function createPeerConnection(peerId, isInitiator) {
        if (peerConnections[peerId]) {
            closePeerConnection(peerId);
        }

        var pc = new RTCPeerConnection(config);
        peerConnections[peerId] = pc;

        pc.onicecandidate = function(event) {
            if (event.candidate) {
                sendSignal(peerId, {
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        pc.onconnectionstatechange = function() {
            var state = pc.connectionState;
            if (state === 'connected') {
                emit('peer-connected', { peerId: peerId });
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                emit('peer-disconnected', { peerId: peerId });
                delete peerConnections[peerId];
                delete dataChannels[peerId];
            }
        };

        pc.ondatachannel = function(event) {
            setupDataChannel(peerId, event.channel, false);
        };

        if (isInitiator) {
            var channel = pc.createDataChannel('files', {
                ordered: true
            });
            setupDataChannel(peerId, channel, true);
        }

        return pc;
    }

    function setupDataChannel(peerId, channel, isInitiator) {
        channel.binaryType = 'arraybuffer';

        channel.onopen = function() {
            dataChannels[peerId] = channel;
            emit('data-channel-open', { peerId: peerId, channel: channel });
        };

        channel.onclose = function() {
            if (dataChannels[peerId] === channel) {
                delete dataChannels[peerId];
            }
            emit('data-channel-close', { peerId: peerId });
        };

        channel.onerror = function(event) {
            console.error('Data channel error for ' + peerId + ':', event);
        };

        channel.onmessage = function(event) {
            var data = event.data;

            if (data instanceof ArrayBuffer) {
                var parts = new Uint8Array(data);
                var headerLen = new DataView(data.slice(0, 4)).getUint32(0, false);
                var headerStr = new TextDecoder().decode(new Uint8Array(data.slice(4, 4 + headerLen)));
                var json;
                try {
                    json = JSON.parse(headerStr);
                } catch (e) {
                    return;
                }
                if (json.type === 'file-chunk' && window.Transfer) {
                    window.Transfer.handleIncomingData(peerId, {
                        type: 'file-chunk',
                        fileIndex: json.fileIndex,
                        chunk: data.slice(4 + headerLen)
                    });
                }
                return;
            }

            var msg;
            try {
                msg = JSON.parse(data);
            } catch (e) {
                return;
            }

            if (msg.type === 'file-meta' || msg.type === 'file-end') {
                if (window.Transfer) {
                    window.Transfer.handleIncomingData(peerId, msg);
                }
            } else if (msg.type === 'text') {
                if (window.Transfer) {
                    window.Transfer.handleIncomingData(peerId, msg);
                }
            }
        };

        if (isInitiator) {
            dataChannels[peerId] = channel;
        }
    }

    function connectToPeer(peerId) {
        var pc = createPeerConnection(peerId, true);

        pc.createOffer().then(function(offer) {
            return pc.setLocalDescription(offer);
        }).then(function() {
            sendSignal(peerId, {
                type: 'offer',
                sdp: pc.localDescription
            });
        }).catch(function(err) {
            console.error('Error creating offer:', err);
        });
    }

    function handleSignal(msg) {
        var peerId = msg.peerId || msg.fromId;
        var signal = msg.signal;

        if (!signal) return;

        if (signal.type === 'offer') {
            var pc = createPeerConnection(peerId, false);

            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
                return pc.createAnswer();
            }).then(function(answer) {
                return pc.setLocalDescription(answer);
            }).then(function() {
                sendSignal(peerId, {
                    type: 'answer',
                    sdp: pc.localDescription
                });
            }).catch(function(err) {
                console.error('Error handling offer:', err);
            });

        } else if (signal.type === 'answer') {
            var pc = peerConnections[peerId];
            if (pc) {
                pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).catch(function(err) {
                    console.error('Error setting remote description:', err);
                });
            }

        } else if (signal.type === 'ice-candidate') {
            var pc = peerConnections[peerId];
            if (pc && signal.candidate) {
                pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(function(err) {
                    console.error('Error adding ICE candidate:', err);
                });
            }
        }
    }

    function closePeerConnection(peerId) {
        if (dataChannels[peerId]) {
            try {
                dataChannels[peerId].close();
            } catch (e) {}
            delete dataChannels[peerId];
        }

        if (peerConnections[peerId]) {
            try {
                peerConnections[peerId].close();
            } catch (e) {}
            delete peerConnections[peerId];
        }
    }

    function disconnectPeer(peerId) {
        closePeerConnection(peerId);
    }

    function disconnectAll() {
        var peers = Object.keys(peerConnections);
        for (var i = 0; i < peers.length; i++) {
            closePeerConnection(peers[i]);
        }
    }

    function getDataChannel(peerId) {
        return dataChannels[peerId] || null;
    }

    if (window.Signaling) {
        window.Signaling.on('signal', handleSignal);
    }

    window.WebRTC = {
        createPeerConnection: createPeerConnection,
        sendSignal: sendSignal,
        connectToPeer: connectToPeer,
        disconnectPeer: disconnectPeer,
        disconnectAll: disconnectAll,
        getDataChannel: getDataChannel,
        on: on,
        off: off
    };
})();