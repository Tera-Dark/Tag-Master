import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROMPT,
  DEFAULT_TEMPLATES,
  PROMPT_MODE_A,
  PROMPT_MODE_B,
  PROMPT_MODE_C,
  PROMPT_MODE_D,
} from '../../types';

describe('Visual Prompt Compiler v2.0 Templates', () => {
  it('should default to Mode D (Structured Natural Language)', () => {
    expect(DEFAULT_PROMPT).toBe(PROMPT_MODE_D);
    expect(DEFAULT_TEMPLATES[0].id).toBe('mode-d-flux');
    expect(DEFAULT_TEMPLATES[0].mode).toBe('Mode D');
    expect(DEFAULT_TEMPLATES[0].value).toBe(DEFAULT_PROMPT);
  });

  it('should contain all 4 compiler modes with descriptions and modes', () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(4);

    const modes = DEFAULT_TEMPLATES.map(t => t.mode);
    expect(modes).toEqual(['Mode D', 'Mode A', 'Mode B', 'Mode C']);

    DEFAULT_TEMPLATES.forEach(tm => {
      expect(tm.id).toBeTruthy();
      expect(tm.label).toBeTruthy();
      expect(tm.description).toBeTruthy();
      expect(tm.value.length).toBeGreaterThan(100);
    });
  });

  it('should enforce pure positive rules across all templates (no negative blocks)', () => {
    DEFAULT_TEMPLATES.forEach(tm => {
      expect(tm.value).toMatch(/PURE POSITIVE/i);
      expect(tm.value).toMatch(/ZERO QUALITY/i);
      // Ensures masterpiece & best quality are explicitly banned in rules
      expect(tm.value).toContain('masterpiece');
      expect(tm.value).toContain('best quality');
    });
  });

  it('Mode D should specify 4-part structured natural language', () => {
    expect(PROMPT_MODE_D).toContain('[Main Subject & Silhouette]');
    expect(PROMPT_MODE_D).toContain('Composition:');
    expect(PROMPT_MODE_D).toContain('Materials and Lighting:');
    expect(PROMPT_MODE_D).toContain('Mood and Color:');
    expect(PROMPT_MODE_D).toContain('9 visual layers');
  });

  it('Mode A should specify Danbooru tags + structural sentence', () => {
    expect(PROMPT_MODE_A).toContain('Part 1 (Danbooru Tags)');
    expect(PROMPT_MODE_A).toContain('Part 2 (Structural Sentence)');
    expect(PROMPT_MODE_A).toContain('Illustrious');
  });

  it('Mode B should specify 9-layer hierarchical tag sequence', () => {
    expect(PROMPT_MODE_B).toContain('9-LAYER HIERARCHICAL ORDER');
    expect(PROMPT_MODE_B).toContain('Layer 1 (Subject)');
    expect(PROMPT_MODE_B).toContain('Layer 9 (Lighting & Mood)');
    expect(PROMPT_MODE_B).toContain('NovelAI');
  });

  it('Mode C should specify cinematic single paragraph + tail parameters', () => {
    expect(PROMPT_MODE_C).toContain('Midjourney');
    expect(PROMPT_MODE_C).toContain('TAIL PARAMETERS');
    expect(PROMPT_MODE_C).toContain('--ar');
  });
});
