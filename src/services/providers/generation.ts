import { AiProtocol } from '../../types';
import {
  Connection,
  connectionProblem,
  extraBody,
  requestJson,
  resolveEndpoint,
} from './connection';
import { ProviderError } from './errors';

export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

export function buildGenerationBody(
  c: Connection,
  model: string,
  prompt: string,
  imageUrl?: string
): Record<string, unknown> {
  const max = c.maxOutputTokens ?? 4096;
  const image = imageUrl?.match(/^data:([^;]+);base64,(.+)$/s);
  if (imageUrl && !image) throw new ProviderError('图片必须是有效的 base64 data URL。');
  let body: Record<string, unknown>;
  switch (c.protocol) {
    case 'google':
      body = {
        contents: [
          {
            role: 'user',
            parts: [
              ...(image ? [{ inlineData: { mimeType: image[1], data: image[2] } }] : []),
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: max,
          ...(/^gemini-3[.-]/.test(model.replace(/^models\//, ''))
            ? { thinkingConfig: { thinkingLevel: 'low' } }
            : {}),
        },
      };
      break;
    case 'anthropic':
      body = {
        model,
        max_tokens: max,
        messages: [
          {
            role: 'user',
            content: [
              ...(image
                ? [
                    {
                      type: 'image',
                      source: { type: 'base64', media_type: image[1], data: image[2] },
                    },
                  ]
                : []),
              { type: 'text', text: prompt },
            ],
          },
        ],
        ...(/^claude-sonnet-5(?:-|$)/.test(model) ? { thinking: { type: 'disabled' } } : {}),
      };
      break;
    case 'openai_responses':
      body = {
        model,
        store: false,
        max_output_tokens: max,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              ...(image ? [{ type: 'input_image', image_url: imageUrl }] : []),
            ],
          },
        ],
      };
      break;
    default:
      body = {
        model,
        messages: [
          {
            role: 'user',
            content: image
              ? [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: imageUrl } },
                ]
              : prompt,
          },
        ],
        [/^(?:.*\/)?(?:gpt-5(?:[.-]|$)|o\d)/i.test(model) ? 'max_completion_tokens' : 'max_tokens']:
          max,
      };
  }
  // Expert options can extend sampling/reasoning/vendor settings, never replace the selected model/image/prompt.
  const overrides = extraBody(c);
  for (const key of ['model', 'messages', 'contents', 'input']) {
    if (key in overrides)
      throw new ProviderError(`自定义参数不能覆盖 ${key}；请通过模型和提示词设置修改。`);
  }
  const result = { ...body, ...overrides };
  if (c.protocol === 'google')
    result.generationConfig = {
      ...object(body.generationConfig),
      ...object(overrides.generationConfig),
    };
  return result;
}

export function parseGenerationResponse(protocol: AiProtocol, raw: unknown): string {
  const data = object(raw);
  let text = '';
  if (protocol === 'google') {
    const candidate = object(array(data.candidates)[0]);
    const finish = textOf(candidate.finishReason);
    const blocked = object(data.promptFeedback).blockReason;
    if (
      blocked ||
      ['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY'].includes(
        finish
      )
    )
      throw new ProviderError(`内容审查拦截 (${blocked || finish})。`);
    if (finish === 'MAX_TOKENS')
      throw new ProviderError('响应被截断 (Max Tokens)，请提高输出上限或降低思考预算。');
    text = array(object(candidate.content).parts)
      .map(object)
      .filter((part) => !part.thought)
      .map((part) => textOf(part.text))
      .join('');
  } else if (protocol === 'openai_responses') {
    if (data.status === 'incomplete' || data.incomplete_details)
      throw new ProviderError(
        `响应未完成 (Max Tokens / ${object(data.incomplete_details).reason || 'incomplete'})。请检查输出预算。`
      );
    if (data.status === 'failed' || data.error)
      throw new ProviderError('Responses 调用失败；请检查模型权限与请求参数。');
    const parts = array(data.output)
      .map(object)
      .filter((item) => item.type === 'message')
      .flatMap((item) => array(item.content))
      .map(object);
    if (parts.some((p) => p.type === 'refusal'))
      throw new ProviderError('模型拒绝处理这张图片 (content_filter)。');
    text =
      parts
        .filter((p) => p.type === 'output_text')
        .map((p) => textOf(p.text))
        .join('') || textOf(data.output_text);
  } else if (protocol === 'anthropic') {
    if (data.type === 'error')
      throw new ProviderError('Anthropic 返回错误，请检查模型权限与请求参数。');
    if (data.stop_reason === 'max_tokens')
      throw new ProviderError('响应被截断 (Max Tokens)，请提高输出上限。');
    if (data.stop_reason === 'refusal')
      throw new ProviderError('模型拒绝处理这张图片 (content_filter)。');
    text = array(data.content)
      .map(object)
      .filter((p) => p.type === 'text')
      .map((p) => textOf(p.text))
      .join('');
  } else {
    const choice = object(array(data.choices)[0]);
    if (choice.finish_reason === 'length')
      throw new ProviderError('响应被截断 (Max Tokens)，请提高输出上限或降低思考预算。');
    const message = object(choice.message);
    if (choice.finish_reason === 'content_filter' || message.refusal)
      throw new ProviderError('模型拒绝处理这张图片 (content_filter)。');
    text =
      typeof message.content === 'string'
        ? message.content
        : array(message.content)
            .map(object)
            .filter((p) => p.type === 'text' || !p.type)
            .map((p) => textOf(p.text))
            .join('');
  }
  if (!text.trim())
    throw new ProviderError(
      '模型未返回可用文本。可能是不兼容协议、纯推理输出、工具响应，或不支持图片的模型。'
    );
  return text.trim();
}

export async function generateText(
  c: Connection,
  model: string,
  prompt: string,
  imageUrl?: string,
  signal?: AbortSignal
): Promise<string> {
  const problem = connectionProblem(c, model);
  if (problem) throw new ProviderError(problem);
  const body = buildGenerationBody(c, model, prompt, imageUrl);
  const data = await requestJson(
    c,
    resolveEndpoint(c, 'generate', model),
    { method: 'POST', body: JSON.stringify(body) },
    signal
  );
  return parseGenerationResponse(c.protocol, data);
}
