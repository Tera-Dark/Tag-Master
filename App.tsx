
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TagImage, AppSettings, DEFAULT_TEMPLATES, DEFAULT_PROMPT, PromptTemplate, Project } from './types';
import { generateCaption } from './services/geminiService';
import { exportAllProjectsToZip, exportProjectToZip, downloadSingleText } from './services/exportService';
import { 
  Upload, 
  Settings, 
  Download, 
  Wand2, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Play,
  Pause,
  Square,
  X,
  FileText,
  Folder,
  ChevronDown,
  ChevronRight,
  Archive,
  RotateCcw,
  Eraser,
  CheckSquare,
  ListFilter,
  LayoutGrid,
  Layers,
  ArrowLeft,
  ArrowRight,
  RefreshCw
} from './components/Icons';

// Local Storage Key
const STORAGE_KEY = 'lora-tag-master-settings-v3';

type ViewFilter = 'all' | 'pending' | 'completed';

// Helper for concurrent processing
const promiseLimit = <T,>(items: T[], limit: number, fn: (item: T) => Promise<void>, checkStop: () => boolean) => {
  let index = 0;
  const active: Promise<void>[] = [];
  
  const next = (): Promise<void> => {
    if (index >= items.length || checkStop()) return Promise.resolve();
    
    const item = items[index++];
    const p = fn(item).then(() => {
      active.splice(active.indexOf(p), 1);
    });
    active.push(p);
    
    // If we have space in the pool and more items, start another immediately
    const chain = active.length >= limit ? Promise.race(active) : Promise.resolve();
    return chain.then(() => next());
  };

  // Start initial batch
  const initialPromises: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
     initialPromises.push(next());
  }
  
  return Promise.all(initialPromises); 
};

