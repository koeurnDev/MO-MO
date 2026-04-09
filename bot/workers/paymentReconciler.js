const orderService = require('../services/orderService');

/**
 * 🕵️ Payment Reconciler Worker
 * Periodically scans the database for missed payments.
 * This is the ultimate "Zero-Touch" safety net.
 */
class PaymentReconciler {
  constructor() {
    this.intervalMs = 15 * 60 * 1000; // 15 minutes
    this.timer = null;
    this.isProcessing = false;
  }

  start() {
    console.log('👷 Reconciler Worker: Initialized (Every 15m)');
    
    // Initial run after 30s to allow server to stabilize
    setTimeout(() => this.run(), 30000);

    this.timer = setInterval(() => {
      this.run();
    }, this.intervalMs);
  }

  async run() {
    if (this.isProcessing) {
      console.log('👷 Reconciler Worker: Previous run still in progress. Skipping...');
      return;
    }

    this.isProcessing = true;
    try {
      await orderService.reconcileAllPending();
    } catch (err) {
      console.error('🔴 Reconciler Worker Error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = new PaymentReconciler();
