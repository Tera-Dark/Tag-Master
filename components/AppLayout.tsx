import React from 'react';
import { AppSettings, Project, TagImage } from '../types';
import { translations } from '../utils/i18n';
import { 
  Wand2, HelpCircle, Upload, Archive, LayoutGrid, Folder, Merge, X, 
  Play, Pause, Settings, Loader2, CheckCircle, Layers, ListFilter, CheckSquare, 
  Grid3X3, List, Search, Square, FolderInput, Trash2, Filter, RotateCcw, Eraser,
  Download, MousePointer2
} from './Icons';

// --- SIDEBAR ---
export const Sidebar = ({
    projects,
    activeProjectId,
    setActiveProjectId,
    settings,
    isProcessing,
    contextStats,
    handlers,
    fileInputRef,
    t
}: {
    projects: Project[],
    activeProjectId: string,
    setActiveProjectId: (id: string) => void,
    settings: AppSettings,
    isProcessing: boolean,
    contextStats: { total: number, completed: number, pending: number, error: number },
    handlers: {
        onImport: () => void,
        onExport: () => void,
        onMerge: (sourceId: string) => void,
        onDeleteProject: (id: string) => void,
        onStartAll: () => void,
        onPause: () => void,
        onOpenSettings: () => void,
        onOpenTutorial: () => void
    },
    fileInputRef: React.RefObject<HTMLInputElement | null>,
    t: (key: keyof typeof translations['en']) => string
}) => {
    return (
        <div className="w-64 lg:w-72 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full z-20 select-none transition-all duration-300">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
               <h1 className="text-lg font-bold flex items-center gap-2"><Wand2 className="w-5 h-5 text-indigo-600" />{t('appTitle')}</h1>
               <button onClick={handlers.onOpenTutorial} className="text-zinc-400 hover:text-indigo-500 transition-colors" title={t('tutorial')}><HelpCircle className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-1 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800/50 pb-2 shrink-0">
               <div className="flex items-center gap-1"><span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded text-zinc-500">{settings.providerName}</span></div>
               <div className="text-[10px] text-zinc-500 truncate max-w-[100px]">{settings.model}</div>
            </div>
    
            <div className="p-3 flex flex-col h-full overflow-hidden">
                 {/* Import/Export Buttons */}
                 <div className="grid grid-cols-2 gap-2 mb-4 shrink-0">
                    <button onClick={handlers.onImport} className="flex flex-col items-center justify-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-3 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium transition-colors"><Upload className="w-4 h-4 text-zinc-400" />{t('import')}</button>
                    <button onClick={handlers.onExport} disabled={projects.length === 0} className="flex flex-col items-center justify-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-3 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium disabled:opacity-50 transition-colors"><Archive className="w-4 h-4 text-zinc-400" />{t('exportAll')}</button>
                 </div>
                 <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => { /* Handled by hook in App.tsx, this ref click is just a trigger */ }} />
                 
                 {/* Project List */}
                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-0.5 mb-4">
                    <button onClick={() => setActiveProjectId('all')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${activeProjectId === 'all' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30' : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" />{t('dashboard')}</div><span className="text-zinc-400">{projects.reduce((acc,p)=>acc+p.images.length,0)}</span></button>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                    {projects.map(p => (
                        <div key={p.id} onClick={() => setActiveProjectId(p.id)} className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${activeProjectId === p.id ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500'}`}>
                            <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                                <Folder className="w-3.5 h-3.5 shrink-0" /> 
                                <span className="truncate">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                <span className="opacity-50 text-[10px]">{p.images.filter(i=>i.status==='success').length}/{p.images.length}</span>
                                {projects.length > 1 && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handlers.onMerge(p.id); }} 
                                        className="p-1 text-zinc-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={t('merge')}
                                    >
                                        <Merge className="w-3 h-3" />
                                    </button>
                                )}
                                {activeProjectId === p.id && <button onClick={(e)=>{e.stopPropagation(); handlers.onDeleteProject(p.id);}} className="hover:text-red-500 p-1 text-zinc-400 transition-colors"><X className="w-3 h-3"/></button>}
                            </div>
                        </div>
                    ))}
                 </div>
    
                 {/* Bottom Controls */}
                 <div className="mt-auto space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                    {!isProcessing ? (
                        <button onClick={handlers.onStartAll} disabled={contextStats.pending === 0} className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-3 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform shadow-lg shadow-black/5 dark:shadow-white/5"><Play className="w-4 h-4 fill-current" />{t('startAll')}</button>
                    ) : (
                        <div className="flex gap-2"><button onClick={handlers.onPause} className="flex-1 bg-amber-500 text-white py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2 hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"><Pause className="w-4 h-4 fill-current" />{t('pause')}</button></div>
                    )}
                    
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400"><span>{t('progress')}</span><span>{contextStats.total > 0 ? Math.round((contextStats.completed/contextStats.total)*100) : 0}%</span></div>
                        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-300" style={{width: `${contextStats.total > 0 ? (contextStats.completed/contextStats.total)*100 : 0}%`}} /></div>
                    </div>
    
                    <div className="flex gap-2">
                        <button onClick={handlers.onOpenSettings} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"><Settings className="w-3.5 h-3.5" />{t('settings')}</button>
                        <div className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center" title="Saved">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

