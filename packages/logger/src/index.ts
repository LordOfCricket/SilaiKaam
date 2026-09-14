import pino, { type Logger, type LoggerOptions } from 'pino';

export type { Logger };

export interface CreateLoggerOptions {
  serviceName: string;
  level?: string;
}

export function createLogger({ serviceName, level }: CreateLoggerOptions): Logger {
  const options: LoggerOptions = {
    level: level ?? process.env.LOG_LEVEL ?? 'info',
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (process.env.NODE_ENV !== 'production') {
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    };
  }

  return pino(options);
}
