const TARGET_KEY = 'shootwords.updateTarget';
const MIN_INTERVAL_MS = 60_000;

let lastCheck = 0;

// Phones can keep serving an old copy of the page long after a deploy (a restored
// tab, a home-screen icon, an in-app browser). Fetch the current index.html past the
// cache and, if it points at a different script bundle than the one running, reload
// onto a fresh URL. Saved sets and progress live in localStorage, so nothing is lost.
export async function checkForNewBuild(): Promise<void> {
  const running = document.querySelector<HTMLScriptElement>('script[src*="assets/index-"]');
  if (!running) return; // dev server
  // never pull the page out from under a round in progress
  if (document.body.classList.contains('game-active')) return;

  try {
    const base = import.meta.env.BASE_URL;
    const res = await fetch(`${base}index.html`, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const latest = html.match(/assets\/index-[\w-]+\.js/)?.[0];
    if (!latest || running.src.endsWith(latest)) return;
    // Already reloaded towards this exact build and still running the old one (the
    // page is cached somewhere we can't reach): don't loop. A newer build can still
    // reload later in the same tab.
    if (sessionStorage.getItem(TARGET_KEY) === latest) return;
    if (document.body.classList.contains('game-active')) return;
    sessionStorage.setItem(TARGET_KEY, latest);
    location.replace(`${base}?v=${Date.now()}`);
  } catch {
    // offline, blocked, or storage unavailable: keep running what we have
  }
}

function checkThrottled(): void {
  const now = Date.now();
  if (now - lastCheck < MIN_INTERVAL_MS) return;
  lastCheck = now;
  void checkForNewBuild();
}

// Check at startup and again whenever the page comes back into view: a phone tab can
// sit in the background for days.
export function watchForNewBuilds(): void {
  checkThrottled();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkThrottled();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) checkThrottled();
  });
}
