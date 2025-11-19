
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { TagImage, AppSettings, DEFAULT_TEMPLATES, DEFAULT_PROMPT, PromptTemplate, Project } from './types';
import { generateCaption } from './services/geminiService';
import { exportAllProjectsToZip, exportProjectToZip, downloadSingleText } from './services/exportService';
import { saveProjectsToDB, loadProjectsFromDB, clearDB } from './services/storageService';
import { translations, Language } from './utils/i18n';
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
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  Filter, 
  Search, 
  CheckCircle as SaveIcon, 
  Layers, 
  Sun, 
  Moon, 
  Tags,
  ImageIcon,
  BookOpen,
  HelpCircle,
  MousePointer2,
  Keyboard,
  List,
  Grid3X3,
  FolderInput,
  Merge,
  Plus
} from './components/Icons';

// Local Storage Key for Settings
const STORAGE_KEY = 'lora-tag-master-settings-v8';
const TUTORIAL_SEEN_KEY = 'lora-tag-master-tutorial-seen-v1';

type ViewFilter = 'all' | 'pending' | 'completed';

// -- Helper Functions for File System Scanning --

const readAllDirectoryEntries = async (directoryReader: any): Promise<any[]> => {
  const entries: any[] = [];
  let readEntries = await new Promise<any[]>((resolve, reject) => {
    directoryReader.readEntries(resolve, reject);
  });

  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await new Promise<any[]>((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });
  }
  return entries;
};

const scanEntry = async (entry: any): Promise<File[]> => {
  if (!entry) return [];
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file: File) => resolve([file]), () => resolve([]));
    });
  } else if (entry.isDirectory) {
    const directoryReader = entry.createReader();
    const entries = await readAllDirectoryEntries(directoryReader);
    const files = await Promise.all(entries.map((e) => scanEntry(e)));
    return files.reduce((acc, curr) => acc.concat(curr), [] as File[]);
  }
  return [];
};

const isImageFile = (file: File) => {
    return file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff|avif|heic)$/i.test(file.name);
};

// -- Sub-components --

