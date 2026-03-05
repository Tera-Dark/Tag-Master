import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, DEFAULT_TEMPLATES, Project } from '../types';
import {
    X, Sun, Moon, BookOpen, Folder, MousePointer2, Wand2, Download, ArrowRight,
    ChevronDown, Tags, Eraser, Settings, Eye, EyeOff, Plus, Loader2, CheckCircle, RefreshCw
} from './Icons';
export { CleanModal } from './CleanModal';

const TUTORIAL_SEEN_KEY = 'lora-tag-master-tutorial-seen-v1';
// --- SETTINGS MODAL ---
export const SettingsModal = ({
    isOpen,
    onClose,
    settings,
    setSettings,
    t,
    onTestConnection
}: {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    t: (key: string) => string;
    onTestConnection: (settings: AppSettings) => Promise<void>;
}) => {
    // Local state for buffering changes
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [modelsList, setModelsList] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [fetchModelsMessage, setFetchModelsMessage] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);


    // Sync local state when modal opens or external settings change
    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
            setIsDropdownOpen(false);
        }
    }, [isOpen, settings]);

    // Handle click outside for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

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

    const handleTest = async () => {
        setIsTesting(true);
        try {
            await onTestConnection(localSettings);
        } finally {
            setIsTesting(false);
        }
    };

    const handleFetchModels = async () => {
        setIsFetchingModels(true);
        setFetchModelsMessage('');
        try {
            const rawBaseUrl = localSettings.baseUrl.trim().replace(/\/+$/, "");
            let apiUrl = rawBaseUrl;

            if (apiUrl.endsWith('/chat/completions')) {
                apiUrl = apiUrl.replace('/chat/completions', '/models');
            } else if (apiUrl.endsWith('/v1')) {
                apiUrl = `${apiUrl}/models`;
            } else {
                apiUrl = `${apiUrl}/v1/models`;
            }

            const headers: Record<string, string> = {
                "Authorization": `Bearer ${localSettings.apiKey}`
            };
            if (localSettings.customHeaders) {
                localSettings.customHeaders.forEach(h => {
                    if (h.key && h.value) {
                        headers[h.key] = h.value;
                    }
                });
            }

            const res = await fetch(apiUrl, { headers });
            if (!res.ok) throw new Error('Fetch failed');
            const data = await res.json();
            if (data && Array.isArray(data.data)) {
                const models = data.data.map((m: { id?: string }) => m.id).filter(Boolean);
                setModelsList(models as string[]);
                setFetchModelsMessage(t('fetchModelsSuccess').replace('{count}', models.length.toString()));
            } else {
                throw new Error('Invalid format');
            }
        } catch (e) {
            setFetchModelsMessage(t('fetchModelsFailed'));
        } finally {
            setIsFetchingModels(false);
        }
    };

    // Smart filtering for models
    const filteredModels = modelsList.filter(m =>
        m.toLowerCase().includes(localSettings.model.toLowerCase())
    ).sort((a, b) => a.localeCompare(b));

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" /> {t('settings')}</h2>
                    <button onClick={handleSave} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                    {/* General Settings */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('language')}</label>
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                <button onClick={() => setLocalSettings(s => ({ ...s, language: 'en' }))} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${localSettings.language === 'en' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>English</button>
                                <button onClick={() => setLocalSettings(s => ({ ...s, language: 'zh' }))} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${localSettings.language === 'zh' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>中文</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('theme')}</label>
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                <button onClick={() => handleThemeChange('light')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${localSettings.theme === 'light' ? 'bg-white text-amber-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}><Sun className="w-3.5 h-3.5" /> Light</button>
                                <button onClick={() => handleThemeChange('dark')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${localSettings.theme === 'dark' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><Moon className="w-3.5 h-3.5" /> Dark</button>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                    {/* API Settings */}
                    <div className="space-y-5">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">{t('apiProvider')}</label>
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl relative">
                            {/* Sliding pill background for animation */}
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-600 rounded-lg shadow-sm transition-all duration-300 ease-out ${localSettings.protocol === 'openai_compatible' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                            />

                            <button
                                onClick={() => setLocalSettings(s => ({ ...s, protocol: 'google' }))}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors duration-300 ${localSettings.protocol === 'google' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            >
                                {t('googleGemini')}
                            </button>
                            <button
                                onClick={() => setLocalSettings(s => ({ ...s, protocol: 'openai_compatible' }))}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors duration-300 ${localSettings.protocol === 'openai_compatible' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            >
                                {t('openaiCompatible')}
                            </button>
                        </div>

                        <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                            <div className="relative group/field">
                                <label className="absolute -top-2 left-3 px-1.5 bg-zinc-50 dark:bg-zinc-900 text-[10px] font-bold text-zinc-400 group-focus-within/field:text-indigo-500 transition-colors">{t('apiEndpoint')}</label>
                                {localSettings.protocol === 'google' ? (
                                    <div className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 text-sm opacity-50 cursor-not-allowed">{t('googleDefault')}</div>
                                ) : (
                                    <input type="text" value={localSettings.baseUrl} onChange={e => setLocalSettings(s => ({ ...s, baseUrl: e.target.value }))} className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-zinc-300" placeholder="https://api.openai.com/v1" />
                                )}
                            </div>

                            <div className="relative group/field z-10">
                                <label className="absolute -top-2 left-3 px-1.5 bg-zinc-50 dark:bg-zinc-900 text-[10px] font-bold text-zinc-400 group-focus-within/field:text-indigo-500 transition-colors z-20">{t('apiKey')}</label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        value={localSettings.apiKey}
                                        onChange={e => setLocalSettings(s => ({ ...s, apiKey: e.target.value }))}
                                        className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-zinc-300 pr-10 relative z-10"
                                        placeholder="sk-..."
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1 z-20"
                                    >
                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="mt-1.5 flex items-start gap-1.5 opacity-60 px-1">
                                <div className="min-w-[4px] min-h-[4px] mt-1.5 rounded-full bg-orange-500" />
                                <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    {t('securityNote')}
                                </p>
                            </div>

                            <div className="relative group/field mt-4">
                                <label className="absolute -top-2 left-3 px-1.5 bg-zinc-50 dark:bg-zinc-900 text-[10px] font-bold text-zinc-400 group-focus-within/field:text-indigo-500 transition-colors">{t('modelName')}</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative" ref={dropdownRef}>
                                            <input
                                                type="text"
                                                value={localSettings.model}
                                                onChange={e => {
                                                    setLocalSettings(s => ({ ...s, model: e.target.value }));
                                                    setIsDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-zinc-300 pr-10"
                                                placeholder={localSettings.protocol === 'google' ? "gemini-2.5-flash" : "gpt-4-vision-preview"}
                                            />
                                            <button
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
                                            >
                                                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Custom Smart Dropdown */}
                                            {isDropdownOpen && filteredModels.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 focus-within:ring-2 focus-within:ring-indigo-500">
                                                    <div className="p-1">
                                                        {filteredModels.map((m) => (
                                                            <button
                                                                key={m}
                                                                onClick={() => {
                                                                    setLocalSettings(s => ({ ...s, model: m }));
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between group ${localSettings.model === m ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                                            >
                                                                <span className="truncate">{m}</span>
                                                                {localSettings.model === m && <CheckCircle className="w-4 h-4 opacity-50" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {localSettings.protocol === 'openai_compatible' && (
                                            <button
                                                onClick={handleFetchModels}
                                                disabled={isFetchingModels || !localSettings.apiKey || !localSettings.baseUrl}
                                                title={t('fetchModels')}
                                                className="px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isFetchingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                <span className="hidden sm:inline">{t('fetchModels')}</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleTest}
                                            disabled={isTesting || !localSettings.apiKey}
                                            className="px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            <span className="hidden sm:inline">{t('test')}</span>
                                        </button>
                                    </div>
                                    {fetchModelsMessage && (
                                        <div className={`text-xs px-1 ${fetchModelsMessage.includes('Failed') || fetchModelsMessage.includes('失败') ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {fetchModelsMessage}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative group/field mt-3">
                                <label className="absolute -top-2 left-3 px-1.5 bg-zinc-50 dark:bg-zinc-900 text-[10px] font-bold text-zinc-400 group-focus-within/field:text-indigo-500 transition-colors">{t('concurrency')} ({localSettings.concurrency || 3})</label>
                                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center gap-4">
                                    <span className="text-xs font-bold text-zinc-400">1</span>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        step="1"
                                        value={localSettings.concurrency || 3}
                                        onChange={e => setLocalSettings(s => ({ ...s, concurrency: parseInt(e.target.value) }))}
                                        className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <span className="text-xs font-bold text-zinc-400">20</span>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Settings (Headers) */}
                        {localSettings.protocol === 'openai_compatible' && (
                            <div className="mt-4 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                                <button
                                    onClick={(e) => {
                                        const content = e.currentTarget.nextElementSibling;
                                        if (content) content.classList.toggle('hidden');
                                        e.currentTarget.querySelector('.chevron')?.classList.toggle('rotate-180');
                                    }}
                                    className="w-full px-5 py-3 flex justify-between items-center text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors bg-zinc-50 dark:bg-zinc-900"
                                >
                                    <span>{t('advancedHeaders')}</span>
                                    <ChevronDown className="w-4 h-4 chevron transition-transform duration-200" />
                                </button>
                                <div className="hidden p-5 space-y-4 border-t border-zinc-200 dark:border-zinc-800">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-zinc-400">{t('advancedHeadersDesc')}</p>

                                        {/* Presets Button */}
                                        <div className="relative group">
                                            <button className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-500/20">{t('loadPreset')}</button>
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20">
                                                <button onClick={() => setLocalSettings(s => ({ ...s, customHeaders: [...(s.customHeaders || []), { key: 'HTTP-Referer', value: 'https://your-site.com' }, { key: 'X-Title', value: 'TagMaster' }] }))} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300">{t('presetOpenAI')}</button>
                                                <button onClick={() => setLocalSettings(s => ({ ...s, customHeaders: [...(s.customHeaders || []), { key: 'Origin', value: 'https://your-site.com' }] }))} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300">{t('presetCors')}</button>
                                                <button onClick={() => setLocalSettings(s => ({ ...s, customHeaders: [...(s.customHeaders || []), { key: 'X-My-Auth', value: 'secret' }] }))} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300">{t('presetAuth')}</button>
                                                <button onClick={() => setLocalSettings(s => ({ ...s, customHeaders: [...(s.customHeaders || []), { key: 'HTTP-Referer', value: 'https://github.com/Tag-Master' }, { key: 'X-Title', value: 'Tag-Master' }, { key: 'Accept', value: 'application/json' }, { key: 'Content-Type', value: 'application/json' }] }))} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300">{t('presetRelay')}</button>
                                            </div>
                                        </div>
                                    </div>

                                    {(localSettings.customHeaders || []).map((header, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                placeholder={t('headerKeyPlaceholder')}
                                                className="flex-1 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono focus:border-indigo-500 outline-none"
                                                value={header.key}
                                                onChange={e => {
                                                    const next = [...(localSettings.customHeaders || [])];
                                                    next[idx].key = e.target.value;
                                                    setLocalSettings(s => ({ ...s, customHeaders: next }));
                                                }}
                                            />
                                            <input
                                                placeholder={t('headerValuePlaceholder')}
                                                className="flex-1 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono focus:border-indigo-500 outline-none"
                                                value={header.value}
                                                onChange={e => {
                                                    const next = [...(localSettings.customHeaders || [])];
                                                    next[idx].value = e.target.value;
                                                    setLocalSettings(s => ({ ...s, customHeaders: next }));
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const next = [...(localSettings.customHeaders || [])];
                                                    next.splice(idx, 1);
                                                    setLocalSettings(s => ({ ...s, customHeaders: next }));
                                                }}
                                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setLocalSettings(s => ({ ...s, customHeaders: [...(s.customHeaders || []), { key: '', value: '' }] }))}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1.5 py-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> {t('startHeader')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                            <Wand2 className="w-3.5 h-3.5" />
                            {t('activePrompt')}
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar snap-x no-scrollbar-on-hover">
                            {[...DEFAULT_TEMPLATES, ...localSettings.customTemplates].map(tm => (
                                <button
                                    key={tm.id}
                                    onClick={() => setLocalSettings(s => ({ ...s, activePrompt: tm.value }))}
                                    className={`snap-start whitespace-nowrap px-4 py-2 rounded-full border text-xs font-bold transition-all ${localSettings.activePrompt === tm.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                >
                                    {tm.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative group">
                            <div className="absolute top-3 right-3 py-1 px-2 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-bold text-zinc-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors z-20">PROMPT</div>
                            <textarea
                                value={localSettings.activePrompt}
                                onChange={e => setLocalSettings(s => ({ ...s, activePrompt: e.target.value }))}
                                className="w-full h-40 p-5 pr-20 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-y"
                                placeholder="Enter your system prompt here..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Blocked Words (Comma Separated)</label>
                        <textarea
                            value={localSettings.blockedWords?.join(', ') || ''}
                            onChange={e => setLocalSettings(s => ({ ...s, blockedWords: e.target.value.split(',').map(w => w.trim()).filter(Boolean) }))}
                            className="w-full h-24 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="username, text logo, watermark..."
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
                    <button onClick={handleSave} className="bg-zinc-900 dark:bg-white text-white dark:text-black px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-zinc-500/10 hover:shadow-zinc-500/20 active:scale-95 transition-all">
                        {t('done')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- EXPORT MODAL ---
export const ExportModal = ({
    isOpen,
    onClose,
    onExport,
    t
}: {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'txt' | 'json') => void;
    t: (key: string) => string;
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
    isOpen: boolean;
    onClose: () => void;
    visibleCount: number;
    selectedCount: number;
    onBatchUpdate: (operation: 'replace' | 'prepend' | 'append' | 'addTags' | 'removeTags' | 'applyRules', params: unknown, scope: 'all' | 'selected') => void;
    t: (key: string) => string;
}) => {
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
    moveState: { isOpen: boolean; mode: 'selection' | 'project'; sourceProjectId?: string };
    onClose: () => void;
    projects: Project[];
    selectionCount: number;
    onConfirm: (targetId: string, newName: string) => void;
    t: (key: string) => string;
}) => {
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
    t: (key: string) => string
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
        setStep(s => {
            if (s < slides.length - 1) return s + 1;
            localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
            onClose();
            return s;
        });
    };

    const handlePrev = () => {
        setStep(s => (s > 0 ? s - 1 : s));
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