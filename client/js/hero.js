(function () {
  var container, svg, animationId, time = 0;
  var BRAND = { emerald: '#06d6a0', purple: '#7b61ff', pink: '#ff6b9d' };
  var PACKET_COUNT = 6;

  function init() {
    container = document.getElementById('hero');
    if (!container) return;
    createSVG();
    animate();
  }

  function createSVG() {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 600 300');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'width:100%;height:100%;max-width:600px;max-height:300px;overflow:visible;';
    container.appendChild(svg);

    var defs = createEl('defs');

    var grad1 = createEl('linearGradient');
    grad1.setAttribute('id', 'packet-grad');
    grad1.setAttribute('x1', '0%');
    grad1.setAttribute('y1', '0%');
    grad1.setAttribute('x2', '100%');
    grad1.setAttribute('y2', '0%');
    grad1.appendChild(createStop('0%', BRAND.emerald));
    grad1.appendChild(createStop('50%', BRAND.purple));
    grad1.appendChild(createStop('100%', BRAND.pink));
    defs.appendChild(grad1);

    var grad2 = createEl('linearGradient');
    grad2.setAttribute('id', 'device-grad');
    grad2.setAttribute('x1', '0%');
    grad2.setAttribute('y1', '0%');
    grad2.setAttribute('x2', '100%');
    grad2.setAttribute('y2', '100%');
    grad2.appendChild(createStop('0%', BRAND.emerald, '0.7'));
    grad2.appendChild(createStop('100%', BRAND.purple, '0.7'));
    defs.appendChild(grad2);

    var grad3 = createEl('linearGradient');
    grad3.setAttribute('id', 'device-grad-2');
    grad3.setAttribute('x1', '0%');
    grad3.setAttribute('y1', '0%');
    grad3.setAttribute('x2', '100%');
    grad3.setAttribute('y2', '100%');
    grad3.appendChild(createStop('0%', BRAND.purple, '0.7'));
    grad3.appendChild(createStop('100%', BRAND.pink, '0.7'));
    defs.appendChild(grad3);

    var glowFilter = createEl('filter');
    glowFilter.setAttribute('id', 'glow');
    glowFilter.setAttribute('x', '-50%');
    glowFilter.setAttribute('y', '-50%');
    glowFilter.setAttribute('width', '200%');
    glowFilter.setAttribute('height', '200%');
    var feGauss = createEl('feGaussianBlur');
    feGauss.setAttribute('stdDeviation', '3');
    feGauss.setAttribute('result', 'coloredBlur');
    glowFilter.appendChild(feGauss);
    var feMerge = createEl('feMerge');
    var fm1 = createEl('feMergeNode');
    fm1.setAttribute('in', 'coloredBlur');
    var fm2 = createEl('feMergeNode');
    fm2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(fm1);
    feMerge.appendChild(fm2);
    glowFilter.appendChild(feMerge);
    defs.appendChild(glowFilter);

    svg.appendChild(defs);

    var phoneGroup = createEl('g');
    phoneGroup.setAttribute('id', 'phone-device');
    phoneGroup.innerHTML =
      '<rect x="60" y="60" width="60" height="120" rx="10" ry="10" fill="none" stroke="url(#device-grad)" stroke-width="2" opacity="0.8"/>' +
      '<rect x="68" y="75" width="44" height="80" rx="3" fill="url(#device-grad)" opacity="0.15"/>' +
      '<line x1="85" y1="163" x2="95" y2="163" stroke="url(#device-grad)" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>' +
      '<circle cx="90" cy="68" r="2" fill="url(#device-grad)" opacity="0.5"/>';
    svg.appendChild(phoneGroup);

    var laptopGroup = createEl('g');
    laptopGroup.setAttribute('id', 'laptop-device');
    laptopGroup.innerHTML =
      '<rect x="430" y="55" width="120" height="85" rx="6" ry="6" fill="none" stroke="url(#device-grad-2)" stroke-width="2" opacity="0.8"/>' +
      '<rect x="438" y="63" width="104" height="65" rx="2" fill="url(#device-grad-2)" opacity="0.12"/>' +
      '<path d="M420 145 L560 145 L555 155 L425 155 Z" fill="none" stroke="url(#device-grad-2)" stroke-width="1.5" opacity="0.6"/>';
    svg.appendChild(laptopGroup);

    var pathGroup = createEl('g');
    pathGroup.setAttribute('id', 'data-path');
    var pathD = 'M 120 120 C 200 80, 300 200, 430 100';
    pathGroup.innerHTML =
      '<path d="' + pathD + '" fill="none" stroke="url(#packet-grad)" stroke-width="1" stroke-dasharray="4 8" opacity="0.3"/>';
    svg.appendChild(pathGroup);

    var packetsGroup = createEl('g');
    packetsGroup.setAttribute('id', 'packets');
    for (var i = 0; i < PACKET_COUNT; i++) {
      var packet = createEl('circle');
      packet.setAttribute('r', '3');
      packet.setAttribute('fill', 'url(#packet-grad)');
      packet.setAttribute('filter', 'url(#glow)');
      packet.setAttribute('opacity', '0');
      packetsGroup.appendChild(packet);
    }
    svg.appendChild(packetsGroup);

    var pulsePhone = createEl('circle');
    pulsePhone.setAttribute('id', 'pulse-phone');
    pulsePhone.setAttribute('cx', '90');
    pulsePhone.setAttribute('cy', '120');
    pulsePhone.setAttribute('r', '30');
    pulsePhone.setAttribute('fill', 'none');
    pulsePhone.setAttribute('stroke', BRAND.emerald);
    pulsePhone.setAttribute('stroke-width', '1');
    pulsePhone.setAttribute('opacity', '0');
    svg.appendChild(pulsePhone);

    var pulseLaptop = createEl('circle');
    pulseLaptop.setAttribute('id', 'pulse-laptop');
    pulseLaptop.setAttribute('cx', '490');
    pulseLaptop.setAttribute('cy', '100');
    pulseLaptop.setAttribute('r', '30');
    pulseLaptop.setAttribute('fill', 'none');
    pulseLaptop.setAttribute('stroke', BRAND.pink);
    pulseLaptop.setAttribute('stroke-width', '1');
    pulseLaptop.setAttribute('opacity', '0');
    svg.appendChild(pulseLaptop);
  }

  function createEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function createStop(offset, color, opacity) {
    var stop = createEl('stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    if (opacity) stop.setAttribute('stop-opacity', opacity);
    return stop;
  }

  function getPointOnPath(t) {
    var p0 = { x: 120, y: 120 };
    var p1 = { x: 200, y: 80 };
    var p2 = { x: 300, y: 200 };
    var p3 = { x: 430, y: 100 };
    var u = 1 - t;
    var tt = t * t;
    var uu = u * u;
    var uuu = uu * u;
    var ttt = tt * t;
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  function animate() {
    time += 0.008;
    var packets = document.getElementById('packets');
    if (packets) {
      var circles = packets.querySelectorAll('circle');
      for (var i = 0; i < circles.length; i++) {
        var t = ((time + i / PACKET_COUNT) % 1);
        var pt = getPointOnPath(t);
        circles[i].setAttribute('cx', pt.x);
        circles[i].setAttribute('cy', pt.y);
        var alpha = Math.sin(t * Math.PI) * 0.9;
        circles[i].setAttribute('opacity', alpha);
        var scale = 0.6 + Math.sin(t * Math.PI) * 0.8;
        circles[i].setAttribute('r', 2 + scale * 2);
      }
    }

    var pulsePhone = document.getElementById('pulse-phone');
    var pulseLaptop = document.getElementById('pulse-laptop');
    if (pulsePhone) {
      var pPhase = (time * 0.5) % 1;
      var pRadius = 30 + pPhase * 30;
      var pAlpha = (1 - pPhase) * 0.25;
      pulsePhone.setAttribute('r', pRadius);
      pulsePhone.setAttribute('opacity', pAlpha);
    }
    if (pulseLaptop) {
      var lPhase = ((time * 0.5) + 0.5) % 1;
      var lRadius = 30 + lPhase * 30;
      var lAlpha = (1 - lPhase) * 0.25;
      pulseLaptop.setAttribute('r', lRadius);
      pulseLaptop.setAttribute('opacity', lAlpha);
    }

    var phoneDevice = document.getElementById('phone-device');
    var laptopDevice = document.getElementById('laptop-device');
    if (phoneDevice) {
      var phoneY = Math.sin(time * 1.5) * 3;
      phoneDevice.setAttribute('transform', 'translate(0,' + phoneY + ')');
    }
    if (laptopDevice) {
      var laptopY = Math.sin(time * 1.5 + Math.PI) * 3;
      laptopDevice.setAttribute('transform', 'translate(0,' + laptopY + ')');
    }

    animationId = requestAnimationFrame(animate);
  }

  window.Hero = {
    init: init,
    destroy: function () {
      if (animationId) cancelAnimationFrame(animationId);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();