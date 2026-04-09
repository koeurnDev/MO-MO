const crypto = require('crypto');
const fetch = require('node-fetch');
const https = require('https');

/**
 * Bakong Intelligence Service
 * Handles communication with the Bakong Open API for payment verification.
 */
class BakongService {
  constructor() {
    this.apiUrl = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';
    this.token = process.env.BAKONG_API_TOKEN;
    
    // 🚀 Performance: Reuse connection to Bakong (Connection Pooling)
    // This saves ~200-500ms per request by skipping the SSL handshake.
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 100,
      keepAliveMsecs: 60000
    });
  }

  /**
   * Generates MD5 hash of the KHQR string as required by Bakong API
   */
  generateMd5(qrString) {
    return crypto.createHash('md5').update(qrString).digest('hex');
  }

  /**
   * Checks the status of a transaction with the Bakong Network
   * Returns: { success: boolean, data: object, message: string }
   */
  async checkTransaction(qrString) {
    if (!this.token) {
      return { success: false, message: 'Bakong API Token not configured' };
    }

    const md5 = this.generateMd5(qrString);
    const endpoint = `${this.apiUrl}/v1/check_transaction_by_md5`;

    try {
      console.log(`🔍 Bakong: Checking transaction MD5: ${md5}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        agent: this.agent, // 🚀 Connection Reuse
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ md5 })
      });

      const result = await response.json();
      
      if (process.env.NODE_ENV !== 'production' || true) { // Force log for debugging verification issues
        console.log(`📡 Bakong API Response for ${md5}:`, JSON.stringify(result));
      }

      // 🛡️ Principal: Bakong API might return status in root or status object
      const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;
      const errorCode = result.errorCode !== undefined ? result.errorCode : result.status?.errorCode;
      const message = result.responseMessage || result.status?.message || 'Transaction not found or pending';

      if (responseCode === 0) {
        return { 
          success: true, 
          data: result.data, 
          message: 'Payment detected successfully' 
        };
      }

      // 🛡️ Identify Stale/Invalid Context (errorCode 15: Internal Error or Not Found)
      const isStale = errorCode === 15;

      return { 
        success: false, 
        isStale,
        message: message 
      };
    } catch (error) {
      console.error('🔴 Bakong API Error:', error.message);
      return { success: false, message: 'Failed to communicate with Bakong network' };
    }
  }

  /**
   * 🛡️ Health Check: Verifies if the Bakong API is reachable and Token is valid.
   * Useful to prevent giving QR codes if verification is offline.
   */
  async checkHealth() {
    if (!this.token) return { success: false, message: 'Bakong API Token not configured' };
    
    // We use a dummy but valid MD5 structure to test connectivity
    const dummyMd5 = '36e47644e7e64d364e4ed284f86feb9b';
    const endpoint = `${this.apiUrl}/v1/check_transaction_by_md5`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        agent: this.agent, // 🚀 Connection Reuse
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ md5: dummyMd5 })
      });

      const result = await response.json();
      
      const responseCode = result.responseCode !== undefined ? result.responseCode : result.status?.code;
      const errorCode = result.errorCode !== undefined ? result.errorCode : result.status?.errorCode;

      // If we get "Not Found" (1) or "Success" (0), the token is working.
      if (responseCode === 0 || errorCode === 1) {
        return { success: true, message: 'Bakong Gateway is healthy' };
      }

      return { success: false, message: result.responseMessage || 'Bakong Gateway authentication failed' };
    } catch (error) {
      return { success: false, message: 'Cannot reach Bakong Gateway' };
    }
  }
}

module.exports = new BakongService();
