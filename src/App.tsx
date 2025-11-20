import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { openDB } from 'idb';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Image as ImageIcon, Upload, Download, Trash2, Tags, Search, X, Folder, File, Settings, Sun, Moon, ChevronDown, ChevronRight, Plus, Copy } from 'lucide-react';
import type { Image, Project } from './types';

const dbPromise = openDB('lora-tag-master', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('images')) {
      db.createObjectStore('images', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('projects')) {
      db.createObjectStore('projects', { keyPath: 'id' });
    }
  },
});

const App: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const activeImage = useMemo(() => images.find(img => img.id === selectedId), [images, selectedId]);

  const visibleImages = useMemo(() => {
    let filteredImages = images;
    if (activeProjectId !== 'all') {
      // This is a simplification. You'll need to associate images with projects.
      // For now, let's assume you have a way to filter images by project.
    }
    if (searchTerm) {
      filteredImages = filteredImages.filter(img => 
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return filteredImages;
  }, [images, activeProjectId, searchTerm]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: Image[] = [];
    for (const file of files) {
      const image: Image = {
        id: crypto.randomUUID(),
        name: file.name,
        url: URL.createObjectURL(file),
        tags: [],
        projectId: activeProjectId === 'all' ? 'default' : activeProjectId,
      };
      newImages.push(image);
    }

    const db = await dbPromise;
    const tx = db.transaction('images', 'readwrite');
    await Promise.all(newImages.map(img => tx.store.put(img)));
    await tx.done;
    setImages(prev => [...prev, ...newImages]);
  };

  const inspectorProjectId = activeImage ? activeImage.projectId : undefined;

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      {/* Sidebar */}
      <div className={`flex flex-col bg-zinc-50 dark:bg-zinc-800/50 border-r border-zinc-200 dark:border-zinc-700/50 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo and Collapse Button */}
        {/* Project List */}
        {/* Settings and Theme Toggle */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700/50">
          <div className="flex items-center gap-4">
            <input type="file" id="image-upload" multiple hidden onChange={handleImageUpload} />
            <button onClick={() => document.getElementById('image-upload')?.click()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
              <Upload size={18} />
              <span>Upload</span>
            </button>
          </div>
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search images..." 
                className="w-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-transparent focus:border-indigo-500/50 rounded-md pl-10 pr-4 py-2 focus:outline-none transition-colors" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Image Grid */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {visibleImages.map(image => (
              <div key={image.id} onClick={() => setSelectedId(image.id)} className={`relative aspect-square rounded-md overflow-hidden cursor-pointer group border-2 ${selectedId === image.id ? 'border-indigo-500' : 'border-transparent hover:border-indigo-500/50'}`}>
                <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-sm truncate">{image.name}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Inspector */}
      {activeImage && (
        <div className="w-96 bg-zinc-50 dark:bg-zinc-800/50 border-l border-zinc-200 dark:border-zinc-700/50 flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700/50">
            <h3 className="font-semibold text-lg">Inspector</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="aspect-square rounded-md overflow-hidden">
              <img src={activeImage.url} alt={activeImage.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Filename</label>
              <p className="font-semibold">{activeImage.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Tags</label>
              {/* Tag editor will go here */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
