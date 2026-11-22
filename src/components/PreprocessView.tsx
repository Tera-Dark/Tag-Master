import React, { useMemo, useState } from 'react';
import { Crop, X } from 'lucide-react';
import { AspectBucket, DatasetItem } from '../types/prompt';
import { cropImageToAspect, getAspectBucket } from '../utils/imageUtils';
import { ResilientImage } from './ResilientImage';

interface PreprocessViewProps {
  items: DatasetItem[];
  onUpdateItem: (id: string, patch: Partial<DatasetItem>) => void;
  t: (key: string) => string;
}

const CROP_PRESETS: { label: string; ratio: number | null }[] = [
  { label: '90% Center', ratio: null },
  { label: '1:1 Square', ratio: 1 },
  { label: '4:3 Landscape', ratio: 4 / 3 },
  { label: '3:4 Portrait', ratio: 3 / 4 },
  { label: '16:9 Wide', ratio: 16 / 9 },
];

export const PreprocessView: React.FC<PreprocessViewProps> = ({
  items,
  onUpdateItem,
  t,
}) => {
  const [bucket, setBucket] = useState<AspectBucket>('all');
  const [cropTarget, setCropTarget] = useState<DatasetItem | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<number | null>(1);
  const [isCropping, setIsCropping] = useState(false);

  const filtered = useMemo(() => {
    if (bucket === 'all') return items;
    return items.filter((item) => getAspectBucket(item.width, item.height) === bucket);
  }, [items, bucket]);

  const handleApplyCrop = async () => {
    if (!cropTarget) return;
    setIsCropping(true);
    try {
      const cropped = await cropImageToAspect(cropTarget.previewUrl, selectedRatio);
      onUpdateItem(cropTarget.id, {
        previewUrl: cropped.previewUrl,
        width: cropped.width,
        height: cropped.height,
        updatedAt: Date.now(),
      });
      setCropTarget(null);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-[28px] font-semibold tracking-tight"
              style={{ color: 'var(--label-primary)' }}
            >
              {t('preprocessTitle')}
            </h1>
            <p
              className="text-[14px] mt-1.5"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('preprocessSubtitle')}
            </p>
          </div>

          {/* Aspect Bucket Segmented Control */}
          <div
            className="flex items-center p-1 rounded-xl"
            style={{ backgroundColor: 'var(--surface-grouped)' }}
          >
            {(
              [
                ['all', 'bucketAll'],
                ['landscape', 'bucketLandscape'],
                ['portrait', 'bucketPortrait'],
                ['square', 'bucketSquare'],
              ] as [AspectBucket, string][]
            ).map(([key, labelKey]) => {
              const active = bucket === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBucket(key)}
                  className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--surface-primary)' : 'transparent',
                    color: active ? 'var(--label-primary)' : 'var(--label-secondary)',
                    boxShadow: active ? 'var(--shadow-control)' : 'none',
                  }}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl p-2 border"
              style={{
                backgroundColor: 'var(--surface-primary)',
                borderColor: 'var(--separator-hairline)',
              }}
            >
              <div
                className="aspect-square rounded-lg overflow-hidden"
                style={{ backgroundColor: 'var(--surface-grouped)' }}
              >
                <ResilientImage
                  src={item.previewUrl}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="px-1.5 pt-2.5 pb-1 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: 'var(--label-primary)' }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-[12px] apple-numeric"
                    style={{ color: 'var(--label-tertiary)' }}
                  >
                    {item.width}×{item.height} · {getAspectBucket(item.width, item.height)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCropTarget(item)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border shrink-0 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  style={{
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                  }}
                >
                  <Crop className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>{t('cropImage')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crop Modal */}
      {cropTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-3xl border p-6 space-y-5"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor: 'var(--separator-hairline)',
              boxShadow: 'var(--shadow-sheet)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-[17px] font-semibold"
                style={{ color: 'var(--label-primary)' }}
              >
                {cropTarget.name}
              </h2>
              <button
                type="button"
                onClick={() => setCropTarget(null)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                style={{ color: 'var(--label-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="rounded-xl overflow-hidden border max-h-72 flex items-center justify-center"
              style={{
                backgroundColor: 'var(--surface-grouped)',
                borderColor: 'var(--separator-hairline)',
              }}
            >
              <ResilientImage
                src={cropTarget.previewUrl}
                alt={cropTarget.name}
                eager
                className="max-h-72 object-contain"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {CROP_PRESETS.map((preset) => {
                const active = selectedRatio === preset.ratio;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedRatio(preset.ratio)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer"
                    style={{
                      borderColor: active
                        ? 'var(--accent)'
                        : 'var(--separator-hairline)',
                      backgroundColor: active
                        ? 'var(--accent-tint)'
                        : 'var(--surface-secondary)',
                      color: active ? 'var(--accent)' : 'var(--label-primary)',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCropTarget(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium border cursor-pointer"
                style={{
                  borderColor: 'var(--separator-hairline)',
                  color: 'var(--label-primary)',
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isCropping}
                onClick={handleApplyCrop}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {t('applyCrop')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
