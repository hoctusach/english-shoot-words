// Installing the game as an app (phone home screen or desktop window), offline
// play through the service worker, and asking the browser to keep our saved data.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac with touch
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export function onInstallAvailabilityChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  notify();
  return outcome === 'accepted';
}

export function startPwa(onInstalled: () => void): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
    onInstalled();
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // offline support is a bonus; the game works without it
    });
  }

  // Ask the browser not to clear our localStorage under storage pressure.
  // Installed apps are usually granted this automatically.
  navigator.storage?.persist?.().catch(() => {});
}
