import './style.css';
import { App } from '@/App';
import { getLang, setLang } from '@/i18n';
import { checkForNewBuild } from '@/updateCheck';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

setLang(getLang());

const app = new App(root);
app.start();

void checkForNewBuild();
