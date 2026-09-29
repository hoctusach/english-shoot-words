import { ScreenManager } from '@/ui/ScreenManager';
import { renderMenuScreen } from '@/ui/screens/MenuScreen';
import { renderImportScreen } from '@/ui/screens/ImportScreen';
import { renderGameScreen } from '@/ui/screens/GameScreen';
import { renderGameOverScreen } from '@/ui/screens/GameOverScreen';
import type { WordSet } from '@/types/wordset';
import {
  getLastPlayedSetId,
  loadWordSets,
  setLastPlayedSetId,
  setLastSelectedSetId,
} from '@/data/wordSetStore';
import { FIRST_PLAY_SET_ID } from '@/data/seedSets';

export interface ShowGameOptions {
  // open the round paused behind a "start" button (the app just opened)
  waitForStart?: boolean;
}

export class App {
  private screens: ScreenManager;

  constructor(root: HTMLElement) {
    this.screens = new ScreenManager(root);
  }

  // Opening the app goes straight into a round: the set played last, or Ways of
  // Walking on a first visit. `?home=1` in the URL opens Home instead.
  start(): void {
    const set = new URLSearchParams(location.search).has('home') ? undefined : this.setToOpen();
    if (set) this.showGame(set, { waitForStart: true });
    else this.showMenu();
  }

  private setToOpen(): WordSet | undefined {
    const sets = loadWordSets().filter((s) => s.words.length > 0);
    const lastPlayed = getLastPlayedSetId();
    return (
      sets.find((s) => s.id === lastPlayed) ?? sets.find((s) => s.id === FIRST_PLAY_SET_ID) ?? sets[0]
    );
  }

  showMenu = (): void => {
    this.screens.show((root) => renderMenuScreen(root, this));
  };

  showImport = (): void => {
    this.screens.show((root) => renderImportScreen(root, this));
  };

  showGame = (wordSet: WordSet, options: ShowGameOptions = {}): void => {
    setLastPlayedSetId(wordSet.id);
    setLastSelectedSetId(wordSet.id);
    this.screens.show((root) => renderGameScreen(root, this, wordSet, options));
  };

  showGameOver = (wordSet: WordSet, score: number, wordsKilled: number): void => {
    this.screens.show((root) => renderGameOverScreen(root, this, wordSet, score, wordsKilled));
  };
}