// --- INSPECTOR ---
export const Inspector = ({
    activeImage,
    inspectorProjectId,
    inspectorProjectName,
    onUpdateCaption,
    onRegen,
    onDownload,
    t
}: {
    activeImage?: TagImage,
    inspectorProjectId?: string,
    inspectorProjectName?: string,
    onUpdateCaption: (text: string) => void,
    onRegen: () => void,
    onDownload: () => void,
    t: (key: keyof typeof translations['en']) => string
}) => {
    return (
        <div className={`w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col transition-all duration-300 flex-shrink-0 ${activeImage ? 'translate-x-0' : 'translate-x-full hidden lg:flex lg:translate-x-0'}`}>
            {activeImage ? (
                <>
                   <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 font-bold flex justify-between items-center shrink-0">
                      <span className="truncate max-w-[200px] text-zinc-800 dark:text-zinc-200" title={activeImage.file.name}>{activeImage.file.name}</span>
                      <div className="flex gap-1 shrink-0">
                           <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 truncate max-w-[80px]">{inspectorProjectName || 'Unknown'}</span>
                      </div>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                       <div className="aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm relative group">
                           <img src={activeImage.previewUrl} className="w-full h-full object-contain" />
                       </div>
                       
                       <div className="space-y-2">
                           <div className="flex justify-between items-center">
                               <label className="text-xs font-bold text-zinc-500 uppercase">{t('captionContent')}</label>
                               <button 
                                  onClick={onRegen} 
                                  disabled={activeImage.status === 'loading'}
                                  className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-500 disabled:opacity-50 transition-colors"
                               >
                                  {activeImage.status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3" />}
                                  {t('regen')}
                               </button>
                           </div>
                           <textarea 
                              className="w-full h-48 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-zinc-800 dark:text-zinc-200"
                              value={activeImage.caption}
                              onChange={(e) => onUpdateCaption(e.target.value)}
                              placeholder="Caption..."
                           />
                           <div className="flex justify-between">
                              <button onClick={onDownload} className="text-xs flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"><Download className="w-3 h-3"/> Save .txt</button>
                              <span className="text-[10px] text-zinc-400">{activeImage.caption.length} chars</span>
                           </div>
                       </div>
                   </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                    <MousePointer2 className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select an image to edit details</p>
                </div>
            )}
        </div>
    );
};

// --- SMART TOOLBAR ---
export const SmartToolbar = ({
    viewFilter,
    setViewFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    selectionCount,
    visibleCount,
    stats,
    handlers,
    t
}: {
    viewFilter: 'all' | 'pending' | 'completed',
    setViewFilter: (v: 'all' | 'pending' | 'completed') => void,
    searchQuery: string,
    setSearchQuery: (q: string) => void,
    viewMode: 'grid' | 'list',
    setViewMode: (v: 'grid' | 'list') => void,
    selectionCount: number,
    visibleCount: number,
    stats: { error: number, success: number, pending: number },
    handlers: {
        onSelectAll: () => void,
        onMove: () => void,
        onDeleteSelected: () => void,
        onBatchEdit: () => void,
        onRetryErrors: () => void,
        onClearDone: () => void
    },
    t: (key: keyof typeof translations['en']) => string
}) => {
    return (
        <div className="sticky top-0 z-30 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-6 py-3 flex items-center justify-between gap-4 shadow-sm transition-all overflow-x-auto no-scrollbar">
            {/* Left Side: Filters & View */}
            <div className="flex items-center gap-3 shrink-0">
              {/* View Filters */}
              <div className="flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-300/50 dark:border-zinc-800/50">
                  <button onClick={() => setViewFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'all' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`} title="All Items"><Layers className="w-3 h-3" /></button>
                  <button onClick={() => setViewFilter('pending')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`} title="Pending">
                      <ListFilter className="w-3 h-3" /> 
                      {stats.pending > 0 && <span className="hidden md:inline bg-black/10 dark:bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-mono">{stats.pending}</span>}
                  </button>
                  <button onClick={() => setViewFilter('completed')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`} title="Completed">
                      <CheckSquare className="w-3 h-3" /> 
                      {stats.success > 0 && <span className="hidden md:inline bg-black/10 dark:bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-mono">{stats.success}</span>}
                  </button>
              </div>
              
              <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-800"></div>

               {/* View Mode Toggle */}
               <div className="flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-300/50 dark:border-zinc-800/50">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`} title="Grid View"><Grid3X3 className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`} title="List View"><List className="w-4 h-4" /></button>
              </div>
              
              <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-800 hidden md:block"></div>
              
              {/* Search */}
              <div className="relative group hidden md:block">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full pl-9 pr-8 py-1.5 text-xs w-32 focus:w-48 transition-all dark:text-zinc-200" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"><X className="w-3 h-3" /></button>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {/* Selection Controls */}
                <button onClick={handlers.onSelectAll} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap flex-shrink-0 transition-colors" title="Ctrl+A">
                    {selectionCount === visibleCount && visibleCount > 0 ? <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> : <Square className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{selectionCount > 0 ? `${t('selected')} (${selectionCount})` : t('selectAll')}</span>
                </button>
                
                {selectionCount > 0 && (
                  <>
                    <button onClick={handlers.onMove} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-md text-xs font-medium animate-in slide-in-from-right-2 whitespace-nowrap flex-shrink-0 transition-colors" title={t('move')}>
                        <FolderInput className="w-3.5 h-3.5" />
                        {/* CHANGED: Hidden on lg, visible on xl to prevent overlap */}
                        <span className="hidden xl:inline">{t('move')}</span>
                    </button>
                    <button onClick={handlers.onDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-md text-xs font-medium animate-in slide-in-from-right-2 whitespace-nowrap flex-shrink-0 transition-colors" title={t('deleteSelected')}>
                        <Trash2 className="w-3.5 h-3.5" />
                        {/* CHANGED: Hidden on lg, visible on xl */}
                        <span className="hidden xl:inline">{t('deleteSelected')}</span>
                    </button>
                  </>
                )}

                {/* Batch Actions */}
                <button onClick={handlers.onBatchEdit} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors" title={t('batchEdit')}>
                    <Filter className="w-3.5 h-3.5" />
                    {/* CHANGED: Hidden on lg, visible on xl */}
                    <span className="hidden xl:inline">{t('batchEdit')}</span>
                </button>

                {/* Utility Actions */}
                {stats.error > 0 && (
                    <button onClick={handlers.onRetryErrors} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors" title={t('retry')}><RotateCcw className="w-3.5 h-3.5" /> <span className="hidden xl:inline">{t('retry')}</span></button>
                )}
                
                {stats.success > 0 && (
                    <button onClick={handlers.onClearDone} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-red-500 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors" title={t('clearDone')}><Eraser className="w-3.5 h-3.5" /> <span className="hidden xl:inline">{t('clearDone')}</span></button>
                )}
            </div>
        </div>
    );
};