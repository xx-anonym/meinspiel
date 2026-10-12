// Partikel über dem Spiel: Rosen auf die Bühne, Goldstaub, Konfetti.

const cv = document.getElementById('fx');
const ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1;
const teile = [];
let laeuft = false;
const reduziert = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

function groesse() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', groesse);
groesse();

const rand = (a, b) => a + Math.random() * (b - a);

function start() {
  if (laeuft) return;
  laeuft = true;
  let last = performance.now();
  const schritt = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.clearRect(0, 0, W, H);
    for (let i = teile.length - 1; i >= 0; i--) {
      const p = teile[i];
      p.leben -= dt;
      if (p.leben <= 0 || p.y > H + 60) { teile.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= 1 - p.reib * dt;
      p.vy *= 1 - p.reib * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      p.flatter += dt * p.fs;
      malen(p);
    }
    if (teile.length) requestAnimationFrame(schritt);
    else { laeuft = false; ctx.clearRect(0, 0, W, H); }
  };
  requestAnimationFrame(schritt);
}

function malen(p) {
  const a = Math.min(1, p.leben / 0.6) * (p.alpha ?? 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  if (p.art === 'rose') {
    const s = p.s;
    ctx.strokeStyle = '#2f6b33'; ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.moveTo(0, s * 0.4); ctx.lineTo(0, s * 1.7); ctx.stroke();
    ctx.fillStyle = '#2f6b33';
    ctx.beginPath(); ctx.ellipse(s * 0.28, s * 1.05, s * 0.3, s * 0.13, -0.6, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, 0, s * 0.7);
    g.addColorStop(0, p.farbe2); g.addColorStop(1, p.farbe);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,0,10,.45)'; ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.32, 0.4, 4.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.06, s * 0.05, s * 0.15, 2.5, 7); ctx.stroke();
  } else if (p.art === 'blatt') {
    ctx.scale(1, Math.abs(Math.cos(p.flatter)) * 0.8 + 0.2);
    ctx.fillStyle = p.farbe;
    ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  } else if (p.art === 'gold') {
    ctx.fillStyle = p.farbe;
    ctx.beginPath();
    const s = p.s;
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.25, -s * 0.25); ctx.lineTo(s, 0); ctx.lineTo(s * 0.25, s * 0.25);
    ctx.lineTo(0, s); ctx.lineTo(-s * 0.25, s * 0.25); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.25, -s * 0.25);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.scale(1, Math.abs(Math.cos(p.flatter)) * 0.9 + 0.1);
    ctx.fillStyle = p.farbe;
    ctx.fillRect(-p.s / 2, -p.s * 0.3, p.s, p.s * 0.6);
  }
  ctx.restore();
}

const ROT = ['#b3122e', '#d12a45', '#8f0d24', '#e04a62'];

/** Rosen fliegen von den Rängen auf die Bühne. menge 0..1 */
export function rosen(menge = 0.5, zielY = null) {
  if (reduziert) return;
  const n = Math.round(4 + menge * 22);
  const yZiel = zielY ?? H * 0.45;
  for (let i = 0; i < n; i++) {
    const vonLinks = Math.random() < 0.5;
    const x = vonLinks ? rand(-40, W * 0.15) : rand(W * 0.85, W + 40);
    const y = rand(-20, H * 0.25);
    const tx = rand(W * 0.25, W * 0.75);
    const zeit = rand(0.9, 1.4);
    teile.push({
      art: 'rose', x, y, vx: (tx - x) / zeit, vy: (yZiel - y) / zeit - 260 * zeit * 0.5, g: 260,
      reib: 0.05, rot: rand(0, 6), vrot: rand(-6, 6), s: rand(9, 14), leben: zeit + rand(0.6, 1.4),
      farbe: ROT[i % ROT.length], farbe2: '#ff7d8f', flatter: 0, fs: 0,
    });
  }
  for (let i = 0; i < n * 3; i++) {
    teile.push({
      art: 'blatt', x: rand(0, W), y: rand(-80, -10), vx: rand(-30, 30), vy: rand(40, 120), g: 30,
      reib: 0.4, rot: rand(0, 6), vrot: rand(-3, 3), s: rand(4, 7), leben: rand(3, 5.5),
      farbe: ROT[i % ROT.length], flatter: rand(0, 6), fs: rand(3, 7),
    });
  }
  start();
}

/** Goldstaub an einem Punkt (z. B. bei einem Faktor). */
export function goldstaub(x, y, n = 14, farbe = '#f3d27a') {
  if (reduziert) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(80, 260);
    teile.push({
      art: 'gold', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 220, reib: 1.6,
      rot: rand(0, 6), vrot: rand(-4, 4), s: rand(2.5, 5), leben: rand(0.5, 1.1), farbe, flatter: 0, fs: 0,
    });
  }
  start();
}

const KONFETTI = ['#c9a84c', '#e8cd7a', '#b3122e', '#2f8a4e', '#2f5fa8', '#f4ecd8', '#7246a8'];
export function konfetti(n = 160) {
  if (reduziert) return;
  for (let i = 0; i < n; i++) {
    teile.push({
      art: 'konfetti', x: rand(0, W), y: rand(-H * 0.4, -10), vx: rand(-40, 40), vy: rand(60, 200), g: 40,
      reib: 0.3, rot: rand(0, 6), vrot: rand(-5, 5), s: rand(6, 11), leben: rand(4, 7),
      farbe: KONFETTI[i % KONFETTI.length], flatter: rand(0, 6), fs: rand(4, 9),
    });
  }
  start();
}
