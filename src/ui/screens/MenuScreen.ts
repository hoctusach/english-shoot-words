import type { App } from '@/App';
import { getLastSelectedSetId, getWordSet } from '@/data/wordSetStore';
import { getSpeedSetting, setSpeedSetting, getBackgroundThemeId, setBackgroundThemeId } from '@/data/settingsStore';
import { SPEED_SETTINGS, SPEED_LABELS, type SpeedSetting } from '@/game/DifficultyCurve';
import { BACKGROUND_THEMES, getThemeById } from '@/ui/backgrounds';

export function renderMenuScreen(root: HTMLElement, app: App): void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-menu';
  wrap.innerHTML = `
    <h1>English Shoot Words</h1>
    <p class="subtitle">Type the falling word before it lands. Practice your own vocabulary sets.</p>
  `;
  root.appendChild(wrap);

  const lastId = getLastSelectedSetId();
  const lastSet = lastId ? getWordSet(lastId) : undefined;
  if (lastSet) {
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn btn-primary';
    continueBtn.textContent = `Continue: ${lastSet.name}`;
    continueBtn.addEventListener('click', () => app.showGame(lastSet));
    wrap.appendChild(continueBtn);
  }

  const savedBtn = document.createElement('button');
  savedBtn.className = 'btn';
  savedBtn.textContent = 'Saved word sets';
  savedBtn.addEventListener('click', () => app.showSavedSets());
  wrap.appendChild(savedBtn);

  const importBtn = document.createElement('button');
  importBtn.className = 'btn';
  importBtn.textContent = 'Import word list (.xlsx)';
  importBtn.addEventListener('click', () => app.showImport());
  wrap.appendChild(importBtn);

  const settings = document.createElement('div');
  settings.className = 'menu-settings';

  const speedRow = document.createElement('div');
  speedRow.className = 'settings-row';
  const speedLabel = document.createElement('span');
  speedLabel.className = 'settings-label';
  speedLabel.textContent = 'Speed';
  const speedBtn = document.createElement('button');
  speedBtn.className = 'btn btn-sm';
  let speed = getSpeedSetting();
  const renderSpeed = () => {
    speedBtn.textContent = SPEED_LABELS[speed];
  };
  renderSpeed();
  speedBtn.addEventListener('click', () => {
    const index = SPEED_SETTINGS.indexOf(speed);
    speed = SPEED_SETTINGS[(index + 1) % SPEED_SETTINGS.length] as SpeedSetting;
    setSpeedSetting(speed);
    renderSpeed();
  });
  speedRow.append(speedLabel, speedBtn);
  settings.appendChild(speedRow);

  const bgRow = document.createElement('div');
  bgRow.className = 'settings-row';
  const bgLabel = document.createElement('span');
  bgLabel.className = 'settings-label';
  bgLabel.textContent = 'Background';
  const bgSwatch = document.createElement('div');
  bgSwatch.className = 'bg-swatch';
  const bgPrevBtn = document.createElement('button');
  bgPrevBtn.className = 'btn btn-sm';
  bgPrevBtn.textContent = '◂';
  const bgName = document.createElement('span');
  bgName.className = 'bg-name';
  const bgNextBtn = document.createElement('button');
  bgNextBtn.className = 'btn btn-sm';
  bgNextBtn.textContent = '▸';

  let themeIndex = BACKGROUND_THEMES.findIndex((t) => t.id === getBackgroundThemeId());
  if (themeIndex < 0) themeIndex = 0;
  const renderTheme = () => {
    const theme = BACKGROUND_THEMES[themeIndex];
    bgSwatch.style.background = theme.previewCss;
    bgName.textContent = theme.name;
  };
  renderTheme();

  const cycleTheme = (delta: number) => {
    themeIndex = (themeIndex + delta + BACKGROUND_THEMES.length) % BACKGROUND_THEMES.length;
    const theme = getThemeById(BACKGROUND_THEMES[themeIndex].id);
    setBackgroundThemeId(theme.id);
    renderTheme();
  };
  bgPrevBtn.addEventListener('click', () => cycleTheme(-1));
  bgNextBtn.addEventListener('click', () => cycleTheme(1));

  bgRow.append(bgLabel, bgSwatch, bgPrevBtn, bgName, bgNextBtn);
  settings.appendChild(bgRow);

  wrap.appendChild(settings);
}
