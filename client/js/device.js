(function() {
    var deviceInfo = null;

    function getDeviceName() {
        var ua = navigator.userAgent || '';

        if (/iPad/.test(ua)) {
            return 'iPad';
        }

        if (/iPhone/.test(ua)) {
            var iosMatch = ua.match(/OS (\d+)_/);
            var version = iosMatch ? parseInt(iosMatch[1], 10) : 0;
            if (version >= 18) return 'iPhone 16';
            if (version >= 17) return 'iPhone 15';
            if (version >= 16) return 'iPhone 14';
            if (version >= 15) return 'iPhone 13';
            return 'iPhone';
        }

        if (/Android/.test(ua)) {
            var modelMatch = ua.match(/;\s*([^;)]+)\s*(?:Build|[)])/) || ua.match(/Android.*?;\s*([A-Za-z0-9\-]+)/);
            if (modelMatch) {
                var model = modelMatch[1].trim();
                var samsungMap = {
                    'SM-G991B': 'Samsung Galaxy S21',
                    'SM-G991U': 'Samsung Galaxy S21',
                    'SM-G996B': 'Samsung Galaxy S21+',
                    'SM-G996U': 'Samsung Galaxy S21+',
                    'SM-G998B': 'Samsung Galaxy S21 Ultra',
                    'SM-G998U': 'Samsung Galaxy S21 Ultra',
                    'SM-S908B': 'Samsung Galaxy S22 Ultra',
                    'SM-S906B': 'Samsung Galaxy S22+',
                    'SM-S901B': 'Samsung Galaxy S22',
                    'SM-S911B': 'Samsung Galaxy S23',
                    'SM-S916B': 'Samsung Galaxy S23+',
                    'SM-S918B': 'Samsung Galaxy S23 Ultra',
                    'SM-S921B': 'Samsung Galaxy S24',
                    'SM-S926B': 'Samsung Galaxy S24+',
                    'SM-S928B': 'Samsung Galaxy S24 Ultra',
                    'SM-A536B': 'Samsung Galaxy A53',
                    'SM-A546B': 'Samsung Galaxy A54',
                    'SM-A556B': 'Samsung Galaxy A55',
                    'SM-A146B': 'Samsung Galaxy A14',
                    'SM-A246B': 'Samsung Galaxy A24',
                    'SM-A346B': 'Samsung Galaxy A34',
                    'SM-A356B': 'Samsung Galaxy A35',
                    'SM-A156B': 'Samsung Galaxy A15',
                    'SM-A256E': 'Samsung Galaxy A25',
                    'SM-G781B': 'Samsung Galaxy S20 FE',
                    'SM-G780F': 'Samsung Galaxy S20 FE',
                    'SM-N986B': 'Samsung Galaxy Note 20 Ultra',
                    'SM-N981B': 'Samsung Galaxy Note 20',
                    'SM-F946B': 'Samsung Galaxy Z Fold 5',
                    'SM-F936B': 'Samsung Galaxy Z Fold 4',
                    'SM-F731B': 'Samsung Galaxy Z Flip 5',
                    'SM-F726B': 'Samsung Galaxy Z Flip 4'
                };
                if (samsungMap[model]) return samsungMap[model];
                if (/^SM-/.test(model)) return 'Samsung ' + model;
                if (/Pixel/.test(model)) return 'Google ' + model;
                if (/^Redmi/.test(model)) return 'Xiaomi ' + model;
                if (/^Mi\s/.test(model)) return 'Xiaomi ' + model;
                if (/^M[0-9]{4}/.test(model)) return 'OnePlus ' + model;
                if (/^CPH/.test(model)) return 'OPPO ' + model;
                if (/^RMX/.test(model)) return 'Realme ' + model;
                if (/^V[0-9]{4}/.test(model)) return 'Vivo ' + model;
                if (/^NOH/.test(model)) return 'Honor ' + model;
                if (/^Mate/.test(model)) return 'Huawei ' + model;
                if (/^P[0-9]{2}/.test(model)) return 'Huawei ' + model;
                return model;
            }
            return 'Android Device';
        }

        if (/Macintosh/.test(ua) || /Mac OS X/.test(ua)) {
            if (/MacBook Pro/.test(ua)) return 'MacBook Pro';
            if (/MacBook Air/.test(ua)) return 'MacBook Air';
            if (/\(iMac/.test(ua)) return 'iMac';
            if (/Mac/.test(ua)) return 'Mac';
            return 'Mac Device';
        }

        if (/Win/.test(ua)) {
            if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
            if (/Windows NT 6.3/.test(ua)) return 'Windows 8.1';
            if (/Windows NT 6.2/.test(ua)) return 'Windows 8';
            if (/Windows NT 6.1/.test(ua)) return 'Windows 7';
            return 'Windows Device';
        }

        if (/Linux/.test(ua)) return 'Linux Device';

        return 'Unknown Device';
    }

    function getPlatform() {
        var ua = navigator.userAgent || '';

        if (/iPad/.test(ua) || /iPhone/.test(ua)) return 'ios';
        if (/Android/.test(ua)) return 'android';
        if (/Macintosh/.test(ua) || /Mac OS X/.test(ua)) return 'mac';
        if (/Win/.test(ua)) return 'windows';
        if (/Linux/.test(ua)) return 'linux';

        return 'unknown';
    }

    function getIcon() {
        var platform = getPlatform();
        var ua = navigator.userAgent || '';

        if (/iPad/.test(ua)) return 'tablet';
        if (platform === 'ios' && /iPhone/.test(ua)) return 'phone';
        if (platform === 'android') {
            if (/tablet|iPad/.test(ua)) return 'tablet';
            return 'phone';
        }
        if (/MacBook/.test(ua)) return 'laptop';
        if (platform === 'mac') return 'desktop';
        if (platform === 'windows' || platform === 'linux') return 'desktop';
        return 'desktop';
    }

    function init() {
        deviceInfo = {
            name: getDeviceName(),
            platform: getPlatform(),
            icon: getIcon(),
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };

        var event = new CustomEvent('device-ready', { detail: deviceInfo });
        window.dispatchEvent(event);

        return deviceInfo;
    }

    function getInfo() {
        return deviceInfo || init();
    }

    window.Device = {
        getDeviceName: getDeviceName,
        getPlatform: getPlatform,
        getIcon: getIcon,
        init: init,
        getInfo: getInfo
    };
})();