import {
  AiProvider,
  KreaVariant,
  ModernizeResult,
  MossLayoutSpec,
  TargetModelId,
} from '../types/prompt';
import { prepareVisionPayload } from '../utils/imageUtils';
import {
  STUDIO_GEMINI_PROVIDER,
  invokeExternalProvider,
  redactProviderSecret,
} from './providerEngine';

export interface CompileImageResponse {
  prompt: string;
  layoutSpec?: MossLayoutSpec;
  targetModel: TargetModelId;
  kreaVariant?: KreaVariant;
}

const REQUEST_TIMEOUT_MS = 45000;

function withTimeoutSignal(externalSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('Request timed out')),
    REQUEST_TIMEOUT_MS
  );

  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function compileImagePrompt(params: {
  imageUrl: string;
  targetModel: TargetModelId;
  kreaVariant?: KreaVariant;
  triggerWord?: string;
  customInstruction?: string;
  systemInstructionOverride?: string;
  provider?: AiProvider;
  signal?: AbortSignal;
}): Promise<CompileImageResponse> {
  const provider = params.provider ?? STUDIO_GEMINI_PROVIDER;
  const { base64, mimeType } = await prepareVisionPayload(params.imageUrl, 1536);
  const { signal, cleanup } = withTimeoutSignal(params.signal);

  try {
    if (provider.protocol === 'studio_gemini') {
      const response = await fetch('/api/prompts/compile-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          targetModel: params.targetModel,
          kreaVariant: params.kreaVariant ?? 'large',
          triggerWord: params.triggerWord ?? '',
          customInstruction: params.customInstruction ?? '',
          systemInstructionOverride: params.systemInstructionOverride ?? '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      return data as CompileImageResponse;
    }

    // External or Local Vision API provider
    const systemPrompt =
      params.systemInstructionOverride?.trim() ||
      `Analyze the image and compile a prompt formatted strictly for ${params.targetModel}.`;

    const rawText = await invokeExternalProvider({
      provider,
      systemInstruction: systemPrompt,
      userPrompt:
        params.targetModel === 'moss_layout'
          ? 'Compile this image into MOSS-Image Spatial Layout JSON with keys: scene_summary, aspect_ratio, elements (each with label, category, description, bbox [ymin,xmin,ymax,xmax] 0-1000, text_content?). Return JSON only.'
          : `Analyze this image and output ONLY the compiled prompt formatted for ${params.targetModel}.`,
      imageDataUrl: `data:${mimeType};base64,${base64}`,
      signal,
    });

    if (params.targetModel === 'moss_layout') {
      try {
        const parsed = JSON.parse(stripJsonFences(rawText));
        const layoutSpec: MossLayoutSpec = {
          model: 'moss-image',
          aspect_ratio: parsed.aspect_ratio || '4:3',
          prompt: parsed.scene_summary || parsed.prompt || '',
          layout: Array.isArray(parsed.elements || parsed.layout)
            ? (parsed.elements || parsed.layout).map(
                (el: Record<string, unknown>, idx: number) => ({
                  id: `el_${idx + 1}`,
                  label: String(el.label || `Element ${idx + 1}`),
                  category: String(el.category || 'object'),
                  description: String(el.description || ''),
                  bbox:
                    Array.isArray(el.bbox) && el.bbox.length === 4
                      ? (el.bbox as [number, number, number, number])
                      : [100, 100, 900, 900],
                  ...(el.text_content ? { text_content: String(el.text_content) } : {}),
                })
              )
            : [],
          sampler_hint: {
            sampler: 'Flow-Matching Euler',
            steps: 50,
            cfg_scale: 3.5,
            shift: 5.0,
          },
        };
        return {
          prompt: JSON.stringify(layoutSpec, null, 2),
          layoutSpec,
          targetModel: params.targetModel,
        };
      } catch {
        return {
          prompt: rawText,
          targetModel: params.targetModel,
        };
      }
    }

    return {
      prompt: rawText,
      targetModel: params.targetModel,
      kreaVariant: params.kreaVariant,
    };
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      throw new Error(redactProviderSecret(err.message, provider));
    }
    throw err;
  } finally {
    cleanup();
  }
}

export async function modernizePromptText(params: {
  sourcePrompt: string;
  targetModel: TargetModelId;
  kreaVariant?: KreaVariant;
  aspectRatio?: string;
  triggerWord?: string;
  systemInstructionOverride?: string;
  provider?: AiProvider;
  signal?: AbortSignal;
}): Promise<ModernizeResult> {
  const provider = params.provider ?? STUDIO_GEMINI_PROVIDER;
  const { signal, cleanup } = withTimeoutSignal(params.signal);

  try {
    if (provider.protocol === 'studio_gemini') {
      const response = await fetch('/api/prompts/modernize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          sourcePrompt: params.sourcePrompt,
          targetModel: params.targetModel,
          kreaVariant: params.kreaVariant ?? 'large',
          aspectRatio: params.aspectRatio ?? '4:3',
          triggerWord: params.triggerWord ?? '',
          systemInstructionOverride: params.systemInstructionOverride ?? '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      return data as ModernizeResult;
    }

    const systemPrompt =
      params.systemInstructionOverride?.trim() ||
      `Transform the user's source prompt into ${params.targetModel}.`;

    const rawText = await invokeExternalProvider({
      provider,
      systemInstruction: `${systemPrompt}\n\nReturn JSON ONLY with keys: compiled_prompt (string), stripped_buzzwords (string[]), anatomy ([{layer, detail}]), and moss_elements (array if moss_layout else []).`,
      userPrompt: `Source input (aspect ratio ${params.aspectRatio ?? '4:3'}):\n${params.sourcePrompt}`,
      signal,
    });

    try {
      const parsed = JSON.parse(stripJsonFences(rawText));
      let layoutSpec: MossLayoutSpec | undefined;
      if (params.targetModel === 'moss_layout') {
        layoutSpec = {
          model: 'moss-image',
          aspect_ratio: params.aspectRatio ?? '4:3',
          prompt: parsed.compiled_prompt || '',
          layout: Array.isArray(parsed.moss_elements) ? parsed.moss_elements : [],
          sampler_hint: {
            sampler: 'Flow-Matching Euler',
            steps: 50,
            cfg_scale: 3.5,
            shift: 5.0,
          },
        };
      }
      return {
        compiledPrompt:
          params.targetModel === 'moss_layout' && layoutSpec
            ? JSON.stringify(layoutSpec, null, 2)
            : parsed.compiled_prompt || rawText,
        layoutSpec,
        strippedBuzzwords: Array.isArray(parsed.stripped_buzzwords)
          ? parsed.stripped_buzzwords
          : [],
        anatomy: Array.isArray(parsed.anatomy) ? parsed.anatomy : [],
      };
    } catch {
      return {
        compiledPrompt: rawText,
        strippedBuzzwords: [],
        anatomy: [],
      };
    }
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      throw new Error(redactProviderSecret(err.message, provider));
    }
    throw err;
  } finally {
    cleanup();
  }
}
