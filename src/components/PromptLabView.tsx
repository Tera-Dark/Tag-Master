import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Cpu,
  Loader2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  KREA_VARIANT_LABELS,
  LEGACY_PROMPT_EXAMPLES,
  MODEL_BLUEPRINTS,
} from '../data/modelSpecs';
import { modernizePromptText } from '../services/promptApi';
import { STUDIO_GEMINI_PROVIDER } from '../services/providerEngine';
import {
  AiProvider,
  CustomPromptPreset,
  KreaVariant,
  Language,
  ModernizeResult,
  SpecTuningConfig,
  TargetModelId,
} from '../types/prompt';
import {
  buildCompiledSystemInstruction,
  getEffectiveTuning,
} from '../utils/promptBuilder';

interface PromptLabViewProps {
  defaultModel: TargetModelId;
  defaultVariant: KreaVariant;
  activeProvider: AiProvider;
  modelTunings: Partial<Record<TargetModelId, SpecTuningConfig>>;
  customPresets: CustomPromptPreset[];
  customInstruction: string;
  onOpenSpecTuning: (model: TargetModelId) => void;
  onOpenProviderSettings: () => void;
  language: Language;
  onErrorToast: (msg: string) => void;
  t: (key: string) => string;
}

const RATIOS = ['4:3', '3:4', '1:1', '16:9', '9:16'];
const LAB_MODELS: TargetModelId[] = [
  'krea2',
  'moss_prose',
  'moss_layout',
  'flux_dit',
  'anima',
  'lora_hybrid',
  'danbooru_tags',
];
const BBOX_COLORS = ['#0071E3', '#248A3D', '#B25000', '#7C3AED', '#D70015'];

