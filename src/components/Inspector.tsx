import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  Check,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { KREA_VARIANT_LABELS, MODEL_BLUEPRINTS } from '../data/modelSpecs';
import {
  CustomPromptPreset,
  DatasetItem,
  KreaVariant,
  Language,
  ReplacementRule,
  TargetModelId,
} from '../types/prompt';
import { downloadTextFile, getSidecarFilename } from '../utils/imageUtils';
import {
  cleanLegacyBuzzwords,
  detectLegacyBuzzwords,
  getPromptMetrics,
  parseMossLayoutJson,
} from '../utils/promptLint';
import { ResilientImage } from './ResilientImage';

interface InspectorProps {
  item: DatasetItem | undefined;
  language: Language;
  blockedWords: string[];
  replacementRules: ReplacementRule[];
  customPresets: CustomPromptPreset[];
  onOpenSpecTuning: (model: TargetModelId) => void;
  onUpdateItem: (id: string, patch: Partial<DatasetItem>) => void;
  onCompileItem: (id: string, targetModel: TargetModelId, variant?: KreaVariant) => Promise<void>;
  onModernizeItemCaption: (
    id: string,
    targetModel: TargetModelId,
    variant?: KreaVariant
  ) => Promise<void>;
  t: (key: string) => string;
}

const BBOX_COLORS = ['#0071E3', '#248A3D', '#B25000', '#7C3AED', '#D70015'];

