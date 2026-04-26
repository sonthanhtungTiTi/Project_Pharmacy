const mongoose = require('mongoose');
const Order = require('./src/models/order.model');

async function run() {
    try {
        await mongoose.connect('mongodb+srv://thanhtung1:thanhtung1@cluster0.tk0dmwl.mongodb.net/Project_Pharmacy');
        console.log('Connected to MongoDB');

        // Update all pending orders to completed
        const result = await Order.updateMany(
            { status: 'pending' },
            { $set: { status: 'completed' } }
        );
        console.log('Updated orders:', result.modifiedCount);

        // Get stats
        const completed = await Order.countDocuments({ status: 'completed' });
        const revenue = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        console.log('Total completed:', completed);
        console.log('Total revenue:', revenue[0]?.total || 0);

        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

run();
