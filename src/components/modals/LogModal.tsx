import { DialogOverlay } from '../ui/DialogOverlay';
import React, { useEffect, useState } from 'react';
import { useAppLogs } from '../../services/loggerService';
import {
  X,
  Trash2,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose }) => {
  const { logs, clearLogs, errorCount, warnCount } = useAppLogs();
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((entry) => {
    if (filter === 'error') return entry.level === 'error';
    if (filter === 'warn') return entry.level === 'warn';
    return true;
  });

  const handleCopyAll = async () => {
    const text = logs
      .slice()
      .reverse()
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${l.details ? `\n  Details: ${l.details}` : ''}`
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (e) {
      console.error('Failed to copy logs', e);
    }
  };

  return (
    <DialogOverlay
      onClose={onClose}
      label='运行日志'
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200'
    >
      <div
        className='relative w-full max-w-3xl max-h-[85vh] bg-tm-canvas text-tm-secondary border border-tm-border rounded-2xl shadow-none flex flex-col overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-tm-border bg-tm-panel'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 rounded-xl bg-tm-muted text-tm-secondary'>
              <Terminal className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-semibold text-sm text-tm-text flex items-center gap-2'>
                <span>任务运行与错误日志</span>
                <span className='text-[11px] font-mono px-2 py-0.5 rounded-full bg-tm-muted text-tm-subtle font-normal'>
                  {logs.length} 条记录
                </span>
              </h3>
              <p className='text-xs text-tm-subtle'>实时记录 API 请求、速率限流冷却及错误异常</p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={handleCopyAll}
              disabled={logs.length === 0}
              className='tm-button flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-tm-secondary hover:text-tm-text bg-tm-muted hover:bg-tm-muted rounded-xl transition-all disabled:opacity-30 cursor-pointer'
              title='复制全部日志'
            >
              {copied ? (
                <Check className='w-3.5 h-3.5 text-emerald-400' />
              ) : (
                <Copy className='w-3.5 h-3.5' />
              )}
              <span>{copied ? '已复制' : '复制全部'}</span>
            </button>
            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className='tm-button p-1.5 text-tm-subtle hover:text-red-400 hover:bg-tm-muted rounded-xl transition-all disabled:opacity-30 cursor-pointer'
              title='清空日志'
            >
              <Trash2 className='w-4 h-4' />
            </button>
            <button
              onClick={onClose}
              className='tm-button p-1.5 text-tm-subtle hover:text-tm-text hover:bg-tm-muted rounded-xl transition-all cursor-pointer'
              title='关闭 (Esc)'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className='flex items-center gap-2 px-6 py-2.5 border-b border-tm-border bg-tm-panel text-xs'>
          <span className='text-tm-subtle font-mono text-[11px] mr-1'>过滤级别:</span>
          <button
            onClick={() => setFilter('all')}
            className={`tm-button px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
              filter === 'all'
                ? 'bg-tm-muted text-tm-text'
                : 'text-tm-subtle hover:text-tm-secondary hover:bg-tm-muted'
            }`}
          >
            全部 ({logs.length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`tm-button flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
              filter === 'error'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'text-tm-subtle hover:text-red-300 hover:bg-red-500/10'
            }`}
          >
            <AlertCircle className='w-3.5 h-3.5 text-red-400' />
            <span>错误 ({errorCount})</span>
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`tm-button flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
              filter === 'warn'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-tm-subtle hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <AlertTriangle className='w-3.5 h-3.5 text-amber-400' />
            <span>警告/限流 ({warnCount})</span>
          </button>
        </div>

        {/* Logs List Area */}
        <div className='flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs custom-scrollbar min-h-[320px] max-h-[55vh] bg-tm-canvas'>
          {filteredLogs.length === 0 ? (
            <div className='h-full flex flex-col items-center justify-center py-16 text-tm-subtle'>
              <Terminal className='w-8 h-8 opacity-40 mb-2' />
              <p className='text-sm'>暂无匹配的运行日志</p>
              <p className='text-[11px] text-tm-subtle mt-1'>
                打标过程中系统会自动将进度、速率等待与报错记录在此处
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border transition-colors ${
                  log.level === 'error'
                    ? 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-300'
                    : log.level === 'warn'
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-300'
                      : log.level === 'success'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-tm-panel border-tm-border text-tm-secondary'
                }`}
              >
                <div className='flex items-start gap-2.5'>
                  <span className='text-tm-subtle font-mono text-[11px] shrink-0 pt-0.5 select-none'>
                    [{log.timestamp}]
                  </span>
                  <div className='shrink-0 pt-0.5'>
                    {log.level === 'error' && <AlertCircle className='w-3.5 h-3.5 text-red-400' />}
                    {log.level === 'warn' && (
                      <AlertTriangle className='w-3.5 h-3.5 text-amber-400' />
                    )}
                    {log.level === 'success' && (
                      <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400' />
                    )}
                    {log.level === 'info' && <Info className='w-3.5 h-3.5 text-tm-subtle' />}
                  </div>
                  <div className='flex-1 min-w-0 break-words leading-relaxed'>
                    <p className='font-medium text-xs'>{log.message}</p>
                    {log.details && (
                      <p className='mt-1 text-[11px] opacity-80 font-mono bg-tm-muted p-2 rounded-lg border border-tm-border whitespace-pre-wrap select-all'>
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className='px-6 py-3 border-t border-tm-border bg-tm-panel flex justify-between items-center text-xs text-tm-subtle'>
          <span> 提示：若因网络或接口问题导致中断，可直接复制此日志用于排查。</span>
          <button
            onClick={onClose}
            className='tm-button tm-button-primary px-4 py-1.5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 font-semibold transition-all cursor-pointer shadow-none'
          >
            完成
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
