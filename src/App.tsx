import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { exportAllProjectsToZip, downloadSingleText } from './services/exportService';
import { WifiOff } from 'lucide-react';
import { AppSettings, WorkflowStep, Project } from './types';
import { Upload, FolderInput } from './components/Icons';

// Hooks
import { useSettings } from './hooks/useSettings';
import { useProjectManager } from './hooks/useProjectManager';
import { useSelectionManager } from './hooks/useSelectionManager';
import { useTagProcessor } from './hooks/useTagProcessor';
import { useFileHandler } from './hooks/useFileHandler';
import { useSearch } from './hooks/useSearch';

// Components
import { VirtualList, VirtualGrid } from './components/VirtualViews';
import { SettingsModal, BatchEditModal, MoveModal, TutorialModal, ExportModal, CleanModal, CreateProjectModal, EditProjectModal, DeleteProjectModal } from './components/AppModals';
import { LogModal } from './components/modals/LogModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { testConnection } from './services/geminiService';

import { Lightbox } from './components/Lightbox';
import { Sidebar, Inspector, SmartToolbar } from './components/AppLayout';
import { WorkflowStepper } from './components/workflow/WorkflowStepper';
import { PreprocessView } from './components/workflow/PreprocessView';
import { ReviewView } from './components/workflow/ReviewView';
import { ExportView } from './components/workflow/ExportView';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from './components/GlobalFallbacks';

const TUTORIAL_SEEN_KEY = 'lora-tag-master-tutorial-seen-v1';

