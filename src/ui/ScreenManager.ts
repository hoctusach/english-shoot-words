export interface ScreenHandle {
  destroy?: () => void;
}

export type ScreenRenderer = (root: HTMLElement) => ScreenHandle | void;

export class ScreenManager {
  private current: ScreenHandle | void = undefined;

  constructor(private root: HTMLElement) {}

  show(renderer: ScreenRenderer): void {
    if (this.current && this.current.destroy) {
      this.current.destroy();
    }
    this.root.innerHTML = '';
    this.current = renderer(this.root);
  }
}
