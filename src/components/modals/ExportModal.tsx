import { useState } from 'react';
import { ArrowDown, Loader2, X } from 'lucide-react';
import { DialogOverlay } from '../ui/DialogOverlay';
import { FormatPicker } from '../ui/FormatPicker';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'txt' | 'json') => void | Promise<void>;
  t: (key: string) => string;
}

export function ExportModal({ isOpen, onClose, onExport, t }: ExportModalProps) {
  const [format, setFormat] = useState<'txt' | 'json'>('txt');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (!isOpen) return null;
  return (
    <DialogOverlay
      onClose={() => {
        if (!pending) onClose();
      }}
      label={t('exportAll')}
    >
      <div className='w-full max-w-lg p-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <h2>{t('exportAll')}</h2>
          <button
            className='tm-button p-2'
            aria-label={t('uiClose')}
            disabled={pending}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <p className='text-sm text-tm-subtle leading-relaxed'>{t('uiExportDescription')}</p>
        <FormatPicker value={format} onChange={setFormat} />
        {error && (
          <p role='alert' className='text-sm text-red-600'>
            {error}
          </p>
        )}
        <div className='flex justify-end items-center gap-3 pt-2'>
          <button
            className='tm-button px-4 py-2 border border-tm-border'
            disabled={pending}
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button
            className='tm-button tm-button-primary px-5 py-2 flex items-center gap-2'
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError('');
              try {
                await onExport(format);
                onClose();
              } catch {
                setError(t('exportFailed'));
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? <Loader2 size={16} className='animate-spin' /> : <ArrowDown size={16} />}
            {t(pending ? 'uiExporting' : 'uiDownload')}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
}
