const logger = require('../logger');

const jobs = new Map();
let jobIdCounter = 0;

function scheduleJob(name, task, options = {}) {
  const id = ++jobIdCounter;
  const interval = options.interval || 60000;
  
  const job = {
    id,
    name,
    task,
    interval,
    lastRun: null,
    nextRun: Date.now() + interval,
    running: false,
    retries: 0,
    maxRetries: options.maxRetries || 3
  };

  jobs.set(id, job);
  
  const timer = setInterval(async () => {
    await executeJob(id);
  }, interval);

  job.timer = timer;
  logger.info(`Job scheduled: ${name} (ID: ${id}, interval: ${interval}ms)`);
  
  return { id, name };
}

async function executeJob(jobId) {
  const job = jobs.get(jobId);
  if (!job || job.running) return;

  job.running = true;
  job.lastRun = Date.now();
  job.nextRun = Date.now() + job.interval;

  try {
    await job.task();
    job.retries = 0;
    logger.debug(`Job ${jobId} (${job.name}) completed successfully`);
  } catch (error) {
    job.retries++;
    logger.error(`Job ${jobId} (${job.name}) failed:`, error.message);
    
    if (job.retries >= job.maxRetries) {
      logger.error(`Job ${jobId} (${job.name}) exceeded max retries, removing`);
      cancelJob(jobId);
    }
  } finally {
    job.running = false;
  }
}

function cancelJob(jobId) {
  const job = jobs.get(jobId);
  if (job) {
    if (job.timer) clearInterval(job.timer);
    jobs.delete(jobId);
    logger.info(`Job ${jobId} (${job.name}) cancelled`);
  }
}

function getJobStatus(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  
  return {
    id: job.id,
    name: job.name,
    lastRun: job.lastRun,
    nextRun: job.nextRun,
    running: job.running,
    retries: job.retries
  };
}

function getAllJobs() {
  return [...jobs.values()].map(job => ({
    id: job.id,
    name: job.name,
    lastRun: job.lastRun,
    nextRun: job.nextRun,
    running: job.running,
    retries: job.retries
  }));
}

module.exports = {
  scheduleJob,
  executeJob,
  cancelJob,
  getJobStatus,
  getAllJobs
};
