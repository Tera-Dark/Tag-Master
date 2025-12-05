import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_TEMPLATES, Project } from '../types';
import { translations, Language } from '../utils/i18n';
import {
    X, Sun, Moon, BookOpen, Folder, MousePointer2, Wand2, Download, ArrowRight,
    ChevronDown, Tags, Eraser
} from './Icons';

const TUTORIAL_SEEN_KEY = 'lora-tag-master-tutorial-seen-v1';

// --- SETTINGS MODAL ---
export const SettingsModal = ({
    isOpen,
    onClose,
    settings,
    setSettings,
    t
}: {
    isOpen: boolean,
    onClose: () => void,
    settings: AppSettings,
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
    t: (key: keyof typeof translations['en']) => string
}) => {
    // Local state for buffering changes
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

    // Sync local state when modal opens or external settings change
    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
        }
    }, [isOpen, settings]);

    // Apply changes and close
    const handleSave = () => {
        setSettings(localSettings);
        onClose();
    };

    // Handle theme change immediately for preview, but keep others buffered
    const handleThemeChange = (theme: 'light' | 'dark') => {
        const newSettings = { ...localSettings, theme };
        setLocalSettings(newSettings);
        setSettings(s => ({ ...s, theme })); // Apply immediately
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{t('settings')}</h2><button onClick={handleSave}><X className="w-5 h-5" /></button></div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('language')}</label><div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg"><button onClick={() => setLocalSettings(s => ({ ...s, language: 'en' }))} className={`flex-1 py-1 rounded text-xs ${localSettings.language === 'en' ? 'bg-white dark:bg-zinc-600 shadow' : ''}`}>English</button><button onClick={() => setLocalSettings(s => ({ ...s, language: 'zh' }))} className={`flex-1 py-1 rounded text-xs ${localSettings.language === 'zh' ? 'bg-white dark:bg-zinc-600 shadow' : ''}`}>中文</button></div></div>
                    <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('theme')}</label><div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg"><button onClick={() => handleThemeChange('light')} className={`flex-1 py-1 rounded text-xs flex items-center justify-center gap-1 ${localSettings.theme === 'light' ? 'bg-white text-amber-600 shadow' : ''}`}><Sun className="w-3 h-3" /> Light</button><button onClick={() => handleThemeChange('dark')} className={`flex-1 py-1 rounded text-xs flex items-center justify-center gap-1 ${localSettings.theme === 'dark' ? 'bg-zinc-700 text-white shadow' : ''}`}><Moon className="w-3 h-3" /> Dark</button></div></div>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-500 uppercase">API Provider</label>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg mb-2">
                        <button onClick={() => setLocalSettings(s => ({ ...s, protocol: 'google' }))} className={`flex-1 py-2 text-xs font-bold rounded-md ${localSettings.protocol === 'google' ? 'bg-white dark:bg-zinc-600 shadow' : 'opacity-50'}`}>Google Gemini</button>
                        <button onClick={() => setLocalSettings(s => ({ ...s, protocol: 'openai_compatible' }))} className={`flex-1 py-2 text-xs font-bold rounded-md ${localSettings.protocol === 'openai_compatible' ? 'bg-white dark:bg-zinc-600 shadow' : 'opacity-50'}`}>OpenAI Compatible</button>
                    </div>
                    <input type="password" value={localSettings.apiKey} onChange={e => setLocalSettings(s => ({ ...s, apiKey: e.target.value }))} className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm" placeholder="API Key" />
                    <input type="text" value={localSettings.model} onChange={e => setLocalSettings(s => ({ ...s, model: e.target.value }))} className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm" placeholder="Model Name" />
                    {localSettings.protocol === 'openai_compatible' && <input type="text" value={localSettings.baseUrl} onChange={e => setLocalSettings(s => ({ ...s, baseUrl: e.target.value }))} className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm" placeholder="Base URL" />}
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('activePrompt')}</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                        {[...DEFAULT_TEMPLATES, ...localSettings.customTemplates].map(tm => (
                            <button key={tm.id} onClick={() => setLocalSettings(s => ({ ...s, activePrompt: tm.value }))} className={`whitespace-nowrap px-3 py-1 rounded border text-xs ${localSettings.activePrompt === tm.value ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-zinc-200 dark:border-zinc-700'}`}>{tm.label}</button>
                        ))}
                    </div>
                    <textarea value={localSettings.activePrompt} onChange={e => setLocalSettings(s => ({ ...s, activePrompt: e.target.value }))} className="w-full h-32 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Blocked Words (Comma Separated)</label>
                    <textarea
                        value={localSettings.blockedWords?.join(', ') || ''}
                        onChange={e => setLocalSettings(s => ({ ...s, blockedWords: e.target.value.split(',').map(w => w.trim()).filter(Boolean) }))}
                        className="w-full h-20 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono"
                        placeholder="username, text logo, watermark..."
                    />
                </div>

                <div className="flex justify-end"><button onClick={handleSave} className="bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold text-sm">{t('done')}</button></div>
            </div>
        </div>
    );
};

