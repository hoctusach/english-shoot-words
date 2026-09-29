import type { App } from '@/App';
import type { WordSet } from '@/types/wordset';
import { DEFAULT_MISS_LIMIT, MAX_MISS_LIMIT, hashString } from '@/game/GameMode';
import { formatSpeed, snapSpeedFactor, stepSpeedFactor } from '@/game/DifficultyCurve';
import { defaultSpeedForSet } from '@/game/difficultyScore';
import { getChallengePrefs, setChallengePrefs } from '@/data/sessionStore';
import { getStats } from '@/data/statsStore';
import { escapeHtml } from '@/utils/dom';
import { t } from '@/i18n';

// The card shown before a challenge: who is playing, how many missed words end it,
// and the speed (locked once it starts). `nextPlayer` clears the name for a new child.
export function openChallengeSetup(app: App, set: WordSet, { nextPlayer = false } = {}): void {
  const prefs = getChallengePrefs(set.id);
  let missLimit = prefs?.missLimit ?? DEFAULT_MISS_LIMIT;
  let speed = snapSpeedFactor(prefs?.speed ?? set.speedFactor ?? defaultSpeedForSet(set.words));
  const name = nextPlayer ? '' : prefs?.lastPlayer ?? getStats().playerName;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <form class="modal-card challenge-setup" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
      <h2 id="challenge-title">🏆 ${t('challenge')}</h2>
      <p class="modal-sub">${escapeHtml(set.name)}</p>
      <label class="field">
        <span>${t('playerNameLabel')}</span>
        <input class="challenge-name" type="text" maxlength="24" autocomplete="off" placeholder="${t('playerNamePlaceholder')}">
      </label>
      <div class="field">
        <span>${t('missLimitLabel')}</span>
        <div class="stepper">
          <button type="button" class="icon-btn limit-down" aria-label="−">−</button>
          <strong class="limit-value"></strong>
          <button type="button" class="icon-btn limit-up" aria-label="+">+</button>
        </div>
      </div>
      <div class="field">
        <span>${t('speedLabel')}</span>
        <div class="stepper">
          <button type="button" class="icon-btn speed-down" aria-label="${t('slower')}">−</button>
          <strong class="speed-value"></strong>
          <button type="button" class="icon-btn speed-up" aria-label="${t('faster')}">+</button>
        </div>
      </div>
      <p class="modal-hint">${t('challengeHint')}</p>
      <div class="modal-actions">
        <button type="button" class="btn cancel-btn">${t('cancel')}</button>
        <button type="submit" class="btn btn-primary start-challenge-btn">${t('startBtn')}</button>
      </div>
    </form>
  `;
  document.body.appendChild(overlay);

  const nameInput = overlay.querySelector<HTMLInputElement>('.challenge-name')!;
  nameInput.value = name;
  const limitValue = overlay.querySelector<HTMLElement>('.limit-value')!;
  const speedValue = overlay.querySelector<HTMLElement>('.speed-value')!;
  const draw = () => {
    limitValue.textContent = t('missLimitValue', missLimit);
    speedValue.textContent = formatSpeed(speed);
  };
  draw();

  const close = () => overlay.remove();
  overlay.querySelector('.limit-down')!.addEventListener('click', () => {
    missLimit = Math.max(1, missLimit - 1);
    draw();
  });
  overlay.querySelector('.limit-up')!.addEventListener('click', () => {
    missLimit = Math.min(MAX_MISS_LIMIT, missLimit + 1);
    draw();
  });
  overlay.querySelector('.speed-down')!.addEventListener('click', () => {
    speed = stepSpeedFactor(speed, -1);
    draw();
  });
  overlay.querySelector('.speed-up')!.addEventListener('click', () => {
    speed = stepSpeedFactor(speed, 1);
    draw();
  });
  overlay.querySelector('.cancel-btn')!.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const player = nameInput.value.trim() || t('playerFallback');
    setChallengePrefs(set.id, { missLimit, speed, lastPlayer: player });
    close();
    // started inside the tap, so the phone keyboard can open
    app.showGame(set, { mode: { kind: 'challenge', missLimit, speed, seed: hashString(set.id) }, player });
  });
  if (nextPlayer) nameInput.focus();
}
