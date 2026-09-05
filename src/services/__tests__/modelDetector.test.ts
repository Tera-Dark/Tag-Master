import { describe, it, expect } from 'vitest';
import { detectModelCapabilities, getModelGroup } from '../modelDetector';

describe('modelDetector', () => {
  describe('detectModelCapabilities', () => {
    it('detects vision for modern multimodal models', () => {
      expect(detectModelCapabilities('gemini-2.0-flash')).toContain('vision');
      expect(detectModelCapabilities('gemini-2.5-pro')).toContain('vision');
      expect(detectModelCapabilities('gpt-4o')).toContain('vision');
      expect(detectModelCapabilities('gpt-4o-mini')).toContain('vision');
      expect(detectModelCapabilities('qwen2.5-vl-72b-instruct')).toContain('vision');
      expect(detectModelCapabilities('claude-3-5-sonnet-20241022')).toContain('vision');
      expect(detectModelCapabilities('llava-v1.6-vicuna-7b')).toContain('vision');
      expect(detectModelCapabilities('florence-2-large')).toContain('vision');
      expect(detectModelCapabilities('joycaption-alpha-two')).toContain('vision');
    });

    it('detects reasoning / deep thinking capability', () => {
      expect(detectModelCapabilities('o1-preview')).toContain('reasoning');
      expect(detectModelCapabilities('o3-mini')).toContain('reasoning');
      expect(detectModelCapabilities('deepseek-r1')).toContain('reasoning');
      expect(detectModelCapabilities('deepseek-ai/DeepSeek-R1-Distill-Qwen-32B')).toContain('reasoning');
      expect(detectModelCapabilities('qwq-32b-preview')).toContain('reasoning');
    });

    it('detects video capability', () => {
      expect(detectModelCapabilities('wan2.1-t2v-14b')).toContain('video');
      expect(detectModelCapabilities('hunyuan-video')).toContain('video');
      expect(detectModelCapabilities('cogvideox-5b')).toContain('video');
    });

    it('detects audio capability', () => {
      expect(detectModelCapabilities('gemini-2.0-flash')).toContain('audio');
      expect(detectModelCapabilities('gpt-4o-audio-preview')).toContain('audio');
      expect(detectModelCapabilities('whisper-large-v3')).toContain('audio');
    });

    it('does not falsely assign vision to text-only models', () => {
      expect(detectModelCapabilities('gpt-3.5-turbo')).not.toContain('vision');
      expect(detectModelCapabilities('deepseek-chat')).not.toContain('vision');
      expect(detectModelCapabilities('meta-llama/Llama-3-70b-chat')).not.toContain('vision');
      expect(detectModelCapabilities('text-embedding-3-small')).not.toContain('vision');
    });
  });

  describe('getModelGroup', () => {
    it('correctly categorizes model families', () => {
      expect(getModelGroup('gemini-2.0-flash')).toBe('gemini');
      expect(getModelGroup('gpt-4o')).toBe('openai');
      expect(getModelGroup('claude-3-5-sonnet')).toBe('anthropic');
      expect(getModelGroup('qwen2.5-vl-7b')).toBe('qwen');
      expect(getModelGroup('deepseek-r1')).toBe('deepseek');
      expect(getModelGroup('joycaption-v2')).toBe('open-vision');
    });
  });
});
