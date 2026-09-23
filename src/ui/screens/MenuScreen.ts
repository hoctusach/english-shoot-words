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
import { t, getLang, setLang, LANGS, type Lang } from '@/i18n';
import { loadProgress, summarizeProgress } from '@/data/progressStore';
import { escapeHtml } from '@/utils/dom';

export function renderMenuScreen(root: HTMLElement, app: App): ScreenHandle {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-home';
  root.appendChild(wrap);

  wrap.appendChild(renderHero(app));
  wrap.appendChild(renderNote());
  wrap.appendChild(renderStats().el);
  wrap.appendChild(renderContinue(app));

  const setsSection = document.createElement('section');
  setsSection.className = 'sets-section';
  wrap.appendChild(setsSection);
  renderSets(setsSection, app);

  const settings = renderSettings();
  wrap.appendChild(settings.el);

  const storageNote = document.createElement('p');
  storageNote.className = 'home-storage-note';
  storageNote.textContent = t('storageWarning');
  wrap.appendChild(storageNote);

  const credit = document.createElement('p');
  credit.className = 'home-credit';
  credit.textContent = 'credited by hoctusach@gmail.com';
  wrap.appendChild(credit);

  const build = document.createElement('p');
  build.className = 'home-build';
  build.textContent = `build ${__BUILD_ID__}`;
  wrap.appendChild(build);

  return { destroy: settings.destroy };
}

