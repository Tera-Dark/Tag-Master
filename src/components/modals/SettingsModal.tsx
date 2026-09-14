import { DialogOverlay } from '../ui/DialogOverlay';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppSettings } from '../../types';
import { X, Cpu, Wand2, Sliders } from 'lucide-react';
import { activeConnection, extraBody } from '../../services/providers/connection';
import { useDialogs } from '../ui/DialogContext';
import { ModelSettingsTab } from './settings/tabs/ModelSettingsTab';
import { PromptSettingsTab } from './settings/tabs/PromptSettingsTab';
import { GeneralSettingsTab } from './settings/tabs/GeneralSettingsTab';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  t: (key: string) => string;
}

type TabKey = 'models' | 'prompts' | 'general';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  t,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('models');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const wasOpen = useRef(false);
  const { alert, confirm } = useDialogs();
  const closing = useRef(false);
  const dirty = JSON.stringify(localSettings) !== JSON.stringify(settings);
  const requestClose = async () => {
    if (closing.current) return;
    closing.current = true;
    try {
      if (!dirty || (await confirm('有尚未保存的设置。放弃这些修改并关闭？'))) onClose();
    } finally {
      closing.current = false;
    }
  };
  useEffect(() => {
    if (!isOpen || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isOpen, dirty]);
  // Theme preview updates global settings; it must not discard the API/prompt draft.
  useEffect(() => {
    if (isOpen && !wasOpen.current) setLocalSettings(settings);
    wasOpen.current = isOpen;
  }, [isOpen, settings]);

  // Active provider summary for footer
  const currentProvider = useMemo(() => {
    const list = localSettings.providers || [];
    const found = list.find((p) => p.id === localSettings.activeProviderId);
    if (found) return found;
    if (!localSettings.activeProviderId) return { name: '未选择' };
    return {
      name:
        localSettings.providerName ||
        (localSettings.protocol === 'google' ? 'Google Gemini' : 'OpenAI 兼容'),
    };
  }, [
    localSettings.providers,
    localSettings.activeProviderId,
    localSettings.protocol,
    localSettings.providerName,
  ]);

  // Save the active projection atomically; browsing providers never changes it.
  const handleSave = async () => {
    for (const p of localSettings.providers || []) {
      try {
        extraBody(p);
      } catch (error) {
        await alert(`${p.name}：${(error as Error).message}`);
        return;
      }
    }
    if (!localSettings.activePrompt.trim()) {
      await alert('打标指令不能为空。');
      return;
    }
    setSettings(activeConnection(localSettings));
    onClose();
  };

  // Immediate theme switch
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setLocalSettings((s) => ({ ...s, theme }));
    setSettings((s) => ({ ...s, theme }));
  };

  if (!isOpen) return null;

  return (
    <DialogOverlay
      onClose={() => void requestClose()}
      label='设置'
      className='fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200'
    >
      <div className='tm-settings-window bg-tm-canvas rounded-2xl w-[96vw] max-w-6xl h-[88vh] max-h-[920px] overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-none flex flex-col animate-in zoom-in-95 duration-200 ease-out'>
        {/* --- Top Header Bar --- */}
        <div className='tm-settings-header flex items-center justify-between px-6 py-4 border-b border-tm-border bg-tm-canvas shrink-0'>
          <div className='tm-settings-heading flex items-center gap-3'>
            <span className='w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-tm-text font-semibold'></span>
            <div>
              <h2 className='text-base font-semibold text-tm-text'>{t('settings')}</h2>
              <p className='text-xs text-tm-subtle'>配置服务商端点、管理模型能力及打标工作流参数</p>
            </div>
          </div>

          {/* Top Segmented Navigation Tabs */}
          <div
            role='tablist'
            aria-label='设置分类'
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              const tabs = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
              );
              const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
              const index =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              event.preventDefault();
              tabs[index]?.focus();
              tabs[index]?.click();
            }}
            className='tm-settings-tabs flex items-center bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.04]'
          >
            <button
              role='tab'
              aria-selected={activeTab === 'models'}
              onClick={() => setActiveTab('models')}
              className={`tm-button px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'models'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-none font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Cpu className='w-4 h-4' />
              <span>模型服务</span>
              <span className='text-xs px-1.5 py-0.2 rounded-full bg-black/[0.06] dark:bg-white/[0.08]'>
                {localSettings.providers?.length || 0}
              </span>
            </button>

            <button
              role='tab'
              aria-selected={activeTab === 'prompts'}
              onClick={() => setActiveTab('prompts')}
              className={`tm-button px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'prompts'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-none font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Wand2 className='w-4 h-4' />
              <span>提示词预设</span>
            </button>

            <button
              role='tab'
              aria-selected={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              className={`tm-button px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-none font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Sliders className='w-4 h-4' />
              <span>通用与并发</span>
            </button>
          </div>

          {/* Close Window */}
          <button
            aria-label='关闭'
            onClick={() => void requestClose()}
            className='tm-button tm-settings-close w-8 h-8 rounded-full flex items-center justify-center text-tm-subtle hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* --- Main Workspace Area --- */}
        <div className='flex-1 min-h-0 overflow-hidden flex flex-col'>
          {/* TAB 1: MODEL SERVICES */}
          {activeTab === 'models' && (
            <ModelSettingsTab localSettings={localSettings} setLocalSettings={setLocalSettings} />
          )}

          {/* TAB 2: PROMPTS */}
          {activeTab === 'prompts' && (
            <PromptSettingsTab localSettings={localSettings} setLocalSettings={setLocalSettings} />
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
        <div className='tm-settings-footer px-6 py-4 border-t border-tm-border bg-tm-sidebar flex flex-wrap items-center justify-between gap-3 shrink-0'>
          {/* Active captioning setup summary */}
          <div className='flex items-center gap-2 text-xs text-tm-subtle'>
            <span className='font-semibold text-tm-secondary'>保存后用于打标：</span>
            <span className='px-2 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.08] font-semibold text-tm-text'>
              {currentProvider.name}
            </span>
            <span>·</span>
            <span className='font-mono font-semibold text-zinc-800 dark:text-zinc-200'>
              {localSettings.model || '未选择模型'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center gap-2.5'>
            <button
              type='button'
              onClick={() => void requestClose()}
              className='tm-button px-5 py-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.15] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-sm font-semibold text-tm-secondary transition-all'
            >
              取消
            </button>
            <button
              type='button'
              onClick={handleSave}
              className='tm-button tm-button-primary px-7 py-2.5 rounded-full bg-tm-accent text-tm-on-accent text-sm font-semibold shadow-none hover:opacity-90  transition-all'
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </DialogOverlay>
  );
};
