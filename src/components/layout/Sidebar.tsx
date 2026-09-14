import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, MoreVertical, FolderPlus, Terminal } from 'lucide-react';
import { AppSettings, Project } from '../../types';
import { useAppLogs } from '../../services/loggerService';
import {
  Wand2,
  HelpCircle,
  Upload,
  Archive,
  LayoutGrid,
  Folder,
  Merge,
  Play,
  Pause,
  Settings,
  CheckCircle,
  Trash2,
  Download,
  Tags,
} from '../Icons';

export interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  settings: AppSettings;
  isProcessing: boolean;
  isCooling?: boolean;
  coolingCountdown?: number;
  onSkipCooldown?: () => void;
  contextStats: { total: number; completed: number; pending: number; error: number };
  handlers: {
    onImport: () => void;
    onExport: () => void;
    onMerge: (sourceId: string) => void;
    onDeleteProject: (id: string) => void;
    onDeleteProjectRequest?: (project: Project) => void;
    onCreateProject?: () => void;
    onRenameProject?: (id: string, newName: string) => void;
    onEditProject?: (project: Project) => void;
    onExportProject?: (project: Project) => void;
    onStartAll: () => void;
    onPause: () => void;
    onOpenSettings: () => void;
    onOpenTutorial: () => void;
    onOpenLog?: () => void;
    onUpdateTriggerWord: (id: string, word: string) => void;
  };
  t: (key: string) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProjectId,
  setActiveProjectId,
  settings,
  isProcessing,
  isCooling,
  coolingCountdown,
  onSkipCooldown,
  contextStats,
  handlers,
  t,
}) => {
  const { errorCount } = useAppLogs();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; project: Project } | null>(
    null
  );
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    if (editingProjectId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingProjectId]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) setContextMenu(null);
      if (openMenuProjectId) setOpenMenuProjectId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, openMenuProjectId]);

  const handleSaveRename = (projectId: string) => {
    const trimmed = editingName.trim();
    if (trimmed && handlers.onRenameProject) {
      handlers.onRenameProject(projectId, trimmed);
    }
    setEditingProjectId(null);
  };

  return (
    <aside className='tm-sidebar w-68 lg:w-76 flex-shrink-0 bg-tm-sidebar border-r border-black/[0.05] dark:border-white/[0.06] flex flex-col h-full z-20 select-none transition-colors relative'>
      {/* Top Workspace Header */}
      <div className='p-4 border-b border-black/[0.04] dark:border-white/[0.05] flex justify-between items-center shrink-0'>
        <h1 className='text-base font-semibold flex items-center gap-2.5 tracking-tight text-tm-text'>
          <Wand2 className='w-4.5 h-4.5 text-zinc-800 dark:text-zinc-200' />
          {t('uiWorkspace')}
        </h1>
        <button
          onClick={handlers.onOpenTutorial}
          className='tm-button text-tm-subtle hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1.5 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
          title={t('tutorial')}
        >
          <HelpCircle className='w-4 h-4' />
        </button>
      </div>

      {/* Provider & Model status bar */}
      <div className='px-4 py-2.5 flex justify-between items-center border-b border-black/[0.04] dark:border-white/[0.05] shrink-0 bg-black/[0.015] dark:bg-white/[0.015]'>
        <div className='flex items-center gap-1.5'>
          <span className='text-xs font-semibold tracking-wide bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full text-tm-secondary border border-black/[0.04] dark:border-white/[0.06]'>
            {settings.providerName}
          </span>
        </div>
        <div className='text-xs text-tm-subtle truncate max-w-[130px] font-mono'>
          {settings.model}
        </div>
      </div>

      {/* Trigger Word Input (Contextual) */}
      {activeProjectId !== 'all' && (
        <div className='px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.05] bg-black/[0.015] dark:bg-white/[0.02]'>
          <div className='flex justify-between items-center mb-1.5'>
            <label className='tm-label text-xs font-semibold text-zinc-600 dark:text-tm-subtle flex items-center gap-1.5'>
              <Tags className='w-3.5 h-3.5 text-tm-subtle' />
              <span>{t('triggerWord')}</span>
            </label>
            {activeProject && (
              <span
                className='text-[11px] text-tm-subtle font-medium truncate max-w-[120px]'
                title={activeProject.name}
              >
                {activeProject.name}
              </span>
            )}
          </div>
          <input
            type='text'
            placeholder={t('triggerWordPlaceholder')}
            className='tm-input w-full bg-tm-canvas border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 transition-all placeholder:text-tm-subtle font-mono text-xs md:text-sm'
            value={activeProject?.triggerWord || ''}
            onChange={(e) => handlers.onUpdateTriggerWord(activeProjectId, e.target.value)}
          />
        </div>
      )}

      <div className='p-3.5 flex flex-col h-full overflow-hidden'>
        {/* Import/Export Action Buttons */}
        <div className='tm-sidebar-actions grid grid-cols-2 gap-2.5 mb-3.5 shrink-0'>
          <button
            onClick={handlers.onImport}
            className='tm-button flex items-center justify-center gap-2 bg-tm-canvas hover:bg-black/[0.03] dark:hover:bg-white/[0.04] py-2.5 px-3 rounded-xl border border-tm-border text-zinc-800 dark:text-zinc-200 text-sm font-semibold transition-all  shadow-none'
          >
            <Upload className='w-4 h-4 text-zinc-500' />
            <span>{t('import')}</span>
          </button>
          <button
            onClick={handlers.onExport}
            disabled={projects.length === 0}
            className='tm-button flex items-center justify-center gap-2 bg-tm-canvas hover:bg-black/[0.03] dark:hover:bg-white/[0.04] py-2.5 px-3 rounded-xl border border-tm-border text-zinc-800 dark:text-zinc-200 text-sm font-semibold disabled:opacity-40 transition-all  shadow-none'
          >
            <Archive className='w-4 h-4 text-zinc-500' />
            <span>{t('exportAll')}</span>
          </button>
        </div>

        {/* Project List Section */}
        <div className='flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 mb-3'>
          <button
            onClick={() => setActiveProjectId('all')}
            className={`tm-button w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              activeProjectId === 'all'
                ? 'bg-black/[0.06] dark:bg-white/[0.08] text-tm-text font-semibold'
                : 'text-zinc-600 dark:text-tm-subtle hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className='flex items-center gap-2.5'>
              <LayoutGrid className='w-4 h-4 text-zinc-500' />
              <span>{t('dashboard')}</span>
            </div>
            <span className='text-xs font-mono text-tm-subtle'>
              {projects.reduce((acc, p) => acc + p.images.length, 0)}
            </span>
          </button>

          {/* Section Header with Add Project Button */}
          <div className='px-1 pt-3 pb-1.5 flex items-center justify-between'>
            <div className='flex items-center gap-1.5 text-xs font-semibold text-tm-subtle normal-case tracking-normal'>
              <span>{t('projects')}</span>
              <span className='text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-tm-subtle font-normal'>
                {projects.length}
              </span>
            </div>
            {handlers.onCreateProject && (
              <button
                type='button'
                onClick={handlers.onCreateProject}
                className='tm-button flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-tm-canvas hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-tm-border  transition-all shadow-none'
                title='新建项目分类'
              >
                <Plus className='w-3.5 h-3.5' />
                <span>新建</span>
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className='px-3 py-6 rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.1] text-center space-y-2.5 bg-black/[0.01] dark:bg-white/[0.01] mt-1'>
              <div className='w-9 h-9 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center mx-auto text-tm-subtle'>
                <FolderPlus className='w-5 h-5' />
              </div>
              <div className='text-xs font-medium text-tm-subtle'>暂无项目分类</div>
              {handlers.onCreateProject && (
                <button
                  type='button'
                  onClick={handlers.onCreateProject}
                  className='tm-button tm-button-primary inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-tm-accent text-tm-on-accent hover:opacity-90  transition-all shadow-none'
                >
                  <Plus className='w-3.5 h-3.5' />
                  <span>创建新项目</span>
                </button>
              )}
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                tabIndex={0}
                role='button'
                aria-label={p.name}
                aria-pressed={activeProjectId === p.id}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    setActiveProjectId(p.id);
                  }
                }}
                onClick={() => setActiveProjectId(p.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: Math.min(e.clientX, window.innerWidth - 200),
                    y: Math.min(e.clientY, window.innerHeight - 240),
                    project: p,
                  });
                }}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer transition-all duration-150 ${
                  activeProjectId === p.id
                    ? 'bg-black/[0.06] dark:bg-white/[0.08] text-tm-text font-semibold'
                    : 'text-zinc-600 dark:text-tm-subtle hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className='flex items-center gap-2 truncate min-w-0 flex-1 mr-1'>
                  <Folder
                    className={`w-4 h-4 shrink-0 ${activeProjectId === p.id ? 'text-zinc-800 dark:text-zinc-200' : 'text-tm-subtle'}`}
                  />
                  {editingProjectId === p.id ? (
                    <input
                      ref={renameInputRef}
                      type='text'
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(p.id);
                        else if (e.key === 'Escape') setEditingProjectId(null);
                      }}
                      onBlur={() => handleSaveRename(p.id)}
                      className='tm-input w-full bg-tm-canvas border border-black/[0.12] dark:border-white/[0.15] rounded px-1.5 py-0.5 text-xs font-semibold text-tm-text outline-none ring-1 ring-zinc-400'
                    />
                  ) : (
                    <div className='flex flex-col min-w-0 truncate'>
                      <span
                        className='truncate font-medium text-xs md:text-sm'
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingProjectId(p.id);
                          setEditingName(p.name);
                        }}
                        title={`${p.name} (双击直接重命名)`}
                      >
                        {p.name}
                      </span>
                      {p.triggerWord && (
                        <div className='flex items-center gap-1 text-[10px] text-tm-subtle dark:text-tm-subtle font-mono truncate'>
                          <Tags className='w-2.5 h-2.5 shrink-0' />
                          <span className='truncate'>{p.triggerWord}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className='flex items-center gap-1 shrink-0'>
                  <span className='text-xs font-mono text-tm-subtle group-hover:hidden group-focus-within:hidden'>
                    {p.images.filter((i) => i.status === 'success').length}/{p.images.length}
                  </span>

                  {/* Hover Action Buttons */}
                  <div className='tm-project-actions hidden group-hover:flex group-focus-within:flex items-center gap-0.5 animate-in fade-in duration-100'>
                    {/* Inline Rename / Edit Trigger */}
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handlers.onEditProject) {
                          handlers.onEditProject(p);
                        } else {
                          setEditingProjectId(p.id);
                          setEditingName(p.name);
                        }
                      }}
                      className='tm-button p-1 text-tm-subtle hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-md transition-colors'
                      title='编辑项目属性'
                    >
                      <Pencil className='w-3.5 h-3.5' />
                    </button>

                    {/* Delete button (clear red hover) */}
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handlers.onDeleteProjectRequest) {
                          handlers.onDeleteProjectRequest(p);
                        } else {
                          handlers.onDeleteProject(p.id);
                        }
                      }}
                      className='tm-button p-1 text-tm-subtle hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors'
                      title='删除项目'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </button>

                    {/* More Actions Dropdown */}
                    <div className='relative'>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProjectId(openMenuProjectId === p.id ? null : p.id);
                        }}
                        className='tm-button p-1 text-tm-subtle hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-md transition-colors'
                        title='更多选项'
                      >
                        <MoreVertical className='w-3.5 h-3.5' />
                      </button>

                      {openMenuProjectId === p.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className='absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#262626] border border-black/[0.08] dark:border-white/[0.1] rounded-xl shadow-none p-1 z-50 animate-in fade-in duration-150 flex flex-col gap-0.5 text-xs font-medium'
                        >
                          <button
                            type='button'
                            onClick={() => {
                              setOpenMenuProjectId(null);
                              if (handlers.onEditProject) handlers.onEditProject(p);
                              else {
                                setEditingProjectId(p.id);
                                setEditingName(p.name);
                              }
                            }}
                            className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-colors'
                          >
                            <Pencil className='w-3.5 h-3.5 text-tm-subtle' />
                            <span>编辑 / 重命名</span>
                          </button>

                          {projects.length > 1 && (
                            <button
                              type='button'
                              onClick={() => {
                                setOpenMenuProjectId(null);
                                handlers.onMerge(p.id);
                              }}
                              className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-colors'
                            >
                              <Merge className='w-3.5 h-3.5 text-tm-subtle' />
                              <span>合并到其他项目...</span>
                            </button>
                          )}

                          {handlers.onExportProject && p.images.length > 0 && (
                            <button
                              type='button'
                              onClick={() => {
                                setOpenMenuProjectId(null);
                                handlers.onExportProject?.(p);
                              }}
                              className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-colors'
                            >
                              <Download className='w-3.5 h-3.5 text-tm-subtle' />
                              <span>单独导出此项目</span>
                            </button>
                          )}

                          <div className='h-px bg-black/[0.06] dark:bg-white/[0.08] my-0.5'></div>

                          <button
                            type='button'
                            onClick={() => {
                              setOpenMenuProjectId(null);
                              if (handlers.onDeleteProjectRequest)
                                handlers.onDeleteProjectRequest(p);
                              else handlers.onDeleteProject(p.id);
                            }}
                            className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 text-left transition-colors font-semibold'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                            <span>删除项目</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Controls */}
        <div className='mt-auto space-y-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.05] shrink-0'>
          {!isProcessing ? (
            <button
              onClick={handlers.onStartAll}
              disabled={contextStats.pending === 0}
              className='tm-button tm-button-primary w-full flex items-center justify-center gap-2 bg-tm-accent text-tm-on-accent py-3 rounded-full font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90  transition-all shadow-none'
            >
              <Play className='w-4 h-4 fill-current' />
              {t('startAll')}
            </button>
          ) : (
            <button
              onClick={handlers.onPause}
              className='tm-button w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-full font-semibold text-sm hover:bg-amber-600 transition-colors shadow-none'
            >
              <Pause className='w-4 h-4 fill-current' />
              {t('pause')}
            </button>
          )}

          {/* Rate Limit Cooldown State in Sidebar */}
          {isCooling && (
            <div className='p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs space-y-1.5 animate-pulse'>
              <div className='flex items-center justify-between font-semibold'>
                <span className='flex items-center gap-1.5'>
                  <span className='w-2 h-2 rounded-full bg-amber-500' />
                  <span>限流冷却排队中</span>
                </span>
                <span className='font-mono text-sm font-semibold bg-amber-500/20 px-1.5 py-0.5 rounded'>
                  {coolingCountdown || 0}s
                </span>
              </div>
              <p className='text-[11px] text-tm-subtle leading-tight'>
                触发 5 RPM / Token 限制，系统正自动等待，冷却后自动继续。
              </p>
              {onSkipCooldown && (
                <button
                  type='button'
                  onClick={onSkipCooldown}
                  className='tm-button w-full py-1 text-center font-medium text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 rounded-lg transition-colors cursor-pointer'
                >
                  跳过等待立即重试
                </button>
              )}
            </div>
          )}

          {/* Progress indicator */}
          <div className='space-y-1.5 px-1 py-0.5'>
            <div className='flex justify-between text-xs font-semibold text-tm-subtle'>
              <span>{t('progress')}</span>
              <span className='font-mono text-zinc-600 dark:text-zinc-300'>
                {contextStats.total > 0
                  ? Math.round((contextStats.completed / contextStats.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className='h-2 bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden'>
              <div
                className={`h-full transition-all duration-300 ease-out ${isProcessing ? 'bg-zinc-800 dark:bg-zinc-200 animate-subtle-pulse' : 'bg-zinc-800 dark:bg-zinc-200'}`}
                style={{
                  width: `${contextStats.total > 0 ? (contextStats.completed / contextStats.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Settings and status */}
          <div className='flex gap-2'>
            <button
              onClick={handlers.onOpenSettings}
              className='tm-button flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-tm-border hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-sm font-medium text-tm-secondary transition-colors'
            >
              <Settings className='w-4 h-4 text-zinc-500' />
              {t('settings')}
            </button>
            {handlers.onOpenLog && (
              <button
                onClick={handlers.onOpenLog}
                className={`tm-button relative px-3 py-2.5 rounded-xl border transition-colors flex items-center justify-center cursor-pointer ${
                  errorCount > 0
                    ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                    : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.04] dark:border-white/[0.06] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title='任务运行与错误日志'
              >
                <Terminal className='w-4 h-4' />
                {errorCount > 0 && (
                  <span className='absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-[#171717] animate-pulse'>
                    {errorCount}
                  </span>
                )}
              </button>
            )}
            <div
              className='px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center'
              title='Saved'
            >
              <CheckCircle className='w-4 h-4 text-emerald-500' />
            </div>
          </div>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className='fixed z-[250] w-48 bg-white dark:bg-[#262626] border border-black/[0.08] dark:border-white/[0.1] rounded-xl shadow-none p-1 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5 text-xs font-medium select-none'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='px-2.5 py-1 text-[11px] font-semibold text-tm-subtle border-b border-black/[0.04] dark:border-white/[0.06] mb-0.5 truncate'>
            {contextMenu.project.name}
          </div>
          <button
            type='button'
            onClick={() => {
              const target = contextMenu.project;
              setContextMenu(null);
              if (handlers.onEditProject) handlers.onEditProject(target);
              else {
                setEditingProjectId(target.id);
                setEditingName(target.name);
              }
            }}
            className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-colors'
          >
            <Pencil className='w-3.5 h-3.5 text-tm-subtle' />
            <span>编辑 / 重命名</span>
          </button>
          {projects.length > 1 && (
            <button
              type='button'
              onClick={() => {
                const id = contextMenu.project.id;
                setContextMenu(null);
                handlers.onMerge(id);
              }}
              className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-colors'
            >
              <Merge className='w-3.5 h-3.5 text-tm-subtle' />
              <span>合并到其他项目...</span>
            </button>
          )}
          {handlers.onExportProject && contextMenu.project.images.length > 0 && (
            <button
              type='button'
              onClick={() => {
                const target = contextMenu.project;
                setContextMenu(null);
                handlers.onExportProject?.(target);
              }}
              className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-colors'
            >
              <Download className='w-3.5 h-3.5 text-tm-subtle' />
              <span>单独导出此项目 (ZIP)</span>
            </button>
          )}
          <div className='h-px bg-black/[0.06] dark:bg-white/[0.08] my-0.5'></div>
          <button
            type='button'
            onClick={() => {
              const target = contextMenu.project;
              setContextMenu(null);
              if (handlers.onDeleteProjectRequest) handlers.onDeleteProjectRequest(target);
              else handlers.onDeleteProject(target.id);
            }}
            className='tm-button tm-option flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 text-left transition-colors font-semibold'
          >
            <Trash2 className='w-3.5 h-3.5' />
            <span>删除项目</span>
          </button>
        </div>
      )}
    </aside>
  );
};
