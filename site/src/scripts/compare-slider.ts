document.querySelectorAll('[data-compare-slider]').forEach((slider) => {
  const overlay = slider.querySelector('.compare-overlay') as HTMLElement;
  const handle = slider.querySelector('.compare-handle') as HTMLElement;

  if (!overlay || !handle) return;

  let isDragging = false;

  const updatePosition = (clientX: number) => {
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;

    overlay.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    handle.style.left = `${percent}%`;
  };

  const startDrag = (e: Event) => {
    e.preventDefault();
    isDragging = true;
  };

  slider.addEventListener('mousedown', (e) => {
    startDrag(e);
    updatePosition((e as MouseEvent).clientX);
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      updatePosition(e.clientX);
    }
  });

  slider.addEventListener('touchstart', (e) => {
    startDrag(e);
    if ((e as TouchEvent).touches[0]) updatePosition((e as TouchEvent).touches[0].clientX);
  });
  document.addEventListener('touchend', () => {
    isDragging = false;
  });
  document.addEventListener('touchmove', (e) => {
    if (isDragging && (e as TouchEvent).touches[0]) {
      updatePosition((e as TouchEvent).touches[0].clientX);
    }
  });
});
