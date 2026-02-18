import { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_PROMPT } from '../types';
import { translations } from '../utils/i18n';

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
    blockedWords: ['username', 'text logo', 'watermark', 'date', 'signature'],
    replacementRules: []
};

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            // 1. Try Legacy (Plain JSON)
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    // It's valid JSON object, assume legacy format.
                    // This will be automatically converted to Base64 on next save (useEffect).
                    return { ...DEFAULT_SETTINGS, ...parsed };
                }
            } catch (e) {
                // Not plain JSON, continue to Base64
            }

            // 2. Try New (Base64)
            try {
                // Unicode-safe decoding
                const binaryString = window.atob(saved);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const decoded = new TextDecoder().decode(bytes);

                const parsed = JSON.parse(decoded);
                return { ...DEFAULT_SETTINGS, ...parsed };
            } catch (e) {
                console.warn("Failed to load settings (corruption or format mismatch)", e);
            }
        }
        return DEFAULT_SETTINGS;
    });

    // Persist settings (Obfuscated)
    useEffect(() => {
        try {
            const json = JSON.stringify(settings);
            // Unicode-safe encoding
            const bytes = new TextEncoder().encode(json);
            const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
            const encoded = window.btoa(binaryString);

            localStorage.setItem(STORAGE_KEY, encoded);
        } catch (e) {
            console.error("Failed to save settings", e);
        }
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