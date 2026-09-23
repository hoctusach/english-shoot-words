import './style.css';
import { App } from '@/App';
import { getLang, setLang } from '@/i18n';
import { checkForNewBuild } from '@/updateCheck';
import { startPwa, isStandalone } from '@/pwa';
import { initAnalytics, track } from '@/analytics';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

setLang(getLang());
initAnalytics();
track('open', { mode: isStandalone() ? 'app' : 'browser', lang: getLang() });
startPwa(() => track('install'));

const app = new App(root);
app.start();

void checkForNewBuild();
