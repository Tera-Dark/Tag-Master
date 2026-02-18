import React, { useState } from 'react';
import { Download, FileText, Code, CheckCircle2 } from '../Icons';

interface ExportViewProps {
    onExport: (format: 'txt' | 'json') => void;
    totalImages: number;
    t: (key: any) => string;
}

export const ExportView: React.FC<ExportViewProps> = ({ onExport, totalImages, t }) => {
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
        <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-2xl mx-auto w-full space-y-8">

                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Export Dataset</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Choose your preferred format and download your training data.</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                    <div className="p-8 space-y-8">

                        {/* Summary */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 flex items-center gap-4 text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800/30">
                            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                            <div>
                                <div className="font-bold">Ready to Export</div>
                                <div className="text-sm opacity-80">{totalImages} images and captions prepared.</div>
                            </div>
                        </div>

                        {/* Format Selection */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider">Select Format</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFormat('txt')}
                                    className={`relative p-6 rounded-xl border-2 text-left transition-all ${format === 'txt'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500'
                                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${format === 'txt' ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Text Files</div>
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Standard .txt caption files side-by-side with images.</div>
                                    {format === 'txt' && <div className="absolute top-4 right-4 text-indigo-500"><CheckCircle2 className="w-5 h-5" /></div>}
                                </button>

                                <button
                                    onClick={() => setFormat('json')}
                                    className={`relative p-6 rounded-xl border-2 text-left transition-all ${format === 'json'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500'
                                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${format === 'json' ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                        <Code className="w-6 h-6" />
                                    </div>
                                    <div className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Kohya JSON</div>
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Single metadata.json file compatible with Kohya-ss scripts.</div>
                                    {format === 'json' && <div className="absolute top-4 right-4 text-indigo-500"><CheckCircle2 className="w-5 h-5" /></div>}
                                </button>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-4">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${isExporting
                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {isExporting ? (
                                    <>Processing...</>
                                ) : (
                                    <><Download className="w-6 h-6" /> Download Dataset</>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
