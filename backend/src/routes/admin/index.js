const express = require('express')

const { authenticateClientJwt } = require('../../middleware/auth.middleware')

// Import routes
const authRoutes = require('./auth.route')
const orderRoutes = require('./order.route')
const productRoutes = require('./product.route')
const userRoutes = require('./user.route')
const categoryRoutes = require('./category.route')
const analyticsRoutes = require('./analytics.route')
const inventoryRoutes = require('./inventory.route')
const consultationRoutes = require('./consultation.route')
const chatRoutes = require('./chat.route')
const prescriptionRoutes = require('./prescription.route')

const router = express.Router()

// Auth routes (login không cần auth)
router.use('/auth', authRoutes)

// Tất cả routes bên dưới đều cần authentication
router.use(authenticateClientJwt)

// Admin routes — authorization được xử lý trong từng route file
router.use('/order', orderRoutes)
router.use('/orders', orderRoutes)
router.use('/products', productRoutes)
router.use('/users', userRoutes)
router.use('/categories', categoryRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/inventory', inventoryRoutes)
router.use('/consultations', consultationRoutes)
router.use('/chat', chatRoutes)
router.use('/prescriptions', prescriptionRoutes)

const eventRoutes = require('./event.route')
const authenticityRoutes = require('./authenticity.route')
const appointmentRoutes = require('./appointment.route')
const partnerRoutes = require('./partner.route')

router.use('/events', eventRoutes)
router.use('/authenticity-codes', authenticityRoutes)
router.use('/appointments', appointmentRoutes)
router.use('/partners', partnerRoutes)

module.exports = router
