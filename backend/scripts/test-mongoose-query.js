require('dotenv').config()
const mongoose = require('mongoose')

const Product = require('../src/models/product.model')

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log('MONGO_CONNECTED=true')
        console.log(`DB_NAME=${mongoose.connection?.name || ''}`)

        const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()
        console.log(`COLLECTIONS=${collections.map((item) => item.name).join(',')}`)

        const total = await Product.countDocuments({ isActive: true })
        console.log(`ACTIVE_TOTAL=${total}`)

        const totalAll = await Product.countDocuments({})
        console.log(`TOTAL_ALL=${totalAll}`)

        const totalInactive = await Product.countDocuments({ isActive: false })
        console.log(`INACTIVE_TOTAL=${totalInactive}`)

        const totalMissingFlag = await Product.countDocuments({ isActive: { $exists: false } })
        console.log(`MISSING_ISACTIVE_TOTAL=${totalMissingFlag}`)

        const p5 = await Product.find({ isActive: true }).select('productName price images').limit(5).lean()
        console.log(`LIMIT_5=${p5.length}`)
        console.log(p5.map((x, i) => `${i + 1}. ${x.productName || '(no name)'}`).join('\n'))

        const p10 = await Product.find({ isActive: true }).select('productName price images').limit(10).lean()
        console.log(`LIMIT_10=${p10.length}`)

        const p20 = await Product.find({ isActive: true }).select('productName price images').limit(20).lean()
        console.log(`LIMIT_20=${p20.length}`)

        const any5 = await Product.find({}).select('productName price isActive').limit(5).lean()
        console.log(`ANY_LIMIT_5=${any5.length}`)
        console.log(any5.map((x, i) => `${i + 1}. ${x.productName || '(no name)'} | isActive=${String(x.isActive)}`).join('\n'))
    } catch (error) {
        console.error('QUERY_ERROR', error.message)
        process.exitCode = 1
    } finally {
        await mongoose.disconnect()
    }
}

void run()
