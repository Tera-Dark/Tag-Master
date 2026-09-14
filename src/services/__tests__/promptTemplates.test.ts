import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROMPT,
  DEFAULT_TEMPLATES,
  PROMPT_MODE_A,
  PROMPT_MODE_B,
  PROMPT_MODE_D,
} from '../../types';
import { normalizeCaption } from '../geminiService';
import { migratePrompt } from '../providers/settingsMigration';
import legacy from '../providers/legacyPrompts.json';

describe('Dataset prompt presets v3', () => {
  it('defaults to a single tag line, not a forced hybrid', () => {
    expect(DEFAULT_PROMPT).toBe(PROMPT_MODE_B);
    expect(DEFAULT_TEMPLATES[0]).toMatchObject({ format: 'tags', value: DEFAULT_PROMPT });
    expect(DEFAULT_PROMPT).toContain('no minimum tag count');
  });
  it('offers three explicit output formats with UI-only examples', () => {
    expect(DEFAULT_TEMPLATES.map((t) => t.format)).toEqual(['tags', 'caption', 'hybrid']);
    for (const template of DEFAULT_TEMPLATES) {
      expect(template.value).toContain('only directly visible');
      expect(template.value).toContain('Omit uncertain details');
      expect(template.value).toContain('Do not add quality');
      expect(template.value).not.toMatch(/medusa|snake hair|--ar|--v |30-50|gold standard/i);
      expect(template.example).toBeTruthy();
      expect(template.value).not.toContain(template.example!);
    }
  });
  it('specifies one natural paragraph and exactly two hybrid blocks', () => {
    expect(PROMPT_MODE_D).toContain('One factual English paragraph');
    expect(PROMPT_MODE_A).toContain('Exactly two blocks separated by one blank line');
  });
  it('updates exact stock prompts but preserves ALL edited prompts and custom intent', () => {
    expect(migratePrompt(legacy.PROMPT_MODE_A)).toBe(DEFAULT_PROMPT);
    expect(migratePrompt(legacy.PROMPT_MODE_B)).toBe(DEFAULT_PROMPT);
    expect(migratePrompt(legacy.PROMPT_MODE_D)).toBe(PROMPT_MODE_D);
    expect(migratePrompt(legacy.PROMPT_MODE_C)).toBe(legacy.PROMPT_MODE_C);
    for (const text of [
      legacy.PROMPT_MODE_A + ' ',
      'Visual Prompt Compiler v2.0 custom instructions',
      'default-danbooru custom',
      '',
    ])
      expect(migratePrompt(text)).toBe(text);
  });
  it('normalizes only an exact stock tag prompt', () => {
    expect(
      normalizeCaption('Red_hair, blue eyes, Red_hair\nportrait', { activePrompt: DEFAULT_PROMPT })
    ).toBe('red hair, blue eyes, portrait');
    expect(
      normalizeCaption('Line_A\n\nLine B', { activePrompt: 'custom', captionFormat: 'tags' })
    ).toBe('Line_A\n\nLine B');
    expect(normalizeCaption('A paragraph.\n\nSecond block.', { activePrompt: PROMPT_MODE_A })).toBe(
      'A paragraph.\n\nSecond block.'
    );
  });
});
