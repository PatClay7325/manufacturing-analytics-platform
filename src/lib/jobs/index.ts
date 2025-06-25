/**
 * Job Queue Setup
 * Register job handlers and initialize queue
 */

import { jobQueue } from './queue';
import { handleImportJob } from './handlers/import-handler';

// Register job handlers
jobQueue.register('import:manufacturing-data', handleImportJob);

// Start the queue
if (process.env.NODE_ENV !== 'test') {
  jobQueue.start();
  console.log('Job queue started');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down job queue...');
  await jobQueue.stop();
  process.exit(0);
});

export { jobQueue };