// --- BATCH EDIT MODAL ---
export const ExportModal = ({
    isOpen,
    onClose,
    onExport,
    t
}: {
    isOpen: boolean,
    onClose: () => void,
    onExport: (format: 'txt' | 'json') => void,
    t: (key: keyof typeof translations['en']) => string
}) => {
    const [format, setFormat] = useState<'txt' | 'json'>('txt');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{t('exportAll')}</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>

                <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-500 uppercase">Format</label>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => setFormat('txt')} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${format === 'txt' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-300' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${format === 'txt' ? 'border-indigo-500' : 'border-zinc-400'}`}>
                                {format === 'txt' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">Text Files (.txt)</div>
                                <div className="text-xs opacity-70">Standard caption files</div>
                            </div>
                        </button>
                        <button onClick={() => setFormat('json')} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${format === 'json' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-300' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${format === 'json' ? 'border-indigo-500' : 'border-zinc-400'}`}>
                                {format === 'json' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">JSON Files (.json)</div>
                                <div className="text-xs opacity-70">Sidecar JSON format</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">Cancel</button>
                    <button onClick={() => { onExport(format); onClose(); }} className="bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold text-sm">Export</button>
                </div>
            </div>
        </div>
    );
};

// --- BATCH EDIT MODAL ---
export const BatchEditModal = ({
    isOpen,
    onClose,
    visibleCount,
    selectedCount,
    onBatchUpdate,
    t
}: {
    isOpen: boolean,
    onClose: () => void,
    visibleCount: number,
    selectedCount: number,
    onBatchUpdate: (operation: 'replace' | 'prepend' | 'append' | 'addTags' | 'removeTags', params: any, scope: 'all' | 'selected') => void,
    t: (key: keyof typeof translations['en']) => string
}) => {
    if (!isOpen) return null;
    const [mode, setMode] = useState<'replace' | 'append' | 'smart'>('smart');
    const [findStr, setFindStr] = useState('');
    const [replaceStr, setReplaceStr] = useState('');
    const [prefixStr, setPrefixStr] = useState('');
    const [suffixStr, setSuffixStr] = useState('');
    const [addTagsStr, setAddTagsStr] = useState('');
    const [removeTagsStr, setRemoveTagsStr] = useState('');
    const [scope, setScope] = useState<'all' | 'selected'>(selectedCount > 0 ? 'selected' : 'all');

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div><h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('batchTitle')}</h2><p className="text-xs text-zinc-500">{t('batchSubtitle')}</p></div>
                    <button onClick={onClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300" /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <button onClick={() => setMode('smart')} className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${mode === 'smart' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>{t('smartTags')}</button>
                        <button onClick={() => setMode('replace')} className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${mode === 'replace' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>{t('findReplace')}</button>
                        <button onClick={() => setMode('append')} className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${mode === 'append' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>{t('prependAppend')}</button>
                    </div>

                    <div className="space-y-4 min-h-[150px]">
                        {mode === 'smart' && (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block mb-1.5 flex gap-2 items-center"><Tags className="w-3 h-3" /> {t('addTags')}</label>
                                    <input value={addTagsStr} onChange={e => setAddTagsStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder={t('addTagsPlaceholder')} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-red-600 dark:text-red-400 block mb-1.5 flex gap-2 items-center"><Eraser className="w-3 h-3" /> {t('removeTags')}</label>
                                    <input value={removeTagsStr} onChange={e => setRemoveTagsStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder={t('removeTagsPlaceholder')} />
                                </div>
                            </>
                        )}
                        {mode === 'replace' && (
                            <>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('find')}</label><input value={findStr} onChange={e => setFindStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder="e.g. cat" /></div>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('replaceWith')}</label><input value={replaceStr} onChange={e => setReplaceStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder="empty to remove" /></div>
                            </>
                        )}
                        {mode === 'append' && (
                            <>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('prefix')}</label><input value={prefixStr} onChange={e => setPrefixStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder="masterpiece, " /></div>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('suffix')}</label><input value={suffixStr} onChange={e => setSuffixStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder=", 4k" /></div>
                            </>
                        )}

                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">{t('target')}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-indigo-500" />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('scopeAll')} ({visibleCount})</span>
                                </label>
                                <label className={`flex items-center gap-2 ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input type="radio" checked={scope === 'selected'} onChange={() => selectedCount > 0 && setScope('selected')} disabled={selectedCount === 0} className="accent-indigo-500" />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('scopeSelected')} ({selectedCount})</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 rounded-lg">{t('close')}</button>
                    <button
                        onClick={() => {
                            if (mode === 'smart') {
                                if (addTagsStr) onBatchUpdate('addTags', { tags: addTagsStr.split(',') }, scope);
                                if (removeTagsStr) onBatchUpdate('removeTags', { tags: removeTagsStr.split(',') }, scope);
                            }
                            else if (mode === 'replace') onBatchUpdate('replace', { find: findStr, replace: replaceStr }, scope);
                            else onBatchUpdate(mode === 'append' && prefixStr ? 'prepend' : 'append', { prefix: prefixStr, suffix: suffixStr }, scope);
                        }}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg"
                    >
                        {t('apply')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MOVE / MERGE MODAL ---
export const MoveModal = ({
    moveState,
    onClose,
    projects,
    selectionCount,
    onConfirm,
    t
}: {
    moveState: { isOpen: boolean, mode: 'selection' | 'project', sourceProjectId?: string },
    onClose: () => void,
    projects: Project[],
    selectionCount: number,
    onConfirm: (targetId: string, newName: string) => void,
    t: (key: keyof typeof translations['en']) => string
}) => {
    if (!moveState.isOpen) return null;
    const [targetId, setTargetId] = useState('new');
    const [newName, setNewName] = useState('');

    const isMerge = moveState.mode === 'project';
    const count = isMerge
        ? projects.find(p => p.id === moveState.sourceProjectId)?.images.length || 0
        : selectionCount;

    const sourceName = isMerge
        ? projects.find(p => p.id === moveState.sourceProjectId)?.name
        : '';

    const availableProjects = projects.filter(p => !isMerge || p.id !== moveState.sourceProjectId);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{isMerge ? t('mergeTitle') : t('moveTitle')}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {isMerge
                            ? t('mergeDesc').replace('{name}', sourceName || 'Project')
                            : t('moveDesc').replace('{count}', count.toString())}
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('targetProject')}</label>
                        <div className="relative">
                            <select
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pr-10 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('newProjectName')}</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="My New Project"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">{t('close')}</button>
                    <button
                        onClick={() => onConfirm(targetId, newName)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg"
                    >
                        {isMerge ? t('confirmMerge') : t('confirmMove')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- TUTORIAL MODAL ---
export const TutorialModal = ({
    isOpen,
    onClose,
    t
}: {
    isOpen: boolean,
    onClose: () => void,
    t: (key: keyof typeof translations['en']) => string
}) => {
    const [step, setStep] = useState(0);

    const slides = [
        { icon: <BookOpen className="w-12 h-12 text-indigo-500" />, title: t('tutWelcomeTitle'), desc: t('tutWelcomeDesc') },
        { icon: <Folder className="w-12 h-12 text-amber-500" />, title: t('tutImportTitle'), desc: t('tutImportDesc') },
        { icon: <MousePointer2 className="w-12 h-12 text-emerald-500" />, title: t('tutSelectTitle'), desc: t('tutSelectDesc') },
        { icon: <Wand2 className="w-12 h-12 text-purple-500" />, title: t('tutTagTitle'), desc: t('tutTagDesc') },
        { icon: <Download className="w-12 h-12 text-blue-500" />, title: t('tutExportTitle'), desc: t('tutExportDesc') }
    ];

    const handleNext = () => {
        if (step < slides.length - 1) setStep(step + 1);
        else {
            localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
            onClose();
        }
    };

    const handlePrev = () => {
        if (step > 0) setStep(step - 1);
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [step, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-300">
                <button onClick={() => { localStorage.setItem(TUTORIAL_SEEN_KEY, 'true'); onClose(); }} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"><X className="w-5 h-5" /></button>

                <div className="p-8 flex-1 flex flex-col items-center text-center justify-center min-h-[320px]">
                    <div className="mb-6 p-6 bg-zinc-50 dark:bg-zinc-950 rounded-full shadow-inner">{slides[step].icon}</div>
                    <h2 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">{slides[step].title}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">{slides[step].desc}</p>
                </div>

                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/50">
                    <button onClick={() => { localStorage.setItem(TUTORIAL_SEEN_KEY, 'true'); onClose(); }} className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">{t('skip')}</button>

                    <div className="flex gap-2">
                        {slides.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-indigo-600 w-6' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                        ))}
                    </div>

                    <button onClick={handleNext} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95">
                        {step === slides.length - 1 ? t('finish') : t('next')}
                        {step < slides.length - 1 && <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};