import React from 'react';
import { Check, Save, RotateCcw, Trash2 } from 'lucide-react';
import { AppSettings, DEFAULT_TEMPLATES, PromptTemplate } from '../../../../types';
import { useDialogs } from '../../../ui/DialogContext';

export interface PromptSettingsTabProps {
  localSettings: AppSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}
export const PromptSettingsTab: React.FC<PromptSettingsTabProps> = ({
  localSettings,
  setLocalSettings,
}) => {
  const { confirm, prompt } = useDialogs();
  const templates = [...DEFAULT_TEMPLATES, ...(localSettings.customTemplates || [])];
  const current = templates.find((t) => t.value === localSettings.activePrompt);
  const select = async (template: PromptTemplate) => {
    if (
      !current &&
      localSettings.activePrompt.trim() &&
      !(await confirm('切换格式会替换当前未另存的自定义指令。继续？如需保留，请先“另存为预设”。'))
    )
      return;
    setLocalSettings((s) => ({
      ...s,
      activePrompt: template.value,
      captionFormat: template.format || 'custom',
      promptPresetId: template.id,
    }));
  };
  return (
    <div className='tm-settings-content api-prompts'>
      <header className='api-section-heading'>
        <div>
          <h2>打标指令</h2>
          <p>先确定数据集需要的输出格式，再按素材调整描述范围。</p>
        </div>
        <span className='api-active-badge'>Dataset presets · v3</span>
      </header>
      <div className='api-prompt-choices'>
        {DEFAULT_TEMPLATES.map((template, i) => (
          <button
            type='button'
            className='tm-button api-prompt-choice'
            key={template.id}
            aria-pressed={current?.id === template.id}
            onClick={() => void select(template)}
          >
            <span className='api-prompt-number'>0{i + 1}</span>
            <strong>
              {template.label}
              {i === 0 && <small>默认推荐</small>}
              {current?.id === template.id && <Check size={16} />}
            </strong>
            <p>{template.description}</p>
          </button>
        ))}
      </div>
      <div className='api-prompt-example'>
        <span className='api-note'>格式示例 · 仅用于展示，不会发送给模型</span>
        <pre>
          {current?.example ||
            (current
              ? '此自定义预设没有示例。'
              : '自定义指令：保留模型的原始文本格式，不自动转换为标签。')}
        </pre>
      </div>
      {!!localSettings.customTemplates?.length && (
        <section className='api-custom-presets'>
          <h3>我的预设</h3>
          <div className='api-actions'>
            {localSettings.customTemplates.map((t) => (
              <div key={t.id} className='api-custom-preset'>
                <button
                  type='button'
                  className='tm-button api-button'
                  aria-pressed={current?.id === t.id}
                  onClick={() => void select(t)}
                >
                  {t.label}
                </button>
                <button
                  type='button'
                  className='tm-button api-icon-button'
                  aria-label={`删除预设 ${t.label}`}
                  onClick={async () => {
                    if (await confirm(`删除预设“${t.label}”？当前指令正文不会被删除。`))
                      setLocalSettings((s) => ({
                        ...s,
                        customTemplates: s.customTemplates.filter((item) => item.id !== t.id),
                      }));
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className='api-prompt-editor'>
        <div className='api-section-heading'>
          <label htmlFor='caption-prompt'>
            <h3>指令正文</h3>
            <p>{current ? `当前：${current.label}` : '当前：自定义（未匹配已保存预设）'}</p>
          </label>
          <div className='api-actions'>
            <button
              type='button'
              className='tm-button api-button'
              onClick={async () => {
                const name = await prompt('自定义预设名称', '我的打标指令');
                if (name?.trim()) {
                  const id = crypto.randomUUID();
                  setLocalSettings((s) => ({
                    ...s,
                    promptPresetId: id,
                    customTemplates: [
                      ...s.customTemplates,
                      {
                        id,
                        label: name.trim(),
                        value: s.activePrompt,
                        format: s.captionFormat || 'custom',
                      },
                    ],
                  }));
                }
              }}
            >
              <Save size={14} />
              另存为预设
            </button>
            <button
              type='button'
              className='tm-button api-button'
              onClick={() => void select(DEFAULT_TEMPLATES[0])}
            >
              <RotateCcw size={14} />
              恢复默认
            </button>
          </div>
        </div>
        <textarea
          id='caption-prompt'
          className='tm-input api-mono'
          rows={13}
          spellCheck={false}
          value={localSettings.activePrompt}
          onChange={(e) =>
            setLocalSettings((s) => ({
              ...s,
              activePrompt: e.target.value,
              captionFormat: 'custom',
              promptPresetId: undefined,
            }))
          }
        />
        <p className='api-note'>
          只描述可见内容，不猜测隐藏属性，不强凑标签，不加入生成参数。项目触发词由打标流程统一添加，无需写进指令。现有自定义预设不会因内置预设更新而被覆盖。
        </p>
      </section>
    </div>
  );
};
