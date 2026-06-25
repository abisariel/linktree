const canvas = document.getElementById('bg');
const ctx    = canvas.getContext('2d');

const HEX_SIZE  = 26;
const HEX_INNER = HEX_SIZE * 0.56;

let hexGrid   = [];
let nodes     = [];
let particles = [];
let frame     = 0;
let raf       = null;
let DPR       = 1;
let W         = 0;
let H         = 0;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Usa visualViewport quando disponível (mais estável no mobile)
function getViewportSize() {
  const vv = window.visualViewport;
  return {
    w: vv ? vv.width  : window.innerWidth,
    h: vv ? vv.height : window.innerHeight,
  };
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2); // limita a 2x para performance

  const { w, h } = getViewportSize();

  // Dimensões lógicas (CSS pixels)
  W = w;
  H = h;

  // Dimensões físicas (pixels reais do device)
  canvas.width  = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);

  // Garante que o canvas CSS cobre a viewport sem crescer além
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  // Escala o contexto pro DPR de uma vez — todo o resto usa coordenadas lógicas
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  if (W === 0 || H === 0) return; // segurança: não monta grid com dimensão zero

  buildHexGrid();
  buildNodes();
  buildParticles();
}

function buildHexGrid() {
  hexGrid = [];
  const cols = Math.ceil(W / (HEX_SIZE * 1.732)) + 3;
  const rows = Math.ceil(H / (HEX_SIZE * 1.5))   + 3;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const xOffset = r % 2 === 0 ? 0 : HEX_SIZE * 0.866;
      hexGrid.push({
        x:     c * HEX_SIZE * 1.732 + xOffset - HEX_SIZE,
        y:     r * HEX_SIZE * 1.5   - HEX_SIZE,
        phase: rand(0, Math.PI * 2),
      });
    }
  }
}

function buildNodes() {
  const count = W < 600 ? 10 : 18;
  nodes = Array.from({ length: count }, () => ({
    x:     rand(0, W),
    y:     rand(0, H),
    phase: rand(0, Math.PI * 2),
  }));
}

function buildParticles() {
  const count = W < 600 ? 28 : 50;
  particles = Array.from({ length: count }, () => ({
    x:     rand(0, W),
    y:     rand(0, H),
    r:     rand(0.3, 1.3),
    vx:    rand(-0.2, 0.2),
    vy:    rand(-0.2, 0.2),
    phase: rand(0, Math.PI * 2),
  }));
}

function drawHex(cx, cy, alpha) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + HEX_INNER * Math.cos(angle);
    const y = cy + HEX_INNER * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(0,100,210,${alpha.toFixed(3)})`;
  ctx.lineWidth   = 0.45;
  ctx.stroke();
}

function renderHexGrid() {
  for (const h of hexGrid) {
    const alpha = 0.02 + 0.012 * Math.sin(frame * 0.005 + h.phase);
    drawHex(h.x, h.y, alpha);
  }
}

function renderCircuits() {
  for (let i = 0; i < nodes.length; i++) {
    const a     = nodes[i];
    const b     = nodes[(i + 1) % nodes.length];
    const alpha = 0.028 + 0.018 * Math.sin(frame * 0.009 + a.phase);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x, b.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(0,148,255,${alpha.toFixed(3)})`;
    ctx.lineWidth   = 0.55;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(a.x, a.y, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,200,255,${(alpha * 2.2).toFixed(3)})`;
    ctx.fill();
  }
}

function renderParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0)  p.x = W;
    if (p.x > W)  p.x = 0;
    if (p.y < 0)  p.y = H;
    if (p.y > H)  p.y = 0;

    const alpha = 0.1 + 0.1 * Math.sin(frame * 0.018 + p.phase);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,172,255,${alpha.toFixed(3)})`;
    ctx.fill();
  }
}

function renderScanLine() {
  if (H === 0) return; // evita createLinearGradient com altura zero
  const y = (frame * 0.6) % H;
  const g = ctx.createLinearGradient(0, y - 80, 0, y + 80);
  g.addColorStop(0,   'transparent');
  g.addColorStop(0.5, 'rgba(0,200,255,0.018)');
  g.addColorStop(1,   'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 80, W, 160);
}

function draw() {
  // clearRect usando coordenadas lógicas (a escala DPR já foi aplicada via setTransform)
  ctx.clearRect(0, 0, W, H);

  renderHexGrid();
  renderCircuits();
  renderParticles();
  renderScanLine();

  frame++;
  raf = requestAnimationFrame(draw);
}

// Pausa quando tab está em background, retoma sem pular frames
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = null;
  } else if (!raf) {
    raf = requestAnimationFrame(draw);
  }
});

// Debounce do resize — 250ms evita reconstrução do grid a cada pixel de rolagem no mobile
let resizeTimer;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resize();
  }, 250);
}

window.addEventListener('resize', onResize);

// visualViewport é mais estável no mobile (ignora barras do browser)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', onResize);
}

resize();
draw();
