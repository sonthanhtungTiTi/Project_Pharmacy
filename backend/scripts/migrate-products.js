const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('../src/models/product.model')

async function migrate() {
	try {
		await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/pharmacy')
		console.log('Connected to MongoDB')

		// Lấy tất cả products hiện tại (dùng lean để lấy raw data)
		const products = await Product.find({}).lean()
		console.log(`Found ${products.length} products to check/migrate.`)

		let updatedCount = 0

		for (const product of products) {
			const updateFields = {}

			// 1. Chuyển categoryId sang ObjectId nếu nó đang là string
			if (typeof product.categoryId === 'string' && mongoose.Types.ObjectId.isValid(product.categoryId)) {
				updateFields.categoryId = new mongoose.Types.ObjectId(product.categoryId)
			}

			// 2. Chuyển images từ string sang array
			if (typeof product.images === 'string') {
				updateFields.images = [product.images]
			} else if (!product.images || product.images.length === 0) {
				updateFields.images = ['https://placeholder.com/150']
			}

			// 3. Khởi tạo defaultSellUnit và baseUnit nếu thiếu
			if (!product.baseUnit) updateFields.baseUnit = 'pill'
			if (!product.defaultSellUnit) updateFields.defaultSellUnit = 'box'

			// 4. Khởi tạo units map nếu thiếu
			if (!product.units || Object.keys(product.units).length === 0) {
				updateFields.units = {
					blister: 10,
					box: 100 // Giả sử 1 hộp = 10 vỉ x 10 viên
				}
			}

			// 5. Khởi tạo sellUnits dựa vào price cũ
			if (!product.sellUnits || Object.keys(product.sellUnits).length === 0) {
				const oldPrice = product.price || 90000
				updateFields.sellUnits = {
					box: { price: oldPrice },
					blister: { price: Math.round(oldPrice / 10) }
				}
			}

			// 6. Cấp inventory mẫu nếu chưa có
			if (!product.inventory || product.inventory.length === 0) {
				const expiryDate = new Date()
				expiryDate.setFullYear(expiryDate.getFullYear() + 2) // Hết hạn sau 2 năm
				
				updateFields.inventory = [
					{
						batchNumber: `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
						baseQuantity: 500, // 500 viên
						expiryDate: expiryDate,
						importPrice: (product.price || 90000) * 0.7 // Giá nhập = 70% giá bán
					}
				]
				updateFields.totalBaseQuantity = 500
			} else {
				// Tính lại totalBaseQuantity
				const total = product.inventory.reduce((sum, item) => sum + (item.baseQuantity || item.quantity || 0), 0)
				updateFields.totalBaseQuantity = total
				
				// Sửa quantity thành baseQuantity nếu là data cũ
				const newInv = product.inventory.map(item => {
					if (item.quantity !== undefined && item.baseQuantity === undefined) {
						item.baseQuantity = item.quantity
						delete item.quantity
					}
					return item
				})
				updateFields.inventory = newInv
			}

			// Cập nhật vào DB
			if (Object.keys(updateFields).length > 0) {
				await mongoose.connection.collection('products').updateOne(
					{ _id: product._id },
					{ $set: updateFields }
				)
				updatedCount++
			}
		}

		console.log(`Successfully migrated ${updatedCount} products!`)
	} catch (error) {
		console.error('Migration error:', error)
	} finally {
		await mongoose.disconnect()
		console.log('Disconnected from MongoDB')
	}
}

migrate()
