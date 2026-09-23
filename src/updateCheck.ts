const RELOADED_KEY = 'shootwords.updateReload';

// Phones can keep serving an old copy of the page long after a deploy (a restored
// tab, a home-screen icon). At startup, fetch the current index.html past the cache
// and, if it points at a different script bundle than the one running, reload once
// onto a fresh URL. Saved sets and progress live in localStorage, so nothing is lost.
export async function checkForNewBuild(): Promise<void> {
  const running = document.querySelector<HTMLScriptElement>('script[src*="assets/index-"]');
  if (!running) return; // dev server

  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(RELOADED_KEY) === '1';
  } catch {
    return;
  }
  if (alreadyReloaded) return;

  try {
    const base = import.meta.env.BASE_URL;
    const res = await fetch(`${base}index.html`, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const latest = html.match(/assets\/index-[\w-]+\.js/)?.[0];
    if (!latest || running.src.endsWith(latest)) return;
    sessionStorage.setItem(RELOADED_KEY, '1');
    location.replace(`${base}?v=${Date.now()}`);
  } catch {
    // offline or blocked: keep running what we have
  }
}
