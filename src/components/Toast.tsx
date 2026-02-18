
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from './Icons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
}

export const ToastContainer = ({
    toasts,
    removeToast
}: {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}) => {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto w-full
                        flex items-start gap-3 p-4 rounded-xl shadow-xl border transition-all duration-300 animate-in slide-in-from-top-2 fade-in
                        bg-white dark:bg-zinc-800
                        ${toast.type === 'success' ? 'border-emerald-500/50 shadow-emerald-500/10' : ''}
                        ${toast.type === 'error' ? 'border-red-500/50 shadow-red-500/10' : ''}
                        ${toast.type === 'info' ? 'border-blue-500/50 shadow-blue-500/10' : ''}
                    `}
                >
                    <div className={`mt-0.5 shrink-0 ${toast.type === 'success' ? 'text-emerald-500' :
                            toast.type === 'error' ? 'text-red-500' : 'text-blue-500'
                        }`}>
                        {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {toast.type === 'info' && <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        {/* Split message if it contains a colon for better title/body separation */}
                        {toast.message.includes(':') ? (
                            <>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                                    {toast.message.split(':')[0]}
                                </p>
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 break-words leading-relaxed font-mono bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded border border-zinc-100 dark:border-zinc-800">
                                    {toast.message.split(':').slice(1).join(':').trim()}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 leading-tight break-words">
                                {toast.message}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <AutoDismiss id={toast.id} onDismiss={removeToast} duration={3000} />
                </div>
            ))}
        </div>
    );
};

const AutoDismiss = ({ id, onDismiss, duration }: { id: string, onDismiss: (id: string) => void, duration: number }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onDismiss]);

    return null;
};
