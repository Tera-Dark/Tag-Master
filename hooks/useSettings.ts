import { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_PROMPT } from '../types';
import { translations, Language } from '../utils/i18n';

const STORAGE_KEY = 'lora-tag-master-settings-v8';

const DEFAULT_SETTINGS: AppSettings = {
    language: 'zh',
    theme: 'dark',
    viewMode: 'grid',
    protocol: 'google',
    providerName: 'Official Gemini',
    apiKey: '',
    baseUrl: 'https://api.openai.com',
    model: 'gemini-2.5-flash',
    activePrompt: DEFAULT_PROMPT,
    concurrency: 3,
    customTemplates: [],
    gridColumns: 5,
    blockedWords: ['username', 'text logo', 'watermark', 'date', 'signature']
};

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch (e) { }
        }
        return DEFAULT_SETTINGS;
    });

    // Persist settings
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    // Apply theme
    useEffect(() => {
        document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    }, [settings.theme]);

    // Translation helper
    const t = (key: keyof typeof translations['en']) => {
        return translations[settings.language][key] || translations['en'][key] || key;
    };

    return { settings, setSettings, t };
};