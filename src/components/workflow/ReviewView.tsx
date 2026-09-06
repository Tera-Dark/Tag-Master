import React, { useMemo } from 'react';
import { Project, TagImage } from '../../types';
import { AlertCircle, CheckCircle2, FileText, ImageIcon, Tags, ArrowRight } from '../Icons';

interface ReviewViewProps {
    projects: Project[];
    onNext: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({ projects, onNext }) => {
    // --- Statistics ---
    const stats = useMemo(() => {
        let totalImages = 0;
        let totalCaptions = 0;
        let missingCaptions = 0;
        let errorCount = 0;
        let avgTags = 0;

        projects.forEach(p => {
            p.images.forEach(img => {
                totalImages++;
                if (img.caption) {
                    totalCaptions++;
                    const tagBlock = img.caption.split(/\n\s*\n/)[0];
                    avgTags += tagBlock.split(',').filter(t => t.trim().length > 0).length;
                } else {
                    missingCaptions++;
                }
                if (img.status === 'error') errorCount++;
            });
        });

        avgTags = totalCaptions > 0 ? Math.round(avgTags / totalCaptions) : 0;

        return { totalImages, totalCaptions, missingCaptions, errorCount, avgTags };
    }, [projects]);

    const issues = useMemo(() => {
        const list: { projectId: string; img: TagImage; issue: string }[] = [];
        projects.forEach(p => {
            p.images.forEach(img => {
                if (!img.caption) {
                    list.push({ projectId: p.id, img, issue: 'Missing caption' });
                } else if (img.caption.length < 10) {
                    list.push({ projectId: p.id, img, issue: 'Caption too short' });
                }
                if (img.status === 'error') {
                    list.push({ projectId: p.id, img, issue: img.errorMsg || 'Processing error' });
                }
            });
        });
        return list;
    }, [projects]);

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#212121] p-6 md:p-10 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 ease-out">
            <div className="max-w-4xl mx-auto w-full space-y-6">

                {/* Header */}
                <div className="text-center space-y-1.5">
                    <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Project Review</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Review your dataset statistics and health before exporting.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-[#262626] p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs flex flex-col items-center justify-center gap-1.5">
                        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{stats.totalImages}</div>
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Images</div>
                    </div>

                    <div className="bg-white dark:bg-[#262626] p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs flex flex-col items-center justify-center gap-1.5">
                        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 rounded-full">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{stats.totalCaptions}</div>
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Captioned</div>
                    </div>

                    <div className="bg-white dark:bg-[#262626] p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs flex flex-col items-center justify-center gap-1.5">
                        <div className={`p-2.5 rounded-full ${stats.missingCaptions > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{stats.missingCaptions}</div>
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Missing Tags</div>
                    </div>

                    <div className="bg-white dark:bg-[#262626] p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs flex flex-col items-center justify-center gap-1.5">
                        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full">
                            <Tags className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{stats.avgTags}</div>
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avg Tags/Img</div>
                    </div>
                </div>

                {/* Issues List */}
                <div className="bg-white dark:bg-[#262626] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-black/[0.04] dark:border-white/[0.06] flex justify-between items-center bg-black/[0.015] dark:bg-white/[0.02]">
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-400" />
                            Review Items
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${issues.length > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-black/[0.04] text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300'}`}>
                            {issues.length} Issues Found
                        </span>
                    </div>

                    {issues.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-3">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">All Good!</h4>
                            <p className="text-sm text-zinc-400">No content issues detected. You are ready to export.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.05] max-h-[360px] overflow-y-auto custom-scrollbar">
                            {issues.map((item, idx) => (
                                <div key={`${item.projectId}-${item.img.id}-${idx}`} className="p-4 flex gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                    <div className="w-14 h-14 bg-[#fbfbfb] dark:bg-[#1a1a1a] rounded-xl overflow-hidden flex-shrink-0 border border-black/[0.04] dark:border-white/[0.06] p-1 flex items-center justify-center">
                                        <img src={item.img.previewUrl} className="w-full h-full object-contain" loading="lazy" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.img.file.name}</span>
                                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">{item.issue}</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">{item.img.caption || "No caption"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-2">
                    <button 
                        onClick={onNext} 
                        className="px-6 py-2.5 bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] rounded-full font-semibold text-sm shadow-2xs hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                    >
                        Next: Export <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
};
