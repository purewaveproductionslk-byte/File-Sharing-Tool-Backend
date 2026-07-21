(function () {
  var canvas, ctx, particles, mouse, animationId, width, height;
  var PARTICLE_COUNT = 80;
  var CONNECTION_DIST = 150;
  var MOUSE_INFLUENCE = 200;
  var BRAND_COLORS = [
    { r: 6, g: 214, b: 160 },
    { r: 123, g: 97, b: 255 },
    { r: 255, g: 107, b: 157 }
  ];
  var dpr = window.devicePixelRatio || 1;

  function init() {
    canvas = document.getElementById('particles');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'particles';
      document.body.prepend(canvas);
    }
    ctx = canvas.getContext('2d');
    mouse = { x: -9999, y: -9999, active: false };
    resize();
    createParticles();
    setupEvents();
    animate();
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var color = BRAND_COLORS[i % BRAND_COLORS.length];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        color: color,
        baseAlpha: Math.random() * 0.5 + 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01
      });
    }
  }

  function setupEvents() {
    window.addEventListener('resize', function () {
      resize();
    });
    document.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });
    document.addEventListener('mouseleave', function () {
      mouse.active = false;
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    updateParticles();
    drawConnections();
    drawParticles();
    animationId = requestAnimationFrame(animate);
  }

  function updateParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.pulsePhase += p.pulseSpeed;
      if (mouse.active) {
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_INFLUENCE && dist > 0) {
          var force = (1 - dist / MOUSE_INFLUENCE) * 0.02;
          p.vx += dx / dist * force;
          p.vy += dy / dist * force;
        }
      }
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
    }
  }

  function drawConnections() {
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var a = particles[i];
        var b = particles[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          var alpha = (1 - dist / CONNECTION_DIST) * 0.25;
          var gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          gradient.addColorStop(0, 'rgba(' + a.color.r + ',' + a.color.g + ',' + a.color.b + ',' + alpha + ')');
          gradient.addColorStop(1, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',' + alpha + ')');
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var pulse = Math.sin(p.pulsePhase) * 0.3 + 0.7;
      var alpha = p.baseAlpha * pulse;
      var radius = p.radius * (1 + pulse * 0.3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + alpha + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + (alpha * 0.15) + ')';
      ctx.fill();
    }
  }

  window.Particles = {
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