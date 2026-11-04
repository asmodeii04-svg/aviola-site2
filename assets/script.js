/*
 * Aviola.NET — скрипты сайта
 * 1. Тема (системная + ручной переключатель)
 * 2. Мобильное меню
 * 3. Анимированная сетка узлов на первом экране
 */

const THEME_KEY = 'aviola-theme';
const THEME_COLORS = { light: '#fbfdff', dark: '#0a111e' };

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMenu();
  initNetworkBackground();
});


/* ---------- 1. Тема ---------- */

function initTheme() {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const metaColor = document.querySelector('meta[name="theme-color"]');
  const button = createThemeButton();

  // Если человек ещё не выбирал тему сам, берём системную
  const getTheme = () => root.dataset.theme || (systemDark.matches ? 'dark' : 'light');

  function render() {
    const theme = getTheme();
    const label = theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';

    button.dataset.current = theme;
    button.setAttribute('aria-label', label);
    button.title = label;
    if (metaColor) metaColor.content = THEME_COLORS[theme];

    window.dispatchEvent(new Event('themechange'));
  }

  button.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';

    root.classList.add('theme-switching');
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      // Хранилище может быть недоступно (например, в приватном режиме) — не страшно
    }
    render();

    setTimeout(() => root.classList.remove('theme-switching'), 400);
  });

  systemDark.addEventListener('change', render);
  render();
}

function createThemeButton() {
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.type = 'button';
  button.innerHTML = `
    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
    </svg>
    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
    </svg>`;
  document.body.append(button);
  return button;
}


/* ---------- 2. Мобильное меню ---------- */

function initMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    toggle.textContent = open ? '×' : '☰';
  }

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));

  // Закрываем меню после перехода по ссылке, по Escape и при расширении окна
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
  window.matchMedia('(min-width: 1021px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}


/* ---------- 3. Сетка узлов на фоне ---------- */

function initNetworkBackground() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.hero, .page-hero').forEach((host) => {
    createNetwork(host, reduceMotion);
  });
}

function createNetwork(host, reduceMotion) {
  const canvas = document.createElement('canvas');
  canvas.className = 'net-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const LINK_DISTANCE = 150; // на каком расстоянии узлы соединяются линией
  let width = 0;
  let height = 0;
  let nodes = [];
  let color = '23, 105, 210';
  let frameId = 0;
  let lastTime = 0;
  let inView = false;

  function readColor() {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--net-rgb').trim();
    if (value) color = value;
  }

  function makeNode() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: 1.2 + Math.random() * 1.4,
    };
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = host.clientWidth;
    height = host.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Количество узлов зависит от площади, чтобы на телефоне было не тесно
    const target = Math.round(Math.min(Math.max((width * height) / 16000, 18), 60));
    while (nodes.length < target) nodes.push(makeNode());
    nodes.length = target;

    draw();
  }

  function step(delta) {
    for (const node of nodes) {
      node.x += node.vx * delta;
      node.y += node.vy * delta;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance > LINK_DISTANCE) continue;

        const alpha = (1 - distance / LINK_DISTANCE) * 0.28;
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = `rgba(${color}, 0.55)`;
    for (const node of nodes) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(time) {
    // delta == 1 при 60 кадрах в секунду, чтобы скорость не зависела от частоты экрана
    const delta = Math.min((time - lastTime) / 16.67, 3);
    lastTime = time;
    step(delta);
    draw();
    frameId = requestAnimationFrame(frame);
  }

  // Анимация идёт, только пока блок виден, вкладка активна и не включено «уменьшить движение»
  function updateLoop() {
    const shouldRun = inView && !document.hidden && !reduceMotion.matches;
    if (shouldRun && !frameId) {
      lastTime = performance.now();
      frameId = requestAnimationFrame(frame);
    } else if (!shouldRun && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  readColor();
  resize();

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateLoop();
  }).observe(host);

  document.addEventListener('visibilitychange', updateLoop);
  reduceMotion.addEventListener('change', updateLoop);
  window.addEventListener('themechange', () => {
    readColor();
    draw();
  });
}
