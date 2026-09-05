import { useState } from 'react';
import { X } from '../Icons';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'txt' | 'json') => void;
  t: (key: string) => string;
}

export const ExportModal = ({
  isOpen,
  onClose,
  onExport,
  t
}: ExportModalProps) => {
  const [format, setFormat] = useState<'txt' | 'json'>('txt');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl max-w-sm w-full border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 ease-out">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t('exportAll')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
            导出格式选择
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFormat('txt')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                format === 'txt'
                  ? 'bg-black/[0.03] dark:bg-white/[0.06] border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white shadow-2xs'
                  : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.18] dark:hover:border-white/[0.2] bg-white dark:bg-[#202024]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${format === 'txt' ? 'border-zinc-900 dark:border-white' : 'border-zinc-400'}`}>
                {format === 'txt' && <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />}
              </div>
              <div>
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">纯文本文件 (.txt)</div>
                <div className="text-xs text-zinc-400">标准 LoRA 训练打标文本格式</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                format === 'json'
                  ? 'bg-black/[0.03] dark:bg-white/[0.06] border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white shadow-2xs'
                  : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.18] dark:hover:border-white/[0.2] bg-white dark:bg-[#202024]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${format === 'json' ? 'border-zinc-900 dark:border-white' : 'border-zinc-400'}`}>
                {format === 'json' && <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />}
              </div>
              <div>
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">JSON 结构化文件 (.json)</div>
                <div className="text-xs text-zinc-400">Sidecar JSON 元数据格式</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-black/[0.1] dark:border-white/[0.15] text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => { onExport(format); onClose(); }}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2 rounded-full font-bold text-sm shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            立即导出
          </button>
        </div>
      </div>
    </div>
  );
};
