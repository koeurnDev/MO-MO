import express from "express";
import cors from "cors";
import { KHQR, TAG, CURRENCY, COUNTRY } from "ts-khqr";

const app = express();
app.use(cors());
app.use(express.json());

const orders = []; // Simple in-memory storage

app.post("/api/pay", (req, res) => {
    console.log("Received payment request:", req.body);
    const { amount } = req.body;
    const orderId = "ORD-" + Date.now();

    try {
        const result = KHQR.generate({
            tag: TAG.INDIVIDUAL,
            accountID: "koeurn_seab@wing",
            merchantName: "Girly Shop",
            amount,
            currency: CURRENCY.KHR,
            countryCode: COUNTRY.KH,
            expirationTimestamp: Date.now() + 5 * 60 * 1000,
            additionalData: {
                billNumber: orderId
            }
        });

        // Save order
        orders.push({
            orderId,
            amount,
            status: "pending", // pending, paid
            createdAt: new Date()
        });

        console.log("Created Order:", orderId);
        res.json({ ...result.data, orderId });
    } catch (error) {
        console.error("Error generating KHQR:", error);
        res.status(500).json({ error: "Failed to generate QR code" });
    }
});

// List all orders (for the UI to show pending ones)
app.get("/api/orders", (req, res) => {
    res.json(orders);
});

// Check Status
app.get("/api/orders/:orderId", (req, res) => {
    let order = orders.find(o => o.orderId === req.params.orderId);
    
    if (!order) {
        // Auto-register unknown orders as pending
        order = {
            orderId: req.params.orderId,
            amount: 0,
            status: "pending",
            createdAt: new Date(),
            source: "MONEA_AUTO"
        };
        orders.push(order);
        console.log("Auto-registered Order from MONEA:", req.params.orderId);
    }
    
    res.json({ status: order.status });
});

// Admin Confirm Payment (Manual)
app.post("/api/admin/confirm/:orderId", (req, res) => {
    const order = orders.find(o => o.orderId === req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "paid";
    console.log(`Order ${order.orderId} marked as PAID`);
    res.json({ success: true, status: "paid" });
});

app.listen(3000, () =>
    console.log("🚀 Server running at http://localhost:3000")
);
