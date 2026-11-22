import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DatasetItem } from '../types/prompt';
import { ResilientImage } from './ResilientImage';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, triggerWord: string) => void;
  t: (key: string) => string;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  t,
}) => {
  const [name, setName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), triggerWord.trim());
    setName('');
    setTriggerWord('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border p-6 space-y-5"
        style={{
          backgroundColor: 'var(--surface-primary)',
          borderColor: 'var(--separator-hairline)',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-[17px] font-semibold"
            style={{ color: 'var(--label-primary)' }}
          >
            {t('projectModalCreate')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--label-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="text-[12px] font-medium block"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('projectNameLabel')}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Krea Editorial Set"
              className="w-full px-3.5 py-2 rounded-xl border text-[13px] apple-focus"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-[12px] font-medium block"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('projectTriggerLabel')}
            </label>
            <input
              type="text"
              value={triggerWord}
              onChange={(e) => setTriggerWord(e.target.value)}
              placeholder={t('triggerWordPlaceholder')}
              className="w-full px-3.5 py-2 rounded-xl border text-[13px] apple-focus"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium border cursor-pointer"
            style={{
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('create')}
          </button>
        </div>
      </form>
    </div>
  );
};

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (params: {
    prefix: string;
    suffix: string;
    find: string;
    replace: string;
  }) => void;
  t: (key: string) => string;
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({
  isOpen,
  onClose,
  onApply,
  t,
}) => {
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({ prefix, suffix, find, replace });
    setPrefix('');
    setSuffix('');
    setFind('');
    setReplace('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border p-6 space-y-5"
        style={{
          backgroundColor: 'var(--surface-primary)',
          borderColor: 'var(--separator-hairline)',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-[17px] font-semibold"
            style={{ color: 'var(--label-primary)' }}
          >
            {t('batchEditTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--label-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[12px] font-medium block" style={{ color: 'var(--label-secondary)' }}>
              {t('batchPrefix')}
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium block" style={{ color: 'var(--label-secondary)' }}>
              {t('batchSuffix')}
            </label>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium block" style={{ color: 'var(--label-secondary)' }}>
                {t('batchFind')}
              </label>
              <input
                type="text"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderColor: 'var(--separator-hairline)',
                  color: 'var(--label-primary)',
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium block" style={{ color: 'var(--label-secondary)' }}>
                {t('batchReplace')}
              </label>
              <input
                type="text"
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderColor: 'var(--separator-hairline)',
                  color: 'var(--label-primary)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium border cursor-pointer"
            style={{
              borderColor: 'var(--separator-hairline)',
              color: 'var(--label-primary)',
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('applyToVisible')}
          </button>
        </div>
      </form>
    </div>
  );
};

interface LightboxModalProps {
  item: DatasetItem | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ item, onClose }) => {
  if (!item) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full rounded-3xl overflow-hidden border p-4 space-y-3"
        style={{
          backgroundColor: 'var(--surface-primary)',
          borderColor: 'var(--separator-hairline)',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        <div className="flex items-center justify-between px-2">
          <span
            className="text-[14px] font-medium truncate"
            style={{ color: 'var(--label-primary)' }}
          >
            {item.name} · {item.width}×{item.height}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--label-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ResilientImage
          src={item.previewUrl}
          alt={item.name}
          eager
          className="w-full max-h-[75vh] object-contain rounded-xl"
        />
      </div>
    </div>
  );
};
