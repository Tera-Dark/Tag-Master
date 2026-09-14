import { Check, FileJson, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FormatPicker({
  value,
  onChange,
}: {
  value: 'txt' | 'json';
  onChange: (value: 'txt' | 'json') => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role='radiogroup'
      aria-label={t('uiExportFormat')}
      className='grid grid-cols-1 sm:grid-cols-2 gap-3'
    >
      {(['txt', 'json'] as const).map((format) => (
        <button
          key={format}
          type='button'
          role='radio'
          aria-checked={value === format}
          tabIndex={value === format ? 0 : -1}
          onClick={() => onChange(format)}
          onKeyDown={(event) => {
            if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
              event.preventDefault();
              onChange(format === 'txt' ? 'json' : 'txt');
              const siblings =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
              siblings?.[format === 'txt' ? 1 : 0]?.focus();
            }
          }}
          className={`tm-button tm-option p-5 text-left border ${value === format ? 'border-tm-text bg-tm-panel' : 'border-tm-border hover:bg-tm-panel'}`}
        >
          <div className='flex items-center justify-between mb-4 text-tm-secondary'>
            {format === 'txt' ? <FileText size={21} /> : <FileJson size={21} />}
            <span
              className={`w-4 h-4 border rounded-full flex items-center justify-center ${value === format ? 'bg-tm-accent text-tm-on-accent border-tm-accent' : 'border-tm-border'}`}
            >
              {value === format && <Check size={10} />}
            </span>
          </div>
          <p className='font-medium text-sm text-tm-text mb-1'>
            {format === 'txt' ? 'Text / .txt' : 'JSON / .json'}
          </p>
          <p className='text-xs text-tm-subtle leading-relaxed'>
            {t(format === 'txt' ? 'uiTxtDescription' : 'uiJsonDescription')}
          </p>
        </button>
      ))}
    </div>
  );
}
