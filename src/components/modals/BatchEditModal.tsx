import { useState } from 'react';
import { X, Tags, Eraser } from '../Icons';

export interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleCount: number;
  selectedCount: number;
  onBatchUpdate: (
    operation: 'replace' | 'prepend' | 'append' | 'addTags' | 'removeTags' | 'applyRules',
    params: unknown,
    scope: 'all' | 'selected'
  ) => void;
  t: (key: string) => string;
}

export const BatchEditModal = ({
  isOpen,
  onClose,
  visibleCount,
  selectedCount,
  onBatchUpdate,
  t
}: BatchEditModalProps) => {
  const [mode, setMode] = useState<'replace' | 'append' | 'smart'>('smart');
  const [findStr, setFindStr] = useState('');
  const [replaceStr, setReplaceStr] = useState('');
  const [prefixStr, setPrefixStr] = useState('');
  const [suffixStr, setSuffixStr] = useState('');
  const [addTagsStr, setAddTagsStr] = useState('');
  const [removeTagsStr, setRemoveTagsStr] = useState('');
  const [scope, setScope] = useState<'all' | 'selected'>(selectedCount > 0 ? 'selected' : 'all');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t('batchTitle')}</h2>
            <p className="text-xs text-zinc-400">{t('batchSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Segmented Mode Switch */}
          <div className="flex bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('smart')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'smart'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t('smartTags')}
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'replace'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t('findReplace')}
            </button>
            <button
              type="button"
              onClick={() => setMode('append')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'append'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t('prependAppend')}
            </button>
          </div>

          <div className="space-y-4 min-h-[140px]">
            {mode === 'smart' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mb-1.5 flex gap-1.5 items-center">
                    <Tags className="w-3.5 h-3.5" /> {t('addTags')}
                  </label>
                  <input
                    autoFocus
                    value={addTagsStr}
                    onChange={e => setAddTagsStr(e.target.value)}
                    className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder-zinc-400 font-mono"
                    placeholder={t('addTagsPlaceholder')}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-rose-500 block mb-1.5 flex gap-1.5 items-center">
                    <Eraser className="w-3.5 h-3.5" /> {t('removeTags')}
                  </label>
                  <input
                    value={removeTagsStr}
                    onChange={e => setRemoveTagsStr(e.target.value)}
                    className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder-zinc-400 font-mono"
                    placeholder={t('removeTagsPlaceholder')}
                  />
                </div>
              </>
            )}
            {mode === 'replace' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1.5">{t('find')}</label>
                  <input
                    autoFocus
                    value={findStr}
                    onChange={e => setFindStr(e.target.value)}
                    className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder-zinc-400 font-mono"
                    placeholder="例如: cat"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1.5">{t('replaceWith')}</label>
                  <input
                    value={replaceStr}
                    onChange={e => setReplaceStr(e.target.value)}
                    className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder-zinc-400 font-mono"
                    placeholder="留空则直接删除匹配词"
                  />
                </div>
              </>
            )}
            {mode === 'append' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1.5">{t('prefix')}</label>
                  <input
                    autoFocus
                    value={prefixStr}
                    onChange={e => setPrefixStr(e.target.value)}
                    className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder-zinc-400 font-mono"
                    placeholder="在开头添加前缀，如: 1girl, "
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1.5">{t('suffix')}</label>
                  <input
                    value={suffixStr}
                    onChange={e => setSuffixStr(e.target.value)}
                    className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder-zinc-400 font-mono"
                    placeholder="在结尾追加后缀，如: , cinematic lighting"
                  />
                </div>
              </>
            )}

            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <label className="text-xs font-semibold text-zinc-400 block mb-2">{t('target')}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    className="accent-zinc-900 dark:accent-white cursor-pointer"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('scopeAll')} ({visibleCount})</span>
                </label>
                <label className={`flex items-center gap-2 ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    checked={scope === 'selected'}
                    onChange={() => selectedCount > 0 && setScope('selected')}
                    disabled={selectedCount === 0}
                    className="accent-zinc-900 dark:accent-white cursor-pointer"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('scopeSelected')} ({selectedCount})</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-end gap-2.5 bg-[#fafafa] dark:bg-[#161619]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            {t('close')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode === 'smart') {
                if (addTagsStr) onBatchUpdate('addTags', { tags: addTagsStr.split(',') }, scope);
                if (removeTagsStr) onBatchUpdate('removeTags', { tags: removeTagsStr.split(',') }, scope);
              }
              else if (mode === 'replace') onBatchUpdate('replace', { find: findStr, replace: replaceStr }, scope);
              else onBatchUpdate(mode === 'append' && prefixStr ? 'prepend' : 'append', { prefix: prefixStr, suffix: suffixStr }, scope);
            }}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-full shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
};
