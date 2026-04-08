/**
 * MO-MO Offline Outbox Service (v2 - Principal Edition)
 * Features: Concurrent throttling, Jittered sync, and Persistence.
 * Now prevents "Thundering Herd" API crashes.
 */

const OUTBOX_KEY = 'momo_offline_outbox';
const SYNC_INTERVAL_MS = 1000; // Throttle: 1 request per second max during sync
const JITTER_RANGE_MS = 2000;  // Random initial delay to spread the load

const OfflineService = {
  queueRequest: (url, options) => {
    const outbox = OfflineService.getOutbox();
    const newRequest = {
      id: Date.now() + Math.random().toString(36).substring(7),
      url,
      options,
      timestamp: new Date().toISOString()
    };
    outbox.push(newRequest);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
    console.log('📦 Request queued in outbox:', newRequest.id);
    return newRequest.id;
  },

  getOutbox: () => {
    try {
      const saved = localStorage.getItem(OUTBOX_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },

  /**
   * Principal Logic: Serial Processing with Throttling & Jitter
   */
  syncOutbox: async (fetchWithRetry) => {
    const outbox = OfflineService.getOutbox();
    if (outbox.length === 0) return;

    // 🌪️ THUNDERING HERD PROTECTION: Add random jitter before starting sync
    const jitter = Math.floor(Math.random() * JITTER_RANGE_MS);
    console.log(`🔄 Sync starting in ${jitter}ms (Jitter active)...`);
    await new Promise(res => setTimeout(res, jitter));

    console.log(`🚀 Syncing ${outbox.length} pending requests...`);
    
    for (const req of [...outbox]) {
      try {
        const result = await fetchWithRetry(req.url, req.options);
        if (result.success) {
          // Atomic update of outbox
          const currentOutbox = OfflineService.getOutbox();
          const filtered = currentOutbox.filter(item => item.id !== req.id);
          localStorage.setItem(OUTBOX_KEY, JSON.stringify(filtered));
          console.log(`✅ Request ${req.id} synced successfully.`);
        } else {
          console.warn(`⏳ Request ${req.id} sync failed (Retrying later). Error:`, result.error);
        }
        
        // ⏱️ THROTTLE: Wait before next request to prevent API burst
        await new Promise(res => setTimeout(res, SYNC_INTERVAL_MS));
        
      } catch (e) {
        console.error(`❌ Global Sync failure for ${req.id}:`, e);
      }
    }
  }
};

export default OfflineService;
