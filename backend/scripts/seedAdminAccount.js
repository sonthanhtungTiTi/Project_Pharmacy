/**
 * Script: Tạo test admin account
 * Chạy: node scripts/seedAdminAccount.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../src/models/user.model')

const seedAdminAccount = async () => {
	try {
		// Connect MongoDB
		if (!process.env.MONGO_URL) {
			throw new Error('MONGO_URL is missing in .env')
		}

		console.log('Connecting to MongoDB...')
		await mongoose.connect(process.env.MONGO_URL)
		console.log('✅ MongoDB connected')

		// Check if admin already exists
		const adminExists = await User.findOne({ email: 'admin@pharmacy.com', role: 'admin' })
		if (adminExists) {
			console.log('⚠️  Admin account already exists:', adminExists.email)
			await mongoose.connection.close()
			return
		}

		// Hash password
		const hashedPassword = await bcrypt.hash('Admin@123456', 10)

		// Create admin account
		const adminUser = new User({
			fullName: 'Quản Lý Hệ Thống',
			email: 'admin@pharmacy.com',
			phone: '0909999999',
			password: hashedPassword,
			role: 'admin',
			provider: 'local',
			isActive: true,
		})

		await adminUser.save()
		console.log('✅ Admin account created successfully!')
		console.log('---')
		console.log('Email: admin@pharmacy.com')
		console.log('Password: Admin@123456')
		console.log('---')

		// Create staff accounts for testing
		const staffData = [
			{
				fullName: 'Dược Sĩ Nguyễn',
				email: 'pharmacist1@pharmacy.com',
				phone: '0901111111',
				role: 'pharmacist',
			},
			{
				fullName: 'Nhân Viên Quản Lý',
				email: 'manager@pharmacy.com',
				phone: '0902222222',
				role: 'manager',
			},
			{
				fullName: 'Nhân Viên Bán Hàng',
				email: 'sales@pharmacy.com',
				phone: '0903333333',
				role: 'sales_staff',
			},
		]

		for (const data of staffData) {
			const staffExists = await User.findOne({ email: data.email })
			if (staffExists) {
				console.log(`⚠️  ${data.role} account already exists`)
				continue
			}

			const hashedStaffPassword = await bcrypt.hash('Staff@123456', 10)
			const staffUser = new User({
				fullName: data.fullName,
				email: data.email,
				phone: data.phone,
				password: hashedStaffPassword,
				role: data.role,
				provider: 'local',
				isActive: true,
			})

			await staffUser.save()
			console.log(`✅ ${data.role} account created: ${data.email}`)
		}

		console.log('\n✅ All test accounts created successfully!')
		console.log('\n=== TEST CREDENTIALS ===')
		console.log('Admin:')
		console.log('  Email: admin@pharmacy.com')
		console.log('  Password: Admin@123456')
		console.log('\nPharmacist:')
		console.log('  Email: pharmacist1@pharmacy.com')
		console.log('  Password: Staff@123456')
		console.log('\nManager:')
		console.log('  Email: manager@pharmacy.com')
		console.log('  Password: Staff@123456')
		console.log('\nSales Staff:')
		console.log('  Email: sales@pharmacy.com')
		console.log('  Password: Staff@123456')
		console.log('========================\n')

		await mongoose.connection.close()
		console.log('✅ Database connection closed')
	} catch (error) {
		console.error('❌ Error:', error.message)
		process.exit(1)
	}
}

seedAdminAccount()