function renderHero(app: App): HTMLElement {
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
    <h1>${t('appNameLead')}<span>${t('appNameAccent')}</span>${t('appNameTail')}</h1>
    <p>${t('tagline')}</p>
  `;

  const toggle = document.createElement('div');
  toggle.className = 'lang-toggle';
  const current = getLang();
  for (const lang of LANGS) {
    const btn = document.createElement('button');
    btn.className = `lang-option${lang === current ? ' active' : ''}`;
    btn.textContent = lang.toUpperCase();
    btn.setAttribute('aria-label', lang === 'vi' ? 'Tiếng Việt' : 'English');
    btn.addEventListener('click', () => {
      if (lang === getLang()) return;
      setLang(lang as Lang);
      app.showMenu();
    });
    toggle.appendChild(btn);
  }
  hero.appendChild(toggle);

  return hero;
}

function renderNote(): HTMLElement {
  const note = document.createElement('p');
  note.className = 'home-note';
  note.innerHTML = `<span aria-hidden="true">💡</span><span>${t('note')}</span>`;
  return note;
}

function renderStats(): { el: HTMLElement } {
  const el = document.createElement('div');
  el.className = 'chip-row';

  const draw = () => {
    const stats = getStats();
    el.innerHTML = `
      <button class="chip chip-player" type="button">
        <span>${t('player')}</span><strong>${escapeHtml(stats.playerName)}</strong>
      </button>
      <div class="chip"><span>${t('totalScore')}</span><strong>${stats.totalScore.toLocaleString()}</strong></div>
      <div class="chip"><span>${t('wordsShot')}</span><strong>${stats.totalWordsShot.toLocaleString()}</strong></div>
    `;
    el.querySelector<HTMLButtonElement>('.chip-player')!.addEventListener('click', () => {
      const name = prompt(t('yourName'), stats.playerName);
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
      <span class="cta-title">${t('continue')}</span>
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
      <h2>${t('wordSets')}</h2>
      <span class="section-count">${sets.length}</span>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'set-list';
  section.appendChild(list);

  if (sets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = t('noSets');
    list.appendChild(empty);
  }

  for (const set of sets) {
    list.appendChild(renderSetCard(set, app, () => renderSets(section, app)));
  }

  const importCard = document.createElement('button');
  importCard.className = 'import-card';
  importCard.innerHTML = `<span class="import-plus">+</span><span>${t('importTitle')}<small>${t('importSub')}</small></span>`;
  importCard.addEventListener('click', () => app.showImport());
  section.appendChild(importCard);
}

function renderSetCard(set: WordSet, app: App, refresh: () => void): HTMLElement {
  const card = document.createElement('article');
  card.className = 'set-card';

  const speed = set.speedFactor ?? defaultSpeedForSet(set.words);
  const meta = [
    t('words', set.words.length.toLocaleString()),
    formatSpeed(speed),
    set.bestScore !== undefined ? t('best', set.bestScore.toLocaleString()) : null,
  ]
    .filter(Boolean)
    .map((part) => `<span>${part}</span>`)
    .join(' · ');

  card.innerHTML = `
    <h3 title="${escapeHtml(set.name)}">${escapeHtml(set.name)}</h3>
    <div class="set-card-foot"><p>${meta}</p></div>
  `;

  const actions = document.createElement('div');
  actions.className = 'set-card-actions';

  const playBtn = document.createElement('button');
  playBtn.className = 'play-btn';
  playBtn.textContent = t('play');
  playBtn.addEventListener('click', () => {
    setLastSelectedSetId(set.id);
    app.showGame(set);
  });

  const renameBtn = document.createElement('button');
  renameBtn.className = 'icon-btn';
  renameBtn.title = t('rename');
  renameBtn.setAttribute('aria-label', t('rename'));
  renameBtn.textContent = '✎';
  renameBtn.addEventListener('click', () => {
    const name = prompt(t('newName'), set.name);
    if (name && name.trim()) {
      renameWordSet(set.id, name.trim());
      refresh();
    }
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn icon-btn-danger';
  deleteBtn.title = t('delete');
  deleteBtn.setAttribute('aria-label', t('delete'));
  deleteBtn.textContent = '🗑';
  deleteBtn.addEventListener('click', () => {
    if (confirm(t('deleteConfirm', set.name))) {
      deleteWordSet(set.id);
      refresh();
    }
  });

  actions.append(renameBtn, deleteBtn, playBtn);
  card.querySelector('.set-card-foot')!.appendChild(actions);
  card.appendChild(renderProgress(set));
  return card;
}

function renderProgress(set: WordSet): HTMLElement {
  const summary = summarizeProgress(set.words, loadProgress(set.id));
  const pct = (n: number) => (summary.total ? (n / summary.total) * 100 : 0);

  const details = document.createElement('details');
  details.className = 'set-progress';

  const hardest = summary.hardest.length
    ? `<ul class="hard-list">${summary.hardest
        .map(
          (w) => `
          <li>
            <span class="hard-word"><b>${escapeHtml(w.term)}</b>${w.meaning ? ` — ${escapeHtml(w.meaning)}` : ''}</span>
            <span class="hard-count"><span class="ok">✓${w.correct}</span> <span class="bad">✗${w.misses}</span></span>
          </li>`,
        )
        .join('')}</ul>`
    : `<p class="progress-empty">${t('noMistakes')}</p>`;

  details.innerHTML = `
    <summary>
      <span class="progress-title">📊 ${t('progress')}</span>
      <span class="progress-mini">${t('progressMini', summary.seen.toLocaleString(), summary.total.toLocaleString(), summary.toReview.toLocaleString())}</span>
    </summary>
    <div class="progress-body">
      <div class="progress-bar" role="img" aria-label="${t('learned', summary.learned)}, ${t('toReview', summary.toReview)}, ${t('unseen', summary.unseen)}">
        <span class="bar-learned" style="width:${pct(summary.learned)}%"></span>
        <span class="bar-review" style="width:${pct(summary.toReview)}%"></span>
      </div>
      <div class="progress-legend">
        <span><i class="dot dot-learned"></i>${t('learned', summary.learned.toLocaleString())}</span>
        <span><i class="dot dot-review"></i>${t('toReview', summary.toReview.toLocaleString())}</span>
        <span><i class="dot dot-unseen"></i>${t('unseen', summary.unseen.toLocaleString())}</span>
      </div>
      <p class="progress-sub">${t('hardest')}</p>
      ${hardest}
      <p class="progress-hint">${t('mixHint')}</p>
    </div>
  `;
  return details;
}

function renderSettings(): { el: HTMLElement; destroy: () => void } {
  const section = document.createElement('section');
  section.className = 'settings-section';
  section.innerHTML = `<div class="section-head"><h2>${t('settings')}</h2></div>`;

  const body = document.createElement('div');
  body.className = 'settings-block';
  section.appendChild(body);

  // background theme
  const bgRow = document.createElement('div');
  bgRow.className = 'settings-row';
  bgRow.innerHTML = `<span class="settings-label">${t('background')}</span>`;
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

  let themeIndex = Math.max(0, BACKGROUND_THEMES.findIndex((theme) => theme.id === getBackgroundThemeId()));
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
  voiceRow.innerHTML = `<span class="settings-label">${t('voice')}</span>`;
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
      option.textContent = t('deviceVoice');
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

  return { el: section, destroy: stopVoiceWatch };
}
