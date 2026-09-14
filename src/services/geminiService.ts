// Compatibility facade: all supported protocols use the same transport and validation.
import { AppSettings, DEFAULT_TEMPLATES } from '../types';
import { processImage } from './imageProcessor';
import { activeConnection, resolveEndpoint, taggingProblem } from './providers/connection';
import { generateText } from './providers/generation';
import { ProviderError } from './providers/errors';
export {
  RateLimitError,
  parseRetryAfter,
  isRateLimitResponse,
  ProviderError,
} from './providers/errors';
export type { ApiErrorData, ApiErrorDetail } from './providers/errors';

export function normalizeCaption(
  text: string,
  settings: Pick<AppSettings, 'activePrompt' | 'captionFormat'>
): string {
  // Never silently reformat a user's edited/custom prompt.
  const format = DEFAULT_TEMPLATES.find((t) => t.value === settings.activePrompt)?.format;
  if (!format) return text.trim();
  const clean = text
    .trim()
    .replace(/^```(?:text|plaintext)?\s*\n/i, '')
    .replace(/\n```$/, '')
    .trim();
  if (format !== 'tags') return clean;
  return [
    ...new Set(
      clean
        .split(/[,\n]+/)
        .map((tag) =>
          tag
            .replace(/^\s*[-•]\s*/, '')
            .replace(/_/g, ' ')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ),
  ].join(', ');
}

export const generateCaption = async (
  file: File,
  settings: AppSettings,
  signal?: AbortSignal
): Promise<string> => {
  const problem = taggingProblem(settings);
  if (problem) throw new ProviderError(problem);
  if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
  const s = activeConnection(settings);
  const image = await processImage(file);
  const text = await generateText(s, s.model, s.activePrompt, image, signal);
  return normalizeCaption(text, s);
};

export interface ConnectionTestResult {
  latencyMs: number;
  model: string;
  endpoint: string;
  preview: string;
  mode: 'vision' | 'text';
}
// A small real PNG, not an unsupported GIF or an empty file. No user images are sent by this diagnostic.
const TEST_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAYklEQVR4nO3PMQ0AIADAMMAP/s0gBhEcDcmqYJtn7/GzpQNeNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaBdsB0BtqEpL5IAAAAASUVORK5CYII=';
export const testConnection = async (
  settings: AppSettings,
  signal?: AbortSignal,
  mode: 'vision' | 'text' = 'vision'
): Promise<ConnectionTestResult> => {
  const s = activeConnection(settings);
  const started = performance.now();
  const text = await generateText(
    s,
    s.model,
    mode === 'vision'
      ? 'Describe the dominant visible color in this image using a few English words. Return only the description.'
      : 'Reply with the word OK only.',
    mode === 'vision' ? TEST_IMAGE : undefined,
    signal
  );
  return {
    latencyMs: Math.round(performance.now() - started),
    model: s.model,
    endpoint: resolveEndpoint(s, 'generate', s.model),
    preview: text.slice(0, 240),
    mode,
  };
};
