import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings } from '../../types';
import { X, Cpu, Wand2, Sliders, Eye } from 'lucide-react';
import { detectModelCapabilities } from '../../services/modelDetector';
import { ModelSettingsTab } from './settings/tabs/ModelSettingsTab';
import { PromptSettingsTab } from './settings/tabs/PromptSettingsTab';
import { GeneralSettingsTab } from './settings/tabs/GeneralSettingsTab';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  t: (key: string) => string;
  onTestConnection: (settings: AppSettings) => Promise<void>;
}

type TabKey = 'models' | 'prompts' | 'general';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  t,
  onTestConnection
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('models');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  // Active provider summary for footer
  const currentProvider = useMemo(() => {
    const list = localSettings.providers || [];
    const found = list.find(p => p.id === localSettings.activeProviderId);
    if (found) return found;
    if (list.length > 0) return list[0];
    return {
      name: localSettings.providerName || (localSettings.protocol === 'google' ? 'Google Gemini' : 'OpenAI 兼容')
    };
  }, [localSettings.providers, localSettings.activeProviderId, localSettings.protocol, localSettings.providerName]);

  // Check if current active model supports vision
  const activeModelCapabilities = useMemo(() => {
    const activeProv = (localSettings.providers || []).find(p => p.id === localSettings.activeProviderId);
    const matched = activeProv?.models?.find(m => m.id.toLowerCase() === localSettings.model.toLowerCase());
    if (matched) return matched.capabilities;
    return detectModelCapabilities(localSettings.model);
  }, [localSettings.providers, localSettings.activeProviderId, localSettings.model]);

  // Save changes
  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  // Immediate theme switch
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setLocalSettings(s => ({ ...s, theme }));
    setSettings(s => ({ ...s, theme }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl w-[96vw] max-w-6xl h-[88vh] max-h-[920px] overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 ease-out">

        {/* --- Top Header Bar --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#18181b] shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-bold">
              ⚙️
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t('settings')}
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                配置服务商端点、管理模型能力及打标工作流参数
              </p>
            </div>
          </div>

          {/* Top Segmented Navigation Tabs */}
          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.04]">
            <button
              onClick={() => setActiveTab('models')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'models'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>模型服务</span>
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                {localSettings.providers?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'prompts'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>提示词预设</span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>通用与并发</span>
            </button>
          </div>

          {/* Close Window */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Main Workspace Area --- */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* TAB 1: MODEL SERVICES */}
          {activeTab === 'models' && (
            <ModelSettingsTab
              localSettings={localSettings}
              setLocalSettings={setLocalSettings}
              onTestConnection={onTestConnection}
              t={t}
            />
          )}

          {/* TAB 2: PROMPTS */}
          {activeTab === 'prompts' && (
            <PromptSettingsTab
              localSettings={localSettings}
              setLocalSettings={setLocalSettings}
            />
          )}

          {/* TAB 3: GENERAL */}
          {activeTab === 'general' && (
            <GeneralSettingsTab
              localSettings={localSettings}
              setLocalSettings={setLocalSettings}
              onThemeChange={handleThemeChange}
              t={t}
            />
          )}
        </div>

        {/* --- Bottom Status & Action Bar --- */}
        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#161619] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Active captioning setup summary */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">当前生效配置：</span>
            <span className="px-2 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.08] font-bold text-zinc-900 dark:text-zinc-100">
              {currentProvider.name}
            </span>
            <span>·</span>
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
              {localSettings.model || '未选择模型'}
            </span>
            {activeModelCapabilities.includes('vision') ? (
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 flex items-center gap-1">
                <Eye className="w-3 h-3" /> 视觉打标可用
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                纯文本 (无视觉输入)
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.15] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-all"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-7 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              {t('done')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
