const canvas = document.getElementById('aurora-canvas');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// --- Mouse / touch tracking ---
let mx = 0.5, my = 0.5;     // normalized [0,1], target
let smx = 0.5, smy = 0.5;   // smoothed
let mouseActive = false;
let mouseTimer;

function pointerMove(cx, cy) {
    mx = cx / W;
    my = cy / H;
    mouseActive = true;
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => { mouseActive = false; }, 2800);
}

window.addEventListener('mousemove', e => pointerMove(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
    pointerMove(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

// --- Stars ---
const STAR_COUNT = 200;
const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random() * 0.70,
    r: Math.random() * 1.3 + 0.2,
    baseAlpha: Math.random() * 0.45 + 0.15,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 1.8,
}));

function drawStars(t) {
    for (const s of stars) {
        const alpha = s.baseAlpha + 0.18 * Math.sin(t * s.speed + s.phase);
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha).toFixed(3)})`;
        ctx.fill();
    }
}

// --- Aurora layers ---
const LAYERS = [
    { hue: 145, y: 0.33, amp: 0.090, thick: 0.14, sp: 0.130, f: [0.0024, 0.0058, 0.0011], ph: [0.0, 1.30, 2.50], a: 0.22 },
    { hue: 168, y: 0.39, amp: 0.070, thick: 0.11, sp: 0.100, f: [0.0031, 0.0072, 0.0014], ph: [1.1, 0.40, 3.20], a: 0.18 },
    { hue: 278, y: 0.27, amp: 0.110, thick: 0.12, sp: 0.080, f: [0.0019, 0.0047, 0.0009], ph: [2.1, 1.90, 0.60], a: 0.14 },
    { hue: 198, y: 0.43, amp: 0.060, thick: 0.10, sp: 0.160, f: [0.0038, 0.0081, 0.0017], ph: [0.6, 2.60, 1.10], a: 0.12 },
    { hue: 122, y: 0.24, amp: 0.080, thick: 0.08, sp: 0.070, f: [0.0014, 0.0039, 0.0007], ph: [3.1, 0.10, 2.10], a: 0.10 },
];

const N = 100;

function getWave(x, t, layer) {
    const amp  = H * layer.amp;
    const ts   = t * layer.sp;

    const base = Math.sin(x * layer.f[0] + ts) * amp
               + Math.sin(x * layer.f[1] + ts * 1.5 + layer.ph[1]) * amp * 0.35
               + Math.sin(x * layer.f[2] + ts * 0.7 + layer.ph[2]) * amp * 0.55;

    // Mouse bulge: aurora rises toward cursor X
    const dist   = Math.abs(x / W - smx);
    const bulge  = Math.max(0, 1 - dist * 4.0) * H * 0.025;

    return base - bulge * mouseInfluence;
}

function drawLayer(layer, t) {
    // Shift every layer slightly up when mouse moves to top, down to bottom
    const yShift  = (0.5 - smy) * 0.022 * mouseInfluence;
    const baseY   = H * (layer.y - yShift);
    const thick   = H * layer.thick;

    let minY = Infinity, maxY = -Infinity;
    const topY = new Float32Array(N + 1);
    const botY = new Float32Array(N + 1);

    for (let i = 0; i <= N; i++) {
        const x = (i / N) * W;
        const wave = getWave(x, t, layer);
        topY[i] = baseY + wave;
        botY[i] = baseY + wave + thick + Math.sin(x * 0.0017 + t * 0.08) * thick * 0.28;
        if (topY[i] < minY) minY = topY[i];
        if (botY[i] > maxY) maxY = botY[i];
    }

    // Boost alpha when mouse is active
    const pulse = 0.78 + 0.22 * Math.sin(t * 0.44 + layer.ph[0]);
    const hue   = layer.hue + 20 * Math.sin(t * 0.11 + layer.ph[0]);
    const alpha = layer.a * pulse * (1 + mouseInfluence * 0.18);

    const grad = ctx.createLinearGradient(0, minY, 0, maxY);
    grad.addColorStop(0,    `hsla(${hue},100%,82%,0)`);
    grad.addColorStop(0.17, `hsla(${hue},100%,82%,${(alpha * 0.50).toFixed(3)})`);
    grad.addColorStop(0.38, `hsla(${hue},100%,76%,${alpha.toFixed(3)})`);
    grad.addColorStop(0.60, `hsla(${hue + 22},92%,66%,${(alpha * 0.68).toFixed(3)})`);
    grad.addColorStop(0.80, `hsla(${hue + 46},86%,56%,${(alpha * 0.24).toFixed(3)})`);
    grad.addColorStop(1,    `hsla(${hue + 70},80%,46%,0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, topY[0]);
    for (let i = 1; i <= N; i++) {
        ctx.lineTo((i / N) * W, topY[i]);
    }
    for (let i = N; i >= 0; i--) {
        ctx.lineTo((i / N) * W, botY[i]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// Vignette
function drawVignette() {
    const grad = ctx.createRadialGradient(W * 0.5, -H * 0.1, 0, W * 0.5, -H * 0.1, H * 1.1);
    grad.addColorStop(0,   'rgba(10,5,40,0)');
    grad.addColorStop(0.7, 'rgba(4,4,26,0)');
    grad.addColorStop(1,   'rgba(2,2,18,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

// --- Main loop ---
let t = 0;
let mouseInfluence = 0;

function frame() {
    t += 0.007;

    // Smoothly follow mouse
    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;

    // Influence fades in when mouse active, fades out when idle
    mouseInfluence += ((mouseActive ? 1 : 0) - mouseInfluence) * 0.018;

    ctx.fillStyle = '#03031a';
    ctx.fillRect(0, 0, W, H);

    drawStars(t);

    for (const layer of LAYERS) drawLayer(layer, t);

    drawVignette();

    requestAnimationFrame(frame);
}

frame();
