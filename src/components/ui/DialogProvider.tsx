import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';
import { DialogContext, type DialogActions } from './DialogContext';
import { DialogOverlay } from './DialogOverlay';

type Request = {
  id: number;
  kind: 'confirm' | 'prompt' | 'alert';
  message: string;
  initial?: string;
  resolve: (value: string | boolean | null) => void;
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<Request[]>([]);
  const outstanding = useRef(new Set<Request>());
  const counter = useRef(0);
  const actions = useMemo<DialogActions>(() => {
    const ask = (kind: Request['kind'], message: string, initial?: string) =>
      new Promise<string | boolean | null>((resolve) => {
        const request = { id: ++counter.current, kind, message, initial, resolve };
        outstanding.current.add(request);
        setQueue((previous) => [...previous, request]);
      });
    return {
      confirm: async (message) => (await ask('confirm', message)) === true,
      prompt: async (message, initial) => {
        const value = await ask('prompt', message, initial);
        return typeof value === 'string' ? value : null;
      },
      alert: async (message) => {
        await ask('alert', message);
      },
    };
  }, []);
  useEffect(() => {
    const pending = outstanding.current;
    return () => {
      pending.forEach((request) => request.resolve(null));
      pending.clear();
    };
  }, []);
  const request = queue[0];
  const finish = (value: string | boolean | null) => {
    if (!request) return;
    request.resolve(value);
    outstanding.current.delete(request);
    setQueue((previous) => previous.slice(1));
  };
  return (
    <DialogContext.Provider value={actions}>
      {children}
      {request && (
        <DialogOverlay
          key={request.id}
          label={t(request.kind === 'prompt' ? 'uiNamePreset' : 'uiConfirmAction')}
          onClose={() => finish(null)}
          className='tm-prompt-overlay'
        >
          <form
            className='w-full max-w-md bg-tm-canvas rounded-2xl p-6 space-y-5 border border-tm-border'
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get('value');
              finish(request.kind === 'prompt' ? String(value || '').trim() : true);
            }}
          >
            <div className='flex justify-between items-center'>
              <h2 className='flex gap-2 items-center'>
                <AlertCircle size={19} />
                {t(request.kind === 'prompt' ? 'uiNamePreset' : 'uiConfirmAction')}
              </h2>
              <button
                type='button'
                className='tm-button p-1.5'
                aria-label={t('uiClose')}
                onClick={() => finish(null)}
              >
                <X size={18} />
              </button>
            </div>
            <p className='text-sm text-tm-secondary leading-relaxed whitespace-pre-wrap'>
              {request.message}
            </p>
            {request.kind === 'prompt' && (
              <input
                autoFocus
                aria-label={t('uiNamePreset')}
                name='value'
                className='tm-input w-full px-3 py-2'
                defaultValue={request.initial}
                required
                maxLength={120}
              />
            )}
            <div className='flex justify-end gap-2 pt-2'>
              {request.kind !== 'alert' && (
                <button
                  type='button'
                  className='tm-button px-4 py-2 border border-tm-border'
                  onClick={() => finish(null)}
                >
                  {t('cancel')}
                </button>
              )}
              <button type='submit' className='tm-button tm-button-primary px-5 py-2'>
                {t('uiConfirm')}
              </button>
            </div>
          </form>
        </DialogOverlay>
      )}
    </DialogContext.Provider>
  );
}
