import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TagImage } from '../../types';
import { Wand2, Loader2, Layers, MousePointer2, Download } from '../Icons';

export interface InspectorProps {
    activeImage?: TagImage;
    inspectorProjectId?: string;
    inspectorProjectName?: string;
    onUpdateCaption: (text: string) => void;
    onRegen: () => void;
    onDownload: () => void;
    onRename: (newName: string) => void;
    stats?: { total: number; completed: number; pending: number; error: number; success: number };
    isProcessing?: boolean;
    images?: { img: TagImage; projId: string }[];
    onTagClick?: (tag: string) => void;
    isInspectorOpen?: boolean;
    onToggleInspector?: () => void;
    onCloseDetails?: () => void;
    t: (key: string) => string;
}

export const Inspector: React.FC<InspectorProps> = ({
    activeImage,
    inspectorProjectName,
    onUpdateCaption,
    onRegen,
    onDownload,
    onRename,
    stats,
    isProcessing,
    images,
    onTagClick,
    isInspectorOpen,
    onToggleInspector,
    onCloseDetails,
    t
}) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');

    const topTags = useMemo(() => {
        if (!images || images.length === 0) return [];
        const counts: Record<string, number> = {};

        images.forEach(item => {
            const img = item.img;
            if (img.caption && img.status === 'success') {
                const tags = img.caption.split(',')
                    .map(t => t.trim().toLowerCase())
                    .filter(t => t.length > 0);

                tags.forEach(t => {
                    counts[t] = (counts[t] || 0) + 1;
                });
            }
        });

        return Object.entries(counts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);
    }, [images]);

    useEffect(() => {
        if (activeImage) setRenameValue(activeImage.file.name);
    }, [activeImage]);

    const handleRename = () => {
        if (renameValue && renameValue !== activeImage?.file.name) {
            onRename(renameValue);
        }
        setIsRenaming(false);
    };

    return (
        <div 
            className={`relative h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-20 ${
                isInspectorOpen ? 'w-84 lg:w-92' : 'w-0'
            } ${activeImage ? '' : 'hidden lg:flex'}`}
        >
            {/* Toggle Handle Tab */}
            {activeImage && onToggleInspector && (
                <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-50">
                    <button
                        onClick={onToggleInspector}
                        className="h-16 w-5 rounded-l-xl bg-white dark:bg-[#212121] border border-r-0 border-black/[0.06] dark:border-white/[0.08] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                        title={isInspectorOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        {isInspectorOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>
            )}

            {/* Actual Inspector Panel */}
            <div 
                className={`h-full w-84 lg:w-92 bg-[#f9f9f9] dark:bg-[#171717] border-l border-black/[0.05] dark:border-white/[0.06] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
                    isInspectorOpen ? 'opacity-100' : 'w-0 border-l-0 opacity-0 pointer-events-none'
                }`}
            >
                {activeImage ? (
                <div className="flex-grow flex flex-col min-h-0 animate-in fade-in duration-200">
                    <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.05] flex flex-col gap-1.5 shrink-0 bg-white/50 dark:bg-[#212121]/50">
                        <div className="flex justify-between items-center">
                            {isRenaming ? (
                                <input
                                    autoFocus
                                    className="flex-1 bg-white dark:bg-[#212121] px-3 py-1.5 rounded-xl text-sm border border-black/[0.15] dark:border-white/[0.2] outline-none"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={handleRename}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                />
                            ) : (
                                <span
                                    className="truncate max-w-[210px] text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    title="Click to rename"
                                    onClick={() => setIsRenaming(true)}
                                >
                                    {activeImage.file.name}
                                </span>
                            )}
                            <div className="flex gap-1.5 shrink-0 items-center">
                                <span className="text-xs px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.06] truncate max-w-[100px] font-medium">
                                    {inspectorProjectName || 'Unknown'}
                                </span>
                                {onCloseDetails && (
                                    <button 
                                        onClick={onCloseDetails}
                                        className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                        title="Close details"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 text-xs text-zinc-400 font-mono">
                            <span>{Math.round(activeImage.file.size / 1024)}KB</span>
                            <span>•</span>
                            <span>{activeImage.file.type.split('/')[1]?.toUpperCase() || 'IMG'}</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {/* Contained image in minimalist card */}
                        <div className="aspect-square rounded-2xl overflow-hidden bg-white dark:bg-[#212121] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs relative group flex items-center justify-center p-3.5">
                            <img src={activeImage.previewUrl} className="w-full h-full object-contain" />
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{t('captionContent')}</label>
                                <button
                                    onClick={onRegen}
                                    disabled={activeImage.status === 'loading'}
                                    className="text-sm font-medium flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-40 transition-colors px-2.5 py-1 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                >
                                    {activeImage.status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                    {t('regen')}
                                </button>
                            </div>
                            <textarea
                                id="caption-textarea"
                                className="w-full h-48 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#212121] text-sm font-mono focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 resize-none text-zinc-800 dark:text-zinc-200 transition-all duration-200 leading-relaxed outline-none"
                                value={activeImage.caption}
                                onChange={(e) => onUpdateCaption(e.target.value)}
                                placeholder="Caption..."
                            />
                            <div className="flex justify-between items-center pt-0.5">
                                <button 
                                    onClick={onDownload} 
                                    className="text-sm font-medium flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors px-2.5 py-1 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                >
                                    <Download className="w-4 h-4 text-zinc-400" /> Save .txt
                                </button>
                                <span className="text-xs text-zinc-400 font-mono">{activeImage.caption.length} chars</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-5 bg-[#f9f9f9] dark:bg-[#171717] select-none animate-in fade-in duration-200">
                    {/* Header */}
                    <div className="pb-3 border-b border-black/[0.04] dark:border-white/[0.05] mb-4">
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-zinc-500" />
                            {t('projectOverview') || '项目全局概览'}
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">
                            {inspectorProjectName || t('allProjects') || '所有数据集'}
                        </p>
                    </div>

                    {/* Stats Cards */}
                    {stats && (
                        <div className="space-y-3.5">
                            {/* Circular/Progress Indicator Card */}
                            <div className="bg-white dark:bg-[#212121] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
                                <div className="flex justify-between items-center text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                    <span>{t('overallProgress') || '打标进度'}</span>
                                    <span className="text-zinc-900 dark:text-zinc-100 font-mono text-sm font-bold">
                                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ease-out ${isProcessing ? 'bg-zinc-800 dark:bg-zinc-200 animate-subtle-pulse' : 'bg-zinc-800 dark:bg-zinc-200'}`} 
                                        style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="text-center">
                                        <p className="text-xs text-zinc-400 font-normal">{t('completed') || '已完成'}</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 font-mono">{stats.completed}</p>
                                    </div>
                                    <div className="text-center border-l border-zinc-100 dark:border-zinc-800">
                                        <p className="text-xs text-zinc-400 font-normal">{t('pending') || '未打标'}</p>
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 font-mono">{stats.pending}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-[#212121] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-3.5 shadow-2xs text-center">
                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('totalImages') || '总图片数'}</p>
                                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">{stats.total}</p>
                                </div>
                                <div className="bg-white dark:bg-[#212121] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-3.5 shadow-2xs text-center">
                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t('failedItems') || '失败错误项'}</p>
                                    <p className={`text-xl font-bold mt-1 font-mono ${stats.error > 0 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{stats.error}</p>
                                </div>
                            </div>

                            {/* Instructions Box */}
                            <div className="bg-white dark:bg-[#212121] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 flex gap-3 shadow-2xs">
                                <MousePointer2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                                <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">{t('instructionTitle') || '快捷提示'}</p>
                                    <p className="text-xs">{t('selectAnImageToEdit') || '点击中间图片网格中的任一图片，即可在右侧查看高清大图并编辑 Caption 标签。'}</p>
                                </div>
                            </div>

                            {/* Top Tags Leaderboard */}
                            {topTags.length > 0 && (
                                <div className="bg-white dark:bg-[#212121] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs animate-in fade-in duration-300">
                                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3 flex items-center justify-between">
                                        <span>{t('topTags') || '高频数据集标签'}</span>
                                        <span className="text-xs text-zinc-400 font-mono font-normal">Rank 1-12</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                                        {topTags.map(({ tag, count }: { tag: string; count: number }) => (
                                            <button 
                                                key={tag} 
                                                onClick={() => onTagClick?.(tag)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 rounded-full border border-black/[0.04] dark:border-white/[0.06] transition-all text-xs font-mono group cursor-pointer"
                                                title={`Click to filter: ${tag}`}
                                            >
                                                <span className="text-zinc-700 dark:text-zinc-300 max-w-[130px] truncate font-normal" title={tag}>{tag}</span>
                                                <span className="bg-black/[0.06] dark:bg-white/[0.1] px-2 py-0.5 rounded-full text-xs text-zinc-500 dark:text-zinc-400 font-mono">{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
};
