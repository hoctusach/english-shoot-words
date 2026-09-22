import type { App } from '@/App';
import type { WordSet } from '@/types/wordset';
import { getWordSet, recordBestScore } from '@/data/wordSetStore';
import { addRoundResult } from '@/data/statsStore';
import { escapeHtml } from '@/utils/dom';

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
    <h2>Game over</h2>
    <p class="final-score">Score: ${score}</p>
    <p class="best-score">Best for "${escapeHtml(latest.name)}": ${latest.bestScore ?? score}</p>
    <div class="stats-panel">
      <div class="stats-row"><span>Words shot this round</span><strong>${wordsKilled}</strong></div>
      <div class="stats-row"><span>${escapeHtml(stats.playerName)} — total score</span><strong>${stats.totalScore}</strong></div>
      <div class="stats-row"><span>Total words shot</span><strong>${stats.totalWordsShot}</strong></div>
    </div>
  `;
  root.appendChild(wrap);

  const againBtn = document.createElement('button');
  againBtn.className = 'btn btn-primary';
  againBtn.textContent = 'Play again';
  againBtn.addEventListener('click', () => app.showGame(latest));
  wrap.appendChild(againBtn);

  const otherBtn = document.createElement('button');
  otherBtn.className = 'btn';
  otherBtn.textContent = 'Choose another set';
  otherBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(otherBtn);

  const menuBtn = document.createElement('button');
  menuBtn.className = 'btn btn-link';
  menuBtn.textContent = 'Menu';
  menuBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(menuBtn);
}
