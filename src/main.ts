import './style.css';
import { App } from '@/App';
import { getLang, setLang } from '@/i18n';
import { watchForNewBuilds } from '@/updateCheck';
import { startPwa, isStandalone } from '@/pwa';
import { initAnalytics, track } from '@/analytics';
import { seedWordSets } from '@/data/seedSets';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

setLang(getLang());
initAnalytics();
track('open', { mode: isStandalone() ? 'app' : 'browser', lang: getLang() });
startPwa(() => track('install'));

const app = new App(root);

// Add any built-in sets this device hasn't had yet before the first screen, so a
// fresh visit opens with sets to play. A device that has them all starts at once.
void seedWordSets()
  .catch(() => false)
  .then(() => {
    app.start();
    watchForNewBuilds();
  });
