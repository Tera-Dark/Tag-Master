import { DialogOverlay } from '../ui/DialogOverlay';
import { useState, useEffect } from 'react';
import { X, BookOpen, Folder, MousePointer2, Wand2, Download, ArrowRight } from '../Icons';

export const TUTORIAL_SEEN_KEY = 'lora-tag-master-tutorial-seen-v1';

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

export const TutorialModal = ({ isOpen, onClose, t }: TutorialModalProps) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: <BookOpen className='w-10 h-10 text-tm-secondary' />,
      title: t('tutWelcomeTitle'),
      desc: t('tutWelcomeDesc'),
    },
    {
      icon: <Folder className='w-10 h-10 text-tm-secondary' />,
      title: t('tutImportTitle'),
      desc: t('tutImportDesc'),
    },
    {
      icon: <MousePointer2 className='w-10 h-10 text-tm-secondary' />,
      title: t('tutSelectTitle'),
      desc: t('tutSelectDesc'),
    },
    {
      icon: <Wand2 className='w-10 h-10 text-tm-secondary' />,
      title: t('tutTagTitle'),
      desc: t('tutTagDesc'),
    },
    {
      icon: <Download className='w-10 h-10 text-tm-secondary' />,
      title: t('tutExportTitle'),
      desc: t('tutExportDesc'),
    },
  ];

  const handleNext = () => {
    setStep((s) => {
      if (s < slides.length - 1) return s + 1;
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
      onClose();
      return s;
    });
  };

  const handlePrev = () => {
    setStep((s) => (s > 0 ? s - 1 : s));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <DialogOverlay
      onClose={onClose}
      label='快速入门'
      className='fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200'
    >
      <div className='bg-tm-canvas rounded-2xl max-w-lg w-full shadow-none border border-black/[0.08] dark:border-white/[0.08] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 ease-out'>
        <button
          aria-label='关闭'
          type='button'
          onClick={() => {
            localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
            onClose();
          }}
          className='tm-button absolute top-4 right-4 text-tm-subtle hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer'
        >
          <X className='w-5 h-5' />
        </button>

        <div className='p-8 flex-1 flex flex-col items-center text-center justify-center min-h-[300px]'>
          <div className='mb-6 p-5 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl'>
            {slides[step].icon}
          </div>
          <h2 className='text-xl font-semibold mb-2.5 text-zinc-900 dark:text-white'>
            {slides[step].title}
          </h2>
          <p className='text-tm-subtle text-sm leading-relaxed max-w-sm'>{slides[step].desc}</p>
        </div>

        <div className='px-6 py-4 border-t border-tm-border flex justify-between items-center bg-tm-sidebar'>
          <button
            type='button'
            onClick={() => {
              localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
              onClose();
            }}
            className='tm-button text-xs font-semibold text-tm-subtle hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer'
          >
            {t('skip')}
          </button>

          <div className='flex gap-1.5'>
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'bg-zinc-900 dark:bg-white w-5'
                    : 'bg-black/[0.1] dark:bg-white/[0.15] w-1.5'
                }`}
              />
            ))}
          </div>

          <div className='flex gap-2'>
            {step > 0 && (
              <button
                type='button'
                onClick={handlePrev}
                className='tm-button px-3.5 py-1.5 rounded-full border border-black/[0.1] dark:border-white/[0.15] text-xs font-semibold text-zinc-600 dark:text-tm-subtle hover:bg-black/[0.04] transition-colors cursor-pointer'
              >
                上一步
              </button>
            )}
            <button
              type='button'
              onClick={handleNext}
              className='tm-button tm-button-primary flex items-center gap-1.5 bg-tm-accent text-tm-on-accent px-4 py-1.5 rounded-full text-xs font-semibold shadow-none hover:opacity-90  transition-all cursor-pointer'
            >
              <span>{step === slides.length - 1 ? t('finish') : t('next')}</span>
              {step < slides.length - 1 && <ArrowRight className='w-3.5 h-3.5' />}
            </button>
          </div>
        </div>
      </div>
    </DialogOverlay>
  );
};
