document.querySelectorAll('[data-compare-slider]').forEach((slider) => {
  const overlay = slider.querySelector('.compare-overlay') as HTMLElement;
  const handle = slider.querySelector('.compare-handle') as HTMLElement;

  if (!overlay || !handle) return;

  const updatePosition = (clientX: number) => {
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;

    overlay.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    handle.style.left = `${percent}%`;
  };

  slider.addEventListener('mousemove', (e) => {
    updatePosition((e as MouseEvent).clientX);
  });

  slider.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if ((e as TouchEvent).touches[0]) updatePosition((e as TouchEvent).touches[0].clientX);
  }, { passive: false });
});
