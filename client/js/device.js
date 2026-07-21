(function() {
  function getDeviceName() {
    var ua = navigator.userAgent || '';
    if (/iPad/.test(ua)) return 'iPad';
    if (/iPhone/.test(ua)) {
      var m = ua.match(/OS (\d+)_/);
      var v = m ? parseInt(m[1], 10) : 0;
      if (v >= 18) return 'iPhone 16';
      if (v >= 17) return 'iPhone 15';
      if (v >= 16) return 'iPhone 14';
      if (v >= 15) return 'iPhone 13';
      return 'iPhone';
    }
    if (/Android/.test(ua)) {
      var modelMatch = ua.match(/;\s*([^;)]+)\s*(?:Build|[)])/) || ua.match(/Android.*?;\s*([A-Za-z0-9\-]+)/);
      if (modelMatch) {
        var model = modelMatch[1].trim();
        var samsung = {
          'SM-G991B': 'Galaxy S21', 'SM-G996B': 'Galaxy S21+', 'SM-G998B': 'Galaxy S21 Ultra',
          'SM-S901B': 'Galaxy S22', 'SM-S906B': 'Galaxy S22+', 'SM-S908B': 'Galaxy S22 Ultra',
          'SM-S911B': 'Galaxy S23', 'SM-S916B': 'Galaxy S23+', 'SM-S918B': 'Galaxy S23 Ultra',
          'SM-S921B': 'Galaxy S24', 'SM-S926B': 'Galaxy S24+', 'SM-S928B': 'Galaxy S24 Ultra',
          'SM-A536B': 'Galaxy A53', 'SM-A546B': 'Galaxy A54', 'SM-A556B': 'Galaxy A55',
          'SM-G781B': 'Galaxy S20 FE', 'SM-N986B': 'Galaxy Note 20 Ultra'
        };
        if (samsung[model]) return 'Samsung ' + samsung[model];
        if (/^SM-/.test(model)) return 'Samsung ' + model;
        if (/Pixel/.test(model)) return 'Google ' + model;
        if (/^Redmi/.test(model)) return 'Xiaomi ' + model;
        if (/^M[0-9]{4}/.test(model)) return 'OnePlus ' + model;
        if (/^CPH/.test(model)) return 'OPPO ' + model;
        if (/^RMX/.test(model)) return 'Realme ' + model;
        if (/^V[0-9]{4}/.test(model)) return 'Vivo ' + model;
        return model;
      }
      return 'Android Device';
    }
    if (/Mac/.test(ua)) {
      if (/MacBook Pro/.test(ua)) return 'MacBook Pro';
      if (/MacBook Air/.test(ua)) return 'MacBook Air';
      return 'Mac';
    }
    if (/Win/.test(ua)) {
      if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
      return 'Windows';
    }
    if (/Linux/.test(ua)) return 'Linux Device';
    return 'Unknown Device';
  }

  function getPlatform() {
    var ua = navigator.userAgent || '';
    if (/iPad|iPhone/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mac/.test(ua)) return 'mac';
    if (/Win/.test(ua)) return 'windows';
    if (/Linux/.test(ua)) return 'linux';
    return 'unknown';
  }

  function getIcon() {
    var ua = navigator.userAgent || '';
    if (/iPad/.test(ua)) return 'tablet';
    if (/iPhone/.test(ua)) return 'phone';
    if (/Android/.test(ua)) { return /tablet/.test(ua) ? 'tablet' : 'phone'; }
    if (/MacBook/.test(ua)) return 'laptop';
    return 'desktop';
  }

  function init() {
    var info = { name: getDeviceName(), platform: getPlatform(), icon: getIcon() };
    window.Device.info = info;
    return info;
  }

  window.Device = { init: init, info: null };
})();
