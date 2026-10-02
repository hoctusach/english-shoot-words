// Input types that put a whole word in at once: a keyboard suggestion or
// autocorrect, a paste, a drop.
const BULK_INPUT_TYPES = new Set([
  'insertReplacementText',
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
]);

const NON_ASCII = /[^\x00-\x7f]/;

export class InputController {
  readonly el: HTMLInputElement;
  private refocusing = false;
  // the value after the last accepted input, restored when a bulk insert is refused
  private lastValue = '';
  // virtual mode: keys are ignored while the round is paused
  enabled = true;

  // `virtual`: letters come from the game's own on-screen keyboard (and any physical
  // keyboard) through type()/backspace(); the input is never focused, so the
  // system keyboard never opens.
  constructor(
    private container: HTMLElement,
    private onInputChange: (value: string) => void,
    private onFocusChange?: (focused: boolean) => void,
    private onBlockedInsert?: () => void,
    private virtual = false,
  ) {
    this.el = document.createElement('input');
    this.el.type = 'text';
    this.el.autocomplete = 'off';
    this.el.autocapitalize = 'off';
    this.el.spellcheck = false;
    this.el.setAttribute('autocorrect', 'off');
    this.el.setAttribute('inputmode', 'text');
    this.el.className = 'typing-input';
    if (virtual) {
      this.el.readOnly = true;
      this.el.inputMode = 'none';
      this.el.tabIndex = -1;
      this.el.setAttribute('aria-hidden', 'true');
      container.appendChild(this.el);
      window.addEventListener('keydown', this.handlePhysicalKey);
      return;
    }
    this.el.addEventListener('input', this.handleInput);
    this.el.addEventListener('focus', this.handleFocus);
    this.el.addEventListener('blur', this.handleBlur);
    container.appendChild(this.el);
    // Tapping the play area must not move focus off the input (that closes the
    // mobile keyboard); a tap then re-opens it.
    container.addEventListener('mousedown', this.keepFocus);
    container.addEventListener('click', this.refocus);
  }

  // Typing adds one character per input event. Tapping a word in the mobile
  // keyboard's suggestion strip adds the rest of the word in one go, which would
  // skip the typing practice, so it is undone.
  private handleInput = (e: Event): void => {
    const value = this.el.value;
    const inputType = (e as InputEvent).inputType ?? '';
    const grewBy = value.length - this.lastValue.length;
    // a Vietnamese input method swapping in a toned/accented letter, not a suggestion
    const vietnameseEdit = inputType === 'insertReplacementText' && grewBy <= 1 && NON_ASCII.test(value);
    if (grewBy > 1 || (BULK_INPUT_TYPES.has(inputType) && !vietnameseEdit)) {
      this.el.value = this.lastValue;
      this.onBlockedInsert?.();
      return;
    }
    this.lastValue = value;
    this.onInputChange(value);
  };

  // One key from the on-screen keyboard: the same as typing it into the field.
  type(ch: string): void {
    if (!this.enabled) return;
    this.commit(this.lastValue + ch);
  }

  backspace(): void {
    if (this.enabled && this.lastValue) this.commit(this.lastValue.slice(0, -1));
  }

  private commit(value: string): void {
    this.el.value = value;
    this.lastValue = value;
    this.onInputChange(value);
  }

  // A tablet with a keyboard attached, or a computer forced into touch mode.
  private handlePhysicalKey = (e: KeyboardEvent): void => {
    if (!this.enabled || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      this.backspace();
    } else if (e.key.length === 1) {
      e.preventDefault();
      this.type(e.key);
    }
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
    if (this.virtual) return;
    this.refocusing = true;
    if (this.isFocused) this.el.blur();
    this.el.focus({ preventScroll: true });
    this.refocusing = false;
    this.onFocusChange?.(this.isFocused);
  }

  clear(): void {
    this.setValue('');
  }

  setValue(value: string): void {
    this.el.value = value;
    this.lastValue = value;
  }

  get value(): string {
    return this.el.value;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handlePhysicalKey);
    this.el.removeEventListener('input', this.handleInput);
    this.el.removeEventListener('focus', this.handleFocus);
    this.el.removeEventListener('blur', this.handleBlur);
    this.container.removeEventListener('mousedown', this.keepFocus);
    this.container.removeEventListener('click', this.refocus);
    this.el.remove();
  }
}
