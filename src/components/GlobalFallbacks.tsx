import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { FallbackProps } from 'react-error-boundary';

export function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 m-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6 whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800 text-left overflow-auto max-h-40">
                {error instanceof Error ? error.message : String(error)}
            </p>
            <button
                onClick={resetErrorBoundary}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
                <RotateCcw size={18} />
                Try Again
            </button>
        </div>
    );
}

export function ViewErrorFallback({ resetErrorBoundary }: FallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 text-center border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-xl m-4 bg-red-50/50 dark:bg-red-900/10">
            <AlertTriangle size={24} className="text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">View Error</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mb-4">
                Failed to render this section. The rest of the app should still work.
            </p>
            <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
            >
                Reload View
            </button>
        </div>
    );
}
