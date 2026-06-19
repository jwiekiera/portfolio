(function () {
    const track = document.getElementById('scrollbar-track');
    const thumb = document.getElementById('scrollbar-thumb');
    if (!track || !thumb) return;

    function scrollMax() { return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
    function trackH()    { return Math.max(1, track.offsetHeight); }
    function thumbH(tH)  {
        return Math.max(32, (window.innerHeight / document.documentElement.scrollHeight) * tH);
    }

    function update() {
        const tH  = trackH();
        const thH = thumbH(tH);
        thumb.style.height = thH + 'px';
        thumb.style.top    = (window.scrollY / scrollMax()) * (tH - thH) + 'px';
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load',   update);
    setTimeout(update, 100);

    // Click on track → jump
    track.addEventListener('click', e => {
        if (thumb.contains(e.target)) return;
        const rect = track.getBoundingClientRect();
        window.scrollTo({ top: ((e.clientY - rect.top) / rect.height) * scrollMax(), behavior: 'smooth' });
    });

    // Drag
    let dragging = false, startY = 0, startScroll = 0;

    thumb.addEventListener('pointerdown', e => {
        thumb.setPointerCapture(e.pointerId);
        dragging    = true;
        startY      = e.clientY;
        startScroll = window.scrollY;
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    thumb.addEventListener('pointermove', e => {
        if (!dragging) return;
        const tH  = trackH();
        const thH = thumbH(tH);
        window.scrollTo({ top: startScroll + (e.clientY - startY) / (tH - thH) * scrollMax() });
    });

    const end = () => { dragging = false; document.body.style.userSelect = ''; };
    thumb.addEventListener('pointerup',     end);
    thumb.addEventListener('pointercancel', end);

})();
