(function() {
  var canvas, ctx, particles = [], mouse = { x: -9999, y: -9999 };
  var COUNT = 50;
  var CONNECT_DIST = 120;
  var MOUSE_DIST = 160;
  var colors = ['#00f5d4', '#a855f7', '#f43f5e'];

  function init() {
    canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    for (var i = 0; i < COUNT; i++) particles.push(create(true));
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', function(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    document.addEventListener('mouseleave', function() { mouse.x = -9999; mouse.y = -9999; });
    animate();
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function create(randomPos) {
    return {
      x: randomPos ? Math.random() * canvas.width : Math.random() * canvas.width,
      y: randomPos ? Math.random() * canvas.height : canvas.height + 10,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.1,
      r: Math.random() * 1.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.3 + 0.1
    };
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      var dx = mouse.x - p.x;
      var dy = mouse.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_DIST) {
        var force = (MOUSE_DIST - dist) / MOUSE_DIST;
        p.x -= dx * force * 0.015;
        p.y -= dy * force * 0.015;
      }

      if (p.x < -20) p.x = canvas.width + 10;
      if (p.x > canvas.width + 20) p.x = -10;
      if (p.y < -20) p.y = canvas.height + 10;
      if (p.y > canvas.height + 20) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }

    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = particles[i].color;
          ctx.globalAlpha = 0.08 * (1 - dist / CONNECT_DIST);
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
