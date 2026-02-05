// Compare slider interactivity
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

  handle.addEventListener('mousedown', () => {
    isDragging = true;
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  document.addEventListener('mousemove', (e) => {
    if (isDragging) updatePosition(e.clientX);
  });

  // Touch support
  handle.addEventListener('touchstart', () => {
    isDragging = true;
  });
  document.addEventListener('touchend', () => {
    isDragging = false;
  });
  document.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches[0]) updatePosition(e.touches[0].clientX);
  });

  // Click to set position
  slider.addEventListener('click', (e) => {
    updatePosition((e as MouseEvent).clientX);
  });
});
