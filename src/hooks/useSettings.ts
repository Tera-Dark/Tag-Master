import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { migrateSettings } from '../services/providers/settingsMigration';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'lora-tag-master-settings-v9';
export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem('lora-tag-master-settings-v8');
    if (saved) {
      try {
        return migrateSettings(JSON.parse(saved));
      } catch {
        /* Try legacy Base64. */
      }
      try {
        const bytes = Uint8Array.from(window.atob(saved), (char) => char.charCodeAt(0));
        return migrateSettings(JSON.parse(new TextDecoder().decode(bytes)));
      } catch {
        console.warn(
          'Settings could not be decoded. The original storage value has not been included in logs.'
        );
      }
    }
    return migrateSettings(null);
  });
  // Local convenience storage only: Base64 is NOT encryption. Never export settings with credentials.
  useEffect(() => {
    try {
      const json = JSON.stringify(settings);
      const bytes = new TextEncoder().encode(json);
      const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
      const encoded = window.btoa(binaryString);

      localStorage.setItem(STORAGE_KEY, encoded);
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', settings.theme === 'dark' ? '#212121' : '#ffffff');
  }, [settings.theme]);

  const { t, i18n } = useTranslation();

  // Sync language state to i18n
  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  return { settings, setSettings, t };
};
