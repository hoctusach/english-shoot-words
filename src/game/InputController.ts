export class InputController {
  readonly el: HTMLInputElement;
  private flashTimeout: number | null = null;

  constructor(
    private container: HTMLElement,
    private onInputChange: (value: string) => void,
  ) {
    this.el = document.createElement('input');
    this.el.type = 'text';
    this.el.autocomplete = 'off';
    this.el.autocapitalize = 'off';
    this.el.spellcheck = false;
    this.el.setAttribute('inputmode', 'text');
    this.el.className = 'typing-input';
    this.el.addEventListener('input', this.handleInput);
    container.appendChild(this.el);
    container.addEventListener('mousedown', this.refocus);
    container.addEventListener('touchend', this.refocus);
  }

  private handleInput = (): void => {
    this.onInputChange(this.el.value);
  };

  private refocus = (): void => {
    this.focus();
  };

  focus(): void {
    this.el.focus({ preventScroll: true });
  }

  clear(): void {
    this.el.value = '';
  }

  get value(): string {
    return this.el.value;
  }

  flashInvalid(): void {
    if (this.flashTimeout !== null) window.clearTimeout(this.flashTimeout);
    this.flashTimeout = window.setTimeout(() => {
      this.el.value = '';
    }, 300);
  }

  destroy(): void {
    if (this.flashTimeout !== null) window.clearTimeout(this.flashTimeout);
    this.el.removeEventListener('input', this.handleInput);
    this.container.removeEventListener('mousedown', this.refocus);
    this.container.removeEventListener('touchend', this.refocus);
    this.el.remove();
  }
}
