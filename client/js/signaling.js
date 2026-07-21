(function() {
  var ws = null;
  var handlers = {};
  var reconnectAttempts = 0;
  var intentionalClose = false;

  function getUrl() {
    if (window.WS_SERVER) return window.WS_SERVER;
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host;
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    intentionalClose = false;
    try {
      ws = new WebSocket(getUrl());
    } catch (e) {
      emit('error', { message: 'Connection failed' });
      scheduleReconnect();
      return;
    }
    ws.onopen = function() {
      reconnectAttempts = 0;
      emit('connected');
    };
    ws.onclose = function() {
      ws = null;
      emit('disconnected');
      if (!intentionalClose) scheduleReconnect();
    };
    ws.onerror = function() {};
    ws.onmessage = function(e) {
      var msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type && handlers[msg.type]) {
        handlers[msg.type].forEach(function(h) { h(msg); });
      }
    };
  }

  function scheduleReconnect() {
    var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 16000);
    reconnectAttempts++;
    setTimeout(connect, delay);
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function on(event, handler) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(handler);
  }

  function off(event, handler) {
    if (!handlers[event]) return;
    handlers[event] = handlers[event].filter(function(h) { return h !== handler; });
  }

  window.Signaling = { connect: connect, send: send, on: on, off: off };
})();