export const PromptLabView: React.FC<PromptLabViewProps> = ({
  defaultModel,
  defaultVariant,
  activeProvider,
  modelTunings,
  customPresets,
  customInstruction,
  onOpenSpecTuning,
  onOpenProviderSettings,
  language,
  onErrorToast,
  t,
}) => {
  const [sourcePrompt, setSourcePrompt] = useState(LEGACY_PROMPT_EXAMPLES[0].source);
  const [targetModel, setTargetModel] = useState<TargetModelId>(defaultModel);
  const [kreaVariant, setKreaVariant] = useState<KreaVariant>(defaultVariant);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [triggerWord, setTriggerWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ModernizeResult | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSpec = MODEL_BLUEPRINTS[targetModel];

  const handleCompile = async () => {
    if (!sourcePrompt.trim()) return;
    setIsLoading(true);
    try {
      const selectedPreset = customPresets.find((p) => p.id === selectedPresetId);
      const effectiveModel = selectedPreset?.baseModel ?? targetModel;
      const effectiveVariant = selectedPreset?.kreaVariant ?? kreaVariant;
      const systemInstructionOverride = buildCompiledSystemInstruction({
        targetModel: effectiveModel,
        kreaVariant: effectiveVariant,
        tuning: getEffectiveTuning(effectiveModel, modelTunings),
        preset: selectedPreset,
        triggerWord,
        globalCustomInstruction: customInstruction,
      });

      const data = await modernizePromptText({
        sourcePrompt,
        targetModel: effectiveModel,
        kreaVariant: effectiveVariant,
        aspectRatio,
        triggerWord,
        systemInstructionOverride,
        provider: activeProvider ?? STUDIO_GEMINI_PROVIDER,
      });
      setResult(data);
    } catch (err) {
      onErrorToast(err instanceof Error ? err.message : 'Compilation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.compiledPrompt) return;
    await navigator.clipboard.writeText(result.compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1
              className="text-[28px] font-semibold tracking-tight"
              style={{ color: 'var(--label-primary)' }}
            >
              {t('promptLabTitle')}
            </h1>
            <p
              className="text-[14px] mt-2 leading-relaxed"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('promptLabSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenProviderSettings}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[12px] font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
            }}
          >
            <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
            <span>
              {activeProvider.name} · {activeProvider.selectedModelId}
            </span>
          </button>
        </div>

        {/* Two-Column Split Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Source & Target Config */}
          <div
            className="lg:col-span-5 rounded-2xl border p-5 space-y-5"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor: 'var(--separator-hairline)',
            }}
          >
            {/* Quick Examples */}
            <div className="space-y-2">
              <span
                className="text-[12px] font-medium block"
                style={{ color: 'var(--label-secondary)' }}
              >
                {t('quickExamples')}
              </span>
              <div className="flex flex-wrap gap-2">
                {LEGACY_PROMPT_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setSourcePrompt(ex.source);
                      setAspectRatio(ex.aspectRatio);
                      if (ex.id === 'moss-cafe-idea') setTargetModel('moss_layout');
                      else if (ex.id === 'anima-illustration') setTargetModel('anima');
                      else if (ex.id === 'sdxl-portrait') setTargetModel('krea2');
                    }}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
                    style={{
                      borderColor: 'var(--separator-hairline)',
                      color: 'var(--label-primary)',
                      backgroundColor: 'var(--surface-secondary)',
                    }}
                  >
                    {language === 'zh' ? ex.titleZh : ex.titleEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Textarea */}
            <div className="space-y-2">
              <label
                className="text-[12px] font-medium block"
                style={{ color: 'var(--label-secondary)' }}
              >
                {t('sourceInputLabel')}
              </label>
              <textarea
                value={sourcePrompt}
                onChange={(e) => setSourcePrompt(e.target.value)}
                rows={6}
                placeholder={t('sourceInputPlaceholder')}
                className="w-full p-3.5 rounded-xl border text-[13px] leading-relaxed resize-y apple-focus"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderColor: 'var(--separator-hairline)',
                  color: 'var(--label-primary)',
                }}
              />
            </div>

            {/* Target Model Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {t('targetModel')}
                </label>
                <button
                  type="button"
                  onClick={() => onOpenSpecTuning(targetModel)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer"
                  style={{ color: 'var(--accent)' }}
                >
                  <SlidersHorizontal className="w-3 h-3" strokeWidth={1.75} />
                  <span>{t('tuneSpec')}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LAB_MODELS.map((mId) => {
                  const spec = MODEL_BLUEPRINTS[mId];
                  const active = targetModel === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => setTargetModel(mId)}
                      className="text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer"
                      style={{
                        borderColor: active
                          ? 'var(--accent)'
                          : 'var(--separator-hairline)',
                        backgroundColor: active
                          ? 'var(--accent-tint)'
                          : 'var(--surface-secondary)',
                      }}
                    >
                      <div
                        className="text-[13px] font-medium truncate"
                        style={{
                          color: active ? 'var(--accent)' : 'var(--label-primary)',
                        }}
                      >
                        {language === 'zh' ? spec.nameZh : spec.nameEn}
                      </div>
                      <div
                        className="text-[11px] truncate mt-0.5"
                        style={{ color: 'var(--label-tertiary)' }}
                      >
                        {spec.badgeText}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Krea 2 Tier Segmented Control */}
            {targetModel === 'krea2' && (
              <div className="space-y-1.5">
                <span
                  className="text-[12px] font-medium block"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {t('kreaVariant')}
                </span>
                <div
                  className="grid grid-cols-3 p-0.5 rounded-lg"
                  style={{ backgroundColor: 'var(--surface-grouped)' }}
                >
                  {(['turbo', 'medium', 'large'] as KreaVariant[]).map((v) => {
                    const active = kreaVariant === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setKreaVariant(v)}
                        className="py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer"
                        style={{
                          backgroundColor: active
                            ? 'var(--surface-primary)'
                            : 'transparent',
                          color: active ? 'var(--accent)' : 'var(--label-secondary)',
                          boxShadow: active ? 'var(--shadow-control)' : 'none',
                        }}
                      >
                        {language === 'zh'
                          ? KREA_VARIANT_LABELS[v].zh
                          : KREA_VARIANT_LABELS[v].en}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aspect Ratio + Trigger Token */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  className="text-[12px] font-medium block"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {t('aspectRatioLabel')}
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] apple-numeric apple-focus"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                  }}
                >
                  {RATIOS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[12px] font-medium block"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {t('triggerWordLabel')}
                </label>
                <input
                  type="text"
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value)}
                  placeholder={t('triggerWordPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] apple-focus"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                  }}
                />
              </div>
            </div>

            {customPresets.length > 0 && (
              <div className="space-y-1.5">
                <label
                  className="text-[12px] font-medium block"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {t('customPresetLabel')}
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPresetId(id);
                    const preset = customPresets.find((p) => p.id === id);
                    if (preset) {
                      setTargetModel(preset.baseModel);
                      if (preset.kreaVariant) setKreaVariant(preset.kreaVariant);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] apple-focus"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                  }}
                >
                  <option value="">{t('presetDefaultSpec')}</option>
                  {customPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({MODEL_BLUEPRINTS[p.baseModel].badgeText})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              disabled={isLoading || !sourcePrompt.trim()}
              onClick={handleCompile}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium text-white transition-all duration-150 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
              )}
              <span>{t('compileAction')}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
            </button>
          </div>

          {/* Right Compiled Result Pane */}
          <div
            className="lg:col-span-7 rounded-2xl border p-6 space-y-6"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor: 'var(--separator-hairline)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-[16px] font-semibold"
                  style={{ color: 'var(--label-primary)' }}
                >
                  {language === 'zh' ? activeSpec.nameZh : activeSpec.nameEn}
                </h2>
                <p
                  className="text-[13px] mt-1"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {language === 'zh' ? activeSpec.summaryZh : activeSpec.summaryEn}
                </p>
              </div>
              {result?.compiledPrompt && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border shrink-0 cursor-pointer"
                  style={{
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                    backgroundColor: 'var(--surface-secondary)',
                  }}
                >
                  {copied ? (
                    <Check
                      className="w-3.5 h-3.5"
                      style={{ color: 'var(--semantic-green)' }}
                    />
                  ) : (
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                  )}
                  <span>{copied ? t('copied') : t('sendToSampleCard')}</span>
                </button>
              )}
            </div>

            {/* Output Box */}
            {result ? (
              <div className="space-y-6">
                <pre
                  className={`p-4 rounded-xl border text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                    targetModel === 'moss_layout' ? 'font-mono text-[12px]' : 'font-sans'
                  }`}
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                  }}
                >
                  {result.compiledPrompt}
                </pre>

                {/* Visual MOSS Spatial Layout Preview Canvas */}
                {result.layoutSpec && result.layoutSpec.layout.length > 0 && (
                  <div className="space-y-2">
                    <span
                      className="text-[12px] font-medium block"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      MOSS Spatial Wireframe ({result.layoutSpec.aspect_ratio})
                    </span>
                    <div
                      className="relative w-full max-w-md aspect-[4/3] rounded-xl border overflow-hidden"
                      style={{
                        backgroundColor: 'var(--surface-secondary)',
                        borderColor: 'var(--separator-hairline)',
                      }}
                    >
                      {result.layoutSpec.layout.map((el, idx) => {
                        const [ymin, xmin, ymax, xmax] = el.bbox;
                        const color = BBOX_COLORS[idx % BBOX_COLORS.length];
                        return (
                          <div
                            key={el.id || idx}
                            style={{
                              position: 'absolute',
                              top: `${ymin / 10}%`,
                              left: `${xmin / 10}%`,
                              height: `${Math.max(4, (ymax - ymin) / 10)}%`,
                              width: `${Math.max(4, (xmax - xmin) / 10)}%`,
                              border: `1.5px solid ${color}`,
                              backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                              borderRadius: '6px',
                            }}
                          >
                            <span
                              className="inline-block px-1.5 py-0.5 text-[10px] font-medium text-white truncate max-w-full"
                              style={{ backgroundColor: color }}
                            >
                              {el.label}
                              {el.text_content ? ` "${el.text_content}"` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stripped Legacy Buzzwords */}
                {result.strippedBuzzwords.length > 0 && (
                  <div
                    className="pt-4 border-t space-y-1.5"
                    style={{ borderColor: 'var(--separator-hairline)' }}
                  >
                    <h3
                      className="text-[12px] font-semibold"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {t('strippedTokensTitle')}
                    </h3>
                    <p
                      className="text-[13px] font-mono"
                      style={{ color: 'var(--semantic-amber)' }}
                    >
                      {result.strippedBuzzwords.join(' · ')}
                    </p>
                  </div>
                )}

                {/* Anatomy Breakdown */}
                {result.anatomy.length > 0 && (
                  <div
                    className="pt-4 border-t space-y-3"
                    style={{ borderColor: 'var(--separator-hairline)' }}
                  >
                    <h3
                      className="text-[12px] font-semibold"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {t('anatomyTitle')}
                    </h3>
                    <div className="divide-y" style={{ borderColor: 'var(--separator-hairline)' }}>
                      {result.anatomy.map((row, idx) => (
                        <div
                          key={idx}
                          className="py-2.5 grid grid-cols-1 sm:grid-cols-4 gap-2 text-[13px]"
                          style={{ borderColor: 'var(--separator-hairline)' }}
                        >
                          <span
                            className="font-medium sm:col-span-1"
                            style={{ color: 'var(--label-primary)' }}
                          >
                            {row.layer}
                          </span>
                          <span
                            className="sm:col-span-3 leading-relaxed"
                            style={{ color: 'var(--label-secondary)' }}
                          >
                            {row.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="rounded-xl border border-dashed p-10 text-center"
                style={{
                  borderColor: 'var(--separator-strong)',
                  backgroundColor: 'var(--surface-secondary)',
                }}
              >
                <p
                  className="text-[14px] font-medium"
                  style={{ color: 'var(--label-primary)' }}
                >
                  {activeSpec.formula}
                </p>
                <p
                  className="text-[12px] mt-2"
                  style={{ color: 'var(--label-tertiary)' }}
                >
                  {language === 'zh'
                    ? '点击左侧「编译为现代提示词」，即可实时重构并解析结构。'
                    : 'Click Compile Prompt on the left to convert and inspect structural anatomy.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
