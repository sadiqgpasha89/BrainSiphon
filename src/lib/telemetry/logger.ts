import pino from 'pino';

/** Structured JSON logs with correlation ids; secrets and cookies are redacted at the serializer level. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'brainsiphon', env: process.env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'headers["x-api-key"]',
      '*.password',
      '*.token',
      '*.secret',
      'DATABASE_URL',
      'REDIS_URL',
    ],
    censor: '[redacted]',
  },
});

export const requestLogger = (requestId: string | null | undefined) =>
  logger.child({ requestId: requestId ?? 'none' });
