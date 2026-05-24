/**
 * Controlled logger — debug messages are stripped in production builds.
 *
 * Usage:
 *   import logger from './logger';
 *   logger.log('...');   // only emits in dev
 *   logger.warn('...');  // always emits (non-fatal operational warnings)
 *   logger.error('...'); // always emits
 */
const isDev = import.meta.env.DEV;

// eslint-disable-next-line no-console
const log   = isDev ? (...a) => console.log(...a)   : () => {};
// eslint-disable-next-line no-console
const warn  = (...a) => console.warn(...a);
// eslint-disable-next-line no-console
const error = (...a) => console.error(...a);

const logger = { log, warn, error };
export default logger;
