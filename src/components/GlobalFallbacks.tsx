import { AlertTriangle, RotateCcw } from 'lucide-react';
import { FallbackProps } from 'react-error-boundary';

export function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className='flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white dark:bg-zinc-800 rounded-xl shadow-none border border-red-100 dark:border-red-900/30 m-4'>
      <div className='w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6'>
        <AlertTriangle size={32} />
      </div>
      <h2 className='text-xl font-semibold text-tm-text mb-2'>Something went wrong</h2>
      <p className='text-tm-subtle max-w-md mb-6 whitespace-pre-wrap font-mono text-sm bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 text-left overflow-auto max-h-40'>
        {error instanceof Error ? error.message : String(error)}
      </p>
      <button
        onClick={resetErrorBoundary}
        className='tm-button tm-button-primary flex items-center gap-2 px-6 py-2.5 bg-zinc-600 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors shadow-none'
      >
        <RotateCcw size={18} />
        Try Again
      </button>
    </div>
  );
}

export function ViewErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className='flex flex-col items-center justify-center h-full min-h-[300px] p-6 text-center border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-xl m-4 bg-red-50/50 dark:bg-red-900/10'>
      <AlertTriangle size={24} className='text-red-500 mb-3' />
      <h3 className='text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2'>View Error</h3>
      <p className='text-sm text-zinc-600 dark:text-tm-subtle max-w-sm mb-4'>
        Failed to render this section. The rest of the app should still work.
      </p>
      <button
        onClick={resetErrorBoundary}
        className='tm-button px-4 py-2 bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors'
      >
        Reload View
      </button>
    </div>
  );
}
