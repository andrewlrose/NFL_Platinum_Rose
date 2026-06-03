// Entry point for `node src/server.js` and the systemd unit.
import { buildServer } from './app.js';
import { config } from './config.js';

const app = buildServer();

const closeOnSignal = async (signal) => {
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error(err, 'error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => closeOnSignal('SIGTERM'));
process.on('SIGINT', () => closeOnSignal('SIGINT'));

app.listen({ host: config.host, port: config.port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
