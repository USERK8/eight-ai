(() => {
  const CONFIG = {
    spacing: 32,
    dashLength: 9,
    lineWidth: 2.2,
    influence: 90,
    push: 16,
    ease: 0.05,
    spinSpeed: 1,
    settleSpeed: 5,
    colorFrom: [255, 255, 255],
    colorTo: [255, 45, 45],
    heatEase: 0.06,
    baseAlpha: 0.2,
    ringHotScale: 1.7
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { CONFIG.ease = 1; CONFIG.spinSpeed = 0; }

  const style = document.createElement('style');
  style.textContent = [
    '#dash-field { position: absolute; top: 0; left: 0; z-index: -1; pointer-events: none; }',
    '.dash-ring { position: fixed; left: 0; top: 0; width: 52px; height: 52px; margin: -26px 0 0 -26px;',
    'border: 1.5px solid #00e5ff; border-radius: 50%; background: transparent;',
    'box-shadow: 0 0 12px rgba(0, 229, 255, 0.55), inset 0 0 8px rgba(0, 229, 255, 0.2);',
    'pointer-events: none; z-index: 9999; opacity: 0; transition: opacity 0.25s ease; will-change: transform; }',
    '.dash-ring.show { opacity: 1; }',
    '@media (hover: hover) and (pointer: fine) { html, body, a { cursor: none; } }'
  ].join('\n');
  document.head.appendChild(style);

  const canvas = document.createElement('canvas');
  canvas.id = 'dash-field';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const ring = document.createElement('div');
  ring.className = 'dash-ring';
  document.body.appendChild(ring);

  let w = 0, h = 0, n = 0, hx, hy, px, py, ang, rate, heat;
  const client = { x: -9999, y: -9999 };
  let rx = -9999, ry = -9999, rs = 1, rsTarget = 1, last = 0;

  function build() {
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = document.documentElement.clientWidth;
    h = Math.max(innerHeight, document.body.offsetHeight);
    while (w * h * dpr * dpr > 12e6 && dpr > 1) dpr -= 0.25;
    dpr = Math.max(1, dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const s = CONFIG.spacing;
    const cols = Math.ceil(w / s) + 1, rows = Math.ceil(h / s) + 1;
    n = cols * rows;
    hx = new Float32Array(n); hy = new Float32Array(n);
    px = new Float32Array(n); py = new Float32Array(n);
    ang = new Float32Array(n); rate = new Float32Array(n);
    heat = new Float32Array(n);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, i++) {
        hx[i] = px[i] = c * s;
        hy[i] = py[i] = r * s;
        ang[i] = 0;
        rate[i] = (3 + Math.random() * 5) * (Math.random() < 0.5 ? -1 : 1) * CONFIG.spinSpeed;
      }
    }
  }

  function draw(time) {
    const dt = Math.min(((time || 0) - last) / 1000, 0.05);
    last = time || 0;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';

    const mx = client.x + window.scrollX;
    const my = client.y + window.scrollY;
    const top = window.scrollY - 40, bottom = window.scrollY + innerHeight + 40;
    const R = CONFIG.influence, P = CONFIG.push, E = CONFIG.ease;
    const half = CONFIG.dashLength / 2;

    for (let i = 0; i < n; i++) {
      if (hy[i] < top || hy[i] > bottom) { px[i] = hx[i]; py[i] = hy[i]; heat[i] = 0; continue; }
      const dx = hx[i] - mx, dy = hy[i] - my;
      const d = Math.hypot(dx, dy);
      let tx = hx[i], ty = hy[i], near = 0;
      if (d < R) {
        near = 1 - d / R;
        const push = near * near * P;
        const ux = d > 0.01 ? dx / d : 1;
        const uy = d > 0.01 ? dy / d : 0;
        tx += ux * push;
        ty += uy * push;
      }
      px[i] += (tx - px[i]) * E;
      py[i] += (ty - py[i]) * E;
      heat[i] += (near - heat[i]) * CONFIG.heatEase;
      ang[i] += rate[i] * dt * heat[i];
      const settle = Math.max(0, 1 - heat[i] * 6);
      if (settle > 0) {
        const flat = Math.round(ang[i] / Math.PI) * Math.PI;
        ang[i] += (flat - ang[i]) * (1 - Math.exp(-dt * CONFIG.settleSpeed * settle));
      }

      const k = Math.min(1, heat[i] * 1.4);
      const cr = CONFIG.colorFrom[0] + (CONFIG.colorTo[0] - CONFIG.colorFrom[0]) * k;
      const cg = CONFIG.colorFrom[1] + (CONFIG.colorTo[1] - CONFIG.colorFrom[1]) * k;
      const cb = CONFIG.colorFrom[2] + (CONFIG.colorTo[2] - CONFIG.colorFrom[2]) * k;
      ctx.strokeStyle = 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' + (CONFIG.baseAlpha + k * 0.55) + ')';
      ctx.lineWidth = CONFIG.lineWidth + k * 0.6;

      const ox = Math.cos(ang[i]) * half, oy = Math.sin(ang[i]) * half;
      ctx.beginPath();
      ctx.moveTo(px[i] - ox, py[i] - oy);
      ctx.lineTo(px[i] + ox, py[i] + oy);
      ctx.stroke();
    }

    rx += (client.x - rx) * 0.4;
    ry += (client.y - ry) * 0.4;
    rs += (rsTarget - rs) * 0.2;
    ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) scale(' + rs + ')';

    requestAnimationFrame(draw);
  }

  function track(e) {
    client.x = e.clientX; client.y = e.clientY;
    if (e.pointerType === 'touch') {
      ring.classList.remove('show');
    } else {
      if (!ring.classList.contains('show')) { rx = client.x; ry = client.y; }
      ring.classList.add('show');
    }
  }

  function release(e) {
    if (e.pointerType === 'touch') { client.x = client.y = -9999; }
  }

  addEventListener('pointermove', track, { passive: true });
  addEventListener('pointerdown', track, { passive: true });
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    client.x = client.y = -9999;
    ring.classList.remove('show');
  });
  document.addEventListener('pointerover', (e) => {
    const hot = e.target.closest && e.target.closest('a');
    rsTarget = hot ? CONFIG.ringHotScale : 1;
  });

  let pending = false;
  function queueBuild() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; build(); });
  }
  addEventListener('resize', queueBuild);
  if ('ResizeObserver' in window) new ResizeObserver(queueBuild).observe(document.body);

  build();
  requestAnimationFrame(draw);
})();
