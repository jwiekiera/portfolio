(function () {
    const track    = document.getElementById('proj-track');
    const dotsEl   = document.getElementById('proj-dots');
    const prevBtn  = document.getElementById('proj-prev');
    const nextBtn  = document.getElementById('proj-next');
    const windowEl = track ? track.closest('.carousel__window') : null;
    if (!track || !dotsEl || !prevBtn || !nextBtn || !windowEl) return;

    const cards = Array.from(track.children);
    const total = cards.length;
    let current = 0;

    // Build dot indicators
    const dots = cards.map((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'carousel__dot' + (i === 0 ? ' active' : '');
        btn.setAttribute('aria-label', `Project ${i + 1}`);
        btn.addEventListener('click', () => goTo(i));
        dotsEl.appendChild(btn);
        return btn;
    });

    function syncHeight() {
        const active = track.querySelector('.project.is-active');
        if (active) windowEl.style.height = active.offsetHeight + 'px';
    }

    function updateClasses() {
        const prev = (current - 1 + total) % total;
        const next = (current + 1) % total;

        cards.forEach((card, i) => {
            card.classList.remove('is-active', 'is-prev', 'is-next', 'is-hidden');
            if      (i === current) card.classList.add('is-active');
            else if (i === prev)    card.classList.add('is-prev');
            else if (i === next)    card.classList.add('is-next');
            else                    card.classList.add('is-hidden');
        });

        dots.forEach((d, i) => d.classList.toggle('active', i === current));
        syncHeight();
    }

    function goTo(idx) {
        current = (idx + total) % total;
        updateClasses();
    }

    // Run on first paint so the window gets a height before user scrolls
    updateClasses();

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));

    // Re-sync height on resize (card width changes → image height changes)
    window.addEventListener('resize', syncHeight);

    // Keyboard: only act when the projects section is in view and rocket isn't flying
    document.addEventListener('keydown', e => {
        if (window._rocketFlying) return;
        const section = document.getElementById('projects');
        if (!section) return;
        const { top, bottom } = section.getBoundingClientRect();
        if (top >= window.innerHeight || bottom <= 0) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(current - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    });

    // Touch swipe
    let touchStartX = null;
    track.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', e => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
        touchStartX = null;
    }, { passive: true });
})();
