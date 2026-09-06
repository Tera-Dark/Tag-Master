import React, { useState } from 'react';
import { useAppLogs } from '../../services/loggerService';
import { X, Trash2, Copy, Check, Terminal, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose }) => {
  const { logs, clearLogs, errorCount, warnCount } = useAppLogs();
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(entry => {
    if (filter === 'error') return entry.level === 'error';
    if (filter === 'warn') return entry.level === 'warn';
    return true;
  });

  const handleCopyAll = async () => {
    const text = logs
      .slice()
      .reverse()
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${l.details ? `\n  Details: ${l.details}` : ''}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy logs', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[85vh] bg-[#141414] text-zinc-200 border border-white/[0.1] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.06] text-zinc-300">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <span>任务运行与错误日志</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-400 font-normal">
                  {logs.length} 条记录
                </span>
              </h3>
              <p className="text-xs text-zinc-400">实时记录 API 请求、速率限流冷却及错误异常</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-xl transition-all disabled:opacity-30 cursor-pointer"
              title="复制全部日志"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制全部'}</span>
            </button>
            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-white/[0.06] rounded-xl transition-all disabled:opacity-30 cursor-pointer"
              title="清空日志"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.06] bg-[#171717] text-xs">
          <span className="text-zinc-500 font-mono text-[11px] mr-1">过滤级别:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
              filter === 'all'
                ? 'bg-white/15 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
            }`}
          >
            全部 ({logs.length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
              filter === 'error'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'text-zinc-400 hover:text-red-300 hover:bg-red-500/10'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>错误 ({errorCount})</span>
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium cursor-pointer ${
              filter === 'warn'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>警告/限流 ({warnCount})</span>
          </button>
        </div>

        {/* Logs List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs custom-scrollbar min-h-[320px] max-h-[55vh] bg-[#0f0f0f]">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-zinc-500">
              <Terminal className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-sm">暂无匹配的运行日志</p>
              <p className="text-[11px] text-zinc-600 mt-1">打标过程中系统会自动将进度、速率等待与报错记录在此处</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div 
                key={log.id} 
                className={`p-2.5 rounded-xl border transition-colors ${
                  log.level === 'error'
                    ? 'bg-red-950/20 border-red-900/40 text-red-200'
                    : log.level === 'warn'
                    ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                    : log.level === 'success'
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                    : 'bg-white/[0.02] border-white/[0.04] text-zinc-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-zinc-500 font-mono text-[11px] shrink-0 pt-0.5 select-none">
                    [{log.timestamp}]
                  </span>
                  <div className="shrink-0 pt-0.5">
                    {log.level === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                    {log.level === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    {log.level === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {log.level === 'info' && <Info className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0 break-words leading-relaxed">
                    <p className="font-medium text-xs">{log.message}</p>
                    {log.details && (
                      <p className="mt-1 text-[11px] opacity-80 font-mono bg-black/30 p-2 rounded-lg border border-white/[0.04] whitespace-pre-wrap select-all">
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
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#171717] flex justify-between items-center text-xs text-zinc-500">
          <span>💡 提示：若因网络或接口问题导致中断，可直接复制此日志用于排查。</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 font-semibold transition-all cursor-pointer shadow-xs"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
