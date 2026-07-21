(function() {
    var ws = null;
    var handlers = {};
    var reconnectAttempts = 0;
    var maxReconnectDelay = 16000;
    var reconnectTimer = null;
    var intentionalClose = false;

    function getServerUrl() {
        if (window.WS_SERVER) return window.WS_SERVER;
        var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return protocol + '//' + location.host;
    }

    function connect() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        intentionalClose = false;
        var url = getServerUrl();

        try {
            ws = new WebSocket(url);
        } catch (e) {
            emit('error', { message: 'Failed to create WebSocket connection' });
            scheduleReconnect();
            return;
        }

        ws.onopen = function() {
            reconnectAttempts = 0;
            emit('connected', {});
        };

        ws.onclose = function(event) {
            ws = null;
            emit('disconnected', { code: event.code, reason: event.reason });
            if (!intentionalClose) {
                scheduleReconnect();
            }
        };

        ws.onerror = function() {
            emit('error', { message: 'WebSocket error occurred' });
        };

        ws.onmessage = function(event) {
            var msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                return;
            }

            var type = msg.type;
            if (type && handlers[type]) {
                var list = handlers[type];
                for (var i = 0; i < list.length; i++) {
                    try {
                        list[i](msg);
                    } catch (e) {
                        console.error('Signaling handler error:', e);
                    }
                }
            }
        };
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectAttempts++;
        reconnectTimer = setTimeout(function() {
            reconnectTimer = null;
            connect();
        }, delay);
    }

    function disconnect() {
        intentionalClose = true;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (ws) {
            try {
                ws.close(1000, 'Client disconnect');
            } catch (e) {}
            ws = null;
        }
        reconnectAttempts = 0;
    }

    function send(msg) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        try {
            ws.send(JSON.stringify(msg));
            return true;
        } catch (e) {
            return false;
        }
    }

    function on(event, handler) {
        if (!handlers[event]) {
            handlers[event] = [];
        }
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
            if (list[i] === handler) {
                list.splice(i, 1);
            }
        }
        if (list.length === 0) {
            delete handlers[event];
        }
    }

    function emit(event, data) {
        if (!handlers[event]) return;
        var list = handlers[event];
        for (var i = 0; i < list.length; i++) {
            try {
                list[i](data);
            } catch (e) {
                console.error('Signaling emit error:', e);
            }
        }
    }

    window.Signaling = {
        connect: connect,
        disconnect: disconnect,
        send: send,
        on: on,
        off: off
    };
})();