const App: React.FC = () => {
  // -- State --
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all'); // 'all' or project ID
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  
  // Ref to control the batch loop
  const shouldStopRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectsRef = useRef(projects); // Ref to access latest projects in async callbacks

  // Sync ref
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Load settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          protocol: parsed.protocol || parsed.provider || 'google',
          providerName: parsed.providerName || 'Official Gemini',
          apiKey: parsed.apiKey || '',
          baseUrl: parsed.baseUrl || '',
          model: parsed.model || 'gemini-2.5-flash',
          activePrompt: parsed.activePrompt || parsed.promptTemplate || DEFAULT_PROMPT,
          concurrency: parsed.concurrency || 3,
          customTemplates: parsed.customTemplates || []
        };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return {
      protocol: 'google',
      providerName: 'Official Gemini',
      apiKey: '',
      baseUrl: 'https://api.openai.com',
      model: 'gemini-2.5-flash',
      activePrompt: DEFAULT_PROMPT,
      concurrency: 3,
      customTemplates: []
    };
  });

  const [newTemplateName, setNewTemplateName] = useState('');
  const [showTemplateSave, setShowTemplateSave] = useState(false);

  // -- Helpers --
  
  const findImageById = (id: string | null): { image: TagImage, project: Project } | null => {
    if (!id) return null;
    for (const proj of projects) {
      const found = proj.images.find(img => img.id === id);
      if (found) return { image: found, project: proj };
    }
    return null;
  };

  const handleSwitchProject = (pid: string | 'all') => {
    setActiveProjectId(pid);
    // If the selected image is NOT in the new view, deselect it to avoid confusion
    if (selectedId && pid !== 'all') {
      const data = findImageById(selectedId);
      if (data && data.project.id !== pid) {
        setSelectedId(null);
      }
    }
  };

  const getVisibleImages = useCallback(() => {
    const visibleImgs: { image: TagImage, projectId: string }[] = [];
    const targetProjects = activeProjectId === 'all' 
      ? projects 
      : projects.filter(p => p.id === activeProjectId);

    targetProjects.forEach(p => {
        if (p.isCollapsed && activeProjectId === 'all') return; 
        p.images.forEach(img => {
            let isVisible = true;
            if (viewFilter === 'pending') isVisible = img.status === 'idle' || img.status === 'error' || img.status === 'loading';
            if (viewFilter === 'completed') isVisible = img.status === 'success';
            
            if (isVisible) {
                visibleImgs.push({ image: img, projectId: p.id });
            }
        });
    });
    return visibleImgs;
  }, [projects, viewFilter, activeProjectId]);

  const selectedData = findImageById(selectedId);
  const selectedImage = selectedData?.image;
  const allTemplates = [...DEFAULT_TEMPLATES, ...settings.customTemplates];
  
  // Global Stats
  const totalImages = projects.reduce((acc, p) => acc + p.images.length, 0);
  const completedImages = projects.reduce((acc, p) => acc + p.images.filter(i => i.status === 'success').length, 0);
  const progressPercentage = totalImages === 0 ? 0 : Math.round((completedImages / totalImages) * 100);

  // Context Stats (Based on Active View)
  const contextProjects = activeProjectId === 'all' ? projects : projects.filter(p => p.id === activeProjectId);
  const contextTotal = contextProjects.reduce((acc, p) => acc + p.images.length, 0);
  const contextCompleted = contextProjects.reduce((acc, p) => acc + p.images.filter(i => i.status === 'success').length, 0);
  const contextPending = contextTotal - contextCompleted;

  // Save settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Delete' && selectedId) {
        handleRemoveImage(selectedId);
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setIsSettingsOpen(false);
      }
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          if (!selectedId) return;
          e.preventDefault();
          
          const visible = getVisibleImages();
          const currentIndex = visible.findIndex(v => v.image.id === selectedId);
          if (currentIndex === -1) return;

          let nextIndex = currentIndex;
          if (e.key === 'ArrowRight') nextIndex = Math.min(visible.length - 1, currentIndex + 1);
          if (e.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);

          if (nextIndex !== currentIndex) {
              const nextItem = visible[nextIndex];
              setSelectedId(nextItem.image.id);
              document.getElementById(`card-${nextItem.image.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, projects, viewFilter, getVisibleImages]);

  // -- File Handling --

  const processFileEntry = async (entry: FileSystemEntry, path: string, fileMap: Map<string, File[]>) => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      return new Promise<void>((resolve) => {
        fileEntry.file((file) => {
          if (file.type.startsWith('image/')) {
            const dirName = path || 'General';
            const currentList = fileMap.get(dirName) || [];
            currentList.push(file);
            fileMap.set(dirName, currentList);
          }
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve) => {
        dirReader.readEntries((results) => resolve(results));
      });
      const subPath = path ? `${path}/${entry.name}` : entry.name; 
      const promises = entries.map(e => processFileEntry(e, subPath, fileMap));
      await Promise.all(promises);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const fileMap = new Map<string, File[]>();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
           // Logic: If specific project active, flat import. If dashboard, recursive structure.
           // If file dropped on dashboard, put in 'General' or similar.
           if (activeProjectId !== 'all') {
             // force empty path to merge into active
             promises.push(processFileEntry(entry, '', fileMap));
           } else {
             promises.push(processFileEntry(entry, '', fileMap));
           }
        }
      }
    }

    await Promise.all(promises);

    setProjects(prev => {
       const next = [...prev];
       
       fileMap.forEach((files, dirName) => {
          if (files.length === 0) return;
          
          // Check if we should merge into active project
          if (activeProjectId !== 'all') {
             const targetIndex = next.findIndex(p => p.id === activeProjectId);
             if (targetIndex > -1) {
                 const newImages = files.map(file => ({
                    id: crypto.randomUUID(),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    caption: "",
                    status: 'idle' as const
                 }));
                 next[targetIndex] = {
                     ...next[targetIndex],
                     images: [...next[targetIndex].images, ...newImages]
                 };
                 return; 
             }
          }

          // Check if project with same name exists in 'all' view to merge folders dropped separately
          const existingIndex = next.findIndex(p => p.name === dirName);
          if (existingIndex > -1 && activeProjectId === 'all') {
              const newImages = files.map(file => ({
                  id: crypto.randomUUID(),
                  file,
                  previewUrl: URL.createObjectURL(file),
                  caption: "",
                  status: 'idle' as const
               }));
               next[existingIndex] = {
                   ...next[existingIndex],
                   images: [...next[existingIndex].images, ...newImages]
               };
               return;
          }

          // Standard create new project
          const finalName = dirName || `Upload ${new Date().toLocaleTimeString()}`;
          const newImages = files.map(file => ({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            caption: "",
            status: 'idle' as const
          }));

          next.push({
            id: crypto.randomUUID(),
            name: finalName,
            images: newImages,
            status: 'idle',
            isCollapsed: false
          });
       });
       return next;
    });

  }, [activeProjectId]);

  const handleStandardUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newImages: TagImage[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        status: 'idle'
      }));
      
    if (newImages.length === 0) return;

    if (activeProjectId !== 'all') {
        // Add to active project
        setProjects(prev => prev.map(p => 
            p.id === activeProjectId 
            ? { ...p, images: [...p.images, ...newImages] }
            : p
        ));
    } else {
        // Create new project
        const timestamp = new Date().toLocaleTimeString();
        const newProject: Project = {
            id: crypto.randomUUID(),
            name: `Import ${timestamp}`,
            images: newImages,
            status: 'idle',
            isCollapsed: false
        };
        setProjects(prev => [...prev, newProject]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // -- Actions --

  const handleRemoveImage = (id: string) => {
    setProjects(prev => {
        return prev.map(proj => ({
            ...proj,
            images: proj.images.filter(img => img.id !== id)
        })).filter(proj => proj.images.length > 0);
    });
    if (selectedId === id) setSelectedId(null);
  };

  const handleRemoveProject = (projId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Delete this entire project group?")) {
        setProjects(prev => prev.filter(p => p.id !== projId));
        if (activeProjectId === projId) setActiveProjectId('all');
        if (selectedImage && selectedData?.project.id === projId) {
            setSelectedId(null);
        }
    }
  };

  const handleClearAll = () => {
      if (window.confirm('Are you sure you want to clear all projects and images?')) {
          setProjects([]);
          setSelectedId(null);
          shouldStopRef.current = true;
          setIsProcessing(false);
          setIsPaused(false);
          setActiveProjectId('all');
      }
  };

  // Smart Batch Actions
  const handleRetryFailed = () => {
    setProjects(prev => prev.map(p => {
        if (activeProjectId !== 'all' && p.id !== activeProjectId) return p;
        return {
            ...p,
            images: p.images.map(img => 
                img.status === 'error' ? { ...img, status: 'idle', errorMsg: undefined } : img
            )
        };
    }));
  };

  const handleClearCompleted = () => {
      if (!window.confirm("Remove all successfully completed images from the current view?")) return;
      
      setProjects(prev => prev.map(p => {
          if (activeProjectId !== 'all' && p.id !== activeProjectId) return p;
          
          return {
            ...p,
            images: p.images.filter(img => img.status !== 'success')
          }
      }).filter(p => p.images.length > 0));
      
      if (selectedImage && selectedImage.status === 'success') {
          setSelectedId(null);
      }
  };

  const handleResetVisible = () => {
      if (!window.confirm("Reset captions and status for visible images?")) return;
      
      const visible = getVisibleImages();
      const visibleIds = new Set(visible.map(v => v.image.id));

      setProjects(prev => prev.map(p => ({
          ...p,
          images: p.images.map(img => 
            visibleIds.has(img.id) ? { ...img, status: 'idle', caption: '', errorMsg: undefined } : img
          )
      })));
  };

  const toggleProjectCollapse = (projId: string) => {
      setProjects(prev => prev.map(p => p.id === projId ? { ...p, isCollapsed: !p.isCollapsed } : p));
  };

  // -- Generation Logic (Concurrent) --

  const updateImageStatus = useCallback((projId: string, imgId: string, status: TagImage['status'], result?: string, error?: string) => {
    setProjects(prev => prev.map(proj => {
        if (proj.id !== projId) return proj;
        return {
            ...proj,
            images: proj.images.map(img => {
                if (img.id !== imgId) return img;
                return {
                    ...img,
                    status,
                    caption: result !== undefined ? result : img.caption,
                    errorMsg: error
                };
            })
        };
    }));
  }, []);

  const handleTagSingle = async (projId: string, imgId: string) => {
    // Access the MOST RECENT projects state via ref to get the file object
    const currentProject = projectsRef.current.find(p => p.id === projId);
    const img = currentProject?.images.find(i => i.id === imgId);
    
    if (!currentProject || !img) return;

    updateImageStatus(projId, imgId, 'loading');

    try {
      const caption = await generateCaption(img.file, settings);
      updateImageStatus(projId, imgId, 'success', caption);
    } catch (error: any) {
      updateImageStatus(projId, imgId, 'error', undefined, error.message);
      throw error; // Re-throw for promise handling
    }
  };

  const handleBatchTag = async () => {
    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    shouldStopRef.current = false;
    setIsProcessing(true);
    setIsPaused(false);

    // 1. Flatten all tasks needed based on current view
    const tasks: { projId: string; imgId: string }[] = [];
    
    const targetProjectIds = activeProjectId === 'all' 
        ? projects.map(p => p.id) 
        : [activeProjectId];
    
    targetProjectIds.forEach(pid => {
        const proj = projects.find(p => p.id === pid);
        if (proj) {
            proj.images.forEach(img => {
                if (img.status === 'idle' || img.status === 'error') {
                    tasks.push({ projId: pid, imgId: img.id });
                }
            });
        }
    });

    if (tasks.length === 0) {
        setIsProcessing(false);
        return;
    }

    // 2. Run Concurrent Pool
    try {
        const concurrency = Math.max(1, Math.min(10, settings.concurrency || 3));
        
        // Define the task processor
        const processTask = async (task: { projId: string, imgId: string }) => {
            if (shouldStopRef.current) return;
            try {
                await handleTagSingle(task.projId, task.imgId);
            } catch (e) {
                // Error already updated in state, just continue
            }
        };

        // Custom Promise Pool
        const activePromises: Promise<void>[] = [];
        let currentIndex = 0;

        while (currentIndex < tasks.length && !shouldStopRef.current) {
             // Fill pool
             while (activePromises.length < concurrency && currentIndex < tasks.length && !shouldStopRef.current) {
                 const task = tasks[currentIndex++];
                 const p = processTask(task).then(() => {
                     activePromises.splice(activePromises.indexOf(p), 1);
                 });
                 activePromises.push(p);
             }

             // Wait for at least one to finish before adding more
             if (activePromises.length > 0) {
                 await Promise.race(activePromises);
             }
        }

        // Wait for remaining
        await Promise.all(activePromises);

    } catch (e) {
        console.error("Batch process error", e);
    } finally {
        setIsProcessing(false);
        setIsPaused(false);
    }
  };

  const handleStop = () => {
      shouldStopRef.current = true;
      // State update will happen in the loop exit or finally block
      setIsPaused(true); // Visual feedback immediately
  };

  // -- Export --

  const handleExportAll = () => {
      if (totalImages === 0) return;
      exportAllProjectsToZip(projects);
  };

  const handleExportProject = (p: Project, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      exportProjectToZip(p);
  };

  // -- Template Handlers --
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTemplate: PromptTemplate = {
        id: crypto.randomUUID(),
        label: newTemplateName,
        value: settings.activePrompt
    };
    setSettings(s => ({ ...s, customTemplates: [...s.customTemplates, newTemplate] }));
    setNewTemplateName('');
    setShowTemplateSave(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSettings(s => ({ ...s, customTemplates: s.customTemplates.filter(t => t.id !== id) }));
  };

  // -- Drag Handlers (Global) --
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);


  // -- Components --

  const Sidebar = () => (
    <div className="w-64 lg:w-72 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full z-20 select-none transition-all">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <Wand2 className="w-5 h-5 text-indigo-500" />
          LoRA Tag Master
        </h1>
        <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 rounded border border-zinc-800 truncate max-w-[180px]">
                {settings.providerName}
            </span>
            <span className="text-[10px] text-zinc-600">•</span>
            <span className="text-[10px] text-zinc-500">{settings.model}</span>
        </div>
      </div>

      <div className="p-3 flex flex-col h-full overflow-hidden relative">
        {/* Main Actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white py-3 px-2 rounded-lg transition-all border border-zinc-800 hover:border-zinc-700 text-xs font-medium group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Upload className="w-4 h-4 text-zinc-500 group-hover:text-indigo-500 transition-colors" />
            Import
          </button>
          <button 
            onClick={handleExportAll}
            disabled={totalImages === 0}
            className="flex flex-col items-center justify-center gap-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white py-3 px-2 rounded-lg transition-all border border-zinc-800 hover:border-zinc-700 disabled:opacity-50 text-xs font-medium group relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Archive className="w-4 h-4 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
            Export All
          </button>
        </div>
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={(e) => handleStandardUpload(e.target.files)} 
        />

        {/* Project Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-0.5 mb-4">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2 px-2">Spaces</div>
            
            <button 
                onClick={() => handleSwitchProject('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border group ${
                    activeProjectId === 'all' 
                    ? 'bg-indigo-950/30 text-indigo-200 border-indigo-500/30 shadow-sm' 
                    : 'bg-transparent text-zinc-400 hover:bg-zinc-900 border-transparent'
                }`}
            >
                <div className="flex items-center gap-2.5">
                    <LayoutGrid className={`w-4 h-4 ${activeProjectId === 'all' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                    Dashboard (All)
                </div>
                <span className="bg-zinc-950/50 px-1.5 rounded text-[10px] opacity-70 text-zinc-500">{totalImages}</span>
            </button>

            <div className="h-px bg-zinc-900/80 my-2 mx-2" />

            {projects.length === 0 && (
                <div className="text-center py-8 text-zinc-700 text-[10px] italic">No projects yet</div>
            )}

            {projects.map(p => {
                const pDone = p.images.filter(i => i.status === 'success').length;
                const pTotal = p.images.length;
                const isComplete = pDone === pTotal && pTotal > 0;
                const isActive = activeProjectId === p.id;
                const isWorking = p.images.some(i => i.status === 'loading');

                return (
                    <div 
                        key={p.id}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer relative overflow-hidden ${
                            isActive
                            ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm' 
                            : 'bg-transparent text-zinc-400 hover:bg-zinc-900/50 border-transparent'
                        }`}
                        onClick={() => handleSwitchProject(p.id)}
                    >
                        {isWorking && (
                            <div className="absolute bottom-0 left-0 h-[2px] bg-indigo-500/50 animate-pulse w-full" />
                        )}
                        <div className="flex items-center gap-2.5 truncate flex-1">
                            {isComplete ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-300' : 'text-zinc-600'} flex-shrink-0 transition-colors`} />}
                            <span className="truncate">{p.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono opacity-60 group-hover:opacity-100 transition-opacity ${isComplete ? 'text-emerald-500' : ''}`}>{pDone}/{pTotal}</span>
                            {isActive && (
                                <button 
                                    onClick={(e) => handleRemoveProject(p.id, e)}
                                    className="hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>

        {/* Process Controls */}
        <div className="mt-auto space-y-3 border-t border-zinc-900 pt-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
            {!isProcessing && !isPaused ? (
                <button 
                    onClick={() => handleBatchTag()}
                    disabled={contextTotal === 0 || contextPending === 0}
                    className="group w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black py-3 px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm relative overflow-hidden"
                >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    <Play className="w-4 h-4 fill-current" />
                    {contextPending === 0 && contextTotal > 0 ? 'Processing Complete' : `Start ${activeProjectId === 'all' ? 'All' : 'Project'}`}
                </button>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {isProcessing ? (
                        <button 
                            onClick={() => shouldStopRef.current = true} 
                            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black py-3 px-4 rounded-lg transition-all font-semibold text-sm"
                        >
                            <Pause className="w-4 h-4 fill-current" />
                            Pause
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleBatchTag()}
                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black py-3 px-4 rounded-lg transition-all font-semibold text-sm"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Resume
                        </button>
                    )}
                    
                    <button 
                        onClick={handleStop}
                        className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 px-4 rounded-lg transition-all font-semibold text-sm"
                    >
                        <Square className="w-4 h-4 fill-current" />
                        Stop
                    </button>
                </div>
            )}

            {/* Progress Bar */}
             <div className="space-y-1.5">
                <div className="flex justify-between items-end text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                        {isProcessing && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                        <span>{isProcessing ? 'Processing...' : 'Progress'}</span>
                    </div>
                    <span>{progressPercentage}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                    <div 
                        className={`h-full transition-all duration-500 ease-out relative ${isProcessing ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progressPercentage}%` }}
                    >
                        {isProcessing && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1s_infinite]" />
                        )}
                    </div>
                </div>
             </div>

             {/* Settings Trigger */}
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all text-xs font-medium border ${
                !settings.apiKey ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
            >
                <Settings className="w-3.5 h-3.5" />
                {settings.apiKey ? 'Settings' : 'Configure API Key'}
            </button>
        </div>
      </div>
    </div>
  );

  const SmartToolbar = () => {
      const errorCount = contextProjects.reduce((acc, p) => acc + p.images.filter(i => i.status === 'error').length, 0);
      const successCount = contextProjects.reduce((acc, p) => acc + p.images.filter(i => i.status === 'success').length, 0);

      if (contextTotal === 0) return null;

      return (
          <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-3 flex items-center justify-between shadow-sm transition-all">
              {/* View Filter */}
              <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800/50">
                  <button 
                    onClick={() => setViewFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'all' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                      <Layers className="w-3 h-3" />
                      All
                  </button>
                  <button 
                    onClick={() => setViewFilter('pending')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                      <ListFilter className="w-3 h-3" />
                      Pending
                      {contextPending > 0 && <span className="bg-black/20 px-1.5 py-0.5 rounded text-[9px] ml-1 font-mono">{contextPending}</span>}
                  </button>
                  <button 
                    onClick={() => setViewFilter('completed')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                      <CheckSquare className="w-3 h-3" />
                      Done
                      {successCount > 0 && <span className="bg-black/20 px-1.5 py-0.5 rounded text-[9px] ml-1 font-mono">{successCount}</span>}
                  </button>
              </div>

              {/* Context Info */}
              <div className="flex items-center gap-2">
                  {errorCount > 0 && (
                      <button 
                        onClick={handleRetryFailed}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 rounded-md text-xs font-medium transition-colors animate-in fade-in"
                      >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry ({errorCount})
                      </button>
                  )}
                  
                  <button 
                    onClick={handleResetVisible}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 rounded-md text-xs font-medium transition-colors"
                  >
                      <Eraser className="w-3.5 h-3.5" />
                      Reset
                  </button>

                  {successCount > 0 && (
                      <button 
                        onClick={handleClearCompleted}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-900/10 border border-zinc-800 hover:border-red-900/20 rounded-md text-xs font-medium transition-colors"
                      >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Clear Done
                      </button>
                  )}
              </div>
          </div>
      )
  }

  const ImageGrid = () => {
    const projectsToRender = activeProjectId === 'all' 
        ? projects 
        : projects.filter(p => p.id === activeProjectId);

    return (
        <div 
            className="flex-1 bg-black relative overflow-hidden flex flex-col"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
        {/* Drag Overlay */}
        {isDragOver && (
            <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-indigo-500 border-dashed m-4 rounded-2xl pointer-events-none">
                <div className="text-indigo-200 font-bold text-xl flex flex-col items-center gap-4">
                    <Folder className="w-16 h-16 animate-bounce" />
                    Drop folders or images here
                </div>
            </div>
        )}

        <SmartToolbar />

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-40 scroll-smooth">
            {projectsToRender.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-6 select-none animate-in fade-in duration-700">
                <div className="w-32 h-32 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
                    <Layers className="w-12 h-12 opacity-20" />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-xl font-medium text-zinc-300">Workspace Empty</p>
                    <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
                        Drag & drop folders to create projects automatically.<br/>
                        Optimized for large dataset workflows.
                    </p>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-6 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:bg-indigo-500/10 px-4 py-2 rounded-full transition-all"
                    >
                        <Upload className="w-4 h-4" />
                        Browse Files
                    </button>
                </div>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {projectsToRender.map(project => {
                        // Apply filtering
                        const visibleImages = project.images.filter(img => {
                            if (viewFilter === 'all') return true;
                            if (viewFilter === 'pending') return img.status === 'idle' || img.status === 'error' || img.status === 'loading';
                            if (viewFilter === 'completed') return img.status === 'success';
                            return true;
                        });

                        if (visibleImages.length === 0 && viewFilter !== 'all') return null;

                        return (
                        <div key={project.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Project Header */}
                            <div className="flex items-center justify-between mb-4 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all group sticky top-0">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer flex-1 select-none"
                                    onClick={() => activeProjectId === 'all' ? toggleProjectCollapse(project.id) : null}
                                >
                                    {activeProjectId === 'all' && (
                                        <button className="text-zinc-500 hover:text-white transition-colors">
                                            {project.isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-md ${activeProjectId === project.id ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800/50 text-zinc-500'}`}>
                                             <Folder className="w-4 h-4" />
                                        </div>
                                        <h2 className="font-bold text-zinc-200 text-sm tracking-tight">{project.name}</h2>
                                        <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                                            {visibleImages.length} items
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => handleExportProject(project, e)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 rounded-lg border border-zinc-800 hover:border-emerald-500/30 transition-all text-xs font-medium"
                                        title="Download this project only"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Export
                                    </button>
                                    <button 
                                        onClick={(e) => handleRemoveProject(project.id, e)}
                                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        title="Delete project"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Grid */}
                            {(!project.isCollapsed || activeProjectId !== 'all') && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                                    {visibleImages.map(img => (
                                        <div 
                                        id={`card-${img.id}`}
                                        key={img.id}
                                        onClick={() => setSelectedId(img.id)}
                                        className={`relative group aspect-square rounded-xl border cursor-pointer overflow-hidden transition-all duration-200 ${
                                            selectedId === img.id 
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] z-10 scale-[1.02]' 
                                            : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900'
                                        }`}
                                        >
                                        <img src={img.previewUrl} alt="thumb" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        
                                        {/* Status Indicator */}
                                        <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                                            {img.status === 'success' && <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in"><CheckCircle className="w-3.5 h-3.5" /></div>}
                                            {img.status === 'loading' && <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg"><Loader2 className="w-3.5 h-3.5 animate-spin" /></div>}
                                            {img.status === 'error' && <div className="bg-red-500 text-white p-1 rounded-full shadow-lg animate-pulse"><AlertCircle className="w-3.5 h-3.5" /></div>}
                                        </div>

                                        {/* Text Overlay */}
                                        {img.caption && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <p className="text-[10px] text-zinc-300 line-clamp-3 font-mono leading-tight">{img.caption}</p>
                                            </div>
                                        )}
                                        
                                        {/* Quick Delete */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id); }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-20 scale-90 group-hover:scale-100"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            )}
        </div>
        </div>
    );
  };

  const EditorPanel = () => {
    if (!selectedId || !selectedImage || !selectedData) return null;

    return (
      <div className="w-96 flex-shrink-0 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full shadow-2xl z-20 animate-in slide-in-from-right-10 duration-300">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <div className="flex flex-col overflow-hidden">
            <h3 className="font-bold text-zinc-200 text-sm">Inspector</h3>
            <span className="text-[10px] text-zinc-500 truncate max-w-[200px] flex items-center gap-1.5">
                <Folder className="w-3 h-3" />
                {selectedData.project.name}
            </span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button 
               onClick={() => downloadSingleText(selectedImage)}
               disabled={!selectedImage.caption}
               title="Download .txt"
               className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors disabled:opacity-30"
            >
               <FileText className="w-4 h-4" />
            </button>
            <button 
               onClick={() => handleTagSingle(selectedData.project.id, selectedImage.id)}
               disabled={selectedImage.status === 'loading'}
               className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center gap-1.5 shadow-sm"
            >
               <RefreshCw className={`w-3.5 h-3.5 ${selectedImage.status === 'loading' ? 'animate-spin' : ''}`} />
               {selectedImage.status === 'loading' ? 'Wait' : 'Regen'}
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 custom-scrollbar">
          <div className="aspect-video bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center relative pattern-grid group">
            <img 
              src={selectedImage.previewUrl} 
              alt="preview" 
              className="max-w-full max-h-full object-contain shadow-lg" 
            />
             <a href={selectedImage.previewUrl} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium border border-white/10 hover:bg-black/80">
                 Open Full Size
             </a>
          </div>

          <div className="flex flex-col gap-3 flex-1 h-full">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Caption Content</label>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${selectedImage.caption.length > 0 ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' : 'text-zinc-600 bg-zinc-900 border-zinc-800'}`}>
                {selectedImage.caption.length} chars
              </span>
            </div>
            
            <div className="relative flex-1 flex flex-col">
                <textarea 
                value={selectedImage.caption}
                onChange={(e) => updateImageStatus(selectedData.project.id, selectedImage.id, selectedImage.status, e.target.value)}
                placeholder={selectedImage.status === 'loading' ? "AI is analyzing image details..." : "Waiting for generation..."}
                className={`flex-1 w-full bg-zinc-900/50 border rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed font-mono custom-scrollbar placeholder:text-zinc-700 transition-all ${selectedImage.status === 'loading' ? 'border-indigo-500/50 animate-pulse' : 'border-zinc-800 focus:border-indigo-500'}`}
                disabled={selectedImage.status === 'loading'}
                />
            </div>

            {selectedImage.status === 'error' && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex gap-3 items-start animate-in slide-in-from-bottom-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                    <p className="font-bold mb-0.5">Generation Failed</p>
                    <p className="opacity-80 leading-tight">{selectedImage.errorMsg}</p>
                </div>
              </div>
            )}

            {/* Navigation Hints */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-600 pt-2 border-t border-zinc-800/50">
                <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">←</kbd> Prev</span>
                <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">→</kbd> Next</span>
                <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Del</kbd> Remove</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SettingsModal = () => {
    if (!isSettingsOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                    <Settings className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-white">Settings</h2>
                    <p className="text-xs text-zinc-500">Performance & API Configuration</p>
                </div>
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Service Provider Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Wand2 className="w-3 h-3" />
                    AI Provider
                 </h3>
                 <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    <button 
                        onClick={() => setSettings(s => ({ ...s, protocol: 'google', providerName: 'Official Gemini', baseUrl: '', model: 'gemini-2.5-flash' }))}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${settings.protocol === 'google' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                        Google GenAI
                    </button>
                    <button 
                        onClick={() => setSettings(s => ({ ...s, protocol: 'openai_compatible', providerName: 'Custom OpenAI', baseUrl: 'https://api.openai.com', model: 'gpt-4o' }))}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${settings.protocol === 'openai_compatible' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                        OpenAI Compatible
                    </button>
                 </div>
              </div>

              <div className="grid gap-4 p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl">
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Provider Name</label>
                        <input 
                            type="text"
                            value={settings.providerName}
                            onChange={(e) => setSettings(s => ({ ...s, providerName: e.target.value }))}
                            placeholder="e.g. Cherry, DeepSeek..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-zinc-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model Name</label>
                        {settings.protocol === 'google' ? (
                            <input 
                            type="text"
                            list="google-models"
                            value={settings.model}
                            onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                            />
                        ) : (
                            <input 
                                type="text"
                                value={settings.model}
                                onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                                placeholder="e.g. gpt-4o, claude-3-opus"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-zinc-700"
                            />
                        )}
                        {settings.protocol === 'google' && (
                            <datalist id="google-models">
                                <option value="gemini-2.5-flash" />
                                <option value="gemini-2.5-flash-lite-latest" />
                                <option value="gemini-3-pro-preview" />
                            </datalist>
                        )}
                    </div>
                </div>

                {settings.protocol === 'openai_compatible' && (
                    <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Base URL</label>
                    <input 
                        type="text"
                        value={settings.baseUrl}
                        onChange={(e) => setSettings(s => ({ ...s, baseUrl: e.target.value }))}
                        placeholder="https://api.provider.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-zinc-700 font-mono"
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">
                       Enter the root domain (e.g. <code>https://api.example.com</code>). The system will automatically append <code>/v1/chat/completions</code>.
                    </p>
                    </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    API Key
                  </label>
                  <input 
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings(s => ({ ...s, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-zinc-700 font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Performance Section */}
            <section className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Loader2 className="w-3 h-3" />
                    Performance
                </h3>
                <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between gap-6">
                     <div className="flex-1">
                         <label className="block text-sm font-medium text-zinc-200 mb-1">Concurrency Limit</label>
                         <p className="text-xs text-zinc-500">
                             Number of images to process simultaneously. Higher is faster but may hit API rate limits.
                         </p>
                     </div>
                     <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                         <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={settings.concurrency || 3}
                            onChange={(e) => setSettings(s => ({ ...s, concurrency: parseInt(e.target.value) }))}
                            className="accent-indigo-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer w-32"
                         />
                         <span className="text-sm font-mono font-bold text-indigo-400 w-6 text-center">{settings.concurrency || 3}</span>
                     </div>
                </div>
            </section>

            {/* Prompt Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Prompt Preset
                 </h3>
                 <button 
                    onClick={() => setShowTemplateSave(true)}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300 transition-colors"
                 >
                    Save current as...
                 </button>
              </div>

              {showTemplateSave && (
                  <div className="flex gap-2 items-center mb-2 animate-in fade-in slide-in-from-top-2">
                      <input 
                        type="text" 
                        placeholder="New template name..."
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      />
                      <button onClick={handleSaveTemplate} className="text-xs bg-indigo-600 px-2 py-1 rounded text-white">Save</button>
                      <button onClick={() => setShowTemplateSave(false)} className="text-xs px-2 py-1 text-zinc-400">Cancel</button>
                  </div>
              )}
              
              <div className="grid gap-3">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {allTemplates.map((t) => (
                    <div 
                        key={t.id}
                        onClick={() => setSettings(s => ({...s, activePrompt: t.value}))}
                        className={`group relative whitespace-nowrap flex-shrink-0 text-xs px-3 py-2 rounded-md border cursor-pointer transition-all ${
                            settings.activePrompt === t.value 
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                    >
                      {t.label}
                      {!t.id.startsWith('default') && (
                          <button 
                            onClick={(e) => handleDeleteTemplate(t.id, e)}
                            className="ml-2 hover:text-red-400"
                          >
                              &times;
                          </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="relative">
                    <textarea 
                        value={settings.activePrompt}
                        onChange={(e) => setSettings(s => ({ ...s, activePrompt: e.target.value }))}
                        className="w-full h-40 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none custom-scrollbar leading-relaxed font-mono"
                        placeholder="Enter your custom system instructions or prompt here..."
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        Current Prompt
                    </div>
                </div>
              </div>
            </section>
            
          </div>

          <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Close
            </button>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-black text-zinc-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      <Sidebar />
      <ImageGrid />
      <EditorPanel />
      <SettingsModal />
    </div>
  );
};

export default App;
