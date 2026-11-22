import React from 'react';
import { Upload } from 'lucide-react';
import { WorkspaceTab } from '../types/prompt';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onImportClick: () => void;
  t: (key: string) => string;
}

const TABS: { id: WorkspaceTab; labelKey: string }[] = [
  { id: 'workspace', labelKey: 'navWorkspace' },
  { id: 'prompt-lab', labelKey: 'navPromptLab' },
  { id: 'preprocess', labelKey: 'navPreprocess' },
  { id: 'review', labelKey: 'navReview' },
  { id: 'export', labelKey: 'navExport' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onImportClick,
  t,
}) => {
  return (
    <header
      className="sticky top-0 z-30 h-14 px-6 flex items-center justify-between gap-8 border-b apple-vibrancy-regular"
      style={{ borderColor: 'var(--separator-hairline)' }}
    >
      {/* Zone 1: Single-line brand wordmark */}
      <button
        type="button"
        onClick={() => onSelectTab('workspace')}
        className="text-[17px] font-semibold tracking-tight whitespace-nowrap shrink-0 apple-focus rounded-md cursor-pointer"
        style={{ color: 'var(--label-primary)', fontFamily: 'var(--font-display)' }}
      >
        {t('brandName')}
      </button>

      {/* Zone 2: Single-line navigation links */}
      <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className="relative py-2 text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors duration-150 apple-focus cursor-pointer"
              style={{
                color: isActive ? 'var(--label-primary)' : 'var(--label-secondary)',
              }}
            >
              {t(tab.labelKey)}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onImportClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white whitespace-nowrap shrink-0 transition-all duration-150 active:scale-[0.98] apple-focus cursor-pointer"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Upload className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>{t('primaryImport')}</span>
        </button>
      </div>
    </header>
  );
};
