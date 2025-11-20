import React, { useState, useEffect, useMemo } from 'react';
import { exportAllProjectsToZip, downloadSingleText } from './services/exportService';
import { Upload, FolderInput } from './components/Icons';

// Hooks
import { useSettings } from './hooks/useSettings';
import { useProjectManager } from './hooks/useProjectManager';
import { useSelectionManager } from './hooks/useSelectionManager';
import { useTagProcessor } from './hooks/useTagProcessor';
import { useFileHandler } from './hooks/useFileHandler';

// Components
import { VirtualList, VirtualGrid } from './components/VirtualViews';
import { SettingsModal, BatchEditModal, MoveModal, TutorialModal } from './components/AppModals';
import { Sidebar, Inspector, SmartToolbar } from './components/AppLayout';

const TUTORIAL_SEEN_KEY = 'lora-tag-master-tutorial-seen-v1';
type ViewFilter = 'all' | 'pending' | 'completed';

const App: React.FC = () => {
  // --- Custom Hooks ---
  const { settings, setSettings, t } = useSettings();
  const { 
      projects, isLoaded, addFilesToProject, deleteProject, removeImages, 
      updateImageCaption, updateImageStatus, batchUpdateCaptions, moveImages, mergeProjects,
      retryErrors, clearDone 
  } = useProjectManager();

  // --- Logic Hooks ---
  const { isProcessing, startBatch, pause, processSingle } = useTagProcessor(projects, settings, updateImageStatus);
  
  // --- Local View State ---
  const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridColumns, setGridColumns] = useState(4);
  
  // --- Modal State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [moveState, setMoveState] = useState<{ isOpen: boolean; mode: 'selection' | 'project'; sourceProjectId?: string; }>({ isOpen: false, mode: 'selection' });

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
        if (w >= 1536) setGridColumns(6);
        else if (w >= 1280) setGridColumns(5);
        else if (w >= 1024) setGridColumns(4);
        else if (w >= 768) setGridColumns(3);
        else setGridColumns(2);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Computed Data for View ---
  const contextProjects = useMemo(() => activeProjectId === 'all' ? projects : projects.filter(p => p.id === activeProjectId), [projects, activeProjectId]);
  
  const visibleImages = useMemo(() => {
    const result: { image: any, projectId: string }[] = [];
    contextProjects.forEach(p => {
        if (p.isCollapsed && activeProjectId === 'all') return;
        p.images.forEach(img => {
            let isVisible = true;
            if (viewFilter === 'pending') isVisible = img.status === 'idle' || img.status === 'error' || img.status === 'loading';
            if (viewFilter === 'completed') isVisible = img.status === 'success';
            if (isVisible && searchQuery.trim()) {
               const q = searchQuery.toLowerCase();
               if (!img.file.name.toLowerCase().includes(q) && !img.caption.toLowerCase().includes(q)) isVisible = false;
            }
            if (isVisible) result.push({ image: img, projectId: p.id });
        });
    });
    return result;
  }, [contextProjects, viewFilter, searchQuery, activeProjectId]);

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

  // --- Selection Manager ---
  const { 
      selectedId, setSelectedId, multiSelection, setMultiSelection, 
      handleSelectAll, handleCardPointerDown, handleCardPointerEnter, clearSelection 
  } = useSelectionManager(visibleImages);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
          if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); handleSelectAll(); }
          if (e.key === 'Escape') { e.preventDefault(); clearSelection(); }
          if (e.key === 'Delete' || e.key === 'Backspace') { 
              if (multiSelection.size > 0) { 
                  e.preventDefault(); 
                  if(confirm(t('deleteSelectedConfirm').replace('{count}', multiSelection.size.toString()))) {
                      removeImages(multiSelection);
                      clearSelection();
                  }
              } 
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [multiSelection, handleSelectAll, clearSelection, removeImages, t]);

  const handleMoveConfirm = (targetId: string, newName: string) => {
      if (moveState.mode === 'selection') {
          moveImages(multiSelection, targetId, newName);
          clearSelection();
      } else if (moveState.mode === 'project' && moveState.sourceProjectId) {
          mergeProjects(moveState.sourceProjectId, targetId, newName);
      }
      setMoveState({ isOpen: false, mode: 'selection' });
  };

  const activeImage = visibleImages.find(v => v.image.id === selectedId)?.image;
  const inspectorProjectId = activeImage ? (activeProjectId === 'all' ? visibleImages.find(v => v.image.id === selectedId)?.projectId : activeProjectId) : null;
  const inspectorProjectObj = inspectorProjectId ? projects.find(p => p.id === inspectorProjectId) : null;

  return (
    <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans overflow-hidden transition-colors duration-300">
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
            onExport: () => exportAllProjectsToZip(projects),
            onMerge: (sourceId) => setMoveState({ isOpen: true, mode: 'project', sourceProjectId: sourceId }),
            onDeleteProject: (id) => { if(confirm(t('deleteProjectConfirm'))) { deleteProject(id); if(activeProjectId===id) setActiveProjectId('all'); }},
            onStartAll: () => startBatch(activeProjectId, () => setIsSettingsOpen(true)),
            onPause: pause,
            onOpenSettings: () => setIsSettingsOpen(true),
            onOpenTutorial: () => setIsTutorialOpen(true)
        }}
      />
      
      {/* Main Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 relative"
        onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        {/* Hidden File Input for Sidebar logic */}
        <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileInputChange}
        />

        <SmartToolbar 
            viewFilter={viewFilter} setViewFilter={setViewFilter}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            viewMode={settings.viewMode} setViewMode={(m) => setSettings(s => ({...s, viewMode: m}))}
            selectionCount={multiSelection.size} visibleCount={visibleImages.length}
            stats={contextStats} t={t}
            handlers={{
                onSelectAll: handleSelectAll,
                onMove: () => setMoveState({ isOpen: true, mode: 'selection' }),
                onDeleteSelected: () => { if(confirm(t('deleteSelectedConfirm').replace('{count}', multiSelection.size.toString()))) { removeImages(multiSelection); clearSelection(); }},
                onBatchEdit: () => setIsBatchOpen(true),
                onRetryErrors: retryErrors,
                onClearDone: () => { if(confirm(t('clearDoneConfirm'))) clearDone(); }
            }}
        />
        
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
                    items={visibleImages} selectedId={selectedId} multiSelection={multiSelection}
                    onCardPointerDown={handleCardPointerDown} onCardPointerEnter={handleCardPointerEnter} 
                    onRemove={(id, e) => { e.stopPropagation(); removeImages(new Set([id])); }}
                />
            ) : (
                <VirtualGrid 
                    items={visibleImages} selectedId={selectedId} multiSelection={multiSelection}
                    onCardPointerDown={handleCardPointerDown} onCardPointerEnter={handleCardPointerEnter} 
                    onRemove={(id, e) => { e.stopPropagation(); removeImages(new Set([id])); }} 
                    columnCount={gridColumns}
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

      <Inspector 
        activeImage={activeImage}
        inspectorProjectId={inspectorProjectId || undefined}
        inspectorProjectName={inspectorProjectObj?.name}
        onUpdateCaption={(text) => inspectorProjectId && activeImage && updateImageCaption(inspectorProjectId, activeImage.id, text)}
        onRegen={() => inspectorProjectId && activeImage && processSingle(inspectorProjectId, activeImage.id)}
        onDownload={() => activeImage && downloadSingleText(activeImage)}
        t={t}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} setSettings={setSettings} t={t} />
      <BatchEditModal 
          isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)} 
          visibleCount={visibleImages.length} selectedCount={multiSelection.size} 
          onBatchUpdate={(op, params, scope) => {
             const targetIds = new Set(scope === 'selected' ? Array.from(multiSelection) : visibleImages.map(v => v.image.id));
             if (targetIds.size > 0) {
                 batchUpdateCaptions(targetIds, op, params);
                 setIsBatchOpen(false);
             }
          }} 
          t={t} 
      />
      <MoveModal 
          moveState={moveState} onClose={() => setMoveState({isOpen: false, mode: 'selection'})} 
          projects={projects} selectionCount={multiSelection.size} 
          onConfirm={handleMoveConfirm} t={t} 
      />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} t={t} />
    </div>
  );
};

export default App;