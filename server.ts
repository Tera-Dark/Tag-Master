import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(msg);
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      const delayMs = 700 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function formatApiError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return String(parsed.error.message);
  } catch {
    // not JSON
  }
  return raw;
}

type TargetModelId =
  | 'krea2'
  | 'moss_prose'
  | 'moss_layout'
  | 'flux_dit'
  | 'anima'
  | 'lora_hybrid'
  | 'danbooru_tags';

type KreaVariant = 'turbo' | 'medium' | 'large';

function buildImageSystemInstruction(
  targetModel: TargetModelId,
  variant: KreaVariant = 'large',
  triggerWord = '',
  customInstruction = ''
): string {
  const triggerNote = triggerWord.trim()
    ? `Include the exact trigger token "${triggerWord.trim()}" naturally at the beginning of the output.`
    : '';

  const customNote = customInstruction.trim()
    ? `Additional user constraint: ${customInstruction.trim()}`
    : '';

  const baseSafety = `Observe only directly visible content in the image. Never invent unseen identities or narratives. Strictly forbid empty quality buzzwords (masterpiece, best quality, 8k, 4k, ultra detailed, photorealistic, hyperrealistic, score_9, absurdres, highres, award winning, unreal engine). Never output negative prompts or markdown code fences.`;

  switch (targetModel) {
    case 'krea2': {
      const variantGuide =
        variant === 'turbo'
          ? 'Keep the prose crisp and compact (45-65 words) for rapid Krea 2 Turbo composition iteration.'
          : variant === 'medium'
          ? 'Use balanced, stylistically clean prose (60-95 words) optimized for Krea 2 Medium graphic, illustrative, and tonal precision.'
          : 'Write rich, tactile, physically grounded prose (80-130 words) optimized for Krea 2 Large photorealistic texture, surface light interaction, and film stock nuance.';

      return `${baseSafety}
You are compiling a prompt specifically for the Krea 2 foundation image model.
Follow the Krea 2 Prompt Architecture:
1. Natural flowing English prose ONLY (no comma-separated keyword soup).
2. Name the exact medium and shot type in the opening clause (e.g. "An editorial 35mm film photograph of...", "A gouache illustration of...", "A studio product photograph of...").
3. Structure logically: [Shot Type / Medium] + [Subject, Pose & Expression] + [Setting & Background] + [Lighting & Atmosphere] + [Material, Surface & Texture Notes].
4. Lean on tactile material descriptions (brushed anodized aluminum, coarse woven linen, weathered oak, matte stoneware, frosted glass) and how light interacts with them rather than generic color lists.
5. If any visible text, signage, or lettering appears in the image, quote the exact characters inside double quotes (e.g. reading "KISSA LAB").
6. Pure positive phrasing only.
${variantGuide}
${triggerNote}
${customNote}
Return ONLY the compiled prompt paragraph.`;
    }

    case 'moss_prose':
      return `${baseSafety}
You are compiling a prompt specifically for MOSS-Image (OpenMOSS 5B long-context diffusion model).
Follow MOSS-Image Best Practices:
1. Write a coherent, spatially explicit English paragraph (80-160 words) leveraging MOSS-Image's long-context encoder.
2. Clearly anchor spatial relationships (foreground, midground, background, left/right placement, architectural framing).
3. If exact text or signage appears in the image, wrap it in double quotes ("...") and use explicit \\n line breaks if the text spans multiple lines.
4. Describe lighting direction, material finishes, and atmosphere accurately without promotional adjectives or quality tags.
${triggerNote}
${customNote}
Return ONLY the compiled English prompt text.`;

    case 'flux_dit':
      return `${baseSafety}
You are compiling a prompt for modern DiT image models (Flux.2 / Qwen-Image / Gemini Image).
Follow Modern DiT Prompting Rules:
1. Direct, literal natural English prose (70-120 words).
2. Specify optical and spatial grounding where clearly visible: camera perspective, approximate focal framing, depth separation (foreground / midground / background), directional light path, and surface materials.
3. Quote any legible text inside double quotes.
4. Avoid poetic fluff, quality buzzwords, and Midjourney CLI flags (--ar, --v).
${triggerNote}
${customNote}
Return ONLY the compiled prompt paragraph.`;

    case 'anima':
      return `Observe only directly visible content in the image. Never invent unseen identities or narratives. Never output negative prompts, markdown code fences, or CLIP weight brackets like ((...)) or (tag:1.2).
You are compiling a prompt specifically for CircleStone's Anima anime/illustration diffusion model (powered by a Qwen3 text encoder).
Follow the Anima Hybrid Architecture strictly:
1. Start with clean meta/count/subject tags separated by commas and spaces: safe, [subject count like 1girl/1boy/no humans], [framing like cowboy shot / upper body / full body], and 10-22 concise lowercase visual tags for hair, eyes, expression, attire, and key objects.
2. CRITICAL ANIMA RULE: Use natural SPACES inside multi-word tags (e.g. "long hair", "school uniform", "wooden chair"), NOT underscores (except score_7 if used). Do NOT wrap tags in ((...)) or (word:1.2) weights.
3. End with a period followed by 1 to 3 clear natural-language English sentences describing the pose/action, spatial placement of elements, and lighting direction/atmosphere.
${triggerNote}
${customNote}
Return ONLY the compiled Anima prompt.`;

    case 'lora_hybrid':
      return `${baseSafety}
You are compiling a classic Tag-Master Hybrid LoRA dataset caption (Tags + Natural Language).
OUTPUT FORMAT: Exactly two blocks separated by one blank line.
Block 1: One single line of 12-28 concise lowercase English visual tags separated by comma and space, ordered from subject -> pose -> attire/objects -> materials -> composition -> background -> lighting. Use natural spaces in multiword tags.
Block 2: One factual English natural language paragraph (50-100 words) describing the same visible scene cleanly.
${triggerNote}
${customNote}
Return ONLY these two blocks with no headings or labels.`;

    case 'danbooru_tags':
      return `${baseSafety}
You are compiling a classic Tag-Master 9-Layer Pure Visual Tag sequence.
OUTPUT FORMAT: One single line of lowercase English visual tags separated by a comma and a space.
Order strictly across the visible layers: Subject -> Posture/Gaze -> Hair/Face -> Attire/Objects -> Color Accents -> Materials -> Framing/Angle -> Environment -> Lighting/Medium.
No sentences, no nested brackets ((...)), no quality trash, no negative tags.
${triggerNote}
${customNote}
Return ONLY the comma-separated tag line.`;

    default:
      return baseSafety;
  }
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON request payload.' });
    }
    return next(err);
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Compile an image into a target model prompt (Krea 2, MOSS Prose, MOSS Layout JSON, Flux DiT, Hybrid, Tags)
  app.post('/api/prompts/compile-image', async (req, res) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
          code: 'MISSING_API_KEY',
        });
      }

      const {
        imageBase64,
        mimeType = 'image/jpeg',
        targetModel = 'krea2',
        kreaVariant = 'large',
        triggerWord = '',
        customInstruction = '',
        systemInstructionOverride = '',
      } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        targetModel?: TargetModelId;
        kreaVariant?: KreaVariant;
        triggerWord?: string;
        customInstruction?: string;
        systemInstructionOverride?: string;
      };

      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 payload.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const imagePart = {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      };

      if (targetModel === 'moss_layout') {
        const systemInstruction = systemInstructionOverride.trim()
          ? systemInstructionOverride.trim()
          : `You are a spatial layout compiler for MOSS-Image (OpenMOSS).
Analyze the image and produce a structured MOSS-Image native layout specification in JSON.
Rules:
- Identify 3 to 7 key visual elements or text signage regions with accurate normalized bounding boxes [ymin, xmin, ymax, xmax] on a 0 to 1000 integer scale.
- Write a clean, natural English global scene description (no quality buzzwords like 8k, masterpiece, photorealistic).
- If legible text appears in the image, include it verbatim inside double quotes in the scene description and populate text_content on that element (using \\n for multi-line text).
${triggerWord.trim() ? `- Prefix scene_summary with the trigger word "${triggerWord.trim()}".` : ''}
${customInstruction.trim() ? `- User constraint: ${customInstruction.trim()}` : ''}`;

        const response = await withRetry(() =>
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              imagePart,
              {
                text: 'Compile this image into a MOSS-Image Spatial Layout JSON prompt with normalized [ymin, xmin, ymax, xmax] (0-1000) bounding boxes.',
              },
            ],
          },
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scene_summary: {
                  type: Type.STRING,
                  description: 'Coherent natural English description of the entire scene.',
                },
                aspect_ratio: {
                  type: Type.STRING,
                  description: 'Closest standard aspect ratio such as 4:3, 3:4, 1:1, or 16:9.',
                },
                elements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      category: {
                        type: Type.STRING,
                        description: 'One of: subject, object, typography, environment, lighting',
                      },
                      description: { type: Type.STRING },
                      bbox: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER },
                        description: 'Normalized [ymin, xmin, ymax, xmax] integers between 0 and 1000.',
                      },
                      text_content: {
                        type: Type.STRING,
                        description: 'Exact visible text if category is typography, else empty string.',
                      },
                    },
                    required: ['label', 'category', 'description', 'bbox'],
                  },
                },
              },
              required: ['scene_summary', 'aspect_ratio', 'elements'],
            },
          },
          })
        );

        const parsed = JSON.parse((response.text ?? '{}').trim());
        const layoutPayload = {
          model: 'moss-image',
          aspect_ratio: parsed.aspect_ratio || '4:3',
          prompt: parsed.scene_summary || '',
          layout: (parsed.elements || []).map((el: Record<string, unknown>, idx: number) => ({
            id: `el_${idx + 1}`,
            label: el.label,
            category: el.category,
            description: el.description,
            bbox: Array.isArray(el.bbox) && el.bbox.length === 4 ? el.bbox : [100, 100, 900, 900],
            ...(el.text_content ? { text_content: el.text_content } : {}),
          })),
          sampler_hint: {
            sampler: 'Flow-Matching Euler',
            steps: 50,
            cfg_scale: 3.5,
            shift: 5.0,
          },
        };

        return res.json({
          prompt: JSON.stringify(layoutPayload, null, 2),
          layoutSpec: layoutPayload,
          targetModel,
        });
      }

      const systemInstruction = systemInstructionOverride.trim()
        ? systemInstructionOverride.trim()
        : buildImageSystemInstruction(
            targetModel,
            kreaVariant,
            triggerWord,
            customInstruction
          );

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            imagePart,
            {
              text: `Analyze this image and output the compiled prompt strictly formatted for ${targetModel}.`,
            },
          ],
        },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
        })
      );

      const promptText = (response.text ?? '').trim();
      if (!promptText) {
        return res.status(502).json({ error: 'Model returned an empty prompt.' });
      }

      return res.json({
        prompt: promptText,
        targetModel,
        kreaVariant,
      });
    } catch (err: unknown) {
      const message = formatApiError(err, 'Failed to compile image prompt.');
      console.error('[compile-image error]', message);
      return res.status(500).json({ error: message });
    }
  });

  // Modernize a legacy tag-soup prompt OR rough idea into Krea 2 / MOSS-Image / Flux DiT
  app.post('/api/prompts/modernize', async (req, res) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
          code: 'MISSING_API_KEY',
        });
      }

      const {
        sourcePrompt,
        targetModel = 'krea2',
        kreaVariant = 'large',
        aspectRatio = '4:3',
        triggerWord = '',
        systemInstructionOverride = '',
      } = req.body as {
        sourcePrompt?: string;
        targetModel?: TargetModelId;
        kreaVariant?: KreaVariant;
        aspectRatio?: string;
        triggerWord?: string;
        systemInstructionOverride?: string;
      };

      if (!sourcePrompt || !sourcePrompt.trim()) {
        return res.status(400).json({ error: 'Please provide a source prompt or concept.' });
      }

      const defaultModernizeSystem = `You are Tag Master's Next-Gen Prompt Compiler.
Your job is to transform legacy AI art prompts (e.g. Danbooru tag soup, weighted brackets ((...)), quality trash like masterpiece/8k/score_9, Midjourney flags --ar/--v) OR rough Chinese/English creative ideas into clean, modern prompts tailored for next-generation diffusion & flow-matching models.

Target Architecture: ${targetModel}${targetModel === 'krea2' ? ` (${kreaVariant})` : ''}.

Strict Compilation Rules:
- Strip ALL quality trash (masterpiece, best quality, 8k, 4k, ultra detailed, photorealistic, hyperrealistic, score_9, absurdres, trending on artstation, unreal engine) and record every stripped token in stripped_buzzwords.
- Strip legacy CLI flags (--ar, --v, --stylize, --no) and convert negative exclusions into positive visible descriptions.
- If target is krea2: Write natural flowing English prose opening with the exact medium/shot type, describing tactile materials and surface light interaction, wrapping any desired signage text in double quotes. Tailor length to variant (${kreaVariant}).
- If target is moss_prose: Write rich, spatially coherent English prose (up to 4K context friendly) with explicit foreground/midground/background layout and quoted typography using \\n for multi-line text.
- If target is moss_layout: Write a clean spatial English prompt AND generate 3-5 structured layout bounding box elements [ymin, xmin, ymax, xmax] (0-1000) representing key subjects, environment, and typography.
- If target is flux_dit: Write precise optical & camera-grounded natural prose with clear lighting direction and material physics.
- If target is anima: Output CircleStone Anima Hybrid format: start with "masterpiece, best quality, score_7, safe," (or preserve any @artist tag from input), followed by lowercase SPACE-separated Danbooru visual tags (no underscores in visual tags, no ((...)) or (word:1.2) weights — record stripped weights/underscores in stripped_buzzwords), then a period and 1-3 natural English sentences describing action, spatial layout, and lighting.
- If target is lora_hybrid: Output Block 1 (concise lowercase tags) + blank line + Block 2 (factual natural prose).
- If target is danbooru_tags: Output a single line of clean 9-layer lowercase visual tags without weights or quality trash.
${triggerWord.trim() ? `- Include trigger token "${triggerWord.trim()}" at the start.` : ''}`;

      const systemInstruction = systemInstructionOverride.trim()
        ? `${systemInstructionOverride.trim()}\n\nOutput valid JSON matching the requested schema (compiled_prompt, stripped_buzzwords, anatomy, moss_elements).`
        : defaultModernizeSystem;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
        contents: `Source input (target aspect ratio ${aspectRatio}):\n${sourcePrompt.trim()}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              compiled_prompt: {
                type: Type.STRING,
                description: 'The final compiled prompt ready to paste into the target model.',
              },
              stripped_buzzwords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Legacy buzzwords, quality tags, or CLI flags removed from source.',
              },
              anatomy: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    layer: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['layer', 'detail'],
                },
                description: '3 to 5 concise breakdown layers (e.g. Medium, Subject, Material & Light, Spatial Framing).',
              },
              moss_elements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    bbox: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                    },
                    text_content: { type: Type.STRING },
                  },
                  required: ['label', 'category', 'description', 'bbox'],
                },
                description: 'Populated when target is moss_layout; otherwise empty array.',
              },
            },
            required: ['compiled_prompt', 'stripped_buzzwords', 'anatomy'],
          },
        },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());

      let layoutSpec = undefined;
      if (targetModel === 'moss_layout') {
        layoutSpec = {
          model: 'moss-image',
          aspect_ratio: aspectRatio,
          prompt: parsed.compiled_prompt || '',
          layout: (parsed.moss_elements || []).map((el: Record<string, unknown>, idx: number) => ({
            id: `el_${idx + 1}`,
            label: el.label,
            category: el.category,
            description: el.description,
            bbox: Array.isArray(el.bbox) && el.bbox.length === 4 ? el.bbox : [120, 120, 880, 880],
            ...(el.text_content ? { text_content: el.text_content } : {}),
          })),
          sampler_hint: {
            sampler: 'Flow-Matching Euler',
            steps: 50,
            cfg_scale: 3.5,
            shift: 5.0,
          },
        };
      }

      return res.json({
        compiledPrompt:
          targetModel === 'moss_layout'
            ? JSON.stringify(layoutSpec, null, 2)
            : parsed.compiled_prompt || '',
        layoutSpec,
        strippedBuzzwords: parsed.stripped_buzzwords || [],
        anatomy: parsed.anatomy || [],
      });
    } catch (err: unknown) {
      const message = formatApiError(err, 'Failed to modernize prompt.');
      console.error('[modernize error]', message);
      return res.status(500).json({ error: message });
    }
  });

  // Optional CORS-free relay for user-configured external HTTPS AI providers
  app.post('/api/providers/relay', async (req, res) => {
    try {
      const { url, method = 'POST', headers = {}, body } = req.body as {
        url?: string;
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: unknown;
      };

      if (!url) {
        return res.status(400).json({ error: 'Missing target URL.' });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid provider URL.' });
      }

      if (parsedUrl.protocol !== 'https:') {
        return res.status(400).json({
          error: 'Relay only supports public HTTPS endpoints. Local endpoints connect directly from your browser.',
        });
      }

      const host = parsedUrl.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        host === '169.254.169.254' ||
        host.endsWith('.internal')
      ) {
        return res.status(403).json({ error: 'Relay cannot target private or internal addresses.' });
      }

      const upstream = await fetch(parsedUrl.toString(), {
        method: method === 'GET' ? 'GET' : 'POST',
        headers,
        ...(method !== 'GET' && body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      const text = await upstream.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return res.status(upstream.status).json({
          error: `Upstream returned non-JSON (${upstream.status}): ${text.slice(0, 200)}`,
        });
      }

      if (!upstream.ok) {
        return res.status(upstream.status).json(json);
      }

      return res.json(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Provider relay error.';
      return res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tag Master server running at http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
