import type { App } from '@/App';
import type { ScreenHandle } from '@/ui/ScreenManager';
import type { WordSet } from '@/types/wordset';
import {
  loadWordSets,
  deleteWordSet,
  renameWordSet,
  getLastSelectedSetId,
  setLastSelectedSetId,
} from '@/data/wordSetStore';
import { getBackgroundThemeId, setBackgroundThemeId, getVoiceName, setVoiceName } from '@/data/settingsStore';
import { BACKGROUND_THEMES } from '@/ui/backgrounds';
import { getStats, setPlayerName } from '@/data/statsStore';
import { getEnglishVoices, onVoicesReady, speak } from '@/audio/pronounce';
import { defaultSpeedForSet } from '@/game/difficultyScore';
import { formatSpeed } from '@/game/DifficultyCurve';
import { escapeHtml } from '@/utils/dom';

export function renderMenuScreen(root: HTMLElement, app: App): ScreenHandle {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-home';
  root.appendChild(wrap);

  wrap.appendChild(renderHero());
  const statsBar = renderStats();
  wrap.appendChild(statsBar.el);
  wrap.appendChild(renderContinue(app));

  const setsSection = document.createElement('section');
  setsSection.className = 'sets-section';
  wrap.appendChild(setsSection);
  renderSets(setsSection, app);

  const settings = renderSettings();
  wrap.appendChild(settings.el);

  return { destroy: settings.destroy };
}

function renderHero(): HTMLElement {
  const hero = document.createElement('header');
  hero.className = 'hero';
  hero.innerHTML = `
    <div class="hero-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="34" height="34">
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"/>
        <line x1="16" y1="3" x2="16" y2="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="16" y1="22" x2="16" y2="29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="3" y1="16" x2="10" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="22" y1="16" x2="29" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="16" cy="16" r="3.5" fill="currentColor"/>
      </svg>
    </div>
    <h1>English <span>Shoot</span> Words</h1>
    <p>Type the falling word to shoot it down — your own vocabulary, your own pace.</p>
  `;
  return hero;
}

function renderStats(): { el: HTMLElement } {
  const el = document.createElement('div');
  el.className = 'chip-row';

  const draw = () => {
    const stats = getStats();
    el.innerHTML = `
      <button class="chip chip-player" type="button">
        <span>Player</span><strong>${escapeHtml(stats.playerName)}</strong>
      </button>
      <div class="chip"><span>Total score</span><strong>${stats.totalScore.toLocaleString()}</strong></div>
      <div class="chip"><span>Words shot</span><strong>${stats.totalWordsShot.toLocaleString()}</strong></div>
    `;
    el.querySelector<HTMLButtonElement>('.chip-player')!.addEventListener('click', () => {
      const name = prompt('Your name', stats.playerName);
      if (name && name.trim()) {
        setPlayerName(name.trim());
        draw();
      }
    });
  };
  draw();

  return { el };
}

function renderContinue(app: App): HTMLElement {
  const holder = document.createElement('div');
  const lastId = getLastSelectedSetId();
  const lastSet = lastId ? loadWordSets().find((s) => s.id === lastId) : undefined;
  if (!lastSet) return holder;

  const btn = document.createElement('button');
  btn.className = 'cta';
  btn.innerHTML = `
    <span class="cta-icon">▶</span>
    <span class="cta-text">
      <span class="cta-title">Continue</span>
      <span class="cta-sub">${escapeHtml(lastSet.name)}</span>
    </span>
  `;
  btn.addEventListener('click', () => app.showGame(lastSet));
  holder.appendChild(btn);
  return holder;
}

