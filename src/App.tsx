import React, {
  Suspense,
  lazy,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createSampleProjects } from './data/modelSpecs';
import { createTranslator } from './i18n/translations';
import { compileImagePrompt, modernizePromptText } from './services/promptApi';
import { STUDIO_GEMINI_PROVIDER } from './services/providerEngine';
import {
  AppSettings,
  DatasetItem,
  KreaVariant,
  Project,
  TargetModelId,
  WorkspaceTab,
} from './types/prompt';
import { readImageFile } from './utils/imageUtils';
import {
  buildCompiledSystemInstruction,
  getEffectiveTuning,
} from './utils/promptBuilder';
import { cleanLegacyBuzzwords } from './utils/promptLint';
import { loadProjectsFromDb, saveProjectsToDb } from './utils/storageDb';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { WorkspaceView } from './components/WorkspaceView';
import { Inspector } from './components/Inspector';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  BatchEditModal,
  CreateProjectModal,
  LightboxModal,
} from './components/Modals';
import { SettingsTabId, SettingsWindow } from './components/SettingsWindow';

// Route-level code splitting for secondary views
const PromptLabView = lazy(() =>
  import('./components/PromptLabView').then((m) => ({ default: m.PromptLabView }))
);
const PreprocessView = lazy(() =>
  import('./components/PreprocessView').then((m) => ({ default: m.PreprocessView }))
);
const ReviewView = lazy(() =>
  import('./components/ReviewView').then((m) => ({ default: m.ReviewView }))
);
const ExportView = lazy(() =>
  import('./components/ExportView').then((m) => ({ default: m.ExportView }))
);

const STORAGE_SETTINGS_KEY = 'tag_master_v3_settings';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  language: 'zh',
  defaultTargetModel: 'krea2',
  kreaVariant: 'large',
  viewMode: 'grid',
  gridColumns: 3,
  concurrency: 2,
  customInstruction: '',
  blockedWords: [],
  replacementRules: [],
  providers: [STUDIO_GEMINI_PROVIDER],
  activeProviderId: STUDIO_GEMINI_PROVIDER.id,
  modelTunings: {},
  customPresets: [],
  activePresetId: null,
};

