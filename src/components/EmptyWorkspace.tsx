import { ArrowUp, FolderPlus, ImagePlus, LockKeyhole, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyWorkspaceProps {
  filtered?: boolean;
  onImport: () => void;
  onCreate: () => void;
  onReset: () => void;
}

export function EmptyWorkspace({ filtered, onImport, onCreate, onReset }: EmptyWorkspaceProps) {
  const { t } = useTranslation();
  return (
    <section className='tm-empty'>
      <div className='tm-empty-mark'>
        {filtered ? <SearchX size={25} /> : <ImagePlus size={25} />}
      </div>
      <h2>{t(filtered ? 'uiNoResults' : 'uiEmptyTitle')}</h2>
      <p>{t(filtered ? 'uiNoResultsDescription' : 'uiEmptyDescription')}</p>
      <div className='tm-empty-actions'>
        <button className='tm-button tm-button-primary' onClick={filtered ? onReset : onImport}>
          {filtered ? <SearchX size={16} /> : <ArrowUp size={16} />}
          {t(filtered ? 'uiResetFilters' : 'import')}
        </button>
        {!filtered && (
          <button
            className='tm-button border border-tm-border hover:bg-tm-muted'
            onClick={onCreate}
          >
            <FolderPlus size={16} />
            {t('uiNewProject')}
          </button>
        )}
      </div>
      {!filtered && (
        <>
          <p className='text-xs'>{t('uiDropHint')}</p>
          <span className='tm-empty-footnote'>
            <LockKeyhole size={12} />
            {t('uiStorageHint')}
          </span>
        </>
      )}
    </section>
  );
}
