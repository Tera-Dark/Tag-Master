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
    onClean: (scope: 'all' | 'selected', op: 'applyRules' | 'lowercase' | 'underscoreToSpace' | 'spaceToUnderscore' | 'sanitize') => void;
    t: (key: keyof typeof translations['en']) => string;
}

export const CleanModal: React.FC<CleanModalProps> = ({
    isOpen, onClose, settings, setSettings, visibleCount, selectedCount, onClean, t
}) => {
    const [newPattern, setNewPattern] = useState('');
    const [newReplace, setNewReplace] = useState('');
    const [testInput, setTestInput] = useState('girl, blue_eyes, hat');

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

    const isZh = settings.language === 'zh';

    const handlePresetClean = (
        scope: 'all' | 'selected',
        op: 'lowercase' | 'underscoreToSpace' | 'spaceToUnderscore' | 'sanitize',
        label: string
    ) => {
        const count = scope === 'selected' ? selectedCount : visibleCount;
        const confirmMsg = isZh
            ? `确定要将 [${label}] 应用于当前 ${count} 张图片吗？此操作将立即修改所有标签，建议先备份。`
            : `Are you sure you want to apply [${label}] to current ${count} images? This will modify captions immediately.`;
        if (confirm(confirmMsg)) {
            onClean(scope, op);
            onClose();
        }
    };

    const presets = [
        {
            op: 'lowercase' as const,
            label: isZh ? '全小写化 (Lowercase)' : 'Lowercase Tags',
            desc: isZh ? '将所有标签字符转换为纯小写 (e.g. Solo ➜ solo)' : 'Convert all tags to lowercase',
        },
        {
            op: 'underscoreToSpace' as const,
            label: isZh ? '下划线转空格 (Booru 转换)' : 'Underscores to Spaces',
            desc: isZh ? '将标签中的下划线替换为空格 (e.g. long_hair ➜ long hair)' : 'Replace "_" with " " for natural captions',
        },
        {
            op: 'spaceToUnderscore' as const,
            label: isZh ? '空格转下划线 (Booru 规范)' : 'Spaces to Underscores',
            desc: isZh ? '将各标签内的空格替换为下划线 (e.g. long hair ➜ long_hair)' : 'Replace spaces with "_" in individual tags',
        },
        {
            op: 'sanitize' as const,
            label: isZh ? '智能去重与整理 (Sanitize)' : 'Deduplicate & Sanitize',
            desc: isZh ? '自动删除重复的标签，清理多余空格与逗号' : 'Remove duplicate tags and clean redundant separators',
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ease-out">
                {/* Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        {isZh ? 'LoRA 标注数据清洗工具' : 'Tag Cleansing & Sanitize Tools'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Intro Warning */}
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 p-4 rounded-xl text-sm text-amber-800 dark:text-amber-300 border border-amber-500/20 flex gap-3 items-center">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="font-bold">{isZh ? '警告：数据清洗操作将直接改写本地缓存文件' : 'Warning: Cleansing operations will overwrite local files'}</p>
                            <p className="text-xs opacity-80 mt-0.5">{isZh ? '清洗后的标签会同步保存至 IndexedDB，建议在执行大批量清洗前，备份已导出的文本。' : 'Changes are synced directly to IndexedDB. Backups are recommended.'}</p>
                        </div>
                    </div>

                    {/* Main Layout: 2 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Preset Cleansing */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                {isZh ? '智能一键快捷清洗预设' : 'One-Click Quick Presets'}
                            </h4>

                            <div className="grid grid-cols-1 gap-3">
                                {presets.map((preset) => (
                                    <div key={preset.op} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 group hover:border-indigo-500/30 transition-all">
                                        <div>
                                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{preset.label}</span>
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-normal">{preset.desc}</p>
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            {selectedCount > 0 && (
                                                <button
                                                    onClick={() => handlePresetClean('selected', preset.op, preset.label)}
                                                    className="flex-1 py-1 px-2.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-950/40 transition-all font-bold"
                                                >
                                                    {isZh ? `已选 (${selectedCount})` : `Selected (${selectedCount})`}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handlePresetClean('all', preset.op, preset.label)}
                                                className="flex-1 py-1 px-2.5 text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-350 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-all font-bold"
                                            >
                                                {isZh ? `全部 (${visibleCount})` : `All (${visibleCount})`}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: Custom Regex Rules */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                {isZh ? '自定义正则查找替换规则' : 'Custom Regex Replacement Rules'}
                            </h4>

                            <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/30 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                                {/* Add New Rule */}
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('pattern')}</label>
                                        <input
                                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="e.g. \b(girl)\b"
                                            value={newPattern}
                                            onChange={e => setNewPattern(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('replaceWith')}</label>
                                        <input
                                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="e.g. 1girl"
                                            value={newReplace}
                                            onChange={e => setNewReplace(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={addRule}
                                        disabled={!newPattern.trim()}
                                        className="px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs disabled:opacity-50 transition-all hover:scale-105 active:scale-95 h-[32px] flex items-center gap-1 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> {t('add')}
                                    </button>
                                </div>

                                {/* Rules List */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('activeRules')}</label>
                                    {(!settings.replacementRules || settings.replacementRules.length === 0) && (
                                        <div className="text-center py-6 text-zinc-400 text-xs italic border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
                                            {t('noRules')}
                                        </div>
                                    )}
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                        {settings.replacementRules?.map((rule, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 group transition-all">
                                                <div className="font-mono text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 flex-1 truncate select-all" title={rule.pattern}>{rule.pattern}</div>
                                                <div className="text-zinc-400 text-xs">→</div>
                                                <div className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 flex-1 truncate select-all" title={rule.replace}>{rule.replace || '<empty>'}</div>
                                                <button onClick={() => removeRule(idx)} className="text-zinc-400 hover:text-red-500 transition-colors bg-zinc-50 dark:bg-zinc-850 p-1 rounded-md border border-zinc-200 dark:border-zinc-750 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Preview / Regex Tester */}
                    <div className="bg-zinc-900 text-zinc-200 p-4 rounded-xl space-y-3 shadow-inner">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                            <Play className="w-3 h-3" /> {t('liveTest')} (Regex)
                        </h4>
                        <input
                            className="w-full bg-transparent border-b border-zinc-700 pb-2 text-sm font-mono focus:border-indigo-500 outline-none transition-colors placeholder-zinc-700"
                            value={testInput}
                            onChange={e => setTestInput(e.target.value)}
                        />
                        {(() => {
                            const previewResult = getPreview(testInput);
                            const hasChanged = previewResult !== testInput;
                            return (
                                <div className={`flex items-start gap-2 text-sm font-mono transition-all duration-300 ${hasChanged ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                    <span className="text-zinc-500 select-none shrink-0">{t('result')}:</span>
                                    <span className="break-all">{previewResult}</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 gap-4">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
                        {t('close')}
                    </button>

                    <div className="flex gap-2">
                        {selectedCount > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm(t('confirmCleanSelected').replace('{count}', selectedCount.toString()))) {
                                        onClean('selected', 'applyRules');
                                        onClose();
                                    }
                                }}
                                className="px-4 py-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                {isZh ? `应用正则到已选 (${selectedCount})` : `Apply Regex to Selected (${selectedCount})`}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm(t('confirmCleanAll')
                                    .replace('{count}', visibleCount.toString())
                                    .replace('{rules}', (settings.replacementRules?.length || 0).toString())
                                )) {
                                    onClean('all', 'applyRules');
                                    onClose();
                                }
                            }}
                            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg"
                        >
                            {isZh ? `应用正则到全部 (${visibleCount})` : `Apply Regex to All (${visibleCount})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
