/**
 * Body scroll lock for full-screen overlays (e.g. the mobile nav drawer).
 * Simplified port of the comfy.org frontend `scrollLock` — this site has no
 * custom smooth-scroller, so it uses a plain `position: fixed` body lock and
 * restores the scroll position on unlock. Ref-counted so nested locks are safe.
 */
let savedScrollY = 0;
let lockCount = 0;

export function lockScroll(): void {
  lockCount++;
  if (lockCount > 1) return;

  savedScrollY = window.scrollY;
  Object.assign(document.body.style, {
    position: 'fixed',
    top: `-${savedScrollY}px`,
    left: '0',
    right: '0',
  });
}

export function unlockScroll(options?: { skipRestore?: boolean }): void {
  if (lockCount <= 0) return;
  lockCount--;
  if (lockCount > 0) return;

  Object.assign(document.body.style, {
    position: '',
    top: '',
    left: '',
    right: '',
  });

  if (!options?.skipRestore) {
    window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
  }
}
