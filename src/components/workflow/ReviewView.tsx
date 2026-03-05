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
                    avgTags += img.caption.split(',').length;
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
        <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Project Review</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Review your dataset statistics and health before exporting.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{stats.totalImages}</div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Images</div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{stats.totalCaptions}</div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Captioned</div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-2">
                        <div className={`p-3 rounded-full ${stats.missingCaptions > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{stats.missingCaptions}</div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Missing Tags</div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                            <Tags className="w-6 h-6" />
                        </div>
                        <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{stats.avgTags}</div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Avg Tags/Img</div>
                    </div>
                </div>

                {/* Issues List */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/50">
                        <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-zinc-500" />
                            Review Items
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${issues.length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                            {issues.length} Issues Found
                        </span>
                    </div>

                    {issues.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-1">All Good!</h4>
                            <p className="text-zinc-500 dark:text-zinc-400">No content issues detected. You are ready to export.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {issues.map((item, idx) => (
                                <div key={`${item.projectId}-${item.img.id}-${idx}`} className="p-4 flex gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                                        <img src={item.img.previewUrl} className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.img.file.name}</span>
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">{item.issue}</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{item.img.caption || "No caption"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button onClick={onNext} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm flex items-center gap-2">
                        Next: Export <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
};
