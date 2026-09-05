import React, { useState } from 'react';
import { Download, FileText, Code, CheckCircle2 } from '../Icons';

interface ExportViewProps {
    onExport: (format: 'txt' | 'json') => void;
    totalImages: number;
}

export const ExportView: React.FC<ExportViewProps> = ({ onExport, totalImages }) => {
    const [format, setFormat] = useState<'txt' | 'json'>('txt');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        // Simulate a small delay for better UX if needed, or just call directly
        await new Promise(resolve => setTimeout(resolve, 500));
        onExport(format);
        setIsExporting(false);
    };

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#212121] p-6 md:p-10 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 ease-out">
            <div className="max-w-xl mx-auto w-full space-y-6">

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Export Dataset</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose your preferred format and download your training data.</p>
                </div>

                <div className="bg-white dark:bg-[#262626] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs overflow-hidden">
                    <div className="p-6 md:p-8 space-y-6">

                        {/* Summary */}
                        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl p-4 flex items-center gap-3.5 text-zinc-800 dark:text-zinc-200 border border-black/[0.04] dark:border-white/[0.06]">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            <div>
                                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Ready to Export</div>
                                <div className="text-sm text-zinc-500 dark:text-zinc-400">{totalImages} images and captions prepared.</div>
                            </div>
                        </div>

                        {/* Format Selection */}
                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Format</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <button
                                    onClick={() => setFormat('txt')}
                                    className={`relative p-5 rounded-xl text-left transition-all border ${
                                        format === 'txt'
                                            ? 'border-transparent ring-2 ring-zinc-900 dark:ring-white bg-black/[0.02] dark:bg-white/[0.03]'
                                            : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.15] bg-white dark:bg-[#212121]'
                                    }`}
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="font-semibold text-base text-zinc-900 dark:text-zinc-100">Text Files</div>
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Standard .txt caption files side-by-side with images.</div>
                                    {format === 'txt' && <div className="absolute top-4 right-4 text-zinc-900 dark:text-white"><CheckCircle2 className="w-5 h-5" /></div>}
                                </button>

                                <button
                                    onClick={() => setFormat('json')}
                                    className={`relative p-5 rounded-xl text-left transition-all border ${
                                        format === 'json'
                                            ? 'border-transparent ring-2 ring-zinc-900 dark:ring-white bg-black/[0.02] dark:bg-white/[0.03]'
                                            : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.15] bg-white dark:bg-[#212121]'
                                    }`}
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                        <Code className="w-5 h-5" />
                                    </div>
                                    <div className="font-semibold text-base text-zinc-900 dark:text-zinc-100">Kohya JSON</div>
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Single metadata.json file compatible with Kohya-ss scripts.</div>
                                    {format === 'json' && <div className="absolute top-4 right-4 text-zinc-900 dark:text-white"><CheckCircle2 className="w-5 h-5" /></div>}
                                </button>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-2">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="w-full py-3.5 bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] rounded-full font-semibold text-sm shadow-2xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
                            >
                                {isExporting ? (
                                    <>Processing...</>
                                ) : (
                                    <><Download className="w-4 h-4" /> Download Dataset</>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
