import React from 'react';
import {
  Cpu,
  Folder,
  FolderPlus,
  Layers,
  Moon,
  SlidersHorizontal,
  Sun,
  Trash2,
} from 'lucide-react';
import { MODEL_BLUEPRINTS } from '../data/modelSpecs';
import { Language, Project, TargetModelId, ThemeMode } from '../types/prompt';
import type { SettingsTabId } from './SettingsWindow';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  defaultModel: TargetModelId;
  onSelectDefaultModel: (model: TargetModelId) => void;
  activeProviderName: string;
  activeProviderModel: string;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onOpenSettings: (tab?: SettingsTabId, specModel?: TargetModelId) => void;
  t: (key: string) => string;
}

const MODEL_ORDER: TargetModelId[] = [
  'krea2',
  'moss_prose',
  'moss_layout',
  'flux_dit',
  'anima',
  'lora_hybrid',
  'danbooru_tags',
];

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenCreateProject,
  onDeleteProject,
  defaultModel,
  onSelectDefaultModel,
  activeProviderName,
  activeProviderModel,
  theme,
  onToggleTheme,
  language,
  onChangeLanguage,
  onOpenSettings,
  t,
}) => {
  const totalCount = projects.reduce((sum, p) => sum + p.items.length, 0);

  return (
    <aside
      className="w-64 shrink-0 border-r flex flex-col justify-between overflow-y-auto select-none"
      style={{
        backgroundColor: 'var(--surface-secondary)',
        borderColor: 'var(--separator-hairline)',
      }}
    >
      <div className="p-4 space-y-6">
        {/* Projects Section */}
        <section>
          <div className="flex items-center justify-between px-2 mb-2">
            <h2
              className="text-[12px] font-semibold tracking-tight"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('sidebarProjects')}
            </h2>
            <button
              type="button"
              onClick={onOpenCreateProject}
              title={t('sidebarNewProject')}
              className="p-1.5 rounded-md transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5 apple-focus cursor-pointer"
              style={{ color: 'var(--label-secondary)' }}
            >
              <FolderPlus className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => onSelectProject('all')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 apple-focus cursor-pointer"
              style={{
                backgroundColor:
                  activeProjectId === 'all' ? 'var(--accent-tint)' : 'transparent',
                color:
                  activeProjectId === 'all' ? 'var(--accent)' : 'var(--label-primary)',
              }}
            >
              <span className="flex items-center gap-2.5 min-w-0 truncate">
                <Layers className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{t('sidebarAllImages')}</span>
              </span>
              <span
                className="text-[12px] apple-numeric shrink-0"
                style={{
                  color:
                    activeProjectId === 'all'
                      ? 'var(--accent)'
                      : 'var(--label-tertiary)',
                }}
              >
                {totalCount}
              </span>
            </button>

            {projects.map((project) => {
              const isActive = activeProjectId === project.id;
              return (
                <div
                  key={project.id}
                  className="group flex items-center justify-between rounded-lg transition-colors duration-150"
                  style={{
                    backgroundColor: isActive ? 'var(--accent-tint)' : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className="flex-1 min-w-0 flex items-center justify-between px-2.5 py-2 text-[13px] font-medium apple-focus rounded-lg cursor-pointer"
                    style={{
                      color: isActive ? 'var(--accent)' : 'var(--label-primary)',
                    }}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Folder className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{project.name}</span>
                    </span>
                    <span
                      className="text-[12px] apple-numeric ml-2 shrink-0"
                      style={{
                        color: isActive ? 'var(--accent)' : 'var(--label-tertiary)',
                      }}
                    >
                      {project.items.length}
                    </span>
                  </button>
                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      title={t('deleteProject')}
                      className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded-md transition-opacity duration-150 hover:bg-black/5 dark:hover:bg-white/10 apple-focus cursor-pointer"
                      style={{ color: 'var(--label-tertiary)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Hairline Divider */}
        <div className="h-px" style={{ backgroundColor: 'var(--separator-hairline)' }} />

        {/* Target Model Specification Selector */}
        <section>
          <div className="flex items-center justify-between px-2 mb-2">
            <h2
              className="text-[12px] font-semibold tracking-tight"
              style={{ color: 'var(--label-secondary)' }}
            >
              {t('sidebarTargetModel')}
            </h2>
            <button
              type="button"
              onClick={() => onOpenSettings('specs', defaultModel)}
              className="text-[11px] font-medium hover:underline apple-focus rounded cursor-pointer"
              style={{ color: 'var(--accent)' }}
            >
              {t('tuneSpec')}
            </button>
          </div>

          <div className="space-y-1">
            {MODEL_ORDER.map((modelId) => {
              const spec = MODEL_BLUEPRINTS[modelId];
              const isSelected = defaultModel === modelId;
              return (
                <button
                  key={modelId}
                  type="button"
                  onClick={() => onSelectDefaultModel(modelId)}
                  className="w-full text-left px-2.5 py-2 rounded-lg transition-colors duration-150 apple-focus cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--surface-primary)'
                      : 'transparent',
                    boxShadow: isSelected ? 'var(--shadow-control)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[13px] font-medium truncate"
                      style={{
                        color: isSelected ? 'var(--accent)' : 'var(--label-primary)',
                      }}
                    >
                      {language === 'zh' ? spec.nameZh : spec.nameEn}
                    </span>
                  </div>
                  <p
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: 'var(--label-tertiary)' }}
                  >
                    {language === 'zh' ? spec.syntaxStyleZh : spec.syntaxStyleEn}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer Utilities */}
      <div
        className="p-4 border-t space-y-3"
        style={{ borderColor: 'var(--separator-hairline)' }}
      >
        {/* Active API Engine Summary Entry */}
        <button
          type="button"
          onClick={() => onOpenSettings('providers')}
          className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors duration-150 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] apple-focus cursor-pointer"
          style={{
            backgroundColor: 'var(--surface-primary)',
            borderColor: 'var(--separator-hairline)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[11px] font-medium flex items-center gap-1.5"
              style={{ color: 'var(--label-secondary)' }}
            >
              <Cpu className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
              <span>{t('activeEngineLabel')}</span>
            </span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
              {t('configureApi')}
            </span>
          </div>
          <div
            className="text-[12px] font-medium truncate mt-1"
            style={{ color: 'var(--label-primary)' }}
          >
            {activeProviderName} · {activeProviderModel}
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {/* Theme Segmented Switch */}
          <div
            className="flex items-center p-0.5 rounded-lg"
            style={{ backgroundColor: 'var(--surface-grouped)' }}
          >
            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor:
                  theme === 'light' ? 'var(--surface-primary)' : 'transparent',
                color:
                  theme === 'light'
                    ? 'var(--label-primary)'
                    : 'var(--label-secondary)',
                boxShadow: theme === 'light' ? 'var(--shadow-control)' : 'none',
              }}
              aria-label={t('lightMode')}
            >
              <Sun className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => onToggleTheme('dark')}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor:
                  theme === 'dark' ? 'var(--surface-elevated)' : 'transparent',
                color:
                  theme === 'dark'
                    ? 'var(--label-primary)'
                    : 'var(--label-secondary)',
                boxShadow: theme === 'dark' ? 'var(--shadow-control)' : 'none',
              }}
              aria-label={t('darkMode')}
            >
              <Moon className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Language Segmented Switch */}
          <div
            className="flex items-center p-0.5 rounded-lg"
            style={{ backgroundColor: 'var(--surface-grouped)' }}
          >
            <button
              type="button"
              onClick={() => onChangeLanguage('zh')}
              className="flex-1 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor:
                  language === 'zh'
                    ? theme === 'dark'
                      ? 'var(--surface-elevated)'
                      : 'var(--surface-primary)'
                    : 'transparent',
                color:
                  language === 'zh'
                    ? 'var(--label-primary)'
                    : 'var(--label-secondary)',
                boxShadow: language === 'zh' ? 'var(--shadow-control)' : 'none',
              }}
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => onChangeLanguage('en')}
              className="flex-1 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor:
                  language === 'en'
                    ? theme === 'dark'
                      ? 'var(--surface-elevated)'
                      : 'var(--surface-primary)'
                    : 'transparent',
                color:
                  language === 'en'
                    ? 'var(--label-primary)'
                    : 'var(--label-secondary)',
                boxShadow: language === 'en' ? 'var(--shadow-control)' : 'none',
              }}
            >
              EN
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenSettings('providers')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors duration-150 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] apple-focus cursor-pointer"
          style={{
            borderColor: 'var(--separator-hairline)',
            color: 'var(--label-primary)',
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>{t('settings')}</span>
        </button>
      </div>
    </aside>
  );
};
