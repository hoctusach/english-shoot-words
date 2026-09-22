import type { App } from '@/App';
import type { WordSet } from '@/types/wordset';
import { getWordSet, recordBestScore } from '@/data/wordSetStore';
import { addRoundResult } from '@/data/statsStore';
import { escapeHtml } from '@/utils/dom';
import { t } from '@/i18n';

export function renderGameOverScreen(
  root: HTMLElement,
  app: App,
  wordSet: WordSet,
  score: number,
  wordsKilled: number,
): void {
  recordBestScore(wordSet.id, score);
  const stats = addRoundResult(score, wordsKilled);
  const latest = getWordSet(wordSet.id) ?? wordSet;

  const wrap = document.createElement('div');
  wrap.className = 'screen screen-gameover';
  wrap.innerHTML = `
    <h2>${t('gameOver')}</h2>
    <p class="final-score">${t('score', score.toLocaleString())}</p>
    <p class="best-score">${t('bestFor', escapeHtml(latest.name), (latest.bestScore ?? score).toLocaleString())}</p>
    <div class="stats-panel">
      <div class="stats-row"><span>${t('roundWords')}</span><strong>${wordsKilled}</strong></div>
      <div class="stats-row"><span>${t('playerTotal', escapeHtml(stats.playerName))}</span><strong>${stats.totalScore.toLocaleString()}</strong></div>
      <div class="stats-row"><span>${t('totalWordsShot')}</span><strong>${stats.totalWordsShot.toLocaleString()}</strong></div>
    </div>
  `;
  root.appendChild(wrap);

  const againBtn = document.createElement('button');
  againBtn.className = 'btn btn-primary';
  againBtn.textContent = t('playAgain');
  againBtn.addEventListener('click', () => app.showGame(latest));
  wrap.appendChild(againBtn);

  const otherBtn = document.createElement('button');
  otherBtn.className = 'btn';
  otherBtn.textContent = t('anotherSet');
  otherBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(otherBtn);

  const menuBtn = document.createElement('button');
  menuBtn.className = 'btn btn-link';
  menuBtn.textContent = t('menu');
  menuBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(menuBtn);
}
