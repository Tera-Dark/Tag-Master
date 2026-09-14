import { useState } from 'react';
import { Archive, ArrowDown, FolderClosed, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormatPicker } from '../ui/FormatPicker';

interface ExportViewProps {
  onExport: (format: 'txt' | 'json') => void | Promise<void>;
  totalImages: number;
}

export function ExportView({ onExport, totalImages }: ExportViewProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'txt' | 'json'>('txt');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    try {
      await onExport(format);
    } catch {
      setError(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <section className='tm-workflow-view flex-1 overflow-y-auto bg-tm-canvas'>
      <div className='max-w-2xl mx-auto w-full py-4 md:py-8'>
        <div className='tm-view-heading'>
          <span className='text-xs text-tm-subtle block mb-3'>05 / {t('export')}</span>
          <h2>{t('uiExportTitle')}</h2>
          <p>{t('uiExportDescription')}</p>
        </div>
        <div className='tm-card p-6 md:p-8 space-y-7'>
          <div className='flex items-center gap-4 pb-6 border-b border-tm-border'>
            <div className='w-11 h-11 bg-tm-muted rounded-xl flex items-center justify-center'>
              <Archive size={21} />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium'>{t('uiDatasetArchive')}</p>
              <p className='text-xs text-tm-subtle mt-1'>
                {t('uiImageCount', { count: totalImages })}
              </p>
            </div>
            <span className='text-xs text-tm-subtle font-mono'>.zip</span>
          </div>
          <div>
            <h3 className='text-sm font-medium mb-3'>{t('uiExportFormat')}</h3>
            <FormatPicker value={format} onChange={setFormat} />
          </div>
          <div className='flex items-start gap-2 text-xs text-tm-subtle leading-relaxed'>
            <FolderClosed size={15} className='shrink-0 mt-0.5' />
            <p>{t('uiArchiveHint')}</p>
          </div>
          {error && (
            <p role='alert' className='text-sm text-red-600'>
              {error}
            </p>
          )}
          <button
            className='tm-button tm-button-primary w-full flex justify-center items-center gap-2 py-3 text-sm'
            disabled={isExporting || totalImages === 0}
            onClick={handleExport}
          >
            {isExporting ? <Loader2 size={17} className='animate-spin' /> : <ArrowDown size={17} />}
            {t(isExporting ? 'uiExporting' : 'uiDownloadDataset')}
          </button>
        </div>
        <p className='text-center text-xs text-tm-subtle mt-6'>{t('uiExportFootnote')}</p>
      </div>
    </section>
  );
}
