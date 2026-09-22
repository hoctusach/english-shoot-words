// `100vh` on mobile ignores the on-screen keyboard, which pushes the bottom of the
// play area (and the turret) out of sight. visualViewport reports the area that is
// actually visible, so the game screen is sized from that instead.
export function startViewportTracking(): () => void {
  const root = document.documentElement;
  const viewport = window.visualViewport;

  const update = (): void => {
    // Smallest wins: visualViewport shrinks with the mobile keyboard, while
    // innerHeight/clientHeight stay correct when a desktop browser is zoomed
    // (where visualViewport can report more than the window actually shows).
    const candidates = [window.innerHeight, root.clientHeight, viewport?.height].filter(
      (value): value is number => typeof value === 'number' && value > 0,
    );
    const height = Math.min(...candidates);
    root.style.setProperty('--app-height', `${Math.round(height)}px`);
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };

  update();
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);

  return () => {
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    root.style.removeProperty('--app-height');
  };
}