// Memoized Image Card for Grid View
const ImageCard = React.memo(({ 
    img, 
    isSelected, 
    isMultiSelected,
    onPointerDown,
    onPointerEnter,
    onRemove 
}: { 
    img: TagImage, 
    isSelected: boolean, 
    isMultiSelected: boolean,
    onPointerDown: (e: React.PointerEvent) => void,
    onPointerEnter: (e: React.PointerEvent) => void,
    onRemove: (e: React.MouseEvent) => void 
}) => {
    return (
        <div 
            id={`card-${img.id}`}
            onPointerDown={onPointerDown}
            onPointerEnter={onPointerEnter}
            className={`relative group aspect-square rounded-xl border cursor-pointer overflow-hidden transition-all duration-200 select-none ${
                isSelected 
                ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20 z-10 scale-[1.02]' 
                : isMultiSelected
                    ? 'border-indigo-400/50 bg-indigo-50/10 ring-1 ring-indigo-400/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
            }`}
        >
            {/* Image */}
            {img.previewUrl ? (
                <img src={img.previewUrl} alt="thumb" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                    <ImageIcon className="w-8 h-8" />
                </div>
            )}
            
            {/* Selection Checkbox */}
            <div 
                className={`absolute top-2 left-2 z-30 p-1 rounded-md transition-all cursor-pointer pointer-events-none ${isMultiSelected ? 'bg-indigo-600 text-white opacity-100' : 'bg-black/20 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/40'}`}
            >
                {isMultiSelected ? <CheckSquare className="w-4 h-4 fill-current" /> : <Square className="w-4 h-4" />}
            </div>

            {/* Status Indicator */}
            <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 pointer-events-none">
                {img.status === 'success' && <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in"><CheckCircle className="w-3.5 h-3.5" /></div>}
                {img.status === 'loading' && <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg"><Loader2 className="w-3.5 h-3.5 animate-spin" /></div>}
                {img.status === 'error' && <div className="bg-red-500 text-white p-1 rounded-full shadow-lg animate-pulse"><AlertCircle className="w-3.5 h-3.5" /></div>}
            </div>

            {/* Caption Overlay */}
            {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 via-white/90 dark:from-black dark:via-black/90 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <p className="text-[10px] text-zinc-700 dark:text-zinc-300 line-clamp-3 font-mono leading-tight">{img.caption}</p>
                </div>
            )}
            
            {/* Remove Button */}
            <button 
                onPointerDown={(e) => e.stopPropagation()} // Prevent selection trigger
                onClick={onRemove}
                className="absolute bottom-2 right-2 p-1.5 bg-white/80 dark:bg-black/60 hover:bg-red-500 dark:hover:bg-red-500 text-zinc-600 dark:text-white hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-20 scale-90 group-hover:scale-100 shadow-sm"
            >
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
    );
});

// Memoized List Item for List View
const ListItem = React.memo(({ 
    img, 
    isSelected, 
    isMultiSelected,
    onPointerDown,
    onPointerEnter,
    onRemove 
}: { 
    img: TagImage, 
    isSelected: boolean, 
    isMultiSelected: boolean,
    onPointerDown: (e: React.PointerEvent) => void,
    onPointerEnter: (e: React.PointerEvent) => void,
    onRemove: (e: React.MouseEvent) => void 
}) => {
    return (
        <div 
            id={`card-${img.id}`}
            onPointerDown={onPointerDown}
            onPointerEnter={onPointerEnter}
            className={`group flex items-center gap-4 p-3 rounded-lg border cursor-pointer select-none transition-all h-24 ${
                isSelected 
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-500/30 z-10' 
                : isMultiSelected
                    ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-900/10'
                    : 'border-transparent bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
        >
            {/* Checkbox */}
            <div className="flex-shrink-0 pl-1 pointer-events-none">
                {isMultiSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />}
            </div>

            {/* Thumbnail */}
            <div className="h-16 w-16 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 pointer-events-none">
                {img.previewUrl ? (
                     <img src={img.previewUrl} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                     <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-zinc-400" /></div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate text-zinc-800 dark:text-zinc-200 max-w-[300px]">{img.file.name}</span>
                    {/* Status Badge */}
                    {img.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {img.status === 'loading' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                    {img.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8 w-full">
                    {img.caption || <span className="italic opacity-30">No caption...</span>}
                </div>
                {img.errorMsg && <span className="text-[10px] text-red-500 truncate">{img.errorMsg}</span>}
            </div>

            {/* Actions */}
            <button 
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={onRemove}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
});

// Virtual List Component (For List View)
const VirtualList = ({ 
    items, 
    selectedId, 
    multiSelection, 
    onCardPointerDown,
    onCardPointerEnter,
    onRemove
}: {
    items: { image: TagImage, projectId: string }[],
    selectedId: string | null,
    multiSelection: Set<string>,
    onCardPointerDown: (id: string, e: React.PointerEvent) => void,
    onCardPointerEnter: (id: string, e: React.PointerEvent) => void,
    onRemove: (id: string, e: React.MouseEvent) => void
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(800);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onScroll = () => requestAnimationFrame(() => setScrollTop(el.scrollTop));
        const onResize = () => setContainerHeight(el.clientHeight);

        el.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onResize);
        
        setContainerHeight(el.clientHeight);

        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    const rowHeight = 104; // 96px (h-24) + 8px gap
    const totalHeight = items.length * rowHeight;

    const buffer = 4;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endRow = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);

    const visibleItems = useMemo(() => {
        return items.slice(startRow, endRow).map((item, index) => ({
            ...item,
            absoluteIndex: startRow + index
        }));
    }, [items, startRow, endRow]);

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar relative outline-none" tabIndex={-1}>
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div 
                    className="flex flex-col gap-2"
                    style={{ 
                        position: 'absolute', 
                        top: startRow * rowHeight, 
                        left: 0, 
                        right: 0,
                    }}
                >
                    {visibleItems.map(({ image }) => (
                        <ListItem 
                            key={image.id}
                            img={image}
                            isSelected={selectedId === image.id}
                            isMultiSelected={multiSelection.has(image.id)}
                            onPointerDown={(e) => onCardPointerDown(image.id, e)}
                            onPointerEnter={(e) => onCardPointerEnter(image.id, e)}
                            onRemove={(e) => onRemove(image.id, e)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// Virtual Grid Component
const VirtualGrid = ({ 
    items, 
    selectedId, 
    multiSelection, 
    onCardPointerDown,
    onCardPointerEnter,
    onRemove,
    columnCount 
}: {
    items: { image: TagImage, projectId: string }[],
    selectedId: string | null,
    multiSelection: Set<string>,
    onCardPointerDown: (id: string, e: React.PointerEvent) => void,
    onCardPointerEnter: (id: string, e: React.PointerEvent) => void,
    onRemove: (id: string, e: React.MouseEvent) => void,
    columnCount: number
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(800);
    const [clientWidth, setClientWidth] = useState(1000);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onScroll = () => requestAnimationFrame(() => setScrollTop(el.scrollTop));
        const onResize = () => {
            setContainerHeight(el.clientHeight);
            setClientWidth(el.clientWidth);
        };

        el.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onResize);
        
        // Initial measurement
        setContainerHeight(el.clientHeight);
        setClientWidth(el.clientWidth);

        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // Calculate accurate row height based on column count and spacing
    const gap = 16;
    const itemWidth = (clientWidth - (gap * (columnCount - 1))) / columnCount;
    const rowHeight = itemWidth + gap; 

    const totalRows = Math.ceil(items.length / columnCount);
    const totalHeight = Math.max(0, totalRows * rowHeight);

    // Buffer rows to render
    const buffer = 4;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);

    const visibleItems = useMemo(() => {
        const startIndex = startRow * columnCount;
        const endIndex = endRow * columnCount;
        return items.slice(startIndex, endIndex).map((item, index) => ({
            ...item,
            absoluteIndex: startIndex + index
        }));
    }, [items, startRow, endRow, columnCount]);

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar relative outline-none" tabIndex={-1}>
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div 
                    className="grid gap-4"
                    style={{ 
                        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                        position: 'absolute', 
                        top: startRow * rowHeight, 
                        left: 0, 
                        right: 0,
                    }}
                >
                    {visibleItems.map(({ image }) => (
                        <ImageCard 
                            key={image.id}
                            img={image}
                            isSelected={selectedId === image.id}
                            isMultiSelected={multiSelection.has(image.id)}
                            onPointerDown={(e) => onCardPointerDown(image.id, e)}
                            onPointerEnter={(e) => onCardPointerEnter(image.id, e)}
                            onRemove={(e) => onRemove(image.id, e)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // -- State --
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); 
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [multiSelection, setMultiSelection] = useState<Set<string>>(new Set());
  const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  
  // Move & Merge State
  const [moveState, setMoveState] = useState<{
     isOpen: boolean;
     mode: 'selection' | 'project';
     sourceProjectId?: string;
  }>({ isOpen: false, mode: 'selection' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  const shouldStopRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectsRef = useRef(projects); 
  const saveTimeoutRef = useRef<number>();
  const lastSelectedIdRef = useRef<string | null>(null); 
  const dragCounter = useRef(0); 
  
  // Selection Drag State
  const isSelectionDraggingRef = useRef(false);
  const selectionModeRef = useRef<'select' | 'deselect'>('select');

  // -- Load Settings --
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      language: 'en',
      theme: 'dark',
      viewMode: 'grid',
      protocol: 'google',
      providerName: 'Official Gemini',
      apiKey: '',
      baseUrl: 'https://api.openai.com',
      model: 'gemini-2.5-flash',
      activePrompt: DEFAULT_PROMPT,
      concurrency: 3,
      customTemplates: []
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return defaultSettings;
  });

  // Helper for i18n
  const t = (key: keyof typeof translations['en']) => {
    return translations[settings.language][key] || translations['en'][key] || key;
  };

  // -- Effects --

  // Sync ref
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Apply Theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Check Tutorial Status
  useEffect(() => {
      const seen = localStorage.getItem(TUTORIAL_SEEN_KEY);
      if (!seen) {
          setIsTutorialOpen(true);
      }
  }, []);

  // Initial DB Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedProjects = await loadProjectsFromDB();
        if (savedProjects && savedProjects.length > 0) {
          const restored = savedProjects.map(p => ({
            ...p,
            images: p.images.map(img => ({
              ...img,
              previewUrl: img.file ? URL.createObjectURL(img.file) : '',
              status: img.status || 'idle'
            }))
          }));
          setProjects(restored);
        }
      } catch (e) {
        console.error("Failed to load DB", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Global Pointer Up for Drag Selection
  useEffect(() => {
      const handleGlobalPointerUp = () => {
          isSelectionDraggingRef.current = false;
      };
      window.addEventListener('pointerup', handleGlobalPointerUp);
      return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, []);

  // Auto-Save
  useEffect(() => {
    if (!isLoaded) return;
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      saveProjectsToDB(projects)
        .then(() => setSaveStatus('saved'))
        .catch(e => { console.error(e); setSaveStatus('unsaved'); });
    }, 1000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [projects, isLoaded]);

  // Save Settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // -- Computed Data --
  
  const contextProjects = useMemo(() => activeProjectId === 'all' ? projects : projects.filter(p => p.id === activeProjectId), [projects, activeProjectId]);
  
  const visibleImages = useMemo(() => {
    const result: { image: TagImage, projectId: string }[] = [];
    contextProjects.forEach(p => {
        if (p.isCollapsed && activeProjectId === 'all') return; 
        p.images.forEach(img => {
            let isVisible = true;
            if (viewFilter === 'pending') isVisible = img.status === 'idle' || img.status === 'error' || img.status === 'loading';
            if (viewFilter === 'completed') isVisible = img.status === 'success';
            
            if (isVisible && searchQuery.trim()) {
               const q = searchQuery.toLowerCase();
               const matchName = img.file.name.toLowerCase().includes(q);
               const matchCaption = img.caption.toLowerCase().includes(q);
               if (!matchName && !matchCaption) isVisible = false;
            }

            if (isVisible) {
                result.push({ image: img, projectId: p.id });
            }
        });
    });
    return result;
  }, [contextProjects, viewFilter, searchQuery, activeProjectId]);

  const contextTotal = contextProjects.reduce((acc, p) => acc + p.images.length, 0);
  const contextCompleted = contextProjects.reduce((acc, p) => acc + p.images.filter(i => i.status === 'success').length, 0);
  const contextPending = contextTotal - contextCompleted;
  
  // Responsive Grid Columns calculation
  const [gridColumns, setGridColumns] = useState(4);
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

  // -- Actions --

  const handleSelectAll = () => {
      if (multiSelection.size === visibleImages.length && visibleImages.length > 0) {
          setMultiSelection(new Set()); // Deselect all
      } else {
          setMultiSelection(new Set(visibleImages.map(v => v.image.id))); // Select all visible
      }
  };

  // Optimized Selection Logic
  const handleCardPointerDown = (id: string, e: React.PointerEvent) => {
      // Only left click triggers selection
      if (e.button !== 0) return;

      // 1. Range Select (Shift + Click)
      if (e.shiftKey && lastSelectedIdRef.current) {
          e.preventDefault(); // Prevent text selection
          const lastIdx = visibleImages.findIndex(v => v.image.id === lastSelectedIdRef.current);
          const currIdx = visibleImages.findIndex(v => v.image.id === id);
          
          if (lastIdx !== -1 && currIdx !== -1) {
              const start = Math.min(lastIdx, currIdx);
              const end = Math.max(lastIdx, currIdx);
              
              const newSet = new Set(multiSelection);
              // Simplified logic: Add range to existing.
              for (let i = start; i <= end; i++) {
                  newSet.add(visibleImages[i].image.id);
              }
              setMultiSelection(newSet);
              return; 
          }
      }

      // 2. Drag/Paint Select Start
      isSelectionDraggingRef.current = true;
      const isCurrentlySelected = multiSelection.has(id);
      
      // If Ctrl/Cmd is held, we toggle. If not, and it's a fresh click, we select.
      // Paint mode: If we start on a selected item -> deselect mode. If unselected -> select mode.
      if (e.ctrlKey || e.metaKey) {
          selectionModeRef.current = isCurrentlySelected ? 'deselect' : 'select';
      } else {
          // If clicking an unselected item without modifiers -> Clear others and select this one
          if (!isCurrentlySelected) {
              setMultiSelection(new Set([id]));
              selectionModeRef.current = 'select';
          } else {
              selectionModeRef.current = 'select';
          }
      }

      // Apply immediate effect to current card
      setMultiSelection(prev => {
          const next = new Set(e.ctrlKey || e.metaKey ? prev : []); // Clear if no ctrl
          if (selectionModeRef.current === 'select') next.add(id);
          else next.delete(id);
          // Re-add current if it was cleared by no-ctrl but we are in select mode
          if (!e.ctrlKey && !e.metaKey) next.add(id);
          return next;
      });

      // Set active for inspector
      setSelectedId(id);
      lastSelectedIdRef.current = id;
  };

  const handleCardPointerEnter = (id: string, e: React.PointerEvent) => {
      if (isSelectionDraggingRef.current) {
          setMultiSelection(prev => {
              const next = new Set(prev);
              if (selectionModeRef.current === 'select') next.add(id);
              else next.delete(id);
              return next;
          });
          lastSelectedIdRef.current = id;
      }
  };

  const handleDeleteSelected = () => {
      const count = multiSelection.size;
      if (count === 0) return;
      
      // We need to confirm with the user
      const msg = t('deleteSelectedConfirm').replace('{count}', count.toString());
      if (!confirm(msg)) return;

      setProjects(prev => prev.map(p => ({
          ...p,
          images: p.images.filter(img => !multiSelection.has(img.id))
      })).filter(p => p.images.length > 0)); // Clean up empty projects if needed
      
      setMultiSelection(new Set());
      setSelectedId(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Ignore if typing in input/textarea
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

          if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
              e.preventDefault();
              handleSelectAll();
          }
          if (e.key === 'Escape') {
              e.preventDefault();
              setMultiSelection(new Set());
              setSelectedId(null);
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (multiSelection.size > 0) {
                  e.preventDefault();
                  handleDeleteSelected();
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleImages, multiSelection]);

  const handleBatchUpdate = (
    operation: 'replace' | 'prepend' | 'append' | 'addTags' | 'removeTags', 
    params: { find?: string, replace?: string, prefix?: string, suffix?: string, tags?: string[] },
    scope: 'all' | 'selected'
  ) => {
    const targetIds = new Set(
       scope === 'selected' 
       ? Array.from(multiSelection) 
       : visibleImages.map(v => v.image.id)
    );

    if (targetIds.size === 0) return;

    setProjects(prev => prev.map(p => ({
      ...p,
      images: p.images.map(img => {
        if (!targetIds.has(img.id)) return img;
        
        let newCaption = img.caption;

        if (operation === 'replace' && params.find) {
           const regex = new RegExp(params.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
           newCaption = newCaption.replace(regex, params.replace || '');
        } 
        else if (operation === 'prepend' && params.prefix) {
           newCaption = params.prefix + newCaption;
        } 
        else if (operation === 'append' && params.suffix) {
           newCaption = newCaption + params.suffix;
        }
        else if (operation === 'addTags' && params.tags) {
            // Smart Add
            const currentTags = newCaption.split(',').map(t => t.trim()).filter(Boolean);
            const tagsToAdd = params.tags.map(t => t.trim()).filter(Boolean);
            // Case insensitive deduplication
            const existingLower = new Set(currentTags.map(t => t.toLowerCase()));
            const uniqueToAdd = tagsToAdd.filter(t => !existingLower.has(t.toLowerCase()));
            
            if (uniqueToAdd.length > 0) {
                const merged = [...currentTags, ...uniqueToAdd];
                newCaption = merged.join(', ');
            }
        }
        else if (operation === 'removeTags' && params.tags) {
            // Smart Remove
            const currentTags = newCaption.split(',').map(t => t.trim()).filter(Boolean);
            const tagsToRemove = new Set(params.tags.map(t => t.trim().toLowerCase()).filter(Boolean));
            const filtered = currentTags.filter(t => !tagsToRemove.has(t.toLowerCase()));
            newCaption = filtered.join(', ');
        }

        return { ...img, caption: newCaption };
      })
    })));
    
    setIsBatchOpen(false);
  };

  const handleMoveAndMerge = (targetId: string, newName: string) => {
     setProjects(prev => {
         let next = [...prev];
         let destId = targetId;
         
         // 1. Create new project if needed
         if (destId === 'new') {
             destId = crypto.randomUUID();
             next.push({
                 id: destId,
                 name: newName || `Project ${new Date().toLocaleTimeString()}`,
                 images: [],
                 status: 'idle'
             });
         }

         let movingImages: TagImage[] = [];

         // 2. Collect images based on mode
         if (moveState.mode === 'selection') {
             // Move selected images from ANY project to destination
             next = next.map(p => {
                  // If this is the destination, we don't remove from it (unless we implemented reordering, but here we just filter)
                  if (p.id === destId) return p; 
                  
                  const staying = p.images.filter(img => !multiSelection.has(img.id));
                  const moving = p.images.filter(img => multiSelection.has(img.id));
                  movingImages.push(...moving);
                  return { ...p, images: staying };
             });
         } else if (moveState.mode === 'project' && moveState.sourceProjectId) {
             // Merge entire project
             const sourceIdx = next.findIndex(p => p.id === moveState.sourceProjectId);
             if (sourceIdx !== -1) {
                 movingImages = [...next[sourceIdx].images];
                 next.splice(sourceIdx, 1); // Delete source
             }
         }

         // 3. Add to destination
         const destIdx = next.findIndex(p => p.id === destId);
         if (destIdx !== -1) {
              next[destIdx] = {
                  ...next[destIdx],
                  images: [...next[destIdx].images, ...movingImages]
              };
         } else {
             // Should have been created or existed, if not, put back? (Edge case)
         }
         
         return next;
     });

     setMoveState({ isOpen: false, mode: 'selection' });
     setMultiSelection(new Set());
     setSelectedId(null);
  };

  // Chunked File Processing
  const processFilesChunked = async (
      files: File[], 
      target: { mode: 'append', projectId: string } | { mode: 'create', name?: string }
  ) => {
      const CHUNK_SIZE = 50;
      
      // If creating new, generate ID and Name upfront
      const newProjectId = crypto.randomUUID();
      const timestamp = new Date().toLocaleTimeString();
      const newProjectName = target.mode === 'create' ? (target.name || `Import ${timestamp}`) : '';

      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
          const chunk = files.slice(i, i + CHUNK_SIZE);
          const newImages = chunk.map(file => ({
             id: crypto.randomUUID(),
             file,
             previewUrl: URL.createObjectURL(file),
             caption: "",
             status: 'idle' as const
          }));

          setProjects(prev => {
             const next = [...prev];

             if (target.mode === 'append') {
                 // Append to existing
                 const idx = next.findIndex(p => p.id === target.projectId);
                 if (idx > -1) {
                     next[idx] = { ...next[idx], images: [...next[idx].images, ...newImages] };
                 }
             } else {
                 // Create New or Append to 'Just Created'
                 // Check if we already created this project in previous chunk loop
                 const existingNewIdx = next.findIndex(p => p.id === newProjectId);
                 
                 if (existingNewIdx > -1) {
                      next[existingNewIdx] = { ...next[existingNewIdx], images: [...next[existingNewIdx].images, ...newImages] };
                 } else {
                     next.push({
                         id: newProjectId,
                         name: newProjectName,
                         images: newImages,
                         status: 'idle',
                         isCollapsed: false
                     });
                 }
             }
             return next;
          });
          
          await new Promise(resolve => requestAnimationFrame(resolve));
      }
  };
  
  const handleStandardUpload = (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter(isImageFile);
      
      if (activeProjectId === 'all') {
          processFilesChunked(files, { mode: 'create' });
      } else {
          processFilesChunked(files, { mode: 'append', projectId: activeProjectId });
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (id: string) => {
    setProjects(prev => prev.map(p => ({ ...p, images: p.images.filter(i => i.id !== id) })).filter(p => p.images.length > 0));
    if (selectedId === id) setSelectedId(null);
    if (multiSelection.has(id)) {
        const newSet = new Set(multiSelection);
        newSet.delete(id);
        setMultiSelection(newSet);
    }
  };

  // -- Generation Logic --

  const handleTagSingle = async (projId: string, imgId: string) => {
    const currentProject = projectsRef.current.find(p => p.id === projId);
    const img = currentProject?.images.find(i => i.id === imgId);
    if (!currentProject || !img) return;

    // Optimistic update
    setProjects(prev => prev.map(p => p.id === projId ? { ...p, images: p.images.map(i => i.id === imgId ? { ...i, status: 'loading' } : i) } : p));

    try {
      const caption = await generateCaption(img.file, settings);
      setProjects(prev => prev.map(p => p.id === projId ? { ...p, images: p.images.map(i => i.id === imgId ? { ...i, status: 'success', caption } : i) } : p));
    } catch (error: any) {
      setProjects(prev => prev.map(p => p.id === projId ? { ...p, images: p.images.map(i => i.id === imgId ? { ...i, status: 'error', errorMsg: error.message } : i) } : p));
    }
  };

  const handleBatchTag = async () => {
      if (!settings.apiKey) { setIsSettingsOpen(true); return; }
      shouldStopRef.current = false;
      setIsProcessing(true);
      setIsPaused(false);
      
      // Build Queue
      const queue: { projId: string, imgId: string }[] = [];
      contextProjects.forEach(p => {
          p.images.forEach(img => {
              if (img.status === 'idle' || img.status === 'error') {
                  queue.push({ projId: p.id, imgId: img.id });
              }
          });
      });

      if (queue.length === 0) { setIsProcessing(false); return; }

      const concurrency = Math.max(1, Math.min(10, settings.concurrency || 3));
      let active = 0;
      let idx = 0;

      const processNext = async () => {
          if (shouldStopRef.current || idx >= queue.length) return;
          const task = queue[idx++];
          active++;
          try {
             await handleTagSingle(task.projId, task.imgId);
          } finally {
             active--;
             if (!shouldStopRef.current) processNext();
          }
      };

      const initialBatch = [];
      for (let i = 0; i < concurrency; i++) initialBatch.push(processNext());
      
      // Poll for completion
      const interval = setInterval(() => {
          if (idx >= queue.length && active === 0) {
              clearInterval(interval);
              setIsProcessing(false);
          }
          if (shouldStopRef.current) {
              clearInterval(interval);
              setIsProcessing(interval);
              setIsProcessing(false);
          }
      }, 500);
  };

  // -- Drag & Drop Handlers --
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    // Safely check types for file presence
    if (e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") !== -1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragOver(false);
      dragCounter.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    const items = e.dataTransfer.items;
    let processedAsEntries = false;

    if (items && items.length > 0) {
       // Try to use WebkitGetAsEntry to detect folders
       // @ts-ignore
       const entries = Array.from(items).map(item => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null).filter(Boolean);
       
       if (entries.length > 0) {
           processedAsEntries = true;
           const looseFiles: File[] = [];
           for (const entry of entries) {
               if (entry.isDirectory) {
                   const files = await scanEntry(entry);
                   const validFiles = files.filter(isImageFile);
                   if (validFiles.length > 0) {
                       await processFilesChunked(validFiles, { mode: 'create', name: entry.name });
                   }
               } else if (entry.isFile) {
                   const files = await scanEntry(entry);
                   looseFiles.push(...files);
               }
           }
           if (looseFiles.length > 0) {
               const validLoose = looseFiles.filter(isImageFile) as File[];
               if (validLoose.length > 0) {
                   if (activeProjectId === 'all') {
                       await processFilesChunked(validLoose, { mode: 'create' });
                   } else {
                       await processFilesChunked(validLoose, { mode: 'append', projectId: activeProjectId });
                   }
               }
           }
           return;
       }
    }

    // Fallback
    if (!processedAsEntries && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files).filter(isImageFile);
        if (files.length > 0) {
            if (activeProjectId === 'all') {
                await processFilesChunked(files, { mode: 'create' });
            } else {
                await processFilesChunked(files, { mode: 'append', projectId: activeProjectId });
            }
        }
    }
  }, [activeProjectId]);

  // -- Modals --

  const MoveModal = () => {
      if (!moveState.isOpen) return null;
      const [targetId, setTargetId] = useState('new');
      const [newName, setNewName] = useState('');

      const isMerge = moveState.mode === 'project';
      const count = isMerge 
        ? projects.find(p => p.id === moveState.sourceProjectId)?.images.length || 0
        : multiSelection.size;
      
      const sourceName = isMerge 
        ? projects.find(p => p.id === moveState.sourceProjectId)?.name 
        : '';

      // Filter out source project from destination list if in merge mode
      const availableProjects = projects.filter(p => !isMerge || p.id !== moveState.sourceProjectId);

      return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                      <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{isMerge ? t('mergeTitle') : t('moveTitle')}</h2>
                      <button onClick={() => setMoveState({isOpen: false, mode: 'selection'})}><X className="w-5 h-5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300" /></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {isMerge 
                            ? t('mergeDesc').replace('{name}', sourceName || 'Project') 
                            : t('moveDesc').replace('{count}', count.toString())}
                      </p>

                      <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('targetProject')}</label>
                          <div className="relative">
                              <select 
                                value={targetId} 
                                onChange={(e) => setTargetId(e.target.value)}
                                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pr-10 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                  <option value="new">{t('newProject')}</option>
                                  {availableProjects.map(p => (
                                      <option key={p.id} value={p.id}>{p.name} ({p.images.length})</option>
                                  ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          </div>
                      </div>

                      {targetId === 'new' && (
                          <div className="animate-in slide-in-from-top-2">
                              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('newProjectName')}</label>
                              <input 
                                type="text" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)} 
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="My New Project" 
                                autoFocus
                              />
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900 rounded-b-2xl">
                      <button onClick={() => setMoveState({isOpen: false, mode: 'selection'})} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">{t('close')}</button>
                      <button 
                          onClick={() => handleMoveAndMerge(targetId, newName)}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg"
                      >
                          {isMerge ? t('confirmMerge') : t('confirmMove')}
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const TutorialModal = () => {
      const [step, setStep] = useState(0);
      
      const slides = [
          {
              icon: <BookOpen className="w-12 h-12 text-indigo-500" />,
              title: t('tutWelcomeTitle'),
              desc: t('tutWelcomeDesc')
          },
          {
              icon: <Folder className="w-12 h-12 text-amber-500" />,
              title: t('tutImportTitle'),
              desc: t('tutImportDesc')
          },
          {
              icon: <MousePointer2 className="w-12 h-12 text-emerald-500" />,
              title: t('tutSelectTitle'),
              desc: t('tutSelectDesc')
          },
          {
              icon: <Wand2 className="w-12 h-12 text-purple-500" />,
              title: t('tutTagTitle'),
              desc: t('tutTagDesc')
          },
          {
              icon: <Download className="w-12 h-12 text-blue-500" />,
              title: t('tutExportTitle'),
              desc: t('tutExportDesc')
          }
      ];

      const handleNext = () => {
          if (step < slides.length - 1) setStep(step + 1);
          else handleClose();
      };

      const handlePrev = () => {
          if (step > 0) setStep(step - 1);
      };

      const handleClose = () => {
          localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
          setIsTutorialOpen(false);
      };

      // Keyboard navigation
      useEffect(() => {
          const handleKey = (e: KeyboardEvent) => {
             if (!isTutorialOpen) return;
             if (e.key === 'ArrowRight') handleNext();
             if (e.key === 'ArrowLeft') handlePrev();
          };
          window.addEventListener('keydown', handleKey);
          return () => window.removeEventListener('keydown', handleKey);
      }, [step, isTutorialOpen]);

      if (!isTutorialOpen) return null;

      return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-300">
                  <button onClick={handleClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"><X className="w-5 h-5" /></button>
                  
                  <div className="p-8 flex-1 flex flex-col items-center text-center justify-center min-h-[320px]">
                      <div className="mb-6 p-6 bg-zinc-50 dark:bg-zinc-950 rounded-full shadow-inner">{slides[step].icon}</div>
                      <h2 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">{slides[step].title}</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">{slides[step].desc}</p>
                  </div>

                  <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/50">
                      <button onClick={handleClose} className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">{t('skip')}</button>
                      
                      <div className="flex gap-2">
                          {slides.map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-indigo-600 w-6' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                          ))}
                      </div>

                      <button onClick={handleNext} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95">
                          {step === slides.length - 1 ? t('finish') : t('next')}
                          {step < slides.length - 1 && <ArrowRight className="w-4 h-4" />}
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  // -- Components --

  const SmartToolbar = () => {
      const errorCount = contextProjects.reduce((acc, p) => acc + p.images.filter(i => i.status === 'error').length, 0);
      const successCount = contextProjects.reduce((acc, p) => acc + p.images.filter(i => i.status === 'success').length, 0);
      const selectedCount = multiSelection.size;

      return (
          <div className="sticky top-0 z-30 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shadow-sm transition-all">
              <div className="flex items-center gap-4">
                {/* View Filters */}
                <div className="flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-300/50 dark:border-zinc-800/50">
                    <button onClick={() => setViewFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'all' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}><Layers className="w-3 h-3" /></button>
                    <button onClick={() => setViewFilter('pending')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}><ListFilter className="w-3 h-3" /> {contextPending > 0 && <span className="bg-black/10 dark:bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-mono">{contextPending}</span>}</button>
                    <button onClick={() => setViewFilter('completed')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}><CheckSquare className="w-3 h-3" /> {successCount > 0 && <span className="bg-black/10 dark:bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-mono">{successCount}</span>}</button>
                </div>
                
                <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-800"></div>

                 {/* View Mode Toggle */}
                 <div className="flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-300/50 dark:border-zinc-800/50">
                    <button onClick={() => setSettings(s => ({...s, viewMode: 'grid'}))} className={`p-1.5 rounded-md transition-all ${settings.viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`} title="Grid View"><Grid3X3 className="w-4 h-4" /></button>
                    <button onClick={() => setSettings(s => ({...s, viewMode: 'list'}))} className={`p-1.5 rounded-md transition-all ${settings.viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`} title="List View"><List className="w-4 h-4" /></button>
                </div>
                
                <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-800"></div>
                
                {/* Search */}
                <div className="relative group">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full pl-9 pr-8 py-1.5 text-xs w-32 focus:w-48 transition-all dark:text-zinc-200" />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"><X className="w-3 h-3" /></button>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                  {/* Selection Controls */}
                  <button onClick={handleSelectAll} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800" title="Ctrl+A">
                      {selectedCount === visibleImages.length && visibleImages.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> : <Square className="w-3.5 h-3.5" />}
                      {selectedCount > 0 ? `${t('selected')} (${selectedCount})` : t('selectAll')}
                  </button>
                  
                  {selectedCount > 0 && (
                    <>
                      <button onClick={() => setMoveState({ isOpen: true, mode: 'selection' })} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-md text-xs font-medium animate-in slide-in-from-right-2">
                          <FolderInput className="w-3.5 h-3.5" />
                          {t('move')}
                      </button>
                      <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-md text-xs font-medium animate-in slide-in-from-right-2" title="Delete Selected Images">
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('deleteSelected')}
                      </button>
                    </>
                  )}

                  {/* Batch Actions */}
                  <button onClick={() => setIsBatchOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md text-xs font-medium">
                      <Filter className="w-3.5 h-3.5" />
                      {t('batchEdit')}
                  </button>

                  {/* Utility Actions */}
                  {errorCount > 0 && (
                      <button onClick={() => setProjects(prev => prev.map(p => ({...p, images: p.images.map(i => i.status === 'error' ? {...i, status: 'idle', errorMsg: undefined} : i)})))} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md text-xs font-medium"><RotateCcw className="w-3.5 h-3.5" /> {t('retry')}</button>
                  )}
                  
                  {successCount > 0 && (
                      <button onClick={() => { if(confirm(t('clearDoneConfirm'))) setProjects(prev => prev.map(p => ({...p, images: p.images.filter(i => i.status !== 'success')}))); }} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-red-500 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium"><Eraser className="w-3.5 h-3.5" /> {t('clearDone')}</button>
                  )}
              </div>
          </div>
      );
  };

  const BatchEditModal = () => {
     if (!isBatchOpen) return null;
     const [mode, setMode] = useState<'replace' | 'append' | 'smart'>('smart');
     const [findStr, setFindStr] = useState('');
     const [replaceStr, setReplaceStr] = useState('');
     const [prefixStr, setPrefixStr] = useState('');
     const [suffixStr, setSuffixStr] = useState('');
     const [addTagsStr, setAddTagsStr] = useState('');
     const [removeTagsStr, setRemoveTagsStr] = useState('');
     const [scope, setScope] = useState<'all' | 'selected'>(multiSelection.size > 0 ? 'selected' : 'all');

     const visibleCount = visibleImages.length;
     const selectedCount = multiSelection.size;

     return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div><h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('batchTitle')}</h2><p className="text-xs text-zinc-500">{t('batchSubtitle')}</p></div>
                    <button onClick={() => setIsBatchOpen(false)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300" /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <button onClick={() => setMode('smart')} className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${mode === 'smart' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>{t('smartTags')}</button>
                        <button onClick={() => setMode('replace')} className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${mode === 'replace' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>{t('findReplace')}</button>
                        <button onClick={() => setMode('append')} className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${mode === 'append' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}>{t('prependAppend')}</button>
                    </div>

                    <div className="space-y-4 min-h-[150px]">
                         {mode === 'smart' && (
                             <>
                                <div>
                                    <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block mb-1.5 flex gap-2 items-center"><Tags className="w-3 h-3" /> {t('addTags')}</label>
                                    <input value={addTagsStr} onChange={e => setAddTagsStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder={t('addTagsPlaceholder')} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-red-600 dark:text-red-400 block mb-1.5 flex gap-2 items-center"><Eraser className="w-3 h-3" /> {t('removeTags')}</label>
                                    <input value={removeTagsStr} onChange={e => setRemoveTagsStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder={t('removeTagsPlaceholder')} />
                                </div>
                             </>
                         )}
                         {mode === 'replace' && (
                             <>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('find')}</label><input value={findStr} onChange={e => setFindStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder="e.g. cat" /></div>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('replaceWith')}</label><input value={replaceStr} onChange={e => setReplaceStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder="empty to remove" /></div>
                             </>
                         )}
                         {mode === 'append' && (
                             <>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('prefix')}</label><input value={prefixStr} onChange={e => setPrefixStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder="masterpiece, " /></div>
                                <div><label className="text-xs font-medium text-zinc-500 block mb-1.5">{t('suffix')}</label><input value={suffixStr} onChange={e => setSuffixStr(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder=", 4k" /></div>
                             </>
                         )}

                         <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
                             <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">{t('target')}</label>
                             <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-indigo-500" />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('scopeAll')} ({visibleCount})</span>
                                </label>
                                <label className={`flex items-center gap-2 ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input type="radio" checked={scope === 'selected'} onChange={() => selectedCount > 0 && setScope('selected')} disabled={selectedCount === 0} className="accent-indigo-500" />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('scopeSelected')} ({selectedCount})</span>
                                </label>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900 rounded-b-2xl">
                    <button onClick={() => setIsBatchOpen(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 rounded-lg">{t('close')}</button>
                    <button 
                        onClick={() => {
                            if (mode === 'smart') {
                                if (addTagsStr) handleBatchUpdate('addTags', { tags: addTagsStr.split(',') }, scope);
                                if (removeTagsStr) handleBatchUpdate('removeTags', { tags: removeTagsStr.split(',') }, scope);
                            }
                            else if (mode === 'replace') handleBatchUpdate('replace', { find: findStr, replace: replaceStr }, scope);
                            else handleBatchUpdate(mode === 'append' && prefixStr ? 'prepend' : 'append', { prefix: prefixStr, suffix: suffixStr }, scope);
                        }}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg"
                    >
                        {t('apply')}
                    </button>
                </div>
            </div>
        </div>
     );
  };

  // Logic for Inspector Content
  const activeImage = visibleImages.find(v => v.image.id === selectedId)?.image;
  const inspectorProjectId = activeImage ? (activeProjectId === 'all' ? visibleImages.find(v => v.image.id === selectedId)?.projectId : activeProjectId) : null;
  const inspectorProjectObj = inspectorProjectId ? projects.find(p => p.id === inspectorProjectId) : null;

  return (
    <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-64 lg:w-72 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full z-20 select-none">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
           <h1 className="text-lg font-bold flex items-center gap-2"><Wand2 className="w-5 h-5 text-indigo-600" />{t('appTitle')}</h1>
           <button onClick={() => setIsTutorialOpen(true)} className="text-zinc-400 hover:text-indigo-500 transition-colors" title={t('tutorial')}><HelpCircle className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-1 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800/50 pb-2">
           <div className="flex items-center gap-1"><span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded text-zinc-500">{settings.providerName}</span></div>
           <div className="text-[10px] text-zinc-500 truncate max-w-[100px]">{settings.model}</div>
        </div>

        <div className="p-3 flex flex-col h-full overflow-hidden">
             {/* Import/Export Buttons */}
             <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-3 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium"><Upload className="w-4 h-4 text-zinc-400" />{t('import')}</button>
                <button onClick={() => exportAllProjectsToZip(projects)} disabled={projects.length === 0} className="flex flex-col items-center justify-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-3 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium disabled:opacity-50"><Archive className="w-4 h-4 text-zinc-400" />{t('exportAll')}</button>
             </div>
             <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleStandardUpload(e.target.files)} />
             
             {/* Project List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-0.5 mb-4">
                <button onClick={() => setActiveProjectId('all')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border ${activeProjectId === 'all' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30' : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" />{t('dashboard')}</div><span className="text-zinc-400">{projects.reduce((acc,p)=>acc+p.images.length,0)}</span></button>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                {projects.map(p => (
                    <div key={p.id} onClick={() => setActiveProjectId(p.id)} className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer ${activeProjectId === p.id ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500'}`}>
                        <div className="flex items-center gap-2 truncate"><Folder className="w-3.5 h-3.5" /> <span className="truncate">{p.name}</span></div>
                        <div className="flex items-center gap-1">
                            <span className="opacity-50">{p.images.filter(i=>i.status==='success').length}/{p.images.length}</span>
                            {/* Merge Button - Only visible on hover or active, and if > 1 project */}
                            {projects.length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setMoveState({ isOpen: true, mode: 'project', sourceProjectId: p.id }); }} 
                                    className="p-1 text-zinc-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={t('merge')}
                                >
                                    <Merge className="w-3 h-3" />
                                </button>
                            )}
                            {/* Delete Button */}
                            {activeProjectId === p.id && <button onClick={(e)=>{e.stopPropagation(); if(confirm(t('deleteProjectConfirm'))) setProjects(pr=>pr.filter(x=>x.id!==p.id)); setActiveProjectId('all');}} className="hover:text-red-500 p-1"><X className="w-3 h-3"/></button>}
                        </div>
                    </div>
                ))}
             </div>

             {/* Bottom Controls */}
             <div className="mt-auto space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {!isProcessing ? (
                    <button onClick={handleBatchTag} disabled={contextPending === 0} className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-3 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"><Play className="w-4 h-4 fill-current" />{t('startAll')}</button>
                ) : (
                    <div className="flex gap-2"><button onClick={() => shouldStopRef.current = true} className="flex-1 bg-amber-500 text-white py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2"><Pause className="w-4 h-4 fill-current" />{t('pause')}</button></div>
                )}
                
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400"><span>{t('progress')}</span><span>{contextTotal > 0 ? Math.round((contextCompleted/contextTotal)*100) : 0}%</span></div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-300" style={{width: `${contextTotal > 0 ? (contextCompleted/contextTotal)*100 : 0}%`}} /></div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setIsSettingsOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium"><Settings className="w-3.5 h-3.5" />{t('settings')}</button>
                    <div className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">{saveStatus === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <SaveIcon className="w-3.5 h-3.5 text-emerald-500" />}</div>
                </div>
             </div>
        </div>
      </div>
      
      {/* Main Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <SmartToolbar />
        
        {visibleImages.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
              <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <FolderInput className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-lg font-medium">{t('workspaceEmpty')}</p>
              <p className="text-sm opacity-50 mt-2 max-w-xs text-center">{t('dropHere')}</p>
              <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105 active:scale-95">
                  {t('browseFiles')}
              </button>
           </div>
        ) : (
            settings.viewMode === 'list' ? (
                <VirtualList 
                    items={visibleImages}
                    selectedId={selectedId}
                    multiSelection={multiSelection}
                    onCardPointerDown={handleCardPointerDown}
                    onCardPointerEnter={handleCardPointerEnter}
                    onRemove={handleRemoveImage}
                />
            ) : (
                <VirtualGrid 
                    items={visibleImages}
                    selectedId={selectedId}
                    multiSelection={multiSelection}
                    onCardPointerDown={handleCardPointerDown}
                    onCardPointerEnter={handleCardPointerEnter}
                    onRemove={handleRemoveImage}
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

      {/* Inspector Panel */}
      <div className={`w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col transition-all duration-300 flex-shrink-0 ${selectedId ? 'translate-x-0' : 'translate-x-full hidden lg:flex lg:translate-x-0'}`}>
          {activeImage ? (
              <>
                 <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 font-bold flex justify-between items-center">
                    <span className="truncate max-w-[200px] text-zinc-800 dark:text-zinc-200">{activeImage.file.name}</span>
                    <div className="flex gap-1">
                         <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">{inspectorProjectObj?.name || 'Unknown'}</span>
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
                                onClick={() => inspectorProjectId && handleTagSingle(inspectorProjectId, activeImage.id)} 
                                disabled={activeImage.status === 'loading'}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                             >
                                {activeImage.status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3" />}
                                {t('regen')}
                             </button>
                         </div>
                         <textarea 
                            className="w-full h-48 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-zinc-800 dark:text-zinc-200"
                            value={activeImage.caption}
                            onChange={(e) => {
                                const newText = e.target.value;
                                if (inspectorProjectId) {
                                    setProjects(prev => prev.map(p => p.id === inspectorProjectId ? {
                                        ...p,
                                        images: p.images.map(i => i.id === activeImage.id ? { ...i, caption: newText } : i)
                                    } : p));
                                }
                            }}
                            placeholder="Caption..."
                         />
                         <div className="flex justify-between">
                            <button onClick={() => downloadSingleText(activeImage)} className="text-xs flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"><Download className="w-3 h-3"/> Save .txt</button>
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

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-6">
                  <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{t('settings')}</h2><button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5" /></button></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('language')}</label><div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg"><button onClick={() => setSettings(s => ({...s, language: 'en'}))} className={`flex-1 py-1 rounded text-xs ${settings.language === 'en' ? 'bg-white dark:bg-zinc-600 shadow' : ''}`}>English</button><button onClick={() => setSettings(s => ({...s, language: 'zh'}))} className={`flex-1 py-1 rounded text-xs ${settings.language === 'zh' ? 'bg-white dark:bg-zinc-600 shadow' : ''}`}>中文</button></div></div>
                       <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('theme')}</label><div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg"><button onClick={() => setSettings(s => ({...s, theme: 'light'}))} className={`flex-1 py-1 rounded text-xs flex items-center justify-center gap-1 ${settings.theme === 'light' ? 'bg-white text-amber-600 shadow' : ''}`}><Sun className="w-3 h-3"/> Light</button><button onClick={() => setSettings(s => ({...s, theme: 'dark'}))} className={`flex-1 py-1 rounded text-xs flex items-center justify-center gap-1 ${settings.theme === 'dark' ? 'bg-zinc-700 text-white shadow' : ''}`}><Moon className="w-3 h-3"/> Dark</button></div></div>
                  </div>

                  <div className="space-y-3">
                      <label className="block text-xs font-bold text-zinc-500 uppercase">API Provider</label>
                      <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg mb-2">
                          <button onClick={() => setSettings(s => ({...s, protocol: 'google'}))} className={`flex-1 py-2 text-xs font-bold rounded-md ${settings.protocol === 'google' ? 'bg-white dark:bg-zinc-600 shadow' : 'opacity-50'}`}>Google Gemini</button>
                          <button onClick={() => setSettings(s => ({...s, protocol: 'openai_compatible'}))} className={`flex-1 py-2 text-xs font-bold rounded-md ${settings.protocol === 'openai_compatible' ? 'bg-white dark:bg-zinc-600 shadow' : 'opacity-50'}`}>OpenAI Compatible</button>
                      </div>
                      <input type="password" value={settings.apiKey} onChange={e => setSettings(s => ({...s, apiKey: e.target.value}))} className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm" placeholder="API Key" />
                      <input type="text" value={settings.model} onChange={e => setSettings(s => ({...s, model: e.target.value}))} className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm" placeholder="Model Name" />
                      {settings.protocol === 'openai_compatible' && <input type="text" value={settings.baseUrl} onChange={e => setSettings(s => ({...s, baseUrl: e.target.value}))} className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm" placeholder="Base URL" />}
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('activePrompt')}</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                          {[...DEFAULT_TEMPLATES, ...settings.customTemplates].map(tm => (
                              <button key={tm.id} onClick={() => setSettings(s => ({...s, activePrompt: tm.value}))} className={`whitespace-nowrap px-3 py-1 rounded border text-xs ${settings.activePrompt === tm.value ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-zinc-200 dark:border-zinc-700'}`}>{tm.label}</button>
                          ))}
                      </div>
                      <textarea value={settings.activePrompt} onChange={e => setSettings(s => ({...s, activePrompt: e.target.value}))} className="w-full h-32 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono" />
                  </div>

                  <div className="flex justify-end"><button onClick={() => setIsSettingsOpen(false)} className="bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-bold text-sm">{t('done')}</button></div>
              </div>
          </div>
      )}

      <BatchEditModal />
      <MoveModal />
      <TutorialModal />
    </div>
  );
};

export default App;