const App: React.FC = () => {
    // --- Custom Hooks ---
    const { settings, setSettings, t } = useSettings();
    const {
        projects, addFilesToProject, createProject, renameProject, deleteProject, removeImages, renameImage,
        updateImageCaption, updateImageStatus, batchUpdateCaptions, moveImages, mergeProjects,
        retryErrors,
        clearDone,
        updateProjectTriggerWord,
        setProjects
    } = useProjectManager();

    // --- Local View State ---
    const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all');

    // Use custom search hook
    const {
        searchQuery, setSearchQuery,
        viewFilter, setViewFilter,
        filteredImages: visibleImages
    } = useSearch(projects, activeProjectId);

    // --- Modal State ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [editProjectTarget, setEditProjectTarget] = useState<Project | null>(null);
    const [deleteProjectTarget, setDeleteProjectTarget] = useState<Project | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isInspectorOpen, setIsInspectorOpen] = useState(true);

    const [moveState, setMoveState] = useState<{ isOpen: boolean; mode: 'selection' | 'project'; sourceProjectId?: string; }>({ isOpen: false, mode: 'selection' });
    const [lightboxImageId, setLightboxImageId] = useState<string | null>(null);

    // --- Toast State ---
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (message: string, type: ToastType) => {
        const id = Date.now().toString() + Math.random().toString();
        setToasts(prev => [...prev, { id, type, message }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleTestConnection = async (testSettings: AppSettings) => {
        try {
            addToast(t('testing'), 'info'); // Using translation key if available, or just string
            await testConnection(testSettings);
            addToast(t('connectionSuccess'), 'success');
        } catch (error: unknown) {
            const err = error as Error;
            addToast(`${t('connectionFailed')}: ${err.message}`, 'error');
            throw err;
        }
    };

    // --- Logic Hooks ---
    const {
        isProcessing,
        isCooling,
        coolingCountdown,
        skipCooldown,
        startBatch,
        pause,
        processSingle
    } = useTagProcessor(projects, settings, updateImageStatus, addToast);

    const handleExport = async (format: 'txt' | 'json') => {
        try {
            await exportAllProjectsToZip(projects, format);
        } catch (e) {
            console.error(e);
            alert(t('exportFailed'));
        }
    };

    // --- File Handler Hook ---
    const {
        isDragOver, fileInputRef, handleDragEnter, handleDragLeave,
        handleDragOver, handleDrop, handleFileInputChange, openFileDialog
    } = useFileHandler(activeProjectId, addFilesToProject);

    // Check Tutorial
    useEffect(() => { if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) setIsTutorialOpen(true); }, []);


    // Check API Configuration on mount
    useEffect(() => {
        if (!settings.apiKey) {
            // Small delay to ensure smooth loading
            setTimeout(() => setIsSettingsOpen(true), 500);
        }
    }, [settings.apiKey]);

    // Offline event listeners
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // --- Computed Data for View ---
    const contextProjects = useMemo(() => activeProjectId === 'all' ? projects : projects.filter(p => p.id === activeProjectId), [projects, activeProjectId]);

    const contextStats = useMemo(() => {
        const stats = { total: 0, completed: 0, pending: 0, error: 0, success: 0 };
        contextProjects.forEach(p => {
            stats.total += p.images.length;
            stats.completed += p.images.filter(i => i.status === 'success').length;
            stats.error += p.images.filter(i => i.status === 'error').length;
        });
        stats.pending = stats.total - stats.completed;
        stats.success = stats.completed;
        return stats;
    }, [contextProjects]);

    // Adapt visibleImages for VirtualListView/Grid (mapped structure)
    // VirtualViews expects: {image: TagImage, projectId: string }[]
    const virtualItems = useMemo(() => visibleImages.map(v => ({ image: v.img, projectId: v.projId })), [visibleImages]);

    // --- Selection Manager ---
    const {
        selectedId, setSelectedId, multiSelection,
        handleSelectAll, handleCardPointerDown, handleCardPointerEnter, clearSelection
    } = useSelectionManager(virtualItems);

    // --- Workflow State Integration ---
    // If settings doesn't have workflowStep (old config), default to IMPORT or TAGGING? 
    // Let's rely on settings.workflowStep, defaulting to IMPORT if undefined in types (handled in useState usually, but settings is persisted)
    // We need to ensure we can switch steps.
    const currentStep = settings.workflowStep || WorkflowStep.TAGGING; // Default to Tagging for backward compat

    const handleStepChange = (step: WorkflowStep) => {
        setSettings(s => ({ ...s, workflowStep: step }));
    };

    const handleNextStep = () => {
        const steps = [
            WorkflowStep.IMPORT,
            WorkflowStep.PREPROCESS,
            WorkflowStep.TAGGING,
            WorkflowStep.REVIEW,
            WorkflowStep.EXPORT
        ];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
            handleStepChange(steps[currentIndex + 1]);
        }
    };

    // --- Preprocessing Handler ---
    const handleImageUpdate = (projectId: string, imageId: string, newFile: File) => {
        // Find existing to preserve caption/status
        const project = projects.find(p => p.id === projectId);
        const image = project?.images.find(i => i.id === imageId);
        if (project && image) {
            // We need a way to update the file blob itself. 
            // Reuse renameImage logic but just swapping file content? 
            // Actually `renameImage` creates a new File. We can create a dedicated `updaFileBlob` in useProjectManager
            // For now, let's use a specialized update that we can add to useProjectManager or just manually setProjects here since we have setProjects exposed

            setProjects(prev => prev.map(p => {
                if (p.id !== projectId) return p;
                return {
                    ...p,
                    images: p.images.map(img => {
                        if (img.id !== imageId) return img;
                        // Revoke old URL before creating new one
                        if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
                            try {
                                URL.revokeObjectURL(img.previewUrl);
                            } catch (e) {
                                console.warn("Failed to revoke object URL:", img.previewUrl, e);
                            }
                        }
                        return {
                            ...img,
                            file: newFile,
                            originalFile: img.originalFile || img.file, // Save backup if first edit
                            previewUrl: URL.createObjectURL(newFile)
                        };
                    })
                };
            }));
        }
    };

    const handleNavigateSelected = useCallback((direction: 'next' | 'prev') => {
        if (visibleImages.length === 0) return;
        const currentIndex = visibleImages.findIndex(v => v.img.id === selectedId);
        let newIndex = 0;
        if (currentIndex !== -1) {
            if (direction === 'next') {
                newIndex = Math.min(visibleImages.length - 1, currentIndex + 1);
            } else {
                newIndex = Math.max(0, currentIndex - 1);
            }
        }
        const targetImageId = visibleImages[newIndex].img.id;
        setSelectedId(targetImageId);

        setTimeout(() => {
            const cardEl = document.getElementById(`card-${targetImageId}`);
            if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 50);
    }, [visibleImages, selectedId, setSelectedId]);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isEditing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

            if (isEditing) {
                if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    e.preventDefault();
                    const direction = e.key === 'ArrowRight' ? 'next' : 'prev';
                    handleNavigateSelected(direction);

                    // 自动对新的 textarea 进行聚焦和定位
                    setTimeout(() => {
                        const el = document.getElementById('caption-textarea') as HTMLTextAreaElement | null;
                        if (el) {
                            el.focus();
                            const len = el.value.length;
                            el.setSelectionRange(len, len);
                        }
                    }, 80);
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); handleSelectAll(); }
            if (e.key === 'Escape') { e.preventDefault(); clearSelection(); }

            // 仅在打标/校对阶段支持直接用方向键在网格卡片间切换图片
            if (currentStep === WorkflowStep.TAGGING || currentStep === WorkflowStep.REVIEW) {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const direction = e.key === 'ArrowRight' ? 'next' : 'prev';
                    handleNavigateSelected(direction);
                }
            }

            // Only allow delete in Tagging/Review steps?
            if (currentStep === WorkflowStep.TAGGING || currentStep === WorkflowStep.PREPROCESS || currentStep === WorkflowStep.REVIEW) {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (multiSelection.size > 0) {
                        if (confirm(t('deleteSelectedConfirm').replace('{count}', multiSelection.size.toString()))) {
                            removeImages(new Set(Array.from(multiSelection)));
                            clearSelection();
                        }
                    } else if (selectedId) {
                        if (confirm(t('deleteSelectedConfirm').replace('{count}', '1'))) {
                            removeImages(new Set([selectedId]));
                            setSelectedId(null);
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSelectAll, clearSelection, multiSelection, selectedId, setSelectedId, removeImages, t, currentStep, handleNavigateSelected]);

    // --- Handlers ---
    // handleDrop is already provided by useFileHandler hook

    const handleMoveConfirm = (targetProjectId: string) => {
        if (moveState.mode === 'project' && moveState.sourceProjectId) {
            mergeProjects(moveState.sourceProjectId, targetProjectId);
        } else {
            const imageIds = multiSelection.size > 0 ? Array.from(multiSelection) : (selectedId ? [selectedId] : []);
            moveImages(new Set(imageIds as string[]), activeProjectId, targetProjectId);
            clearSelection();
        }
        setMoveState({ ...moveState, isOpen: false });
    };

    const handleLightboxNav = (direction: 'next' | 'prev') => {
        if (!lightboxImageId) return;
        const currentIndex = visibleImages.findIndex(v => v.img.id === lightboxImageId);
        if (currentIndex === -1) return;

        let newIndex = -1;
        if (direction === 'next' && currentIndex < visibleImages.length - 1) newIndex = currentIndex + 1;
        if (direction === 'prev' && currentIndex > 0) newIndex = currentIndex - 1;

        if (newIndex >= 0) {
            setLightboxImageId(visibleImages[newIndex].img.id);
        }
    };

    const handleClean = (
        scope: 'all' | 'selected',
        op: 'applyRules' | 'lowercase' | 'underscoreToSpace' | 'spaceToUnderscore' | 'sanitize' = 'applyRules'
    ) => {
        const targetIds = new Set(scope === 'selected' ? Array.from(multiSelection) : visibleImages.map(v => v.img.id));
        if (targetIds.size > 0) {
            if (op === 'applyRules') {
                if (settings.replacementRules) {
                    batchUpdateCaptions(targetIds, 'applyRules', { rules: settings.replacementRules });
                }
            } else {
                batchUpdateCaptions(targetIds, op, {});
            }
        }
    };

    // Current Active Image for Inspector (Look in visibleImages first, fallback to all projects)
    const activeImageEntry = useMemo(() => {
        if (!selectedId) return null;
        const fromVisible = visibleImages.find(v => v.img.id === selectedId);
        if (fromVisible) return fromVisible;
        for (const p of projects) {
            const found = p.images.find(i => i.id === selectedId);
            if (found) return { projId: p.id, img: found };
        }
        return null;
    }, [visibleImages, projects, selectedId]);

    const activeImage = activeImageEntry?.img;
    const inspectorProjectId = activeImageEntry?.projId;
    const inspectorProjectObj = inspectorProjectId ? projects.find(p => p.id === inspectorProjectId) : null;

    // Lightbox Image Object
    const lightboxImageEntry = visibleImages.find(v => v.img.id === lightboxImageId);
    const lightboxImage = lightboxImageEntry?.img || null;
    const lightboxIndex = visibleImages.findIndex(v => v.img.id === lightboxImageId);

    return (
        <div
            className={`h-screen w-screen flex flex-col bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 transition-colors duration-200 ${settings.theme === 'dark' ? 'dark' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
        >
            {/* Workflow Stepper at Top */}
            <WorkflowStepper currentStep={currentStep} onStepChange={handleStepChange} />

            {/* Offline Banner */}
            {isOffline && (
                <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2 border-b border-amber-500/20">
                    <WifiOff size={14} />
                    <span>{t('offlineWarning') || 'You are currently offline. Local features are still available, but AI generation is disabled.'}</span>
                </div>
            )}

            {/* Rate Limit Cooldown Notification Banner */}
            {isCooling && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 px-4 py-2 flex items-center justify-between text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 font-medium">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span>⚠️ 触发 API 速率限制 (5 RPM 或 Token 配额耗尽)，正在自动排队轮询恢复中...</span>
                        <span className="font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-800 dark:text-amber-200">
                            {coolingCountdown}s 后自动继续
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={skipCooldown}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold transition-all cursor-pointer"
                        >
                            跳过等待立即重试
                        </button>
                        <button
                            onClick={pause}
                            className="px-2.5 py-1 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                        >
                            暂停批处理
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <Sidebar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    setActiveProjectId={setActiveProjectId}
                    settings={settings}
                    isProcessing={isProcessing}
                    isCooling={isCooling}
                    coolingCountdown={coolingCountdown}
                    onSkipCooldown={skipCooldown}
                    contextStats={contextStats}
                    fileInputRef={fileInputRef}
                    t={t}
                    handlers={{
                        onImport: openFileDialog,
                        onExport: () => setIsExportModalOpen(true),
                        onMerge: (sourceId) => setMoveState({ isOpen: true, mode: 'project', sourceProjectId: sourceId }),
                        onDeleteProject: (id) => {
                            const p = projects.find(item => item.id === id);
                            if (p) setDeleteProjectTarget(p);
                        },
                        onDeleteProjectRequest: (p) => setDeleteProjectTarget(p),
                        onCreateProject: () => setIsCreateProjectOpen(true),
                        onRenameProject: (id, newName) => {
                            renameProject(id, newName);
                            addToast('项目已重命名', 'success');
                        },
                        onEditProject: (p) => setEditProjectTarget(p),
                        onExportProject: async (p) => {
                            try {
                                await exportAllProjectsToZip([p], 'txt');
                                addToast(`项目「${p.name}」已成功导出`, 'success');
                            } catch (e) {
                                console.error(e);
                                addToast('导出失败，请重试', 'error');
                            }
                        },
                        onStartAll: () => startBatch(activeProjectId, () => setIsSettingsOpen(true)),
                        onPause: pause,
                        onOpenSettings: () => setIsSettingsOpen(true),
                        onOpenTutorial: () => setIsTutorialOpen(true),
                        onOpenLog: () => setIsLogOpen(true),
                        onUpdateTriggerWord: updateProjectTriggerWord
                    }}
                />

                {/* Main View Area Switcher */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                    <ErrorBoundary FallbackComponent={GlobalErrorFallback} onReset={() => window.location.reload()}>
                        {currentStep === WorkflowStep.PREPROCESS ? (
                            <PreprocessView projects={contextProjects} onUpdateImage={handleImageUpdate} onNext={handleNextStep} />
                        ) : currentStep === WorkflowStep.REVIEW ? (
                            <ReviewView projects={projects} onNext={handleNextStep} />
                        ) : currentStep === WorkflowStep.EXPORT ? (
                            <ExportView onExport={handleExport} totalImages={projects.reduce((acc, p) => acc + p.images.length, 0)} />
                        ) : (
                            // Standard Tagging/Import View (Reusing the Grid/List)
                            <>
                                <SmartToolbar
                                    viewFilter={viewFilter} setViewFilter={setViewFilter}
                                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                                    viewMode={settings.viewMode} setViewMode={(m) => setSettings(s => ({ ...s, viewMode: m }))}
                                    selectionCount={multiSelection.size} visibleCount={visibleImages.length}
                                    stats={contextStats} t={t}
                                    onNext={handleNextStep}
                                    onOpenLog={() => setIsLogOpen(true)}
                                    onStartSelected={() => {
                                        if (multiSelection.size > 0) {
                                            startBatch(activeProjectId, () => setIsSettingsOpen(true), multiSelection);
                                        }
                                    }}
                                    handlers={{
                                        onSelectAll: handleSelectAll,
                                        onMove: () => setMoveState({ isOpen: true, mode: 'selection' }),
                                        onDeleteSelected: () => {
                                            if (confirm(t('deleteSelectedConfirm').replace('{count}', multiSelection.size.toString()))) {
                                                removeImages(new Set(Array.from(multiSelection)));
                                                clearSelection();
                                            }
                                        },
                                        onBatchEdit: () => setIsBatchOpen(true),
                                        onOpenClean: () => setIsCleanModalOpen(true),
                                        onRetryErrors: retryErrors,
                                        onClearDone: () => { if (confirm(t('clearDoneConfirm'))) clearDone(); }
                                    }}
                                    settings={settings}
                                    setSettings={setSettings}
                                />

                                <div className="flex-1 flex min-w-0 relative overflow-hidden bg-white dark:bg-[#212121]">
                                    <div
                                        className="flex-1 flex flex-col min-w-0 relative"
                                        onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                    >
                                        <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileInputChange} />

                                        {visibleImages.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-6 select-none">
                                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                                                    <FolderInput className="w-6 h-6 opacity-40" />
                                                </div>
                                                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('workspaceEmpty')}</p>
                                                <p className="text-xs text-zinc-400 mt-1 max-w-xs text-center">{t('dropHere')}</p>
                                                <button 
                                                    onClick={openFileDialog} 
                                                    className="mt-4 px-4 py-2 bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] rounded-full text-xs font-medium hover:opacity-90 transition-all active:scale-95 shadow-2xs"
                                                >
                                                    {t('browseFiles')}
                                                </button>
                                            </div>
                                        ) : (
                                            settings.viewMode === 'list' ? (
                                                <VirtualList
                                                    items={virtualItems} selectedId={selectedId} multiSelection={multiSelection}
                                                    onCardPointerDown={handleCardPointerDown} onCardPointerEnter={handleCardPointerEnter}
                                                    onRemove={(id, e) => { e.stopPropagation(); removeImages(new Set([id])); }}
                                                    onDoubleClick={(id) => setLightboxImageId(id)}
                                                />
                                            ) : (
                                                <VirtualGrid
                                                    items={virtualItems} selectedId={selectedId} multiSelection={multiSelection}
                                                    onCardPointerDown={handleCardPointerDown} onCardPointerEnter={handleCardPointerEnter}
                                                    onRemove={(id, e) => { e.stopPropagation(); removeImages(new Set([id])); }}
                                                    columnCount={settings.gridColumns}
                                                    onDoubleClick={(id) => setLightboxImageId(id)}
                                                />
                                            )
                                        )}

                                        {/* Drag Overlay */}
                                        {isDragOver && (
                                            <div className="absolute inset-0 bg-black/[0.03] dark:bg-white/[0.04] backdrop-blur-xs z-50 flex items-center justify-center border-2 border-dashed border-zinc-400 dark:border-zinc-600 m-3 rounded-2xl animate-in fade-in">
                                                <div className="bg-white dark:bg-[#212121] p-6 rounded-2xl shadow-xl flex flex-col items-center border border-black/[0.06] dark:border-white/[0.08]">
                                                    <Upload className="w-8 h-8 text-zinc-700 dark:text-zinc-300 mb-2" />
                                                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{t('import')}</h3>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Inspector is only relevant in Tagging/Review steps */}
                                    {currentStep !== WorkflowStep.IMPORT && (
                                        <Inspector
                                            activeImage={activeImage}
                                            inspectorProjectId={inspectorProjectId || undefined}
                                            inspectorProjectName={inspectorProjectObj?.name}
                                            onUpdateCaption={(text) => inspectorProjectId && activeImage && updateImageCaption(inspectorProjectId, activeImage.id, text)}
                                            onRename={(newName) => inspectorProjectId && activeImage && renameImage(inspectorProjectId, activeImage.id, newName)}
                                            onRegen={() => inspectorProjectId && activeImage && processSingle(inspectorProjectId, activeImage.id)}
                                            onDownload={() => activeImage && downloadSingleText(activeImage)}
                                            stats={contextStats}
                                            isProcessing={isProcessing}
                                            images={visibleImages}
                                            onTagClick={(tag) => {
                                                const trimmed = searchQuery.trim();
                                                if (!trimmed) {
                                                    setSearchQuery(tag);
                                                } else {
                                                    const tags = trimmed.split(',').map(t => t.trim().toLowerCase());
                                                    if (!tags.includes(tag.toLowerCase())) {
                                                        setSearchQuery(trimmed + ', ' + tag);
                                                    }
                                                }
                                            }}
                                            isInspectorOpen={isInspectorOpen}
                                            onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
                                            onCloseDetails={() => { setSelectedId(null); clearSelection(); }}
                                            t={t}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </ErrorBoundary>
                </div>

                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} setSettings={setSettings} t={t} onTestConnection={handleTestConnection} />
                <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={handleExport} t={t} />
                <CreateProjectModal
                    isOpen={isCreateProjectOpen}
                    onClose={() => setIsCreateProjectOpen(false)}
                    onCreate={(name, triggerWord) => {
                        const newId = createProject(name, triggerWord);
                        setActiveProjectId(newId);
                        addToast(`项目「${name}」已成功创建`, 'success');
                    }}
                    defaultIndex={projects.length + 1}
                />
                <EditProjectModal
                    isOpen={!!editProjectTarget}
                    onClose={() => setEditProjectTarget(null)}
                    project={editProjectTarget}
                    onSave={(id, name, triggerWord) => {
                        renameProject(id, name);
                        updateProjectTriggerWord(id, triggerWord);
                        addToast('项目信息已更新', 'success');
                    }}
                />
                <DeleteProjectModal
                    isOpen={!!deleteProjectTarget}
                    onClose={() => setDeleteProjectTarget(null)}
                    project={deleteProjectTarget}
                    onConfirm={(id) => {
                        deleteProject(id);
                        if (activeProjectId === id) setActiveProjectId('all');
                        addToast('项目已成功删除', 'info');
                    }}
                />
                {/* --- Modals --- */}
                <CleanModal
                    isOpen={isCleanModalOpen}
                    onClose={() => setIsCleanModalOpen(false)}
                    settings={settings}
                    setSettings={setSettings}
                    visibleCount={visibleImages.length}
                    selectedCount={multiSelection.size}
                    onClean={handleClean}
                    t={t}
                />
                <BatchEditModal
                    isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)}
                    visibleCount={visibleImages.length} selectedCount={multiSelection.size}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onBatchUpdate={(op: 'append' | 'prepend' | 'replace' | 'removeTags' | 'addTags' | 'applyRules', params: any, scope: 'all' | 'selected') => {
                        const targetIds = new Set(scope === 'selected' ? Array.from(multiSelection) : visibleImages.map(v => v.img.id));
                        if (targetIds.size > 0) {
                            batchUpdateCaptions(targetIds, op, params);
                            setIsBatchOpen(false);
                        }
                    }}
                    t={t}
                />
                <MoveModal
                    moveState={moveState} onClose={() => setMoveState({ isOpen: false, mode: 'selection' })}
                    projects={projects} selectionCount={multiSelection.size}
                    onConfirm={handleMoveConfirm} t={t}
                />
                <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} t={t} />
                <LogModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
                <Lightbox
                    isOpen={!!lightboxImageId}
                    onClose={() => setLightboxImageId(null)}
                    image={lightboxImage}
                    onNext={() => handleLightboxNav('next')}
                    onPrev={() => handleLightboxNav('prev')}
                    hasNext={lightboxIndex < visibleImages.length - 1}
                    hasPrev={lightboxIndex > 0}
                />
            </div>
            {/* Toasts */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default App;