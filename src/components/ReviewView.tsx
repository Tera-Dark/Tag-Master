import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Eraser } from 'lucide-react';
import { MODEL_BLUEPRINTS } from '../data/modelSpecs';
import { DatasetItem } from '../types/prompt';
import { detectLegacyBuzzwords, getPromptMetrics } from '../utils/promptLint';
import { ResilientImage } from './ResilientImage';

interface ReviewViewProps {
  items: DatasetItem[];
  onInspectItem: (id: string) => void;
  onCleanAllBuzzwords: () => void;
  t: (key: string) => string;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  items,
  onInspectItem,
  onCleanAllBuzzwords,
  t,
}) => {
  const analysis = useMemo(() => {
    let compiled = 0;
    let missingOrShort = 0;
    let legacyCount = 0;
    const issues: {
      item: DatasetItem;
      reason: string;
      buzzwords: string[];
    }[] = [];

    for (const item of items) {
      const trimmed = item.caption.trim();
      const metrics = getPromptMetrics(trimmed);
      const buzzwords = detectLegacyBuzzwords(trimmed, item.targetModel);

      if (item.status === 'success' && trimmed.length > 0) {
        compiled += 1;
      }

      if (!trimmed || metrics.words < 8) {
        missingOrShort += 1;
        issues.push({
          item,
          reason: !trimmed ? t('statusIdle') : `${metrics.words} ${t('wordsUnit')}`,
          buzzwords,
        });
      } else if (buzzwords.length > 0) {
        legacyCount += 1;
        issues.push({
          item,
          reason: buzzwords.join(' · '),
          buzzwords,
        });
      } else if (item.status === 'error') {
        issues.push({
          item,
          reason: item.error || t('statusError'),
          buzzwords: [],
        });
      }
    }

    return { compiled, missingOrShort, legacyCount, issues };
  }, [items, t]);

  const metricsStrip = [
    { label: t('metricTotal'), value: items.length },
    { label: t('metricCompiled'), value: analysis.compiled },
    { label: t('metricNeedsAttention'), value: analysis.missingOrShort },
    { label: t('metricLegacyLeaks'), value: analysis.legacyCount },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-[28px] font-semibold tracking-tight"
              style={{ color: 'var(--label-primary)' }}
            >
              {t('reviewTitle')}
            </h1>
            <p
              className="text-[14px] mt-1.5"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('reviewSubtitle')}
            </p>
          </div>

          {analysis.legacyCount > 0 && (
            <button
              type="button"
              onClick={onCleanAllBuzzwords}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Eraser className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{t('fixAllBuzzwords')}</span>
            </button>
          )}
        </div>

        {/* 4-Column Tabular KPI Strip */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 rounded-2xl border divide-y md:divide-y-0 md:divide-x overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-primary)',
            borderColor: 'var(--separator-hairline)',
          }}
        >
          {metricsStrip.map((m) => (
            <div
              key={m.label}
              className="p-5"
              style={{ borderColor: 'var(--separator-hairline)' }}
            >
              <div
                className="text-[28px] font-semibold apple-numeric tracking-tight"
                style={{ color: 'var(--label-primary)' }}
              >
                {m.value}
              </div>
              <div
                className="text-[12px] mt-1"
                style={{ color: 'var(--label-secondary)' }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Issue Audit Table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-primary)',
            borderColor: 'var(--separator-hairline)',
          }}
        >
          {analysis.issues.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: 'var(--semantic-green)' }}
                strokeWidth={1.6}
              />
              <h3
                className="text-[16px] font-semibold"
                style={{ color: 'var(--label-primary)' }}
              >
                {t('reviewCleanState')}
              </h3>
              <p
                className="text-[13px] mt-1.5"
                style={{ color: 'var(--label-secondary)' }}
              >
                {t('reviewCleanDesc')}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--separator-hairline)' }}>
              {analysis.issues.map(({ item, reason }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                  style={{ borderColor: 'var(--separator-hairline)' }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <ResilientImage
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-11 h-11 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p
                        className="text-[13px] font-medium truncate"
                        style={{ color: 'var(--label-primary)' }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-[12px] flex items-center gap-1.5 mt-0.5 truncate"
                        style={{ color: 'var(--semantic-amber)' }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {MODEL_BLUEPRINTS[item.targetModel].badgeText} · {reason}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspectItem(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border shrink-0 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    style={{
                      borderColor: 'var(--separator-hairline)',
                      color: 'var(--label-primary)',
                    }}
                  >
                    <span>{t('inspectItem')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
