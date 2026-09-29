import type { App } from '@/App';
import type { WordSet } from '@/types/wordset';
import { challengeBoard, getSession, recentPractice, type Session } from '@/data/sessionStore';
import { getWordSet } from '@/data/wordSetStore';
import { formatSpeed } from '@/game/DifficultyCurve';
import { openChallengeSetup } from '@/ui/components/ChallengeSetup';
import { escapeHtml } from '@/utils/dom';
import { t } from '@/i18n';

const BOARD_SIZE = 10;
const RECENT_PRACTICE = 5;

function shortDate(iso: string): string {
  const d = new Date(iso);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

function accuracy(s: Session): string {
  const tries = s.wordsShot + s.missed;
  return tries ? `${Math.round((s.wordsShot / tries) * 100)}%` : '—';
}

// Table of rounds: rank (challenge only), name, score, words shot, missed, when.
export function sessionTable(rows: Session[], highlightId: string | null, ranked: boolean): string {
  return `
    <table class="round-table">
      <thead><tr>
        ${ranked ? '<th>#</th>' : ''}<th>${t('colName')}</th><th>${t('colScore')}</th><th>${t('colWords')}</th><th>${t('colMissed')}</th><th>${t('colDate')}</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (s, i) => `
          <tr class="${s.id === highlightId ? 'current' : ''}">
            ${ranked ? `<td>${i + 1}</td>` : ''}
            <td>${escapeHtml(s.player)}${s.end === 'stopped' ? ' <span class="stopped" title="' + t('stoppedEarly') + '">⏹</span>' : ''}</td>
            <td><strong>${s.score.toLocaleString()}</strong></td>
            <td>${s.wordsShot}</td>
            <td>${s.missed}</td>
            <td class="when">${shortDate(s.startedAt)}</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>`;
}

export function renderResultsScreen(root: HTMLElement, app: App, wordSet: WordSet, sessionId: string): void {
  const session = getSession(sessionId);
  const set = getWordSet(wordSet.id) ?? wordSet;
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-results';
  root.appendChild(wrap);
  if (!session) {
    app.showMenu();
    return;
  }
  const isChallenge = session.mode === 'challenge';

  let title = isChallenge ? t('resultsChallenge') : t('resultsPractice');
  if (session.end === 'gameover') title = t('resultsOut', session.missLimit ?? 0);

  let extra = '';
  if (isChallenge) {
    const board = challengeBoard(set.id, session.missLimit ?? 0, session.speed);
    const rank = board.findIndex((s) => s.id === session.id) + 1;
    extra = `
      <p class="rank-line">${t('rank', rank, board.length)}</p>
      <h3 class="board-title">🏆 ${t('boardTitle', session.missLimit ?? 0, formatSpeed(session.speed))}</h3>
      ${sessionTable(board.slice(0, BOARD_SIZE), session.id, true)}`;
  } else {
    extra = `
      <h3 class="board-title">${t('recentPractice')}</h3>
      ${sessionTable(recentPractice(set.id, RECENT_PRACTICE), session.id, false)}
      ${set.bestScore !== undefined ? `<p class="best-score">${t('bestFor', escapeHtml(set.name), set.bestScore.toLocaleString())}</p>` : ''}`;
  }

  wrap.innerHTML = `
    <p class="results-mode">${isChallenge ? '🏆 ' + t('challenge') : '▶ ' + t('practice')} · ${escapeHtml(set.name)}</p>
    <h2>${title}</h2>
    <p class="results-player">${escapeHtml(session.player)}</p>
    <p class="final-score">${session.score.toLocaleString()}</p>
    <div class="result-chips">
      <span><strong>${session.wordsShot}</strong>${t('statShot')}</span>
      <span><strong>${session.missed}</strong>${t('statMissed')}</span>
      <span><strong>${accuracy(session)}</strong>${t('statAccuracy')}</span>
    </div>
    ${extra}
    <div class="results-actions"></div>
  `;

  const actions = wrap.querySelector('.results-actions')!;
  const addButton = (label: string, className: string, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    actions.appendChild(btn);
  };
  if (isChallenge) {
    addButton(t('nextChallenger'), 'btn btn-primary', () => openChallengeSetup(app, set, { nextPlayer: true }));
  } else {
    addButton(t('playMore'), 'btn btn-primary', () => app.showGame(set));
  }
  addButton(t('menu'), 'btn', () => app.showMenu());
}
