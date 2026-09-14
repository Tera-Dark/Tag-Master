import { describe, it, expect } from 'vitest';
import { keyboardContext, removeLiteralTerms } from '../interaction';
function key(tag: string, init: KeyboardEventInit = {}, id = '') {
  const element = document.createElement(tag);
  element.id = id;
  const event = new KeyboardEvent('keydown', { key: 'ArrowRight', ...init });
  Object.defineProperty(event, 'target', { value: element });
  return event;
}
describe('safe workspace shortcuts', () => {
  it.each(['input', 'textarea', 'select'])('does not hijack %s', (tag) =>
    expect(keyboardContext(key(tag, { altKey: true }), false)).toBe('ignore')
  );
  it('allows Alt navigation only from the caption editor', () =>
    expect(keyboardContext(key('textarea', { altKey: true }, 'caption-textarea'), false)).toBe(
      'caption'
    ));
  it('never navigates behind dialogs or during IME composition', () => {
    expect(keyboardContext(key('textarea', { altKey: true }, 'caption-textarea'), true)).toBe(
      'ignore'
    );
    expect(keyboardContext(key('div', { isComposing: true }), false)).toBe('ignore');
  });
  it('does not queue repeated deletion prompts', () =>
    expect(keyboardContext(key('div', { key: 'Delete', repeat: true }), false)).toBe('ignore'));
  it('preserves normal grid navigation', () =>
    expect(keyboardContext(key('div'), false)).toBe('workspace'));
});
describe('literal caption terms', () => {
  it.each(['[token]', 'c++', 'a.b', '(test)', 'x*', 'a\\b'])(
    'handles %s literally without throwing',
    (term) => expect(removeLiteralTerms(`${term}, blue hair`, [term])).toBe(', blue hair')
  );
  it('does not remove substrings or interpret regex operators', () => {
    expect(removeLiteralTerms('cat, category, concatenate', ['cat'])).toBe(
      ', category, concatenate'
    );
    expect(removeLiteralTerms('a.b, axb', ['a.b'])).toBe(', axb');
  });
  it('keeps paragraphs and matches Unicode tokens', () =>
    expect(removeLiteralTerms('标记, portrait\n\nA scene.', ['标记', ' '])).toBe(
      ', portrait\n\nA scene.'
    ));
});
