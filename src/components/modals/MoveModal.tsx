import { useState } from 'react';
import { Project } from '../../types';
import { X, ChevronDown } from '../Icons';

export interface MoveModalProps {
  moveState: { isOpen: boolean; mode: 'selection' | 'project'; sourceProjectId?: string };
  onClose: () => void;
  projects: Project[];
  selectionCount: number;
  onConfirm: (targetId: string, newName: string) => void;
  t: (key: string) => string;
}

export const MoveModal = ({
  moveState,
  onClose,
  projects,
  selectionCount,
  onConfirm,
  t
}: MoveModalProps) => {
  const [targetId, setTargetId] = useState('new');
  const [newName, setNewName] = useState('');

  if (!moveState.isOpen) return null;

  const isMerge = moveState.mode === 'project';
  const count = isMerge
    ? projects.find(p => p.id === moveState.sourceProjectId)?.images.length || 0
    : selectionCount;

  const sourceName = isMerge
    ? projects.find(p => p.id === moveState.sourceProjectId)?.name
    : '';

  const availableProjects = projects.filter(p => !isMerge || p.id !== moveState.sourceProjectId);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {isMerge ? t('mergeTitle') : t('moveTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isMerge
              ? t('mergeDesc').replace('{name}', sourceName || 'Project')
              : t('moveDesc').replace('{count}', count.toString())}
          </p>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {t('targetProject')}
            </label>
            <div className="relative">
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full appearance-none bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white cursor-pointer"
              >
                <option value="new">{t('newProject')}</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.images.length})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          {targetId === 'new' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                {t('newProjectName')}
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                placeholder="例如: 角色精修训练集"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-end gap-2.5 bg-[#fafafa] dark:bg-[#161619]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            {t('close')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(targetId, newName)}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-full shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            {isMerge ? t('confirmMerge') : t('confirmMove')}
          </button>
        </div>
      </div>
    </div>
  );
};
