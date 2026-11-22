import React, { memo, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Eraser,
  LayoutGrid,
  List,
  Loader2,
  Play,
  Search,
  Square,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { MODEL_BLUEPRINTS } from '../data/modelSpecs';
import { DatasetItem, Language } from '../types/prompt';
import { detectLegacyBuzzwords, getPromptMetrics } from '../utils/promptLint';
import { ResilientImage } from './ResilientImage';

interface WorkspaceViewProps {
  items: DatasetItem[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onDoubleClickItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  isBatchCompiling: boolean;
  onCompilePending: () => void;
  onStopCompiling: () => void;
  onCleanAllBuzzwords: () => void;
  onOpenBatchEdit: () => void;
  onImportFiles: (files: FileList | File[]) => void;
  onOpenFilePicker: () => void;
  onLoadSamples: () => void;
  activeEngineLabel: string;
  onOpenProviderSettings: () => void;
  language: Language;
  t: (key: string) => string;
}

const PAGE_SIZE = 48;

interface AssetCardProps {
  item: DatasetItem;
  isSelected: boolean;
  language: Language;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onRemove: (id: string) => void;
  t: (key: string) => string;
}

const AssetCard = memo<AssetCardProps>(
  ({ item, isSelected, language, onSelect, onDoubleClick, onRemove, t }) => {
    const spec = MODEL_BLUEPRINTS[item.targetModel];
    const metrics = getPromptMetrics(item.caption);
    const hasBuzzwords =
      detectLegacyBuzzwords(item.caption, item.targetModel).length > 0;

    return (
      <div
        onClick={() => onSelect(item.id)}
        onDoubleClick={() => onDoubleClick(item.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelect(item.id);
        }}
        className="group rounded-2xl p-2 border transition-all duration-150 cursor-pointer apple-focus"
        style={{
          backgroundColor: 'var(--surface-primary)',
          borderColor: isSelected ? 'var(--accent)' : 'var(--separator-hairline)',
          boxShadow: isSelected ? '0 0 0 1px var(--accent)' : 'none',
        }}
      >
        <div
          className="relative aspect-[4/3] rounded-lg overflow-hidden"
          style={{ backgroundColor: 'var(--surface-grouped)' }}
        >
          <ResilientImage
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            title={t('deleteItem')}
            className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg apple-vibrancy-regular transition-opacity duration-150 cursor-pointer"
            style={{ color: 'var(--label-primary)' }}
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-1.5 pt-2.5 pb-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[13px] font-medium truncate"
              style={{ color: 'var(--label-primary)' }}
            >
              {item.name}
            </span>
            <span className="shrink-0 flex items-center gap-1 text-[11px]">
              {item.status === 'loading' && (
                <Loader2
                  className="w-3.5 h-3.5 animate-spin"
                  style={{ color: 'var(--accent)' }}
                />
              )}
              {item.status === 'success' && !hasBuzzwords && (
                <CheckCircle2
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--semantic-green)' }}
                />
              )}
              {(item.status === 'error' || hasBuzzwords) && (
                <AlertCircle
                  className="w-3.5 h-3.5"
                  style={{
                    color:
                      item.status === 'error'
                        ? 'var(--semantic-red)'
                        : 'var(--semantic-amber)',
                  }}
                />
              )}
            </span>
          </div>

          <p
            className="text-[12px] apple-numeric truncate"
            style={{ color: 'var(--label-tertiary)' }}
          >
            {spec.badgeText} · {item.width}×{item.height} ·{' '}
            {item.caption.trim()
              ? `${metrics.words} ${t('wordsUnit')}`
              : t('statusIdle')}
          </p>

          <p
            className="text-[12px] line-clamp-2 leading-relaxed min-h-[2.4em]"
            style={{
              color: item.caption.trim()
                ? 'var(--label-secondary)'
                : 'var(--label-quaternary)',
            }}
          >
            {item.caption.trim()
              ? item.caption
              : language === 'zh'
              ? '等待编译提示词…'
              : 'Awaiting prompt compilation…'}
          </p>
        </div>
      </div>
    );
  }
);

AssetCard.displayName = 'AssetCard';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  items,
  selectedId,
  onSelectItem,
  onDoubleClickItem,
  onRemoveItem,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  isBatchCompiling,
  onCompilePending,
  onStopCompiling,
  onCleanAllBuzzwords,
  onOpenBatchEdit,
  onImportFiles,
  onOpenFilePicker,
  onLoadSamples,
  activeEngineLabel,
  onOpenProviderSettings,
  language,
  t,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [searchQuery]);

  const displayedItems = items.slice(0, visibleLimit);
  const hasMore = items.length > visibleLimit;

  const pendingCount = items.filter(
    (i) => i.status === 'idle' || i.status === 'error'
  ).length;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col min-w-0 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Workspace Toolbar */}
      <div
        className="px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--surface-secondary)',
          borderColor: 'var(--separator-hairline)',
        }}
      >
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--label-tertiary)' }}
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-[13px] border apple-focus"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isBatchCompiling ? (
            <button
              type="button"
              onClick={onStopCompiling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white whitespace-nowrap shrink-0 cursor-pointer"
              style={{ backgroundColor: 'var(--semantic-red)' }}
            >
              <Square className="w-3.5 h-3.5" fill="currentColor" />
              <span>{t('stopCompiling')}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={pendingCount === 0}
              onClick={onCompilePending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" />
              <span>
                {t('compilePending')}
                {pendingCount > 0 ? ` (${pendingCount})` : ''}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCleanAllBuzzwords}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border whitespace-nowrap shrink-0 disabled:opacity-40 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
            style={{
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <Eraser className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{t('cleanBuzzwords')}</span>
          </button>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={onOpenBatchEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border whitespace-nowrap shrink-0 disabled:opacity-40 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
            style={{
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{t('batchEdit')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenProviderSettings}
            title={t('configureApi')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border whitespace-nowrap shrink-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] apple-focus cursor-pointer"
            style={{
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
            <span className="max-w-[140px] truncate">{activeEngineLabel}</span>
          </button>

          <div
            className="flex items-center p-0.5 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--surface-grouped)' }}
          >
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label={t('gridView')}
              className="p-1.5 rounded-md transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor:
                  viewMode === 'grid' ? 'var(--surface-primary)' : 'transparent',
                color:
                  viewMode === 'grid'
                    ? 'var(--label-primary)'
                    : 'var(--label-secondary)',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-control)' : 'none',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-label={t('listView')}
              className="p-1.5 rounded-md transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor:
                  viewMode === 'list' ? 'var(--surface-primary)' : 'transparent',
                color:
                  viewMode === 'list'
                    ? 'var(--label-primary)'
                    : 'var(--label-secondary)',
                boxShadow: viewMode === 'list' ? 'var(--shadow-control)' : 'none',
              }}
            >
              <List className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {items.length === 0 ? (
          <div
            className="h-full min-h-[380px] rounded-2xl border border-dashed flex flex-col items-center justify-center p-10 text-center"
            style={{
              borderColor: 'var(--separator-strong)',
              backgroundColor: 'var(--surface-primary)',
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'var(--surface-grouped)',
                color: 'var(--label-secondary)',
              }}
            >
              <Upload className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h3
              className="text-[18px] font-semibold tracking-tight"
              style={{ color: 'var(--label-primary)' }}
            >
              {searchQuery ? t('noSearchResults') : t('emptyTitle')}
            </h3>
            <p
              className="text-[14px] mt-2 max-w-md leading-relaxed"
              style={{ color: 'var(--label-secondary)' }}
            >
              {searchQuery ? t('noSearchResultsDesc') : t('emptyDescription')}
            </p>
            <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {t('resetSearch')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenFilePicker}
                    className="px-4 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {t('primaryImport')}
                  </button>
                  <button
                    type="button"
                    onClick={onLoadSamples}
                    className="px-4 py-2 rounded-lg text-[13px] font-medium border cursor-pointer"
                    style={{
                      borderColor: 'var(--separator-hairline)',
                      color: 'var(--label-primary)',
                      backgroundColor: 'var(--surface-secondary)',
                    }}
                  >
                    {t('loadSampleSet')}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {displayedItems.map((item) => (
              <AssetCard
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                language={language}
                onSelect={onSelectItem}
                onDoubleClick={onDoubleClickItem}
                onRemove={onRemoveItem}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border overflow-hidden divide-y"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor: 'var(--separator-hairline)',
            }}
          >
            {displayedItems.map((item) => {
              const isSelected = selectedId === item.id;
              const spec = MODEL_BLUEPRINTS[item.targetModel];
              const metrics = getPromptMetrics(item.caption);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  onDoubleClick={() => onDoubleClickItem(item.id)}
                  className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-tint)' : 'transparent',
                    borderColor: 'var(--separator-hairline)',
                  }}
                >
                  <ResilientImage
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[13px] font-medium truncate"
                        style={{ color: 'var(--label-primary)' }}
                      >
                        {item.name}
                      </span>
                      <span
                        className="text-[12px] apple-numeric shrink-0"
                        style={{ color: 'var(--label-tertiary)' }}
                      >
                        {spec.badgeText} · {item.width}×{item.height}
                      </span>
                    </div>
                    <p
                      className="text-[12px] truncate mt-0.5"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {item.caption.trim() || t('statusIdle')}
                    </p>
                  </div>
                  <div
                    className="text-[12px] apple-numeric shrink-0 text-right"
                    style={{ color: 'var(--label-tertiary)' }}
                  >
                    {metrics.words} {t('wordsUnit')}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium border cursor-pointer"
              style={{
                borderColor: 'var(--separator-hairline)',
                backgroundColor: 'var(--surface-primary)',
                color: 'var(--label-primary)',
              }}
            >
              {t('showMoreItems')} ({items.length - visibleLimit})
            </button>
          </div>
        )}
      </div>

      {/* Drag Drop Overlay */}
      {isDragOver && (
        <div
          className="absolute inset-4 rounded-2xl border-2 border-dashed flex items-center justify-center z-20 apple-vibrancy-thick pointer-events-none"
          style={{ borderColor: 'var(--accent)' }}
        >
          <div className="text-center">
            <Upload
              className="w-8 h-8 mx-auto mb-2"
              style={{ color: 'var(--accent)' }}
              strokeWidth={1.75}
            />
            <p className="text-[14px] font-semibold" style={{ color: 'var(--label-primary)' }}>
              {t('dropHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
