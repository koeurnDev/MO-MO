const EventEmitter = require('events');

/**
 * MO-MO Elite Job Queue Service
 * Lightweight in-memory event-driven queue for decoupling high-latency tasks.
 * Pattern: Event-Driven Architecture (EDA)
 */

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.concurrency = 3;
    this.active = 0;
    this.queue = [];
    
    // Listen for new jobs
    this.on('new_job', this.processNext.bind(this));
  }

  async add(type, payload, handler) {
    this.queue.push({ id: Date.now() + Math.random(), type, payload, handler });
    console.log(`📥 EDA: Job [${type}] queued. (Queue depth: ${this.queue.length})`);
    this.emit('new_job');
  }

  async processNext() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;

    this.active++;
    const job = this.queue.shift();

    try {
      console.log(`⚙️ EDA: Processing [${job.type}]...`);
      await job.handler(job.payload);
      console.log(`✅ EDA: Job [${job.type}] completed.`);
    } catch (e) {
      console.error(`❌ EDA: Job [${job.type}] failed:`, e.message);
      // Optional: Add retry logic here
    } finally {
      this.active--;
      this.processNext();
    }
  }
}

const QueueService = new JobQueue();

module.exports = QueueService;
