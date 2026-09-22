import { ScreenManager } from '@/ui/ScreenManager';
import { renderMenuScreen } from '@/ui/screens/MenuScreen';
import { renderImportScreen } from '@/ui/screens/ImportScreen';
import { renderSavedSetsScreen } from '@/ui/screens/SavedSetsScreen';
import { renderGameScreen } from '@/ui/screens/GameScreen';
import { renderGameOverScreen } from '@/ui/screens/GameOverScreen';
import type { WordSet } from '@/types/wordset';

export class App {
  private screens: ScreenManager;

  constructor(root: HTMLElement) {
    this.screens = new ScreenManager(root);
  }

  start(): void {
    this.showMenu();
  }

  showMenu = (): void => {
    this.screens.show((root) => renderMenuScreen(root, this));
  };

  showImport = (): void => {
    this.screens.show((root) => renderImportScreen(root, this));
  };

  showSavedSets = (): void => {
    this.screens.show((root) => renderSavedSetsScreen(root, this));
  };

  showGame = (wordSet: WordSet): void => {
    this.screens.show((root) => renderGameScreen(root, this, wordSet));
  };

  showGameOver = (wordSet: WordSet, score: number): void => {
    this.screens.show((root) => renderGameOverScreen(root, this, wordSet, score));
  };
}
