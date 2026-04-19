const express = require("express");
const crypto = require("crypto");
const path = require("path");
const Razorpay = require("razorpay");
const fs = require("fs");
const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ✅ YOUR KEYS */
const RZP_KEY_ID = "rzp_test_SfD4yltoecr9OP";
const RZP_KEY_SECRET = "0LRAodaSxZuOmlhDz0C8IQvy";

/* ✅ Razorpay init */
const rzp = new Razorpay({
  key_id: RZP_KEY_ID,
  key_secret: RZP_KEY_SECRET,
});

console.log("Razorpay initialized");

/* -------- Send key -------- */
app.get("/api/config", (req, res) => {
  res.json({ key: RZP_KEY_ID, demo: false });
});

/* -------- Create order -------- */
app.post("/api/create-order", async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const order = await rzp.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: "order_" + Date.now(),   // ✅ FIXED (NO BACKTICK)
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* -------- Verify payment -------- */
app.post("/api/verify-payment", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    name,
    phone,
    address
  } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", RZP_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {

    // ✅ SAVE ORDER
    const orderData = {
      name,
      phone,
      address,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      date: new Date()
    };

    let orders = [];

    try {
      const data = fs.readFileSync("orders.json");
      orders = JSON.parse(data);
    } catch (err) {
      orders = [];
    }

    orders.push(orderData);

    fs.writeFileSync("orders.json", JSON.stringify(orders, null, 2));

    res.json({ success: true });

  } else {
    res.status(400).json({ success: false });
  }
});

/* -------- Serve frontend -------- */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* -------- Start server -------- */
app.listen(PORT, () => {
  console.log("Server running at http://localhost:3001");
});