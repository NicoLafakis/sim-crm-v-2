/**
 * Structured logging helper for JSON-formatted logs
 */

export function logEvent(
  level: 'info' | 'warn' | 'error',
  correlationId: string,
  event: string,
  data?: Record<string, any>
): void {
  // Skip if structured logging is disabled
  if (process.env.STRUCTURED_LOGGING !== 'true') {
    return;
  }

  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    correlationId,
    event,
    ...(data || {})
  };

  const message = JSON.stringify(logEntry);

  // Output to console based on level
  switch (level) {
    case 'error':
      console.error(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'info':
    default:
      console.log(message);
      break;
  }
}