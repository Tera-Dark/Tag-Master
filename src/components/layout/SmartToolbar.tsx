import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Terminal } from 'lucide-react';
import { AppSettings } from '../../types';
import { useAppLogs } from '../../services/loggerService';
import {
    Play, Settings, Layers, ListFilter, CheckSquare,
    Grid3X3, List, Search, Square, FolderInput, Trash2, Filter, RotateCcw, Eraser,
    ArrowRight, X
} from '../Icons';

export interface SmartToolbarProps {
    viewFilter: 'all' | 'pending' | 'completed';
    setViewFilter: (v: 'all' | 'pending' | 'completed') => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (v: 'grid' | 'list') => void;
    selectionCount: number;
    visibleCount: number;
    stats: { error: number; success: number; pending: number };
    handlers: {
        onSelectAll: () => void;
        onMove: () => void;
        onDeleteSelected: () => void;
        onBatchEdit: () => void;
        onOpenClean: () => void;
        onRetryErrors: () => void;
        onClearDone: () => void;
    };
    settings: AppSettings;
    setSettings: (settings: AppSettings) => void;
    onNext?: () => void;
    onStartSelected?: () => void;
    onOpenLog?: () => void;
    t: (key: string) => string;
}

export const SmartToolbar: React.FC<SmartToolbarProps> = ({
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
    settings,
    setSettings,
    onNext,
    onStartSelected,
    onOpenLog,
    t
}) => {
    const { errorCount, warnCount } = useAppLogs();
    const [isUtilsOpen, setIsUtilsOpen] = useState(false);
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const currentColumns = Math.min(8, Math.max(3, settings.gridColumns || 5));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                 target.tagName === 'TEXTAREA' ||
                 target.isContentEditable)
            ) {
                return;
            }

            if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md border-b border-black/[0.05] dark:border-white/[0.06] px-3 md:px-5 py-2 flex flex-wrap items-center justify-between gap-2 md:gap-3 transition-all overflow-visible min-h-14">
            {/* Left Side: Filters, View, Columns & Extended Search */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                {/* View Filters (ChatGPT Segmented Pill) */}
                <div className="flex items-center gap-0.5 bg-[#f4f4f4] dark:bg-[#2f2f2f] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.06] shrink-0">
                    <button 
                        onClick={() => setViewFilter('all')} 
                        className={`px-2.5 sm:px-3 h-7.5 sm:h-8 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 ${
                            viewFilter === 'all' 
                                ? 'bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' 
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`} 
                        title="All Items"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>全部</span>
                    </button>
                    <button 
                        onClick={() => setViewFilter('pending')} 
                        className={`px-2.5 sm:px-3 h-7.5 sm:h-8 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 ${
                            viewFilter === 'pending' 
                                ? 'bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' 
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`} 
                        title="Pending"
                    >
                        <ListFilter className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">未完成</span>
                        {stats.pending > 0 && <span className="text-[11px] font-mono text-zinc-400 font-normal ml-0.5">({stats.pending})</span>}
                    </button>
                    <button 
                        onClick={() => setViewFilter('completed')} 
                        className={`px-2.5 sm:px-3 h-7.5 sm:h-8 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 ${
                            viewFilter === 'completed' 
                                ? 'bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' 
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`} 
                        title="Completed"
                    >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">已打标</span>
                        {stats.success > 0 && <span className="text-[11px] font-mono text-zinc-400 font-normal ml-0.5">({stats.success})</span>}
                    </button>
                </div>

                <div className="h-4 w-px bg-black/[0.06] dark:bg-white/[0.08] shrink-0 hidden sm:block"></div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-0.5 bg-[#f4f4f4] dark:bg-[#2f2f2f] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.06] shrink-0">
                    <button 
                        onClick={() => setViewMode('grid')} 
                        className={`p-1.5 sm:p-2 rounded-full transition-all active:scale-95 ${
                            viewMode === 'grid' 
                                ? 'bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 shadow-2xs' 
                                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`} 
                        title="Grid View"
                    >
                        <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`p-1.5 sm:p-2 rounded-full transition-all active:scale-95 ${
                            viewMode === 'list' 
                                ? 'bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 shadow-2xs' 
                                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`} 
                        title="List View"
                    >
                        <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                </div>

                {/* Grid Columns Dropdown (3 to 8, default 5) */}
                {viewMode === 'grid' && (
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                            className="flex items-center gap-1 px-2.5 h-7.5 sm:h-8 rounded-full text-xs font-medium transition-all bg-[#f4f4f4] dark:bg-[#2f2f2f] hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-black/[0.04] dark:border-white/[0.06] active:scale-95 shadow-2xs cursor-pointer"
                            title="选择网格列数 (3-8 列)"
                        >
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{currentColumns}列</span>
                            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isColumnsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isColumnsOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsColumnsOpen(false)} />
                                <div className="absolute left-0 mt-2 w-32 bg-white dark:bg-[#262626] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in duration-150 flex flex-col gap-0.5">
                                    <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                        网格列数
                                    </div>
                                    {[3, 4, 5, 6, 7, 8].map((col) => (
                                        <button
                                            key={col}
                                            onClick={() => {
                                                setSettings({ ...settings, gridColumns: col });
                                                setIsColumnsOpen(false);
                                            }}
                                            className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-xl transition-colors font-medium ${
                                                currentColumns === col
                                                    ? 'bg-black/[0.06] dark:bg-white/[0.1] text-zinc-900 dark:text-white font-semibold'
                                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span>{col} 列</span>
                                                {col === 5 && (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-normal">
                                                        默认
                                                    </span>
                                                )}
                                            </span>
                                            {currentColumns === col && <Check className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="h-4 w-px bg-black/[0.06] dark:bg-white/[0.08] shrink-0 hidden md:block"></div>

                {/* Extended Search Box (Flexible, truncates gracefully, never causes overflow) */}
                <div className="relative flex-1 min-w-[100px] max-w-[240px] 2xl:max-w-[320px] transition-all">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                searchInputRef.current?.blur();
                            }
                        }}
                        className="w-full bg-[#f4f4f4] dark:bg-[#2f2f2f] border border-black/[0.04] dark:border-white/[0.06] rounded-full pl-8.5 pr-7 h-8 text-xs transition-all text-zinc-800 dark:text-zinc-200 focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-zinc-300 dark:focus:border-zinc-600 focus:shadow-2xs outline-none placeholder:text-zinc-400 truncate"
                    />
                    {searchQuery ? (
                        <button 
                            onClick={() => {
                                setSearchQuery('');
                                searchInputRef.current?.focus();
                            }} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full p-0.5 transition-colors cursor-pointer"
                            title="清除搜索"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <kbd className="hidden 2xl:inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono text-zinc-400 bg-black/[0.04] dark:bg-white/[0.06] rounded border border-black/[0.06] dark:border-white/[0.08] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none select-none">
                            /
                        </kbd>
                    )}
                </div>
            </div>

            {/* Right Side: Selection Controls, Batch Tools, Data Tools, Run Logs, Next */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Selection Controls */}
                <button 
                    onClick={handlers.onSelectAll} 
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 shadow-2xs border cursor-pointer ${
                        selectionCount > 0
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent font-semibold'
                            : 'bg-white dark:bg-[#2f2f2f] text-zinc-700 dark:text-zinc-200 border-black/[0.06] dark:border-white/[0.08] hover:bg-zinc-50 dark:hover:bg-zinc-700'
                    }`} 
                    title="全选 / 反选 (Ctrl+A)"
                >
                    {selectionCount === visibleCount && visibleCount > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span>{selectionCount > 0 ? `已选 ${selectionCount}` : t('selectAll')}</span>
                </button>

                {/* Contextual Action Pill for Selected Items */}
                {selectionCount > 0 && (
                    <div className="flex items-center gap-0.5 bg-[#f0f0f0] dark:bg-[#2c2c2c] p-0.5 rounded-full border border-black/[0.05] dark:border-white/[0.08] animate-in slide-in-from-right-2 fade-in duration-150">
                        {onStartSelected && (
                            <button 
                                onClick={onStartSelected} 
                                className="flex items-center gap-1 px-2.5 h-7 bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 shadow-2xs cursor-pointer" 
                                title={t('startSelected')}
                            >
                                <Play className="w-3 h-3 fill-current" />
                                <span>打标</span>
                            </button>
                        )}

                        <button 
                            onClick={handlers.onMove} 
                            className="flex items-center gap-1 px-2 h-7 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 cursor-pointer" 
                            title={t('move')}
                        >
                            <FolderInput className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('move')}</span>
                        </button>
                        <button 
                            onClick={handlers.onDeleteSelected} 
                            className="flex items-center gap-1 px-2 h-7 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 cursor-pointer" 
                            title={t('deleteSelected')}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('deleteSelected')}</span>
                        </button>
                    </div>
                )}

                <div className="h-4 w-px bg-black/[0.06] dark:bg-white/[0.08] mx-0.5"></div>

                {/* Batch Actions */}
                <button 
                    onClick={handlers.onBatchEdit} 
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 h-8 bg-white dark:bg-[#2f2f2f] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-black/[0.06] dark:border-white/[0.08] rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 shadow-2xs cursor-pointer" 
                    title={t('batchEdit')}
                >
                    <Filter className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="hidden md:inline">{t('batchEdit')}</span>
                </button>

                {/* Dropdown Data Management Tools */}
                <div className="relative">
                    <button
                        onClick={() => setIsUtilsOpen(!isUtilsOpen)}
                        className={`flex items-center gap-1 px-2.5 sm:px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 border cursor-pointer ${
                            isUtilsOpen 
                                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600' 
                                : 'bg-white dark:bg-[#2f2f2f] text-zinc-700 dark:text-zinc-200 border-black/[0.06] dark:border-white/[0.08] hover:bg-zinc-50 dark:hover:bg-zinc-700'
                        } shadow-2xs`}
                        title="数据整理与清洗"
                    >
                        <Settings className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="hidden md:inline">整理</span>
                        <span className="text-[10px] opacity-60">▼</span>
                    </button>
                    {isUtilsOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsUtilsOpen(false)} />
                            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#262626] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in duration-150 flex flex-col gap-0.5">
                                <button
                                    onClick={() => { handlers.onOpenClean(); setIsUtilsOpen(false); }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                                >
                                    <Eraser className="w-3.5 h-3.5 text-amber-500" />
                                    {t('cleanLabel') || '清洗标签 (Regex)'}
                                </button>
                                {stats.error > 0 && (
                                    <button
                                        onClick={() => { handlers.onRetryErrors(); setIsUtilsOpen(false); }}
                                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                                        {t('retry') || '重试失败项'}
                                    </button>
                                )}
                                {stats.success > 0 && (
                                    <button
                                        onClick={() => { handlers.onClearDone(); setIsUtilsOpen(false); }}
                                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                                        {t('clearDone') || '清除已完成'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* 运行日志入口 */}
                {onOpenLog && (
                    <button
                        onClick={onOpenLog}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 border cursor-pointer ${
                            errorCount > 0
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/15 shadow-2xs'
                                : 'bg-white dark:bg-[#2f2f2f] text-zinc-700 dark:text-zinc-200 border-black/[0.06] dark:border-white/[0.08] hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs'
                        }`}
                        title="查看任务执行与错误日志"
                    >
                        <Terminal className={`w-3.5 h-3.5 ${errorCount > 0 ? 'text-red-500' : 'text-zinc-500'}`} />
                        <span className="hidden lg:inline">日志</span>
                        {errorCount > 0 ? (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-500 text-white animate-pulse">
                                {errorCount}
                            </span>
                        ) : warnCount > 0 ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        ) : null}
                    </button>
                )}

                {onNext && (
                    <button 
                        onClick={onNext} 
                        className="flex items-center gap-1 px-3 sm:px-3.5 h-8 bg-[#0d0d0d] dark:bg-white hover:opacity-90 text-white dark:text-[#0d0d0d] rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 shadow-2xs cursor-pointer ml-0.5 animate-in fade-in"
                        title={t('next')}
                    >
                        <span>{t('next')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
};