export const Inspector: React.FC<InspectorProps> = ({
  item,
  language,
  blockedWords,
  replacementRules,
  customPresets,
  onOpenSpecTuning,
  onUpdateItem,
  onCompileItem,
  onModernizeItemCaption,
  t,
}) => {
  const [showBbox, setShowBbox] = useState(true);
  const [copied, setCopied] = useState(false);

  const layoutSpec = useMemo(() => {
    if (!item) return undefined;
    return item.layoutSpec ?? parseMossLayoutJson(item.caption);
  }, [item]);

  const buzzwords = useMemo(() => {
    if (!item) return [];
    return detectLegacyBuzzwords(item.caption, item.targetModel);
  }, [item]);

  const metrics = useMemo(() => {
    return getPromptMetrics(item?.caption ?? '');
  }, [item?.caption]);

  if (!item) {
    return (
      <aside
        className="w-92 shrink-0 border-l hidden xl:flex flex-col items-center justify-center p-8 text-center"
        style={{
          backgroundColor: 'var(--surface-primary)',
          borderColor: 'var(--separator-hairline)',
        }}
      >
        <p className="text-[14px] font-medium" style={{ color: 'var(--label-primary)' }}>
          {t('inspectorTitle')}
        </p>
        <p
          className="text-[13px] mt-2 leading-relaxed max-w-[240px]"
          style={{ color: 'var(--label-secondary)' }}
        >
          {t('inspectorEmpty')}
        </p>
      </aside>
    );
  }

  const activeVariant: KreaVariant = item.kreaVariant ?? 'large';
  const modelSpec = MODEL_BLUEPRINTS[item.targetModel];
  const isBusy = item.status === 'loading';

  const handleCopy = async () => {
    if (!item.caption) return;
    await navigator.clipboard.writeText(item.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleStripBuzzwords = () => {
    const cleaned = cleanLegacyBuzzwords(
      item.caption,
      blockedWords,
      replacementRules,
      item.targetModel
    );
    onUpdateItem(item.id, { caption: cleaned });
  };

  const handleDownloadSidecar = () => {
    const isJson = item.targetModel === 'moss_layout' || Boolean(layoutSpec);
    const ext = isJson ? 'json' : 'txt';
    const content = isJson
      ? item.caption
      : item.caption;
    downloadTextFile(getSidecarFilename(item, ext), content);
  };

  return (
    <aside
      className="w-92 shrink-0 border-l flex flex-col overflow-y-auto"
      style={{
        backgroundColor: 'var(--surface-primary)',
        borderColor: 'var(--separator-hairline)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--separator-hairline)' }}
      >
        <div className="min-w-0">
          <h2
            className="text-[14px] font-semibold truncate"
            style={{ color: 'var(--label-primary)' }}
          >
            {item.name}
          </h2>
          <p
            className="text-[12px] apple-numeric mt-0.5 truncate"
            style={{ color: 'var(--label-tertiary)' }}
          >
            {item.width}×{item.height} · {modelSpec.badgeText}
          </p>
        </div>

        {layoutSpec && layoutSpec.layout.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBbox((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            style={{
              borderColor: 'var(--separator-hairline)',
              backgroundColor: showBbox ? 'var(--accent-tint)' : 'transparent',
              color: showBbox ? 'var(--accent)' : 'var(--label-secondary)',
            }}
          >
            <Box className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{showBbox ? t('hideBboxOverlay') : t('showBboxOverlay')}</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-5 flex-1">
        {/* Image Frame + Optional MOSS Spatial Layout Bounding Boxes */}
        <div
          className="relative rounded-xl overflow-hidden border"
          style={{
            backgroundColor: 'var(--surface-grouped)',
            borderColor: 'var(--separator-hairline)',
          }}
        >
          <ResilientImage
            src={item.previewUrl}
            alt={item.name}
            eager
            className="w-full max-h-56 object-contain mx-auto block"
          />
          {showBbox && layoutSpec && layoutSpec.layout.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {layoutSpec.layout.map((el, idx) => {
                const [ymin, xmin, ymax, xmax] = el.bbox;
                const color = BBOX_COLORS[idx % BBOX_COLORS.length];
                return (
                  <div
                    key={el.id || idx}
                    style={{
                      position: 'absolute',
                      top: `${ymin / 10}%`,
                      left: `${xmin / 10}%`,
                      height: `${Math.max(2, (ymax - ymin) / 10)}%`,
                      width: `${Math.max(2, (xmax - xmin) / 10)}%`,
                      border: `1.5px solid ${color}`,
                      backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
                      borderRadius: '4px',
                    }}
                  >
                    <span
                      className="inline-block px-1.5 py-0.5 text-[10px] font-medium text-white truncate max-w-full"
                      style={{ backgroundColor: color }}
                    >
                      {el.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Model Selector */}
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
              onClick={() => onOpenSpecTuning(item.targetModel)}
              className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline apple-focus rounded cursor-pointer"
              style={{ color: 'var(--accent)' }}
            >
              <SlidersHorizontal className="w-3 h-3" strokeWidth={1.75} />
              <span>{t('tuneSpec')}</span>
            </button>
          </div>

          <select
            value={item.targetModel}
            onChange={(e) =>
              onUpdateItem(item.id, {
                targetModel: e.target.value as TargetModelId,
              })
            }
            className="w-full px-3 py-2 rounded-lg text-[13px] font-medium border apple-focus"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
            }}
          >
            {(Object.keys(MODEL_BLUEPRINTS) as TargetModelId[]).map((mId) => (
              <option key={mId} value={mId}>
                {language === 'zh'
                  ? MODEL_BLUEPRINTS[mId].nameZh
                  : MODEL_BLUEPRINTS[mId].nameEn}
              </option>
            ))}
          </select>

          {/* Krea 2 Tier Segmented Control */}
          {item.targetModel === 'krea2' && (
            <div className="pt-1">
              <div
                className="grid grid-cols-3 p-0.5 rounded-lg"
                style={{ backgroundColor: 'var(--surface-grouped)' }}
              >
                {(['turbo', 'medium', 'large'] as KreaVariant[]).map((variant) => {
                  const active = activeVariant === variant;
                  return (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => onUpdateItem(item.id, { kreaVariant: variant })}
                      className="py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer"
                      style={{
                        backgroundColor: active
                          ? 'var(--surface-primary)'
                          : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--label-secondary)',
                        boxShadow: active ? 'var(--shadow-control)' : 'none',
                      }}
                    >
                      {language === 'zh'
                        ? KREA_VARIANT_LABELS[variant].zh
                        : KREA_VARIANT_LABELS[variant].en}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--label-tertiary)' }}>
                {language === 'zh'
                  ? KREA_VARIANT_LABELS[activeVariant].descZh
                  : KREA_VARIANT_LABELS[activeVariant].descEn}
              </p>
            </div>
          )}

          {customPresets.length > 0 && (
            <div className="pt-1.5 space-y-1">
              <label
                className="text-[11px] font-medium block"
                style={{ color: 'var(--label-tertiary)' }}
              >
                {t('customPresetLabel')}
              </label>
              <select
                value={item.presetId || ''}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const preset = customPresets.find((p) => p.id === nextId);
                  onUpdateItem(item.id, {
                    presetId: nextId || undefined,
                    ...(preset
                      ? {
                          targetModel: preset.baseModel,
                          kreaVariant: preset.kreaVariant ?? item.kreaVariant,
                        }
                      : {}),
                  });
                }}
                className="w-full px-3 py-1.5 rounded-lg text-[12px] font-medium border apple-focus"
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
        </div>

        {/* Legacy Buzzword Guard Alert */}
        {buzzwords.length > 0 && (
          <div
            className="p-3 rounded-xl border flex items-start justify-between gap-3"
            style={{
              borderColor: 'color-mix(in srgb, var(--semantic-amber) 32%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--semantic-amber) 8%, transparent)',
            }}
          >
            <div className="min-w-0">
              <div
                className="flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: 'var(--semantic-amber)' }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                <span>{t('buzzwordWarning')}</span>
              </div>
              <p
                className="text-[11px] mt-1 break-words font-mono"
                style={{ color: 'var(--label-secondary)' }}
              >
                {buzzwords.join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleStripBuzzwords}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-primary)',
                color: 'var(--semantic-amber)',
                boxShadow: 'var(--shadow-control)',
              }}
            >
              {t('stripNow')}
            </button>
          </div>
        )}

        {/* Prompt Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              className="text-[12px] font-medium"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('compiledOutput')}
            </label>
            <span
              className="text-[11px] apple-numeric"
              style={{ color: 'var(--label-tertiary)' }}
            >
              {metrics.words} {t('wordsUnit')} · ~{metrics.approxTokens} tok
            </span>
          </div>

          <textarea
            value={item.caption}
            onChange={(e) =>
              onUpdateItem(item.id, {
                caption: e.target.value,
                layoutSpec: parseMossLayoutJson(e.target.value),
                status: e.target.value.trim() ? 'success' : 'idle',
              })
            }
            rows={item.targetModel === 'moss_layout' ? 11 : 7}
            placeholder={t('promptPlaceholder')}
            className={`w-full p-3 rounded-xl border text-[13px] leading-relaxed resize-y apple-focus ${
              item.targetModel === 'moss_layout' ? 'font-mono text-[12px]' : ''
            }`}
            style={{
              backgroundColor: 'var(--surface-secondary)',
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
            }}
          />

          {item.error && (
            <p className="text-[12px]" style={{ color: 'var(--semantic-red)' }}>
              {item.error}
            </p>
          )}
        </div>

        {/* MOSS / Anima Sampler Hints */}
        {(item.targetModel === 'moss_prose' || item.targetModel === 'moss_layout') && (
          <div
            className="px-3 py-2.5 rounded-xl border text-[12px]"
            style={{
              borderColor: 'var(--separator-hairline)',
              backgroundColor: 'var(--surface-secondary)',
            }}
          >
            <span className="font-medium" style={{ color: 'var(--label-secondary)' }}>
              {t('mossSamplerHint')}
            </span>
            <p
              className="mt-1 font-mono text-[11px] apple-numeric"
              style={{ color: 'var(--label-tertiary)' }}
            >
              Flow-Matching Euler · Steps ≥ 50 · CFG 3.5 · Shift 5.0
            </p>
          </div>
        )}

        {item.targetModel === 'anima' && (
          <div
            className="px-3 py-2.5 rounded-xl border text-[12px]"
            style={{
              borderColor: 'var(--separator-hairline)',
              backgroundColor: 'var(--surface-secondary)',
            }}
          >
            <span className="font-medium" style={{ color: 'var(--label-secondary)' }}>
              {t('animaSamplerHint')}
            </span>
            <p
              className="mt-1 font-mono text-[11px] apple-numeric"
              style={{ color: 'var(--label-tertiary)' }}
            >
              Euler a · 30–50 steps · CFG 4.0–5.0 · 1024×1024 · Qwen3 Hybrid
            </p>
          </div>
        )}

        {/* Primary & Secondary Actions */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onCompileItem(item.id, item.targetModel, activeVariant)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white transition-all duration-150 disabled:opacity-60 apple-focus cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {isBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
              <span>{t('compileThis')}</span>
            </button>

            <button
              type="button"
              disabled={isBusy || !item.caption.trim()}
              onClick={() =>
                onModernizeItemCaption(item.id, item.targetModel, activeVariant)
              }
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors duration-150 disabled:opacity-45 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] apple-focus cursor-pointer"
              style={{
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{t('modernizeThis')}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!item.caption.trim()}
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors duration-150 disabled:opacity-45 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] apple-focus cursor-pointer"
              style={{
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" style={{ color: 'var(--semantic-green)' }} />
              ) : (
                <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
              <span>{copied ? t('copied') : t('copyPrompt')}</span>
            </button>

            <button
              type="button"
              disabled={!item.caption.trim()}
              onClick={handleDownloadSidecar}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors duration-150 disabled:opacity-45 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] apple-focus cursor-pointer"
              style={{
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{t('downloadSidecar')}</span>
            </button>
          </div>
        </div>

        {/* Formula Reference */}
        <div
          className="pt-3 border-t text-[11px] leading-relaxed"
          style={{
            borderColor: 'var(--separator-hairline)',
            color: 'var(--label-tertiary)',
          }}
        >
          <span className="font-medium flex items-center gap-1" style={{ color: 'var(--label-secondary)' }}>
            <Sparkles className="w-3 h-3" strokeWidth={1.75} />
            {language === 'zh' ? modelSpec.nameZh : modelSpec.nameEn}
          </span>
          <p className="mt-1 font-mono">{modelSpec.formula}</p>
        </div>
      </div>
    </aside>
  );
};