function renderSets(section: HTMLElement, app: App): void {
  const sets = loadWordSets();
  section.innerHTML = `
    <div class="section-head">
      <h2>Word sets</h2>
      <span class="section-count">${sets.length}</span>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'set-list';
  section.appendChild(list);

  if (sets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No sets yet — import a word list to start playing.';
    list.appendChild(empty);
  }

  for (const set of sets) {
    list.appendChild(renderSetCard(set, app, () => renderSets(section, app)));
  }

  const importCard = document.createElement('button');
  importCard.className = 'import-card';
  importCard.innerHTML = `<span class="import-plus">+</span><span>Import word list<small>.csv or .xlsx — word, meaning</small></span>`;
  importCard.addEventListener('click', () => app.showImport());
  section.appendChild(importCard);
}

function renderSetCard(set: WordSet, app: App, refresh: () => void): HTMLElement {
  const card = document.createElement('article');
  card.className = 'set-card';

  const speed = set.speedFactor ?? defaultSpeedForSet(set.words);
  const meta = [
    `${set.words.length.toLocaleString()} words`,
    formatSpeed(speed),
    set.bestScore !== undefined ? `★ ${set.bestScore.toLocaleString()}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  card.innerHTML = `
    <h3 title="${escapeHtml(set.name)}">${escapeHtml(set.name)}</h3>
    <div class="set-card-foot"><p>${meta}</p></div>
  `;

  const actions = document.createElement('div');
  actions.className = 'set-card-actions';

  const playBtn = document.createElement('button');
  playBtn.className = 'play-btn';
  playBtn.innerHTML = '▶ Play';
  playBtn.addEventListener('click', () => {
    setLastSelectedSetId(set.id);
    app.showGame(set);
  });

  const renameBtn = document.createElement('button');
  renameBtn.className = 'icon-btn';
  renameBtn.title = 'Rename';
  renameBtn.setAttribute('aria-label', 'Rename');
  renameBtn.textContent = '✎';
  renameBtn.addEventListener('click', () => {
    const name = prompt('New name', set.name);
    if (name && name.trim()) {
      renameWordSet(set.id, name.trim());
      refresh();
    }
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn icon-btn-danger';
  deleteBtn.title = 'Delete';
  deleteBtn.setAttribute('aria-label', 'Delete');
  deleteBtn.textContent = '🗑';
  deleteBtn.addEventListener('click', () => {
    if (confirm(`Delete "${set.name}"?`)) {
      deleteWordSet(set.id);
      refresh();
    }
  });

  actions.append(renameBtn, deleteBtn, playBtn);
  card.querySelector('.set-card-foot')!.appendChild(actions);
  return card;
}

function renderSettings(): { el: HTMLElement; destroy: () => void } {
  const details = document.createElement('details');
  details.className = 'settings-block';
  details.innerHTML = '<summary>Settings</summary>';

  const body = document.createElement('div');
  body.className = 'settings-body';
  details.appendChild(body);

  // background theme
  const bgRow = document.createElement('div');
  bgRow.className = 'settings-row';
  bgRow.innerHTML = '<span class="settings-label">Background</span>';
  const bgSwatch = document.createElement('div');
  bgSwatch.className = 'bg-swatch';
  const bgPrev = document.createElement('button');
  bgPrev.className = 'icon-btn';
  bgPrev.textContent = '◂';
  bgPrev.setAttribute('aria-label', 'Previous background');
  const bgName = document.createElement('span');
  bgName.className = 'bg-name';
  const bgNext = document.createElement('button');
  bgNext.className = 'icon-btn';
  bgNext.textContent = '▸';
  bgNext.setAttribute('aria-label', 'Next background');

  let themeIndex = Math.max(0, BACKGROUND_THEMES.findIndex((t) => t.id === getBackgroundThemeId()));
  const drawTheme = () => {
    const theme = BACKGROUND_THEMES[themeIndex];
    bgSwatch.style.background = theme.previewCss;
    bgName.textContent = theme.name;
  };
  drawTheme();
  const cycle = (delta: number) => {
    themeIndex = (themeIndex + delta + BACKGROUND_THEMES.length) % BACKGROUND_THEMES.length;
    setBackgroundThemeId(BACKGROUND_THEMES[themeIndex].id);
    drawTheme();
  };
  bgPrev.addEventListener('click', () => cycle(-1));
  bgNext.addEventListener('click', () => cycle(1));
  bgRow.append(bgSwatch, bgPrev, bgName, bgNext);
  body.appendChild(bgRow);

  // voice
  const voiceRow = document.createElement('div');
  voiceRow.className = 'settings-row';
  voiceRow.innerHTML = '<span class="settings-label">Voice</span>';
  const voiceSelect = document.createElement('select');
  voiceSelect.className = 'voice-select';
  const testBtn = document.createElement('button');
  testBtn.className = 'icon-btn';
  testBtn.textContent = '▶';
  testBtn.setAttribute('aria-label', 'Test voice');

  const fillVoices = () => {
    const voices = getEnglishVoices();
    const saved = getVoiceName();
    voiceSelect.innerHTML = '';
    if (voices.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'Device default';
      option.value = '';
      voiceSelect.appendChild(option);
      return;
    }
    for (const voice of voices) {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      if (voice.name === saved) option.selected = true;
      voiceSelect.appendChild(option);
    }
  };
  fillVoices();
  const stopVoiceWatch = onVoicesReady(fillVoices);
  voiceSelect.addEventListener('change', () => {
    setVoiceName(voiceSelect.value);
    speak('ready', voiceSelect.value);
  });
  testBtn.addEventListener('click', () => speak('shoot the word', voiceSelect.value));
  voiceRow.append(voiceSelect, testBtn);
  body.appendChild(voiceRow);

  return { el: details, destroy: stopVoiceWatch };
}
