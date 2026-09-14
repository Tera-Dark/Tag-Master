/** Global shortcuts must never hijack dialogs, composition, or form navigation. */
export function keyboardContext(
  event: KeyboardEvent,
  modalOpen: boolean
): 'ignore' | 'caption' | 'workspace' {
  if (modalOpen || event.defaultPrevented || event.isComposing) return 'ignore';
  const target = event.target instanceof Element ? event.target : null;
  if (
    target?.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="textbox"]'
    )
  ) {
    return target.id === 'caption-textarea' &&
      event.altKey &&
      ['ArrowLeft', 'ArrowRight'].includes(event.key)
      ? 'caption'
      : 'ignore';
  }
  // Avoid repeat-triggered destructive confirmation queues.
  if (event.repeat && ['Delete', 'Backspace'].includes(event.key)) return 'ignore';
  return 'workspace';
}

/** Blocked words and project trigger tokens are literal text, not regex programs. */
export function removeLiteralTerms(text: string, terms: string[]): string {
  return terms.reduce((result, raw) => {
    const term = raw.trim();
    if (!term) return result;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(
      new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'giu'),
      '$1'
    );
  }, text);
}
