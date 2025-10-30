/**
 * Structured logging utility for BabelGopher
 * Provides consistent logging across all hooks and components
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogContext {
  component?: string;
  participantId?: string;
  participantName?: string;
  [key: string]: unknown;
}

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO;
  private isDevelopment: boolean = false;

  constructor() {
    // Set log level based on environment
    if (typeof window !== 'undefined') {
      this.isDevelopment = process.env.NODE_ENV === 'development';
      this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private formatMessage(
    level: string,
    component: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:mm:ss.SSS
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] [${component}]${contextStr} ${message}`;
  }

  debug(component: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(this.formatMessage('DEBUG', component, message, context));
  }

  info(component: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.formatMessage('INFO', component, message, context));
  }

  warn(component: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage('WARN', component, message, context));
  }

  error(component: string, message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const errorMsg = error ? ` Error: ${error.message}` : '';
    console.error(this.formatMessage('ERROR', component, message + errorMsg, context));
    if (error && error.stack && this.isDevelopment) {
      console.error(error.stack);
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Component-specific loggers for convenience
export const createComponentLogger = (componentName: string) => ({
  debug: (message: string, context?: LogContext) =>
    logger.debug(componentName, message, context),
  info: (message: string, context?: LogContext) =>
    logger.info(componentName, message, context),
  warn: (message: string, context?: LogContext) =>
    logger.warn(componentName, message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    logger.error(componentName, message, error, context),
});
