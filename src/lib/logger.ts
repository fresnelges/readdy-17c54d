type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

const MAX_STORED_LOGS = 200;

class Logger {
  private logs: LogEntry[] = [];
  private level: LogLevel = 'debug';

  constructor() {
    // Load persisted logs
    try {
      const stored = sessionStorage.getItem('rdy_app_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  private persist(): void {
    try {
      const toStore = this.logs.slice(-MAX_STORED_LOGS);
      sessionStorage.setItem('rdy_app_logs', JSON.stringify(toStore));
    } catch {
      // ignore
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 23);
  }

  log(level: LogLevel, category: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_STORED_LOGS * 2) {
      this.logs = this.logs.slice(-MAX_STORED_LOGS);
    }
    this.persist();

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}]`;
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}${dataStr}`);
        break;
      case 'info':
        console.info(`${prefix} ${message}${dataStr}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${dataStr}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}${dataStr}`);
        break;
    }
  }

  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  getLogs(level?: LogLevel, category?: string): LogEntry[] {
    let filtered = [...this.logs];
    if (level) {
      filtered = filtered.filter((l) => l.level === level);
    }
    if (category) {
      filtered = filtered.filter((l) => l.category === category);
    }
    return filtered.slice(-100);
  }

  getAllLogs(): LogEntry[] {
    return this.logs.slice(-100);
  }

  getRecentErrors(): LogEntry[] {
    return this.logs
      .filter((l) => l.level === 'error')
      .slice(-20);
  }

  clear(): void {
    this.logs = [];
    sessionStorage.removeItem('rdy_app_logs');
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /** Returns a formatted string of recent errors for display */
  getErrorSummary(): string {
    const errors = this.getRecentErrors();
    if (errors.length === 0) return '';
    return errors
      .map((e) => `[${e.timestamp}] ${e.category}: ${e.message}`)
      .join('\n');
  }
}

export const logger = new Logger();

// Export for global access in dev tools
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).__rdyLogger = logger;
}