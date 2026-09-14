import { useMemo } from 'react';
import { AlertCircle, ArrowRight, Check, FileText, Images, Tags } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project, TagImage } from '../../types';
import { Thumbnail } from '../Thumbnail';

interface ReviewViewProps {
  projects: Project[];
  onNext: () => void;
}

export function ReviewView({ projects, onNext }: ReviewViewProps) {
  const { t } = useTranslation();
  const { total, captioned, missing, average, issues } = useMemo(() => {
    let total = 0,
      captioned = 0,
      tagCount = 0;
    const issues: { img: TagImage; project: string; message: string; raw?: boolean }[] = [];
    for (const project of projects)
      for (const img of project.images) {
        total++;
        if (img.caption.trim()) {
          captioned++;
          tagCount += img.caption
            .split(/\n\s*\n/)[0]
            .split(',')
            .filter((tag) => tag.trim()).length;
          if (img.caption.length < 10)
            issues.push({ img, project: project.name, message: 'uiCaptionShort' });
        } else issues.push({ img, project: project.name, message: 'uiCaptionMissing' });
        if (img.status === 'error')
          issues.push({
            img,
            project: project.name,
            message: img.errorMsg || 'uiProcessingError',
            raw: !!img.errorMsg,
          });
      }
    return {
      total,
      captioned,
      missing: total - captioned,
      average: captioned ? Math.round(tagCount / captioned) : 0,
      issues,
    };
  }, [projects]);
  const metrics = [
    { icon: Images, label: 'totalImages', value: total },
    { icon: Check, label: 'uiCaptioned', value: captioned },
    { icon: AlertCircle, label: 'uiMissingCaptions', value: missing },
    { icon: Tags, label: 'uiAverageTags', value: average },
  ];
  return (
    <section className='tm-workflow-view flex-1 overflow-y-auto bg-tm-canvas'>
      <div className='max-w-4xl mx-auto w-full py-4'>
        <div className='tm-view-heading flex items-start justify-between gap-4'>
          <div>
            <span className='text-xs text-tm-subtle block mb-3'>04 / {t('review')}</span>
            <h2>{t('uiReviewTitle')}</h2>
            <p>{t('uiReviewDescription')}</p>
          </div>
          <button
            className='tm-button tm-button-primary px-4 py-2.5 mt-6 text-sm flex items-center gap-2 shrink-0'
            onClick={onNext}
          >
            {t('export')}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className='tm-review-stats grid grid-cols-2 md:grid-cols-4 mb-8'>
          {metrics.map(({ icon: Icon, label, value }) => (
            <div key={label} className='flex flex-col gap-2'>
              <div className='text-tm-subtle'>
                <Icon size={19} />
              </div>
              <div className='text-2xl'>{value}</div>
              <p className='text-xs text-tm-subtle'>{t(label)}</p>
            </div>
          ))}
        </div>
        <div className='tm-card overflow-hidden'>
          <div className='flex justify-between items-center gap-3 px-6 py-4 border-b border-tm-border'>
            <h3 className='flex items-center gap-2 text-sm font-medium'>
              <FileText size={16} />
              {t('uiReviewItems')}
            </h3>
            <span className='text-xs text-tm-subtle'>
              {t('uiIssueCount', { count: issues.length })}
            </span>
          </div>
          {!issues.length ? (
            <div className='p-12 text-center'>
              <div className='w-11 h-11 border border-tm-border rounded-full flex items-center justify-center mx-auto mb-4'>
                {total ? <Check size={20} /> : <Images size={20} />}
              </div>
              <h4 className='font-medium mb-2'>{t(total ? 'uiReviewReady' : 'uiNoImages')}</h4>
              <p className='text-sm text-tm-subtle'>
                {t(total ? 'uiReviewReadyDescription' : 'uiImportFirst')}
              </p>
            </div>
          ) : (
            <div className='divide-y divide-tm-border max-h-[480px] overflow-y-auto'>
              {issues.map(({ img, project, message, raw }, index) => (
                <div
                  key={`${img.id}-${index}`}
                  className='flex items-center gap-4 p-4 sm:px-6 hover:bg-tm-panel'
                >
                  <div className='w-12 h-12 bg-tm-media rounded-lg overflow-hidden shrink-0 p-1'>
                    <Thumbnail
                      file={img.file}
                      url={img.previewUrl}
                      className='w-full h-full object-contain'
                    />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm truncate'>{img.file.name}</p>
                    <p className='text-xs text-tm-subtle mt-1 truncate'>{project}</p>
                  </div>
                  <span className='text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5 max-w-[50%] break-words'>
                    <AlertCircle size={13} className='shrink-0 mt-0.5' />
                    {raw ? message : t(message)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
