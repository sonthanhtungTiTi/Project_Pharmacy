
const mongoose = require('mongoose');
const Order = require('../src/models/order.model');

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

async function cancelExpiredPendingPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
    
    const thirtyMinAgo = new Date(Date.now() - THIRTY_MINUTES_MS);
    
    const result = await Order.updateMany(
      {
        status: 'pending',
        paymentStatus: { $ne: 'paid' },
        placedAt: { $lt: thirtyMinAgo }
      },
      {
        paymentStatus: 'failed',
        status: 'cancelled',
        cancelReason: 'Hết hạn chờ thanh toán (30 phút)'
      }
    );
    
    console.log(`Cancelled ${result.modifiedCount} expired pending orders.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cancelExpiredPendingPayments();

