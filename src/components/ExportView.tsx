import React, { useState } from 'react';
import { Archive, FileCode2, FileText, Loader2 } from 'lucide-react';
import { Project } from '../types/prompt';
import { exportProjectsZip } from '../utils/imageUtils';

interface ExportViewProps {
  projects: Project[];
  onErrorToast: (msg: string) => void;
  t: (key: string) => string;
}

export const ExportView: React.FC<ExportViewProps> = ({
  projects,
  onErrorToast,
  t,
}) => {
  const [format, setFormat] = useState<'txt' | 'json'>('txt');
  const [isExporting, setIsExporting] = useState(false);

  const totalImages = projects.reduce((s, p) => s + p.items.length, 0);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportProjectsZip(projects, format);
    } catch (err) {
      onErrorToast(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1
            className="text-[28px] font-semibold tracking-tight"
            style={{ color: 'var(--label-primary)' }}
          >
            {t('exportTitle')}
          </h1>
          <p
            className="text-[14px] mt-1.5"
            style={{ color: 'var(--label-secondary)' }}
          >
            {t('exportSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormat('txt')}
            className="text-left p-5 rounded-2xl border transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor:
                format === 'txt' ? 'var(--accent)' : 'var(--separator-hairline)',
              boxShadow: format === 'txt' ? '0 0 0 1px var(--accent)' : 'none',
            }}
          >
            <FileText
              className="w-5 h-5 mb-3"
              style={{
                color: format === 'txt' ? 'var(--accent)' : 'var(--label-secondary)',
              }}
              strokeWidth={1.75}
            />
            <div
              className="text-[15px] font-semibold"
              style={{ color: 'var(--label-primary)' }}
            >
              {t('exportFormatTxt')}
            </div>
            <p
              className="text-[13px] mt-1.5 leading-relaxed"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('exportFormatTxtDesc')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFormat('json')}
            className="text-left p-5 rounded-2xl border transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor:
                format === 'json' ? 'var(--accent)' : 'var(--separator-hairline)',
              boxShadow: format === 'json' ? '0 0 0 1px var(--accent)' : 'none',
            }}
          >
            <FileCode2
              className="w-5 h-5 mb-3"
              style={{
                color: format === 'json' ? 'var(--accent)' : 'var(--label-secondary)',
              }}
              strokeWidth={1.75}
            />
            <div
              className="text-[15px] font-semibold"
              style={{ color: 'var(--label-primary)' }}
            >
              {t('exportFormatJson')}
            </div>
            <p
              className="text-[13px] mt-1.5 leading-relaxed"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('exportFormatJsonDesc')}
            </p>
          </button>
        </div>

        <div
          className="rounded-2xl border p-6 flex flex-wrap items-center justify-between gap-4"
          style={{
            backgroundColor: 'var(--surface-primary)',
            borderColor: 'var(--separator-hairline)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--surface-grouped)',
                color: 'var(--label-primary)',
              }}
            >
              <Archive className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p
                className="text-[15px] font-semibold apple-numeric"
                style={{ color: 'var(--label-primary)' }}
              >
                {projects.length} Projects · {totalImages} Assets
              </p>
              <p
                className="text-[12px] mt-0.5 font-mono"
                style={{ color: 'var(--label-tertiary)' }}
              >
                archive/*.jpg + archive/*.{format}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isExporting || totalImages === 0}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium text-white disabled:opacity-45 cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isExporting ? t('exporting') : t('exportZipBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
