import { useState, useEffect } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
}

type LogListener = (logs: LogEntry[]) => void;

class LoggerService {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 300;

  add(level: LogEntry['level'], message: string, details?: string) {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0]; // "20:05:12"
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      level,
      message,
      details
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    this.notify();
  }

  info(message: string, details?: string) {
    this.add('info', message, details);
  }

  warn(message: string, details?: string) {
    this.add('warn', message, details);
  }

  error(message: string, details?: string) {
    this.add('error', message, details);
  }

  success(message: string, details?: string) {
    this.add('success', message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.notify();
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = [...this.logs];
    for (const listener of this.listeners) {
      listener(current);
    }
  }
}

export const appLogger = new LoggerService();

export const useAppLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>(() => appLogger.getLogs());

  useEffect(() => {
    return appLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
  }, []);

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return {
    logs,
    clearLogs: () => appLogger.clear(),
    errorCount,
    warnCount
  };
};
