import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTranslations from './locales/zh.json';
import enTranslations from './locales/en.json';
import jaTranslations from './locales/ja.json';

const resources = {
    en: {
        translation: enTranslations
    },
    zh: {
        translation: zhTranslations
    },
    ja: {
        translation: jaTranslations
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
