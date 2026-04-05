import { useState, useEffect } from "react";
import QRCode from "qrcode";

function App() {
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState(""); // UI Status text
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle, pending, paid

  async function pay() {
    setStatus("Requesting...");
    setError("");
    setQr("");
    setOrderId(null);
    setPaymentStatus("idle");

    try {
      const res = await fetch("http://localhost:3000/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 5000 })
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();

      if (data.qr) {
        setStatus("Generating QR Image...");
        const toDataURL = QRCode.toDataURL || QRCode.default?.toDataURL;
        const img = await toDataURL(data.qr);
        setQr(img);
        setOrderId(data.orderId);
        setPaymentStatus("pending");
        setStatus("Waiting for payment...");
      } else {
        setError("No QR data received");
      }
    } catch (e) {
      console.error("Payment error:", e);
      setError("Fetch Error: " + e.message);
    }
  }

  // Polling for status
  useEffect(() => {
    let interval;
    if (orderId && paymentStatus === "pending") {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:3000/api/orders/${orderId}`);
          const data = await res.json();
          if (data.status === "paid") {
            setPaymentStatus("paid");
            setStatus("Payment Successful! ✅");
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [orderId, paymentStatus]);

  const [allOrders, setAllOrders] = useState([]);

  // Fetch all orders every 3s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:3000/api/orders");
        const data = await res.json();
        setAllOrders(data);
      } catch (err) {
        console.error("Error fetching orders list", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulate Admin Confirm
  async function adminConfirm(id) {
    const targetId = id || orderId;
    if (!targetId) return;
    await fetch(`http://localhost:3000/api/admin/confirm/${targetId}`, {
      method: "POST"
    });
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ color: "#b32b1a" }}>Bakong Payment Simulator</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        {/* Left Column: Local Simulation */}
        <div>
          <h2>Step 1: Create Order</h2>
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={pay}
              disabled={paymentStatus === "pending"}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: paymentStatus === "pending" ? "not-allowed" : "pointer",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "10px",
                width: "100%"
              }}
            >
              {paymentStatus === "pending" ? "Processing..." : "Generate New Test QR ($5.00)"}
            </button>
          </div>

          <div style={{ minHeight: "200px", border: "1px solid #eee", borderRadius: "15px", padding: "15px", backgroundColor: "#fff" }}>
            {status && <p style={{ fontSize: "16px", fontWeight: "bold", color: paymentStatus === "paid" ? "green" : "#333" }}>{status}</p>}
            {error && <p style={{ color: "red" }}>Error: {error}</p>}

            {qr && paymentStatus === "pending" && (
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "#666" }}>Scan to Pay:</p>
                <img src={qr} alt="Bakong QR" style={{ width: "200px", border: "1px solid #ccc", borderRadius: "10px" }} />
                <p style={{ fontSize: "10px", color: "#999" }}>{orderId}</p>
                
                <button
                  onClick={() => adminConfirm()}
                  style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", width: "100%", fontWeight: "bold" }}
                >
                  Pay Now (Success)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: All Orders (Including MONEA Auto-Registered) */}
        <div>
          <h2>Step 2: Track & Confirm</h2>
          <p style={{ fontSize: "12px", color: "#666" }}>The simulator tracks all incoming requests from MONEA.</p>
          
          <div style={{ border: "1px solid #eee", borderRadius: "15px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead style={{ backgroundColor: "#f8f9fa" }}>
                <tr>
                  <th style={{ padding: "10px", textAlign: "left" }}>Order ID</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: "20px", textAlign: "center", fontStyle: "italic", color: "#999" }}>No orders detected yet</td>
                  </tr>
                )}
                {[...allOrders].reverse().map(o => (
                  <tr key={o.orderId} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: "bold" }}>{o.orderId.substring(0, 15)}...</div>
                        <div style={{ fontSize: "10px", color: o.source === "MONEA_AUTO" ? "#b32b1a" : "#666" }}>{o.source === "MONEA_AUTO" ? "FROM MONEA APP" : "Local Demo"}</div>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span style={{ 
                        padding: "2px 6px", 
                        borderRadius: "4px", 
                        backgroundColor: o.status === "paid" ? "#d4edda" : "#fff3cd",
                        color: o.status === "paid" ? "#155724" : "#856404"
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      {o.status === "pending" && (
                        <button
                          onClick={() => adminConfirm(o.orderId)}
                          style={{ padding: "5px 10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                        >
                          CONFIRM PAID
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