interface ToastMsg {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

const ViewSkeleton: React.FC = () => (
  <div className="flex-1 p-8 animate-pulse space-y-6">
    <div
      className="h-8 w-64 rounded-lg"
      style={{ backgroundColor: 'var(--surface-grouped)' }}
    />
    <div
      className="h-4 w-96 max-w-full rounded-lg"
      style={{ backgroundColor: 'var(--surface-grouped)' }}
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
      <div
        className="h-72 rounded-2xl"
        style={{ backgroundColor: 'var(--surface-primary)' }}
      />
      <div
        className="h-72 rounded-2xl"
        style={{ backgroundColor: 'var(--surface-primary)' }}
      />
    </div>
  </div>
);

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (!savedRaw) return DEFAULT_SETTINGS;
      const saved = JSON.parse(savedRaw) as Partial<AppSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        providers:
          Array.isArray(saved.providers) && saved.providers.length > 0
            ? saved.providers
            : [STUDIO_GEMINI_PROVIDER],
        activeProviderId: saved.activeProviderId || STUDIO_GEMINI_PROVIDER.id,
        modelTunings: saved.modelTunings ?? {},
        customPresets: saved.customPresets ?? [],
        activePresetId: saved.activePresetId ?? null,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => createSampleProjects());
  const [hasHydratedDb, setHasHydratedDb] = useState(false);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('workspace');
  const [activeProjectId, setActiveProjectId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>('sample-cafe');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [isBatchCompiling, setIsBatchCompiling] = useState(false);
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [settingsModal, setSettingsModal] = useState<{
    isOpen: boolean;
    tab: SettingsTabId;
    specModel: TargetModelId;
  }>({
    isOpen: false,
    tab: 'providers',
    specModel: 'krea2',
  });
  const [lightboxItem, setLightboxItem] = useState<DatasetItem | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useMemo(() => createTranslator(settings.language), [settings.language]);

  const activeProvider = useMemo(
    () =>
      settings.providers.find((p) => p.id === settings.activeProviderId) ??
      settings.providers[0] ??
      STUDIO_GEMINI_PROVIDER,
    [settings.providers, settings.activeProviderId]
  );

  const openSettings = (
    tab: SettingsTabId = 'providers',
    specModel?: TargetModelId
  ) => {
    setSettingsModal({
      isOpen: true,
      tab,
      specModel: specModel ?? settings.defaultTargetModel,
    });
  };

  // Hydrate projects asynchronously from IndexedDB on mount
  useEffect(() => {
    let active = true;
    loadProjectsFromDb()
      .then((stored) => {
        if (!active) return;
        if (stored && stored.length > 0) {
          setProjects(stored);
          setSelectedId(stored[0]?.items[0]?.id ?? null);
        }
      })
      .finally(() => {
        if (active) setHasHydratedDb(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Persist lightweight settings synchronously
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota
    }
  }, [settings]);

  // Debounced IndexedDB persistence for projects + images
  useEffect(() => {
    if (!hasHydratedDb) return;
    const timer = setTimeout(() => {
      void saveProjectsToDb(projects);
    }, 350);
    return () => clearTimeout(timer);
  }, [projects, hasHydratedDb]);

  // Abort any ongoing compilation on unmount
  useEffect(() => {
    return () => {
      batchAbortControllerRef.current?.abort();
    };
  }, []);

  const pushToast = (message: string, tone: ToastMsg['tone'] = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  };

  const projectItems = useMemo(() => {
    if (activeProjectId === 'all') {
      return projects.flatMap((p) => p.items);
    }
    return projects.find((p) => p.id === activeProjectId)?.items ?? [];
  }, [projects, activeProjectId]);

  const visibleItems = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) return projectItems;
    return projectItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.caption.toLowerCase().includes(q) ||
        item.targetModel.toLowerCase().includes(q)
    );
  }, [projectItems, deferredSearchQuery]);

  const selectedItem = useMemo(
    () => projectItems.find((i) => i.id === selectedId) ?? visibleItems[0],
    [projectItems, visibleItems, selectedId]
  );

  const findProjectForItem = (itemId: string): Project | undefined =>
    projects.find((p) => p.items.some((i) => i.id === itemId));

  const updateItem = (itemId: string, patch: Partial<DatasetItem>) => {
    setProjects((prev) =>
      prev.map((proj) => ({
        ...proj,
        items: proj.items.map((item) =>
          item.id === itemId ? { ...item, ...patch, updatedAt: Date.now() } : item
        ),
      }))
    );
  };

  const removeItem = (itemId: string) => {
    setProjects((prev) =>
      prev.map((proj) => ({
        ...proj,
        items: proj.items.filter((i) => i.id !== itemId),
      }))
    );
    if (selectedId === itemId) setSelectedId(null);
  };

  const handleImportFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;

    const targetProjId =
      activeProjectId === 'all' ? projects[0]?.id : activeProjectId;
    if (!targetProjId) return;

    // Decode & downscale in parallel chunks of 4 for fast non-blocking import
    const newItems: DatasetItem[] = [];
    for (let i = 0; i < list.length; i += 4) {
      const slice = list.slice(i, i + 4);
      const decoded = await Promise.all(
        slice.map(async (file) => {
          const data = await readImageFile(file);
          return {
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            previewUrl: data.previewUrl,
            mimeType: data.mimeType,
            width: data.width,
            height: data.height,
            status: 'idle' as const,
            caption: '',
            targetModel: settings.defaultTargetModel,
            kreaVariant: settings.kreaVariant,
            updatedAt: Date.now(),
          };
        })
      );
      newItems.push(...decoded);
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === targetProjId ? { ...p, items: [...newItems, ...p.items] } : p
      )
    );

    if (newItems[0]) {
      setSelectedId(newItems[0].id);
      setActiveTab('workspace');
    }
    pushToast(
      settings.language === 'zh'
        ? `已导入 ${newItems.length} 张图片`
        : `Imported ${newItems.length} image(s)`,
      'success'
    );
  };

  const handleCompileItem = async (
    itemId: string,
    targetModel: TargetModelId,
    variant?: KreaVariant,
    signal?: AbortSignal
  ) => {
    const proj = findProjectForItem(itemId);
    const item = proj?.items.find((i) => i.id === itemId);
    if (!item) return;

    updateItem(itemId, {
      status: 'loading',
      error: undefined,
      targetModel,
      kreaVariant: variant ?? item.kreaVariant ?? settings.kreaVariant,
    });

    try {
      const effectiveVariant = variant ?? item.kreaVariant ?? settings.kreaVariant;
      const itemPreset = item.presetId
        ? settings.customPresets.find((p) => p.id === item.presetId)
        : undefined;
      const systemInstructionOverride = buildCompiledSystemInstruction({
        targetModel,
        kreaVariant: effectiveVariant,
        tuning: getEffectiveTuning(targetModel, settings.modelTunings),
        preset: itemPreset,
        triggerWord: proj?.triggerWord ?? '',
        globalCustomInstruction: settings.customInstruction,
      });

      const res = await compileImagePrompt({
        imageUrl: item.previewUrl,
        targetModel,
        kreaVariant: effectiveVariant,
        triggerWord: proj?.triggerWord ?? '',
        customInstruction: settings.customInstruction,
        systemInstructionOverride,
        provider: activeProvider,
        signal,
      });

      const cleaned =
        targetModel === 'moss_layout'
          ? res.prompt
          : cleanLegacyBuzzwords(
              res.prompt,
              settings.blockedWords,
              settings.replacementRules,
              targetModel
            );

      updateItem(itemId, {
        status: 'success',
        caption: cleaned,
        layoutSpec: res.layoutSpec,
        targetModel,
        error: undefined,
      });
    } catch (err) {
      if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
        updateItem(itemId, { status: 'idle', error: undefined });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Compilation error';
      updateItem(itemId, { status: 'error', error: msg });
      pushToast(msg, 'error');
    }
  };

  const handleModernizeItemCaption = async (
    itemId: string,
    targetModel: TargetModelId,
    variant?: KreaVariant
  ) => {
    const proj = findProjectForItem(itemId);
    const item = proj?.items.find((i) => i.id === itemId);
    if (!item || !item.caption.trim()) return;

    updateItem(itemId, {
      status: 'loading',
      error: undefined,
      targetModel,
      kreaVariant: variant ?? item.kreaVariant ?? settings.kreaVariant,
    });

    try {
      const effectiveVariant = variant ?? item.kreaVariant ?? settings.kreaVariant;
      const itemPreset = item.presetId
        ? settings.customPresets.find((p) => p.id === item.presetId)
        : undefined;
      const systemInstructionOverride = buildCompiledSystemInstruction({
        targetModel,
        kreaVariant: effectiveVariant,
        tuning: getEffectiveTuning(targetModel, settings.modelTunings),
        preset: itemPreset,
        triggerWord: proj?.triggerWord ?? '',
        globalCustomInstruction: settings.customInstruction,
      });

      const ratio = `${item.width}:${item.height}`;
      const res = await modernizePromptText({
        sourcePrompt: item.caption,
        targetModel,
        kreaVariant: effectiveVariant,
        aspectRatio: ratio,
        triggerWord: proj?.triggerWord ?? '',
        systemInstructionOverride,
        provider: activeProvider,
      });
      updateItem(itemId, {
        status: 'success',
        caption: res.compiledPrompt,
        layoutSpec: res.layoutSpec,
        targetModel,
        error: undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Modernize failed';
      updateItem(itemId, { status: 'error', error: msg });
      pushToast(msg, 'error');
    }
  };

  // Bounded concurrency worker pool with real AbortController cancellation
  const handleCompilePending = async () => {
    const pending = visibleItems.filter(
      (i) => i.status === 'idle' || i.status === 'error'
    );
    if (pending.length === 0) return;

    const controller = new AbortController();
    batchAbortControllerRef.current = controller;
    setIsBatchCompiling(true);

    const queue = [...pending];
    const workerCount = Math.max(1, Math.min(settings.concurrency || 2, queue.length));

    const workers = Array.from({ length: workerCount }, async () => {
      while (queue.length > 0 && !controller.signal.aborted) {
        const nextItem = queue.shift();
        if (!nextItem) break;
        await handleCompileItem(
          nextItem.id,
          nextItem.targetModel || settings.defaultTargetModel,
          nextItem.kreaVariant || settings.kreaVariant,
          controller.signal
        );
      }
    });

    await Promise.all(workers);
    batchAbortControllerRef.current = null;
    setIsBatchCompiling(false);
  };

  const handleStopCompiling = () => {
    batchAbortControllerRef.current?.abort();
    batchAbortControllerRef.current = null;
    setIsBatchCompiling(false);
  };

  const handleCleanAllBuzzwords = () => {
    let cleanedCount = 0;
    setProjects((prev) =>
      prev.map((proj) => ({
        ...proj,
        items: proj.items.map((item) => {
          if (!item.caption.trim()) return item;
          const nextCaption = cleanLegacyBuzzwords(
            item.caption,
            settings.blockedWords,
            settings.replacementRules,
            item.targetModel
          );
          if (nextCaption !== item.caption) cleanedCount += 1;
          return { ...item, caption: nextCaption };
        }),
      }))
    );
    pushToast(
      settings.language === 'zh'
        ? `已净化 ${cleanedCount} 条提示词中的旧版冗余词`
        : `Cleaned legacy buzzwords across ${cleanedCount} prompt(s)`,
      'success'
    );
  };

  const handleBatchEdit = (params: {
    prefix: string;
    suffix: string;
    find: string;
    replace: string;
  }) => {
    const visibleSet = new Set(visibleItems.map((i) => i.id));
    setProjects((prev) =>
      prev.map((proj) => ({
        ...proj,
        items: proj.items.map((item) => {
          if (!visibleSet.has(item.id)) return item;
          let text = item.caption;
          if (params.find) text = text.split(params.find).join(params.replace);
          if (params.prefix) text = `${params.prefix}${text}`;
          if (params.suffix) text = `${text}${params.suffix}`;
          return {
            ...item,
            caption: text,
            status: text.trim() ? 'success' : item.status,
          };
        }),
      }))
    );
    pushToast(
      settings.language === 'zh' ? '批量编辑已应用' : 'Batch edit applied',
      'success'
    );
  };

  const handleSelectDefaultModel = (model: TargetModelId) => {
    setSettings((prev) => ({ ...prev, defaultTargetModel: model }));
    if (selectedItem && selectedItem.status === 'idle') {
      updateItem(selectedItem.id, { targetModel: model });
    }
  };

  const handleLoadSamples = () => {
    const samples = createSampleProjects();
    setProjects((prev) => {
      const first = prev[0];
      if (!first) return samples;
      return [
        { ...first, items: [...samples[0].items, ...first.items] },
        ...prev.slice(1),
      ];
    });
    setSelectedId('sample-cafe');
  };

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-canvas)',
        color: 'var(--label-primary)',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleImportFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onImportClick={() => fileInputRef.current?.click()}
        t={t}
      />

      {/* Compact Mobile Navigation Strip */}
      <div
        className="md:hidden flex items-center gap-1 px-3 py-1.5 border-b overflow-x-auto"
        style={{
          backgroundColor: 'var(--surface-secondary)',
          borderColor: 'var(--separator-hairline)',
        }}
      >
        {(
          [
            ['workspace', 'navWorkspace'],
            ['prompt-lab', 'navPromptLab'],
            ['preprocess', 'navPreprocess'],
            ['review', 'navReview'],
            ['export', 'navExport'],
          ] as [WorkspaceTab, string][]
        ).map(([id, key]) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className="px-3 py-1 rounded-md text-[12px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--surface-primary)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--label-secondary)',
                boxShadow: active ? 'var(--shadow-control)' : 'none',
              }}
            >
              {t(key)}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setActiveTab('workspace');
          }}
          onOpenCreateProject={() => setIsCreateProjectOpen(true)}
          onDeleteProject={(id) => {
            setProjects((prev) => prev.filter((p) => p.id !== id));
            if (activeProjectId === id) setActiveProjectId('all');
          }}
          defaultModel={settings.defaultTargetModel}
          onSelectDefaultModel={handleSelectDefaultModel}
          activeProviderName={activeProvider.name}
          activeProviderModel={activeProvider.selectedModelId || 'default'}
          theme={settings.theme}
          onToggleTheme={(theme) => setSettings((prev) => ({ ...prev, theme }))}
          language={settings.language}
          onChangeLanguage={(language) => setSettings((prev) => ({ ...prev, language }))}
          onOpenSettings={(tab, specModel) => openSettings(tab, specModel)}
          t={t}
        />

        <ErrorBoundary
          key={activeTab}
          title={t('errorBoundaryTitle')}
          actionLabel={t('errorBoundaryRecover')}
        >
          {activeTab === 'workspace' && (
            <>
              <WorkspaceView
                items={visibleItems}
                selectedId={selectedItem?.id ?? null}
                onSelectItem={(id) => setSelectedId(id)}
                onDoubleClickItem={(id) => {
                  const target = projectItems.find((i) => i.id === id);
                  if (target) setLightboxItem(target);
                }}
                onRemoveItem={removeItem}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={settings.viewMode}
                onViewModeChange={(viewMode) =>
                  setSettings((prev) => ({ ...prev, viewMode }))
                }
                isBatchCompiling={isBatchCompiling}
                onCompilePending={handleCompilePending}
                onStopCompiling={handleStopCompiling}
                onCleanAllBuzzwords={handleCleanAllBuzzwords}
                onOpenBatchEdit={() => setIsBatchEditOpen(true)}
                onImportFiles={handleImportFiles}
                onOpenFilePicker={() => fileInputRef.current?.click()}
                onLoadSamples={handleLoadSamples}
                activeEngineLabel={`${activeProvider.name} · ${
                  activeProvider.selectedModelId || 'default'
                }`}
                onOpenProviderSettings={() => openSettings('providers')}
                language={settings.language}
                t={t}
              />

              <Inspector
                item={selectedItem}
                language={settings.language}
                blockedWords={settings.blockedWords}
                replacementRules={settings.replacementRules}
                customPresets={settings.customPresets}
                onOpenSpecTuning={(model) => openSettings('specs', model)}
                onUpdateItem={updateItem}
                onCompileItem={handleCompileItem}
                onModernizeItemCaption={handleModernizeItemCaption}
                t={t}
              />
            </>
          )}

          {activeTab !== 'workspace' && (
            <Suspense fallback={<ViewSkeleton />}>
              {activeTab === 'prompt-lab' && (
                <PromptLabView
                  defaultModel={settings.defaultTargetModel}
                  defaultVariant={settings.kreaVariant}
                  activeProvider={activeProvider}
                  modelTunings={settings.modelTunings}
                  customPresets={settings.customPresets}
                  customInstruction={settings.customInstruction}
                  onOpenSpecTuning={(model) => openSettings('specs', model)}
                  onOpenProviderSettings={() => openSettings('providers')}
                  language={settings.language}
                  onErrorToast={(msg) => pushToast(msg, 'error')}
                  t={t}
                />
              )}

              {activeTab === 'preprocess' && (
                <PreprocessView
                  items={projectItems}
                  onUpdateItem={updateItem}
                  t={t}
                />
              )}

              {activeTab === 'review' && (
                <ReviewView
                  items={projectItems}
                  onInspectItem={(id) => {
                    setSelectedId(id);
                    setActiveTab('workspace');
                  }}
                  onCleanAllBuzzwords={handleCleanAllBuzzwords}
                  t={t}
                />
              )}

              {activeTab === 'export' && (
                <ExportView
                  projects={projects}
                  onErrorToast={(msg) => pushToast(msg, 'error')}
                  t={t}
                />
              )}
            </Suspense>
          )}
        </ErrorBoundary>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreate={(name, triggerWord) => {
          const newProj: Project = {
            id: `proj_${Date.now()}`,
            name,
            triggerWord,
            targetModel: settings.defaultTargetModel,
            items: [],
            createdAt: Date.now(),
          };
          setProjects((prev) => [...prev, newProj]);
          setActiveProjectId(newProj.id);
        }}
        t={t}
      />

      <BatchEditModal
        isOpen={isBatchEditOpen}
        onClose={() => setIsBatchEditOpen(false)}
        onApply={handleBatchEdit}
        t={t}
      />

      <SettingsWindow
        isOpen={settingsModal.isOpen}
        initialTab={settingsModal.tab}
        initialSpecModel={settingsModal.specModel}
        onClose={() => setSettingsModal((prev) => ({ ...prev, isOpen: false }))}
        settings={settings}
        onSave={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
        language={settings.language}
        t={t}
      />

      <LightboxModal item={lightboxItem} onClose={() => setLightboxItem(null)} />

      {/* Subtle Apple Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="px-4 py-2.5 rounded-xl border text-[13px] font-medium apple-vibrancy-thick"
              style={{
                borderColor: 'var(--separator-hairline)',
                color:
                  toast.tone === 'error'
                    ? 'var(--semantic-red)'
                    : toast.tone === 'success'
                    ? 'var(--semantic-green)'
                    : 'var(--label-primary)',
                boxShadow: 'var(--shadow-sheet)',
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
