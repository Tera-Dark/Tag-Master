import React, { useState, useEffect, useMemo } from 'react';
import { exportAllProjectsToZip, downloadSingleText } from './services/exportService';
import { WifiOff } from 'lucide-react';
import { AppSettings, WorkflowStep } from './types';
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
import { SettingsModal, BatchEditModal, MoveModal, TutorialModal, ExportModal, CleanModal } from './components/AppModals';
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
        projects, addFilesToProject, deleteProject, removeImages, renameImage,
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
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
    const { isProcessing, startBatch, pause, processSingle } = useTagProcessor(projects, settings, updateImageStatus, addToast);

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

    // Responsive Grid
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            let cols = 5;
            if (w >= 1536) cols = 6;
            else if (w >= 1280) cols = 5;
            else if (w >= 1024) cols = 4;
            else if (w >= 768) cols = 3;
            else cols = 2;

            setSettings(prev => ({ ...prev, gridColumns: cols }));
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [setSettings]);

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
                        return {
                            ...img,
                            file: newFile,
                            originalFile: img.originalFile || img.file, // Save backup if first edit
                            previewUrl: URL.createObjectURL(newFile) // Revoke old one? React strict mode might make this tricky, but browser handles eventually.
                        };
                    })
                };
            }));
        }
    };

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); handleSelectAll(); }
            if (e.key === 'Escape') { e.preventDefault(); clearSelection(); }

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
    }, [handleSelectAll, clearSelection, multiSelection, selectedId, setSelectedId, removeImages, t, currentStep]);

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

    const handleClean = (scope: 'all' | 'selected') => {
        const targetIds = new Set(scope === 'selected' ? Array.from(multiSelection) : visibleImages.map(v => v.img.id));
        if (targetIds.size > 0 && settings.replacementRules) {
            batchUpdateCaptions(targetIds, 'applyRules', { rules: settings.replacementRules });
        }
    };

    // Current Active Image for Inspector
    const activeImageEntry = visibleImages.find(v => v.img.id === selectedId);
    const activeImage = activeImageEntry?.img;
    const inspectorProjectId = activeImageEntry?.projId;
    const inspectorProjectObj = inspectorProjectId ? projects.find(p => p.id === inspectorProjectId) : null;

    // Lightbox Image Object
    const lightboxImageEntry = visibleImages.find(v => v.img.id === lightboxImageId);
    const lightboxImage = lightboxImageEntry?.img || null;
    const lightboxIndex = visibleImages.findIndex(v => v.img.id === lightboxImageId);

    return (
        <div
            className={`h-screen w-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200 ${settings.theme === 'dark' ? 'dark' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
        >
            {/* Workflow Stepper at Top */}
            <WorkflowStepper currentStep={currentStep} onStepChange={handleStepChange} />

            {/* Offline Banner */}
            {isOffline && (
                <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-sm font-medium py-1.5 px-4 flex items-center justify-center gap-2 border-b border-amber-500/20">
                    <WifiOff size={16} />
                    <span>{t('offlineWarning') || 'You are currently offline. Local features are still available, but AI generation is disabled.'}</span>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Always visible for Project Navigation, but maybe context sensitive? 
                    Let's keep it for IMPORT state mostly, but useful for NAV. 
                    Actually, in 'Preprocess' mode, do we want to switch projects? Yes.
                */}
                <Sidebar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    setActiveProjectId={setActiveProjectId}
                    settings={settings}
                    isProcessing={isProcessing}
                    contextStats={contextStats}
                    fileInputRef={fileInputRef}
                    t={t}
                    handlers={{
                        onImport: openFileDialog,
                        onExport: () => setIsExportModalOpen(true),
                        onMerge: (sourceId) => setMoveState({ isOpen: true, mode: 'project', sourceProjectId: sourceId }),
                        onDeleteProject: (id) => { if (confirm(t('deleteProjectConfirm'))) { deleteProject(id); if (activeProjectId === id) setActiveProjectId('all'); } },
                        onStartAll: () => startBatch(activeProjectId, () => setIsSettingsOpen(true)),
                        onPause: pause,
                        onOpenSettings: () => setIsSettingsOpen(true),
                        onOpenTutorial: () => setIsTutorialOpen(true),
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

                                <div className="flex-1 flex min-w-0 relative overflow-hidden">
                                    <div
                                        className="flex-1 flex flex-col min-w-0 relative"
                                        onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                    >
                                        <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileInputChange} />

                                        {visibleImages.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                                                <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                                    <FolderInput className="w-10 h-10 opacity-50" />
                                                </div>
                                                <p className="text-lg font-medium">{t('workspaceEmpty')}</p>
                                                <p className="text-sm opacity-50 mt-2 max-w-xs text-center">{t('dropHere')}</p>
                                                <button onClick={openFileDialog} className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105 active:scale-95">
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
                                            <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-indigo-500 border-dashed m-4 rounded-2xl animate-in fade-in">
                                                <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce">
                                                    <Upload className="w-12 h-12 text-indigo-600 mb-4" />
                                                    <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{t('import')}</h3>
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