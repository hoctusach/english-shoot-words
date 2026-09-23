export class InputController {
  readonly el: HTMLInputElement;
  private refocusing = false;

  constructor(
    private container: HTMLElement,
    private onInputChange: (value: string) => void,
    private onFocusChange?: (focused: boolean) => void,
  ) {
    this.el = document.createElement('input');
    this.el.type = 'text';
    this.el.autocomplete = 'off';
    this.el.autocapitalize = 'off';
    this.el.spellcheck = false;
    this.el.setAttribute('inputmode', 'text');
    this.el.className = 'typing-input';
    this.el.addEventListener('input', this.handleInput);
    this.el.addEventListener('focus', this.handleFocus);
    this.el.addEventListener('blur', this.handleBlur);
    container.appendChild(this.el);
    // Tapping the play area must not move focus off the input (that closes the
    // mobile keyboard); a tap then re-opens it.
    container.addEventListener('mousedown', this.keepFocus);
    container.addEventListener('click', this.refocus);
  }

  private handleInput = (): void => {
    this.onInputChange(this.el.value);
  };

  private handleFocus = (): void => {
    if (!this.refocusing) this.onFocusChange?.(true);
  };

  private handleBlur = (): void => {
    if (!this.refocusing) this.onFocusChange?.(false);
  };

  private keepFocus = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private refocus = (): void => {
    this.focus();
  };

  get isFocused(): boolean {
    return document.activeElement === this.el;
  }

  // A mobile keyboard dismissed with its hide/back key leaves the input focused,
  // and focusing an already-focused input does not bring the keyboard back — so
  // blur first. Must run inside a tap/click handler for the keyboard to open.
  focus(): void {
    this.refocusing = true;
    if (this.isFocused) this.el.blur();
    this.el.focus({ preventScroll: true });
    this.refocusing = false;
    this.onFocusChange?.(this.isFocused);
  }

  clear(): void {
    this.el.value = '';
  }

  setValue(value: string): void {
    this.el.value = value;
  }

  get value(): string {
    return this.el.value;
  }

  destroy(): void {
    this.el.removeEventListener('input', this.handleInput);
    this.el.removeEventListener('focus', this.handleFocus);
    this.el.removeEventListener('blur', this.handleBlur);
    this.container.removeEventListener('mousedown', this.keepFocus);
    this.container.removeEventListener('click', this.refocus);
    this.el.remove();
  }
}
