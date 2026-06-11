import app from './app.js';
import { env } from './config/env.js';
import { startNotificationScheduler } from './modules/rentals-pos/notification.scheduler.js';

const PORT = env.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Film Camera Store Backend listening at http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  
  // Start background notification scheduler
  startNotificationScheduler();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
