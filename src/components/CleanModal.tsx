import React, { useState } from 'react';
import { X, Plus, Trash2, Play, AlertTriangle } from './Icons';
import { AppSettings } from '../types';
import { translations } from '../utils/i18n';

interface CleanModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    setSettings: (s: AppSettings) => void;
    visibleCount: number;
    selectedCount: number;
    onClean: (scope: 'all' | 'selected') => void;
    t: (key: keyof typeof translations['en']) => string;
}

export const CleanModal: React.FC<CleanModalProps> = ({
    isOpen, onClose, settings, setSettings, visibleCount, selectedCount, onClean, t
}) => {
    const [newPattern, setNewPattern] = useState('');
    const [newReplace, setNewReplace] = useState('');
    const [testInput, setTestInput] = useState('girl, blue eyes, hat');

    if (!isOpen) return null;

    const addRule = () => {
        if (!newPattern.trim()) return;
        setSettings({
            ...settings,
            replacementRules: [...(settings.replacementRules || []), { pattern: newPattern, replace: newReplace }]
        });
        setNewPattern('');
        setNewReplace('');
    };

    const removeRule = (index: number) => {
        const next = [...(settings.replacementRules || [])];
        next.splice(index, 1);
        setSettings({ ...settings, replacementRules: next });
    };

    const getPreview = (input: string) => {
        let result = input;
        (settings.replacementRules || []).forEach(rule => {
            try {
                let pattern = rule.pattern;
                let flags = 'gi';
                if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
                    const lastSlash = pattern.lastIndexOf('/');
                    flags = pattern.substring(lastSlash + 1);
                    pattern = pattern.substring(1, lastSlash);
                }
                const regex = new RegExp(pattern, flags);
                result = result.replace(regex, rule.replace);
            } catch (e) {
                // ignore invalid regex in preview
            }
        });
        return result;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        {t('cleanTitle')}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-500" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800/30">
                        <p>{t('cleanDescription')}</p>
                        <p className="mt-2 text-xs opacity-75">{t('cleanTip')}</p>
                    </div>

                    {/* Add New Rule */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('pattern')}</label>
                            <input
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="e.g. \b(girl)\b or /girl/gi"
                                value={newPattern}
                                onChange={e => setNewPattern(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('replaceWith')}</label>
                            <input
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="e.g. 1girl"
                                value={newReplace}
                                onChange={e => setNewReplace(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={addRule}
                            disabled={!newPattern.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-all hover:scale-105 active:scale-95 h-[38px] flex items-center gap-2 shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> {t('add')}
                        </button>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('activeRules')}</label>
                        {(!settings.replacementRules || settings.replacementRules.length === 0) && (
                            <div className="text-center py-8 text-zinc-400 text-sm italic border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                                {t('noRules')}
                            </div>
                        )}
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {settings.replacementRules?.map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 group transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                                    <div className="font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-100 dark:border-amber-900/30 flex-1 truncate select-all" title={rule.pattern}>{rule.pattern}</div>
                                    <div className="text-zinc-400">→</div>
                                    <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-900/30 flex-1 truncate select-all" title={rule.replace}>{rule.replace || '<empty>'}</div>
                                    <button onClick={() => removeRule(idx)} className="text-zinc-400 hover:text-red-500 transition-colors bg-white dark:bg-zinc-900 p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="bg-zinc-900 text-zinc-200 p-4 rounded-xl space-y-3 shadow-inner">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><Play className="w-3 h-3" /> {t('liveTest')}</h4>
                        <input
                            className="w-full bg-transparent border-b border-zinc-700 pb-2 text-sm font-mono focus:border-indigo-500 outline-none transition-colors placeholder-zinc-700"
                            value={testInput}
                            onChange={e => setTestInput(e.target.value)}
                        />
                        <div className="flex items-center gap-2 text-sm font-mono text-emerald-400">
                            <span className="text-zinc-500 select-none">{t('result')}:</span>
                            <span className="break-all">{getPreview(testInput)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 gap-4">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">{t('close')}</button>

                    <div className="flex gap-2">
                        {selectedCount > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm(t('confirmCleanSelected').replace('{count}', selectedCount.toString()))) {
                                        onClean('selected');
                                        onClose();
                                    }
                                }}
                                className="px-4 py-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                {t('cleanSelected')} ({selectedCount})
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm(t('confirmCleanAll')
                                    .replace('{count}', visibleCount.toString())
                                    .replace('{rules}', (settings.replacementRules?.length || 0).toString())
                                )) {
                                    onClean('all');
                                    onClose();
                                }
                            }}
                            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg"
                        >
                            {t('cleanAll')} ({visibleCount})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
