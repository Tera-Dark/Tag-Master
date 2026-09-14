import { useState } from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { AiProvider, AiProtocol } from '../../../../types';
import { PROTOCOL_LABELS, resolveEndpoint } from '../../../../services/providers/connection';

export function ConnectionForm({
  provider,
  onChange,
}: {
  provider: AiProvider;
  onChange: (patch: Partial<AiProvider>) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  let endpoint: string;
  try {
    endpoint = resolveEndpoint(provider, 'generate', provider.selectedModelId || 'MODEL_ID');
  } catch (err) {
    endpoint = (err as Error).message;
  }
  return (
    <section className='api-connection'>
      <div className='api-section-heading'>
        <h3>连接设置</h3>
        <span className='api-note'>修改仅在保存后用于打标</span>
      </div>
      <div className='api-fields-grid'>
        <label className='api-field'>
          API 协议
          <select
            className='tm-input'
            value={provider.protocol}
            onChange={(e) => onChange({ protocol: e.target.value as AiProtocol })}
          >
            {Object.entries(PROTOCOL_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className='api-field'>
          API Key{' '}
          {provider.authMode === 'none' && (
            <span className='api-note'>（免密模式不发送此字段）</span>
          )}
          <span className='api-secret'>
            <input
              aria-label='API Key'
              className='tm-input'
              type={showKey ? 'text' : 'password'}
              autoComplete='off'
              spellCheck={false}
              value={provider.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              placeholder={provider.authMode === 'none' ? '本地服务可留空' : '填写服务商密钥'}
            />
            <button
              type='button'
              className='tm-button api-icon-button'
              aria-label={showKey ? '隐藏密钥' : '显示密钥'}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
      </div>
      <label className='api-field'>
        API 地址
        <input
          className='tm-input api-mono'
          type='url'
          spellCheck={false}
          value={provider.baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
          placeholder='https://your-provider.example/v1'
        />
      </label>
      <p className='api-note'>根地址自动补版本；已有路径按 API 前缀保留。也可填写完整调用端点。</p>
      <div className='api-endpoint'>
        <span>实际请求</span>
        <code>{endpoint}</code>
      </div>
      <details className='api-advanced'>
        <summary>
          高级设置 <span>鉴权、端点、请求参数</span>
        </summary>
        <div className='api-fields-grid'>
          <label className='api-field'>
            鉴权方式
            <select
              className='tm-input'
              value={provider.authMode || 'auto'}
              onChange={(e) => onChange({ authMode: e.target.value as AiProvider['authMode'] })}
            >
              <option value='auto'>跟随协议（推荐）</option>
              <option value='bearer'>Authorization: Bearer</option>
              <option value='x-api-key'>x-api-key</option>
              <option value='api-key'>api-key（Azure 等）</option>
              <option value='none'>无需鉴权（本地服务）</option>
            </select>
          </label>
          <label className='api-field'>
            地址处理
            <select
              className='tm-input'
              value={provider.endpointMode || 'auto'}
              onChange={(e) =>
                onChange({ endpointMode: e.target.value as AiProvider['endpointMode'] })
              }
            >
              <option value='auto'>智能识别 API 前缀 / 标准端点</option>
              <option value='exact'>完整端点（不补路径）</option>
            </select>
          </label>
          <label className='api-field'>
            请求超时（秒）
            <input
              className='tm-input'
              type='number'
              min={5}
              max={600}
              value={provider.requestTimeoutSec ?? 90}
              onChange={(e) => onChange({ requestTimeoutSec: Number(e.target.value) })}
            />
          </label>
          <label className='api-field'>
            最大输出 tokens
            <input
              className='tm-input'
              type='number'
              min={64}
              max={131072}
              value={provider.maxOutputTokens ?? 4096}
              onChange={(e) => onChange({ maxOutputTokens: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className='api-field'>
          模型列表 URL <span className='api-note'>可选 · 必须同源</span>
          <input
            className='tm-input api-mono'
            value={provider.modelsUrl || ''}
            onChange={(e) => onChange({ modelsUrl: e.target.value })}
            placeholder='留空则自动推断；没有列表接口可手动添加模型'
          />
        </label>
        <div className='api-section-heading'>
          <h4>自定义请求头</h4>
          <button
            className='tm-button api-button'
            type='button'
            onClick={() =>
              onChange({
                customHeaders: [...(provider.customHeaders || []), { key: '', value: '' }],
              })
            }
          >
            <Plus size={14} />
            添加请求头
          </button>
        </div>
        {(provider.customHeaders || []).map((h, index) => (
          <div className='api-header-row' key={index}>
            <input
              className='tm-input api-mono'
              aria-label={`请求头名称 ${index + 1}`}
              placeholder='Header-Name'
              value={h.key}
              onChange={(e) =>
                onChange({
                  customHeaders: provider.customHeaders!.map((item, i) =>
                    i === index ? { ...item, key: e.target.value } : item
                  ),
                })
              }
            />
            <input
              className='tm-input api-mono'
              type='password'
              autoComplete='off'
              aria-label={`请求头值 ${index + 1}`}
              placeholder='Value（覆盖默认同名头）'
              value={h.value}
              onChange={(e) =>
                onChange({
                  customHeaders: provider.customHeaders!.map((item, i) =>
                    i === index ? { ...item, value: e.target.value } : item
                  ),
                })
              }
            />
            <button
              type='button'
              className='tm-button api-icon-button'
              aria-label={`删除请求头 ${index + 1}`}
              onClick={() =>
                onChange({ customHeaders: provider.customHeaders!.filter((_, i) => i !== index) })
              }
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <label className='api-field'>
          自定义请求参数（JSON）
          <textarea
            aria-label='自定义请求参数（JSON）'
            className='tm-input api-mono'
            rows={4}
            value={
              provider.requestBodyJson ??
              (provider.requestBody ? JSON.stringify(provider.requestBody, null, 2) : '')
            }
            onChange={(e) => onChange({ requestBodyJson: e.target.value })}
            placeholder={'{\n  "temperature": 0.2\n}'}
          />
        </label>
        <p className='api-note'>
          仅在模型文档要求时添加；不是所有模型都支持
          temperature。参数覆盖默认值，但不能替换模型、图片或提示词。Gemini 3 默认 low 思考；Claude
          Sonnet 5 默认关闭思考。
        </p>
      </details>
      <p className='api-note api-security'>
        密钥仅保存在此浏览器（非加密保险库），随请求发往你配置的服务。浏览器直连需要服务允许
        CORS；HTTPS 页面访问 HTTP 本地服务可能被浏览器拦截。
      </p>
    </section>
  );
}
