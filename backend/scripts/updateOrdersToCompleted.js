const mongoose = require('mongoose')
const Order = require('../src/models/order.model')

const MONGO_URL = 'mongodb+srv://thanhtung1:thanhtung1@cluster0.tk0dmwl.mongodb.net/Project_Pharmacy'

(async () => {
    try {
        await mongoose.connect(MONGO_URL)
        console.log('Connected to MongoDB')

        // Update 5 pending orders to completed
        const result = await Order.updateMany(
            { status: 'pending' },
            { $set: { status: 'completed' } },
            { limit: 5 }
        )

        console.log('✅ Updated orders:', result.modifiedCount)

        // Get new stats
        const totalOrders = await Order.countDocuments()
        const completedOrders = await Order.countDocuments({ status: 'completed' })
        const revenue = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])

        console.log('Total Orders:', totalOrders)
        console.log('Completed Orders:', completedOrders)
        console.log('Total Revenue:', revenue[0]?.total || 0, 'VND')

        process.exit(0)
    } catch (err) {
        console.error('Error:', err.message)
        process.exit(1)
    }
})()
