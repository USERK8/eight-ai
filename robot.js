(() => {
  const CONFIG = {
    size: 52,
    speed: 0.025,
    idleMs: 60000,
    holdMs: 4800,
    typeMs: 38,
    messages: [
      'reading this long, i see... are you stalking my creator?',
      'still here? bold of you to assume i haven\'t noticed.',
      'psst. the mouse works better when you actually move it.',
      'it\'s been a minute. i have started naming the pixels.',
      'beep boop. that was the whole message.',
      'blink twice if this page is holding you hostage.',
      'i could be running on a phone right now. instead i\'m a floating head. no regrets.',
      'there\'s a "try eight ai" button up there, you know. just saying.',
      'is this a staring contest? i have no eyelids. i win.',
      'fun fact: i have no body. leg day is cancelled forever.',
      'hello? anyone in there? ...my creator said not to mention i get lonely.',
      'you can scroll, you know. i won\'t judge. much.',
      'i read the whole page while you were away. plot twist: it was about me.'
    ]
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) CONFIG.speed = 1;

  const style = document.createElement('style');
  style.textContent = [
    '.rb-robot { position: fixed; left: 0; top: 0; width: ' + CONFIG.size + 'px; height: ' + Math.round(CONFIG.size * 1.05) + 'px;',
    'z-index: 1; pointer-events: none; will-change: transform; filter: drop-shadow(0 0 14px rgba(0, 229, 255, 0.22)); }',
    '.rb-robot svg { width: 100%; height: 100%; overflow: visible; }',
    '.rb-led { animation: rbLed 1.6s ease-in-out infinite; }',
    '@keyframes rbLed { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }',
    '.rb-eyes ellipse { transform-box: fill-box; transform-origin: center; animation: rbBlink 5s infinite; }',
    '@keyframes rbBlink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }',
    '.rb-bubble { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; max-width: 240px;',
    'padding: 12px 16px; font: 12px/1.6 "JetBrains Mono", monospace; color: #eaf2f8;',
    'background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.06));',
    'border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 16px;',
    '-webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);',
    'box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6); opacity: 0; transition: opacity 0.3s ease; }',
    '.rb-bubble.show { opacity: 1; }',
    '.rb-bubble::after { content: ""; position: absolute; left: var(--tail, 50%); bottom: -6px; width: 10px; height: 10px;',
    'background: #1f2326; border-right: 1px solid rgba(255, 255, 255, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.2);',
    'transform: translateX(-50%) rotate(45deg); }',
    '.rb-bubble.below::after { bottom: auto; top: -6px; border: 0; border-left: 1px solid rgba(255, 255, 255, 0.2);',
    'border-top: 1px solid rgba(255, 255, 255, 0.2); }',
    '.rb-ghost { visibility: hidden; display: block; }',
    '.rb-typed { position: absolute; left: 16px; right: 16px; top: 12px; display: block; }'
  ].join('\n');
  document.head.appendChild(style);

  const robot = document.createElement('div');
  robot.className = 'rb-robot';
  robot.setAttribute('aria-hidden', 'true');
  robot.innerHTML =
    '<svg viewBox="0 0 80 84" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="rbGrad" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#f3f7fa"/><stop offset="100%" stop-color="#9fb0bf"/></linearGradient></defs>' +
    '<line x1="40" y1="5" x2="40" y2="17" stroke="#9fb0bf" stroke-width="3" stroke-linecap="round"/>' +
    '<circle class="rb-led" cx="40" cy="5" r="4" fill="#00e5ff"/>' +
    '<rect x="3" y="34" width="9" height="20" rx="4.5" fill="#8294a5"/>' +
    '<rect x="68" y="34" width="9" height="20" rx="4.5" fill="#8294a5"/>' +
    '<rect x="10" y="16" width="60" height="54" rx="17" fill="url(#rbGrad)" stroke="#ffffff" stroke-opacity="0.5"/>' +
    '<rect x="17" y="26" width="46" height="32" rx="11" fill="#04070b"/>' +
    '<g class="rb-eyes"><ellipse cx="30" cy="42" rx="6" ry="7.5" fill="#00e5ff"/>' +
    '<ellipse cx="50" cy="42" rx="6" ry="7.5" fill="#00e5ff"/></g>' +
    '<rect x="30" y="62" width="20" height="3" rx="1.5" fill="#5c6c7b"/>' +
    '</svg>';
  document.body.appendChild(robot);

  const bubble = document.createElement('div');
  bubble.className = 'rb-bubble';
  bubble.setAttribute('aria-hidden', 'true');
  bubble.innerHTML = '<span class="rb-ghost"></span><span class="rb-typed"></span>';
  document.body.appendChild(bubble);

  const eyes = robot.querySelector('.rb-eyes');
  const ghost = bubble.querySelector('.rb-ghost');
  const typed = bubble.querySelector('.rb-typed');

  const W = CONFIG.size, H = Math.round(CONFIG.size * 1.05);
  let tx = innerWidth * 0.75, ty = innerHeight * 0.45;
  let x = tx, y = ty, rot = 0, ex = 0, ey = 0, last = 0, active = false;
  let lastActive = performance.now();

  let idleOn = false, bubbleVisible = false, typeTimer = null;
  let timers = [];
  let queue = [], qi = 0;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showNext() {
    if (!idleOn) return;
    const text = queue[qi % queue.length];
    qi++;
    ghost.textContent = text;
    typed.textContent = '';
    bubbleVisible = true;
    bubble.classList.add('show');
    let n = 0;
    typeTimer = setInterval(() => {
      n++;
      typed.textContent = text.slice(0, n);
      if (n >= text.length) {
        clearInterval(typeTimer);
        typeTimer = null;
        later(() => {
          bubble.classList.remove('show');
          later(() => { bubbleVisible = false; showNext(); }, 900);
        }, CONFIG.holdMs);
      }
    }, CONFIG.typeMs);
  }

  function startMessages() {
    idleOn = true;
    queue = shuffle(CONFIG.messages);
    qi = 0;
    showNext();
  }

  function stopMessages() {
    idleOn = false;
    timers.forEach(clearTimeout);
    timers = [];
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    bubble.classList.remove('show');
    setTimeout(() => { if (!idleOn) bubbleVisible = false; }, 350);
  }

  function activity() {
    lastActive = performance.now();
    if (idleOn) stopMessages();
  }

  function track(e) {
    active = true;
    tx = e.clientX;
    ty = e.clientY;
    activity();
  }

  addEventListener('pointermove', track, { passive: true });
  addEventListener('pointerdown', track, { passive: true });
  addEventListener('keydown', activity);
  addEventListener('scroll', activity, { passive: true });
  addEventListener('touchstart', activity, { passive: true });

  function placeBubble() {
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    let bx = Math.min(Math.max(x - bw / 2, 8), innerWidth - bw - 8);
    let by = y - H / 2 - bh - 14;
    const below = by < 70;
    if (below) by = y + H / 2 + 14;
    bubble.classList.toggle('below', below);
    const tail = Math.min(Math.max(x - bx, 16), bw - 16);
    bubble.style.setProperty('--tail', tail + 'px');
    bubble.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
  }

  function loop(t) {
    const dt = Math.min(t - last, 50);
    last = t;
    const frames = dt / 16.667;
    const k = 1 - Math.pow(1 - CONFIG.speed, frames);
    const kr = 1 - Math.pow(1 - 0.06, frames);
    const ke = 1 - Math.pow(1 - 0.15, frames);

    if (!active) {
      tx = innerWidth * 0.5 + Math.sin(t / 3200) * innerWidth * 0.28;
      ty = innerHeight * 0.5 + Math.cos(t / 2500) * innerHeight * 0.22;
    }

    const dx = tx - x, dy = ty - y;
    x += dx * k;
    y += dy * k;

    const targetRot = Math.max(-20, Math.min(20, dx * 0.06));
    rot += (targetRot - rot) * kr;

    const dist = Math.hypot(dx, dy);
    const amp = Math.min(3.5, dist / 30);
    const tex = dist > 0.5 ? (dx / dist) * amp : 0;
    const tey = dist > 0.5 ? (dy / dist) * amp : 0;
    ex += (tex - ex) * ke;
    ey += (tey - ey) * ke;
    eyes.setAttribute('transform', 'translate(' + ex.toFixed(2) + ' ' + ey.toFixed(2) + ')');

    const bob = reduce ? 0 : Math.sin(t / 900) * 3;
    robot.style.transform =
      'translate3d(' + (x - W / 2).toFixed(2) + 'px,' + (y - H / 2 + bob).toFixed(2) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';

    if (!idleOn && performance.now() - lastActive > CONFIG.idleMs) startMessages();
    if (bubbleVisible) placeBubble();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
