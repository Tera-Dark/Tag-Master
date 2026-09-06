import React from 'react';
import { Wand2, Sparkles } from 'lucide-react';
import { AppSettings, DEFAULT_TEMPLATES } from '../../../../types';

export interface PromptSettingsTabProps {
  localSettings: AppSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const PromptSettingsTab: React.FC<PromptSettingsTabProps> = ({
  localSettings,
  setLocalSettings
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white dark:bg-[#18181b]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <span>系统反推提示词预设 (Visual Prompt Compiler v2.1)</span>
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            针对不同扩散模型（Flux、Illustrious、SDXL、Midjourney）精调的高保真视觉解构提示词
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.06]">
          9-Layer Spatial Hierarchy
        </span>
      </div>

      {/* Template Mode Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[...DEFAULT_TEMPLATES, ...(localSettings.customTemplates || [])].map(tm => {
          const isActive = localSettings.activePrompt === tm.value;
          return (
            <button
              key={tm.id}
              type="button"
              onClick={() => setLocalSettings(s => ({ ...s, activePrompt: tm.value }))}
              className={`whitespace-nowrap px-4 py-2.5 rounded-2xl border text-sm font-medium transition-all flex items-center gap-2.5 shrink-0 ${
                isActive
                  ? 'bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900 font-bold shadow-2xs'
                  : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.08] dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:border-black/[0.2]'
              }`}
            >
              {tm.mode && (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${
                  isActive
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900'
                    : 'bg-black/[0.05] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300'
                }`}>
                  {tm.mode}
                </span>
              )}
              <span>{tm.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Guide Banner */}
      {(() => {
        const allTms = [...DEFAULT_TEMPLATES, ...(localSettings.customTemplates || [])];
        const currentTm = allTms.find(tm => tm.value === localSettings.activePrompt);
        if (currentTm?.description) {
          return (
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 mr-1">{currentTm.label}：</span>
                <span className="text-zinc-600 dark:text-zinc-400">{currentTm.description}</span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Prompt Textarea Editor */}
      <div className="relative space-y-2">
        <div className="flex justify-between items-center text-xs text-zinc-400">
          <span>系统提示词正文 (System Instruction)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('请输入自定义预设名称：', '自定义提示词');
                if (name?.trim()) {
                  const newTemplate = {
                    id: `custom-${Date.now()}`,
                    label: name.trim(),
                    value: localSettings.activePrompt
                  };
                  setLocalSettings(s => ({
                    ...s,
                    customTemplates: [...(s.customTemplates || []), newTemplate]
                  }));
                }
              }}
              className="px-3 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 font-semibold transition-colors"
            >
              另存为预设
            </button>
            <button
              type="button"
              onClick={() => setLocalSettings(s => ({ ...s, activePrompt: DEFAULT_TEMPLATES[0].value }))}
              className="px-3 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 font-semibold transition-colors"
            >
              恢复推荐 (Mode D)
            </button>
          </div>
        </div>

        <textarea
          value={localSettings.activePrompt}
          onChange={e => setLocalSettings(s => ({ ...s, activePrompt: e.target.value }))}
          className="w-full h-80 p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#fafafa] dark:bg-[#1a1a1e] text-sm font-mono leading-relaxed focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all resize-y"
          placeholder="输入用于图像反推打标的系统提示词..."
        />
      </div>
    </div>
  );
};
