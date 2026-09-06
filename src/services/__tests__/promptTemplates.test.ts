import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROMPT,
  DEFAULT_TEMPLATES,
  PROMPT_MODE_A,
  PROMPT_MODE_B,
  PROMPT_MODE_C,
  PROMPT_MODE_D,
} from '../../types';

describe('Visual Prompt Compiler v2.1 Templates', () => {
  it('should default to Mode A (Tag + NL Hybrid for LoRA Training)', () => {
    expect(DEFAULT_PROMPT).toBe(PROMPT_MODE_A);
    expect(DEFAULT_TEMPLATES[0].id).toBe('mode-a-illustrious');
    expect(DEFAULT_TEMPLATES[0].mode).toBe('Mode A');
    expect(DEFAULT_TEMPLATES[0].value).toBe(DEFAULT_PROMPT);
  });

  it('should contain all 4 compiler modes with descriptions and modes', () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(4);

    const modes = DEFAULT_TEMPLATES.map(t => t.mode);
    expect(modes).toEqual(['Mode A', 'Mode B', 'Mode D', 'Mode C']);

    DEFAULT_TEMPLATES.forEach(tm => {
      expect(tm.id).toBeTruthy();
      expect(tm.label).toBeTruthy();
      expect(tm.description).toBeTruthy();
      expect(tm.value.length).toBeGreaterThan(100);
      expect(tm.value).toContain('Visual Prompt Compiler v2.1');
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

  it('Mode A should adhere to gold standard Tag + NL specification with Medusa reference', () => {
    expect(PROMPT_MODE_A).toContain('[Part 1: Comma-separated Danbooru Tags]');
    expect(PROMPT_MODE_A).toContain('[Part 2: Rich, Detailed Natural Language Paragraph]');
    expect(PROMPT_MODE_A).toContain('Illustrious');
    expect(PROMPT_MODE_A).toContain('Costume Breakdown');
    // Gold Standard Danbooru tags
    expect(PROMPT_MODE_A).toContain('medusa, monster girl, white hair, snake hair');
    expect(PROMPT_MODE_A).toContain('open white jacket, cleavage, corset, black ribbons, lace-up white pantyhose, bare feet');
    expect(PROMPT_MODE_A).toContain('sitting on giant snake, giant white snake');
    expect(PROMPT_MODE_A).toContain('delicate line art, white background, simple background');
    // Gold Standard Natural Language paragraph
    expect(PROMPT_MODE_A).toContain('A delicate and ethereal character design of a pale Medusa girl');
    expect(PROMPT_MODE_A).toContain('massive, coiled white snake against a pure white background');
    expect(PROMPT_MODE_A).toContain('holographic, iridescent pastel gradients shimmering on the snake scales');
    expect(PROMPT_MODE_A).toContain('clean, cold, yet mesmerizing mythical aesthetic');
  });

  it('Mode B should specify 9-layer hierarchical tag sequence with 30-50 tags', () => {
    expect(PROMPT_MODE_B).toContain('9-LAYER HIERARCHICAL ORDER');
    expect(PROMPT_MODE_B).toContain('Layer 1 (Subject)');
    expect(PROMPT_MODE_B).toContain('Layer 9 (Lighting & Mood)');
    expect(PROMPT_MODE_B).toContain('NovelAI');
    expect(PROMPT_MODE_B).toContain('30-50');
  });

  it('Mode D should specify 4-part structured natural language', () => {
    expect(PROMPT_MODE_D).toContain('[Main Subject & Silhouette]');
    expect(PROMPT_MODE_D).toContain('Composition:');
    expect(PROMPT_MODE_D).toContain('Materials and Lighting:');
    expect(PROMPT_MODE_D).toContain('Mood and Color:');
    expect(PROMPT_MODE_D).toContain('9 visual layers');
  });

  it('Mode C should specify cinematic single paragraph + tail parameters', () => {
    expect(PROMPT_MODE_C).toContain('Midjourney');
    expect(PROMPT_MODE_C).toContain('TAIL PARAMETERS');
    expect(PROMPT_MODE_C).toContain('--ar');
  });
});
