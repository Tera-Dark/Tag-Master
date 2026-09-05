import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Folder, Tags, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { Project } from '../../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, triggerWord: string) => void;
  defaultIndex?: number;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultIndex = 1
}) => {
  const [name, setName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(`项目 ${defaultIndex}`);
      setTriggerWord('');
    }
  }, [isOpen, defaultIndex]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), triggerWord.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl max-w-md w-full border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out">
        <div className="px-6 py-4.5 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center bg-[#fafafa] dark:bg-[#161619]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-zinc-700 dark:text-zinc-200">
              <FolderPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-100">新建项目分类</h2>
              <p className="text-xs text-zinc-400">创建一个空的数据集分类，方便归类管理与针对性打标</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如: 角色精修集 / 场景风格A"
                className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 transition-all placeholder:text-zinc-400 font-medium"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              专属触发词 (Trigger Word · 可选)
            </label>
            <div className="relative">
              <Tags className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={triggerWord}
                onChange={e => setTriggerWord(e.target.value)}
                placeholder="例如: miku_hatsune, anime style"
                className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 transition-all placeholder:text-zinc-400 font-mono text-xs md:text-sm"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              提示：设置触发词后，该项目下所有图片 AI 反推时将自动注入该触发词。
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] text-xs md:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] px-5 py-2 rounded-full font-semibold text-xs md:text-sm shadow-2xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            >
              创建项目
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (projectId: string, name: string, triggerWord: string) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave
}) => {
  const [name, setName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setTriggerWord(project.triggerWord || '');
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(project.id, name.trim(), triggerWord.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl max-w-md w-full border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out">
        <div className="px-6 py-4.5 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center bg-[#fafafa] dark:bg-[#161619]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-zinc-700 dark:text-zinc-200">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-100">编辑项目属性</h2>
              <p className="text-xs text-zinc-400">修改项目名称及专属训练触发词</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="项目名称"
                className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 transition-all font-medium"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              专属触发词 (Trigger Word)
            </label>
            <div className="relative">
              <Tags className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={triggerWord}
                onChange={e => setTriggerWord(e.target.value)}
                placeholder="例如: miku_hatsune"
                className="w-full bg-[#fafafa] dark:bg-[#202024] border border-black/[0.08] dark:border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 transition-all font-mono text-xs md:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] text-xs md:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] px-5 py-2 rounded-full font-semibold text-xs md:text-sm shadow-2xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            >
              保存修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onConfirm: (projectId: string) => void;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onConfirm
}) => {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl max-w-sm w-full border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 ease-out">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">确认删除项目？</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              您确定要删除项目 <span className="font-semibold text-zinc-800 dark:text-zinc-200">「{project.name}」</span> 吗？
            </p>
          </div>
        </div>

        <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] rounded-2xl p-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          <div className="flex justify-between">
            <span>包含图片数量：</span>
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{project.images.length} 张</span>
          </div>
          <p className="text-[11px] text-red-500/90 pt-0.5">
            ⚠️ 删除后该分类下的所有图片与打标记录将不可恢复。
          </p>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] text-xs md:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(project.id);
              onClose();
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full font-semibold text-xs md:text-sm shadow-2xs active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};
