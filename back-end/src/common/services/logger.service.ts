import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  message: string;
  data?: unknown;
  stack?: string;
}

/**
 * FileLoggerService — Singleton
 *
 * Writes structured JSON log lines to daily dated files:
 *   logs/access-YYYY-MM-DD.log  — HTTP access records
 *   logs/errors-YYYY-MM-DD.log  — Exception details + stack traces
 *   logs/audit-YYYY-MM-DD.log   — Sensitive-resource access events
 *
 * A new file is automatically started each calendar day.
 */
export class FileLoggerService {
  private static instance: FileLoggerService;
  private readonly logsDir: string;

  private constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(this.logsDir, { recursive: true });
  }

  static getInstance(): FileLoggerService {
    if (!FileLoggerService.instance) {
      FileLoggerService.instance = new FileLoggerService();
    }
    return FileLoggerService.instance;
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private filePath(channel: string): string {
    return path.join(this.logsDir, `${channel}-${this.todayStr()}.log`);
  }

  private write(channel: string, entry: LogEntry): void {
    try {
      fs.appendFileSync(this.filePath(channel), JSON.stringify(entry) + '\n', 'utf8');
    } catch (err) {
      console.error('[FileLoggerService] Failed to write log:', err);
    }
  }

  /** HTTP access log → access-YYYY-MM-DD.log */
  access(entry: Omit<LogEntry, 'level'>): void {
    this.write('access', { level: 'INFO', ...entry });
  }

  /** Error log with optional stack trace → errors-YYYY-MM-DD.log */
  error(entry: Omit<LogEntry, 'level'>): void {
    this.write('errors', { level: 'ERROR', ...entry });
  }

  /** Sensitive-route audit entry → audit-YYYY-MM-DD.log */
  audit(entry: Omit<LogEntry, 'level'>): void {
    this.write('audit', { level: 'INFO', ...entry });
  }
}
