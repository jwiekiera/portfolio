(function () {
    const canvas = document.getElementById('planet-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const R = 62;
    let W, H;
    let PX, PY;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        PX = W / 2;
        PY = H + R * 0.62;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── State ──────────────────────────────────────────
    let state = 'idle';   // 'idle' | 'launching' | 'flying'
    let celebrateTimer = 0;
    let hintAlpha = 1;
    let t = 0;

    const rocket = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, thrusting: false };
    const particles = [];

    // Launch animation
    let launchTimer = 0;
    const LAUNCH_DUR = 90;
    const launchSmoke = [];

    // ── Collectibles ───────────────────────────────────
    const collectibles = [];
    const sparkles = [];
    const fireworks = [];
    let score = 0;
    let totalStars = 0;
    let allStarsFound = false;
    let easterEggTimer = 0;
    let easterEggText = { y: 0, alpha: 0 };
    const MAX_COLLECT = 14;

    function spawnAllCollectibles() {
        collectibles.length = 0;
        const docH = document.documentElement.scrollHeight;
        const N = MAX_COLLECT;
        for (let i = 0; i < N; i++) {
            const base = 80 + ((i + 0.5) / N) * (docH - 200);
            const pageY = Math.max(80, Math.min(docH - 80, base + (Math.random() - 0.5) * (docH / N * 0.5)));
            const pageX = 80 + Math.random() * (W - 160);
            collectibles.push({ pageX, pageY, phase: Math.random() * Math.PI * 2, size: 4 + Math.random() * 3 });
        }
    }

    function triggerEasterEgg() {
        easterEggTimer = 280;
        easterEggText = { y: H / 2, alpha: 1 };
        for (let b = 0; b < 8; b++) {
            const bx = 80 + Math.random() * (W - 160);
            const by = 80 + Math.random() * (H - 160);
            const hue = Math.floor(Math.random() * 360);
            for (let i = 0; i < 22; i++) {
                const angle = (i / 22) * Math.PI * 2;
                const spd = 1.5 + Math.random() * 3.5;
                fireworks.push({
                    x: bx, y: by,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    life: 1,
                    hue: hue + Math.random() * 40,
                });
            }
        }
    }

    function spawnSparkles(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
            sparkles.push({
                x, y,
                vx: Math.cos(angle) * (1.2 + Math.random() * 2.2),
                vy: Math.sin(angle) * (1.2 + Math.random() * 2.2),
                life: 1,
            });
        }
    }

    function spawnLaunchSmoke(x, y) {
        const dir = (Math.random() - 0.5) * 2.8;
        launchSmoke.push({
            x: x + dir * 5,
            y,
            vx: dir * (0.6 + Math.random() * 1.3),
            vy: 0.4 + Math.random() * 0.8,
            life: 1,
            size: 5 + Math.random() * 5,
            maxSize: 14 + Math.random() * 20,
        });
    }

    // Rocket rests on top of the planet surface
    function idlePos() {
        return {
            x: PX,
            y: PY - R - 15 + Math.sin(t * 1.8) * 1.8,
            angle: 0,
        };
    }

    // ── Input ──────────────────────────────────────────
    const keys = {};
    document.addEventListener('keydown', e => {
        keys[e.key] = true;
        if (state === 'flying' && ['ArrowUp','ArrowLeft','ArrowRight','ArrowDown'].includes(e.key))
            e.preventDefault();
    });
    document.addEventListener('keyup', e => { keys[e.key] = false; });

    window.addEventListener('mousemove', e => {
        if (state !== 'idle') return;
        const p = idlePos();
        document.body.style.cursor =
            Math.hypot(e.clientX - p.x, e.clientY - p.y) < 28 ? 'pointer' : '';
    });

    window.addEventListener('click', e => {
        if (state !== 'idle') return;
        const p = idlePos();
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 28) launch(p);
    });

    window.addEventListener('touchstart', e => {
        if (state !== 'idle') return;
        const p  = idlePos();
        const tc = e.touches[0];
        if (Math.hypot(tc.clientX - p.x, tc.clientY - p.y) < 38) {
            e.preventDefault();
            launch(p);
        }
    }, { passive: false });

    function launch(p) {
        state = 'launching';
        window._rocketFlying = true;
        hintAlpha = 1;
        score = 0;
        rocket.x     = p.x;
        rocket.y     = p.y;
        rocket.vx    = 0;
        rocket.vy    = 0;
        rocket.angle = 0;
        rocket.thrusting = false;
        launchTimer = 0;
        launchSmoke.length = 0;
        document.body.style.cursor = '';
        sparkles.length = 0;
        fireworks.length = 0;
        allStarsFound = false;
        easterEggTimer = 0;
        spawnAllCollectibles();
        totalStars = collectibles.length;
    }

    // ── Drawing ────────────────────────────────────────
    function drawPlanet() {
        const x = PX, y = PY, r = R;

        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.rect(-W * 2, 0, W * 4, H * 2);
        ctx.clip();
        ctx.scale(1, 0.28);
        ctx.strokeStyle = 'rgba(120, 155, 255, 0.20)'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.72, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        const atm = ctx.createRadialGradient(x, y, r * 0.78, x, y, r * 1.58);
        atm.addColorStop(0, 'rgba(60, 130, 255, 0.18)');
        atm.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = atm;
        ctx.beginPath(); ctx.arc(x, y, r * 1.58, 0, Math.PI * 2); ctx.fill();

        const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.32, r * 0.04, x, y, r);
        body.addColorStop(0,    '#3d4c90');
        body.addColorStop(0.55, '#17234a');
        body.addColorStop(1,    '#060b1c');
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(55, 82, 168, 0.55)';
        ctx.beginPath(); ctx.arc(x - 19, y - r * 0.28, 13, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 14, y - r * 0.52, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(78, 108, 198, 0.32)';
        ctx.beginPath(); ctx.arc(x + 2,  y - r * 0.72,  6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x - 7,  y - r * 0.10,  7, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.rect(-W * 2, -H * 2, W * 4, H * 2);
        ctx.clip();
        ctx.scale(1, 0.28);
        ctx.strokeStyle = 'rgba(145, 175, 255, 0.30)'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.72, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(145, 175, 255, 0.14)'; ctx.lineWidth = 22;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.92, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // flameScale > 1 means launch flame (bigger, multi-layer)
    function drawRocket(x, y, angle, thrusting, flameScale) {
        flameScale = flameScale || 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const launching = flameScale > 1;

        if (thrusting || launching) {
            const fl  = 0.65 + Math.random() * 0.35;
            const ext = launching ? flameScale * (1 + Math.random() * 0.35) : 1;

            // outer orange flame
            ctx.fillStyle = `rgba(255, 108, 18, ${fl})`;
            ctx.beginPath();
            ctx.moveTo(-3.5 * Math.min(ext, 2.8), 8);
            ctx.lineTo( 3.5 * Math.min(ext, 2.8), 8);
            ctx.lineTo(0, 18 + Math.random() * 10 * ext);
            ctx.closePath(); ctx.fill();

            // inner yellow flame
            ctx.fillStyle = `rgba(255, 218, 48, ${fl * 0.75})`;
            ctx.beginPath();
            ctx.moveTo(-1.8 * Math.min(ext, 2), 8);
            ctx.lineTo( 1.8 * Math.min(ext, 2), 8);
            ctx.lineTo(0, 13 + Math.random() * 5 * ext);
            ctx.closePath(); ctx.fill();

            // white-hot core during big flames
            if (ext > 2) {
                ctx.fillStyle = `rgba(255, 255, 220, ${fl * 0.88})`;
                ctx.beginPath();
                ctx.moveTo(-1, 8); ctx.lineTo(1, 8);
                ctx.lineTo(0, 12 + Math.random() * 3);
                ctx.closePath(); ctx.fill();
            }

        } else if (state === 'idle' && Math.random() < 0.04) {
            ctx.fillStyle = 'rgba(255, 195, 90, 0.28)';
            ctx.beginPath();
            ctx.moveTo(-2, 7); ctx.lineTo(2, 7); ctx.lineTo(0, 13);
            ctx.closePath(); ctx.fill();
        }

        ctx.fillStyle = '#7766bb';
        ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-11, 11); ctx.lineTo(-5, 9); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo( 5, 3); ctx.lineTo( 11, 11); ctx.lineTo( 5, 9); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#d0daff';
        ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(5.5, 5); ctx.lineTo(-5.5, 5); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#64ffda';
        ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(3.5, -6); ctx.lineTo(-3.5, -6); ctx.closePath(); ctx.fill();

        ctx.fillStyle = 'rgba(120, 210, 255, 0.65)';
        ctx.beginPath(); ctx.arc(0, -1.5, 2.8, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    function drawLaunchSmoke() {
        // Engine pre-glow (warm-up before ignition)
        if (launchTimer > 8 && launchTimer < 32) {
            const g  = Math.min(1, (launchTimer - 8) / 20);
            const gx = rocket.x;
            const gy = rocket.y + 10;
            const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22 * g);
            grad.addColorStop(0, `rgba(255, 180, 40, ${g * 0.55})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(gx, gy, 22 * g, 0, Math.PI * 2); ctx.fill();
        }

        // Smoke / steam clouds
        for (const s of launchSmoke) {
            const r = s.size + (s.maxSize - s.size) * (1 - s.life);
            ctx.beginPath();
            ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(205, 215, 235, ${s.life * 0.36})`;
            ctx.fill();
        }
    }

    function drawCollectibles() {
        const scrollY = window.scrollY;
        for (const c of collectibles) {
            const vy = c.pageY - scrollY;
            if (vy < -30 || vy > H + 30) continue;
            const pulse = 0.7 + 0.3 * Math.sin(c.phase);
            const r = c.size * pulse;
            const cx = c.pageX, cy = vy;

            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4);
            glow.addColorStop(0, `rgba(100, 255, 218, ${0.30 * pulse})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(cx, cy, r * 4, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = `rgba(200, 255, 242, ${0.92 * pulse})`;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = `rgba(100, 255, 218, ${0.6 * pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 2.2);
            ctx.lineTo(cx, cy + r * 2.2);
            ctx.moveTo(cx - r * 2.2, cy);
            ctx.lineTo(cx + r * 2.2, cy);
            ctx.stroke();
        }
    }

    function drawSparkles() {
        for (const s of sparkles) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 3 * s.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 255, 218, ${s.life * 0.9})`;
            ctx.fill();
        }
    }

    function spawnParticle(x, y, angle) {
        particles.push({
            x, y,
            vx: Math.cos(angle + Math.PI) * (0.9 + Math.random() * 1.3) + (Math.random() - 0.5) * 0.9,
            vy: Math.sin(angle + Math.PI) * (0.9 + Math.random() * 1.3) + (Math.random() - 0.5) * 0.9,
            life: 1,
            size: 1.2 + Math.random() * 1.6,
        });
        if (particles.length > 100) particles.shift();
    }

    // ── Update ─────────────────────────────────────────
    function update() {
        t += 0.016;

        // Launch sequence
        if (state === 'launching') {
            launchTimer++;
            const prog    = launchTimer / LAUNCH_DUR;
            const baseY   = PY - R - 15;

            // Phase 1 (0-25%): shake builds up
            // Phase 2 (25-50%): ignition, smoke starts, shake peaks
            // Phase 3 (50-100%): liftoff, rocket rises, shake stops
            const shakeMag = launchTimer < LAUNCH_DUR * 0.5
                ? Math.min(4.5, launchTimer * 0.14)
                : 0;
            const shake = (Math.random() - 0.5) * shakeMag;

            let riseAmount = 0;
            if (prog > 0.48) {
                const rp = (prog - 0.48) / 0.52;
                riseAmount = rp * rp * 175;
            }

            rocket.x = PX + shake;
            rocket.y = baseY - riseAmount;

            // Spawn smoke after ignition starts
            if (launchTimer > 20) {
                const nozzleY = rocket.y + 8;
                if (launchTimer % 2 === 0)             spawnLaunchSmoke(rocket.x, nozzleY);
                if (launchTimer > 32)                   spawnLaunchSmoke(rocket.x, nozzleY);
                if (launchTimer > 45 && Math.random() < 0.5) spawnLaunchSmoke(rocket.x, nozzleY);
            }

            if (launchTimer >= LAUNCH_DUR) {
                state = 'flying';
                rocket.vx = 0;
                rocket.vy = -2.8;
            }
        }

        if (state === 'flying') {
            hintAlpha = Math.max(0, hintAlpha - 0.006);

            const thrust = keys['ArrowUp']    || keys['w'] || keys['W'];
            const left   = keys['ArrowLeft']  || keys['a'] || keys['A'];
            const right  = keys['ArrowRight'] || keys['d'] || keys['D'];

            rocket.thrusting = thrust;
            if (left)  rocket.angle -= 0.065;
            if (right) rocket.angle += 0.065;

            if (thrust) {
                rocket.vx += Math.cos(rocket.angle - Math.PI / 2) * 0.13;
                rocket.vy += Math.sin(rocket.angle - Math.PI / 2) * 0.13;
                spawnParticle(rocket.x, rocket.y, rocket.angle - Math.PI / 2);
            }

            const dx   = PX - rocket.x;
            const dy   = PY - rocket.y;
            const dist = Math.hypot(dx, dy);
            const g    = 3.0 / dist;
            rocket.vx += (dx / dist) * g;
            rocket.vy += (dy / dist) * g;

            const spd = Math.hypot(rocket.vx, rocket.vy);
            if (spd > 5.5) { rocket.vx = rocket.vx / spd * 5.5; rocket.vy = rocket.vy / spd * 5.5; }

            rocket.x += rocket.vx;
            rocket.y += rocket.vy;

            if (rocket.x < -25) rocket.x = W + 25;
            if (rocket.x > W + 25) rocket.x = -25;

            const EDGE = 90;
            if (rocket.y < EDGE) {
                window.scrollBy(0, -Math.ceil((EDGE - rocket.y) / EDGE * 8));
            } else if (rocket.y > H - EDGE) {
                window.scrollBy(0, Math.ceil((rocket.y - (H - EDGE)) / EDGE * 8));
            }
            const navH = document.querySelector('.navbar') ? document.querySelector('.navbar').offsetHeight : 60;
            if (rocket.y < navH + 10) { rocket.y = navH + 10; if (rocket.vy < 0) rocket.vy = 0; }
            if (rocket.y > H - 15) { rocket.y = H - 15; if (rocket.vy > 0) rocket.vy = 0; }

            if (dist < R + 12) {
                state = 'idle';
                window._rocketFlying = false;
                particles.length = 0;
                collectibles.length = 0;
                sparkles.length = 0;
                rocket.vx = rocket.vy = 0;
                celebrateTimer = 55;
            }

            const scrollY = window.scrollY;
            for (let i = collectibles.length - 1; i >= 0; i--) {
                const c = collectibles[i];
                const vy = c.pageY - scrollY;
                if (Math.hypot(rocket.x - c.pageX, rocket.y - vy) < 20 + c.size) {
                    spawnSparkles(c.pageX, vy);
                    collectibles.splice(i, 1);
                    score++;
                    if (collectibles.length === 0 && !allStarsFound) {
                        allStarsFound = true;
                        triggerEasterEgg();
                    }
                }
            }

            for (const c of collectibles) c.phase += 0.045;
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.95; p.vy *= 0.95;
            p.life -= 0.034;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = sparkles.length - 1; i >= 0; i--) {
            const s = sparkles[i];
            s.x += s.vx; s.y += s.vy;
            s.vx *= 0.91; s.vy *= 0.91;
            s.life -= 0.042;
            if (s.life <= 0) sparkles.splice(i, 1);
        }

        for (let i = fireworks.length - 1; i >= 0; i--) {
            const f = fireworks[i];
            f.x += f.vx; f.y += f.vy;
            f.vx *= 0.96; f.vy *= 0.96;
            f.vy += 0.04;
            f.life -= 0.018;
            if (f.life <= 0) fireworks.splice(i, 1);
        }

        for (let i = launchSmoke.length - 1; i >= 0; i--) {
            const s = launchSmoke[i];
            s.x  += s.vx; s.y  += s.vy;
            s.vx *= 0.97; s.vy *= 0.96;
            s.life -= 0.015;
            if (s.life <= 0) launchSmoke.splice(i, 1);
        }

        if (easterEggTimer > 0) {
            easterEggTimer--;
            easterEggText.y -= 0.28;
            if (easterEggTimer < 80) easterEggText.alpha = easterEggTimer / 80;
        }

        if (celebrateTimer > 0) celebrateTimer--;
    }

    // ── Draw frame ─────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, W, H);

        drawPlanet();

        // Launch smoke renders behind rocket
        if (state === 'launching' || launchSmoke.length > 0) drawLaunchSmoke();

        if (state === 'flying') {
            drawCollectibles();
            drawSparkles();
        }

        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = allStarsFound
                ? `hsla(${(t * 180 + p.life * 120) % 360}, 100%, 70%, ${p.life * 0.9})`
                : `rgba(255, 152, 48, ${p.life * 0.85})`;
            ctx.fill();
        }

        for (const f of fireworks) {
            ctx.beginPath();
            ctx.arc(f.x, f.y, 3 * f.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${f.hue}, 100%, 70%, ${f.life})`;
            ctx.fill();
        }

        if (easterEggTimer > 0) {
            ctx.save();
            ctx.globalAlpha = easterEggText.alpha;
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#64ffda';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#ffffff';
            ctx.fillText('✨ All stars found! ✨', W / 2, easterEggText.y);
            ctx.font = '13px system-ui, sans-serif';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(200, 255, 240, 0.85)';
            ctx.fillText(`${totalStars} / ${totalStars} collected`, W / 2, easterEggText.y + 28);
            ctx.restore();
        }

        if (state === 'idle') {
            const p = idlePos();

            const pulse = 0.5 + 0.5 * Math.sin(t * 2.8);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 16 + pulse * 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 255, 200, ${0.20 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            drawRocket(p.x, p.y, p.angle, false);

            if (hintAlpha > 0.02) {
                ctx.fillStyle = `rgba(200, 218, 255, ${hintAlpha * 0.48})`;
                ctx.font = '11px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('click to launch', p.x, p.y - 30);
            }

        } else {
            // Compute launch flame scale: grows during ignition phase (25-50% of LAUNCH_DUR)
            let flameScale = 1;
            if (state === 'launching') {
                const prog = launchTimer / LAUNCH_DUR;
                if (prog > 0.22) {
                    flameScale = 1 + Math.min(3.8, ((prog - 0.22) / 0.22) * 3.8);
                }
            }

            drawRocket(rocket.x, rocket.y, rocket.angle, rocket.thrusting, flameScale);

            if (state === 'flying' && hintAlpha > 0.04) {
                ctx.fillStyle = `rgba(200, 218, 255, ${hintAlpha * 0.38})`;
                ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('↑  thrust     ←  →  steer', W / 2, H - 18);
            }

            // Score counter (below navbar)
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillStyle = allStarsFound
                ? `hsla(${(t * 120) % 360}, 100%, 75%, 0.9)`
                : 'rgba(100, 255, 218, 0.72)';
            ctx.fillText(`★ ${score} / ${totalStars}`, W - 18, 80);
        }

        if (celebrateTimer > 0) {
            const a  = celebrateTimer / 55;
            const gl = ctx.createRadialGradient(PX, PY, 0, PX, PY, R * 2.5);
            gl.addColorStop(0, `rgba(100, 255, 200, ${a * 0.32})`);
            gl.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gl;
            ctx.fillRect(0, 0, W, H);
        }
    }

    function loop() { update(); draw(); requestAnimationFrame(loop); }
    loop();
})();
