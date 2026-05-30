const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const http = require('http')
const { Server } = require('socket.io')
const callHandlerModule = require('./src/sockets/callHandler')
const setupCallHandlers = callHandlerModule
const { onlineUsers } = callHandlerModule

const clientRoutes = require('./src/routes/client')
const adminRoutes = require('./src/routes/admin')
const { errorHandler } = require('./src/middleware/errorHandler')
const { startChatCleanupJob } = require('./src/jobs/chatCleanup.job')
const { loadFaceModels } = require('./src/services/ai/faceModelLoader')
const { warmupFaceModel } = require('./src/services/ai/face.service')

dotenv.config()

const app = express()
const port = process.env.PORT || 3000   

// Create HTTP server for Socket.IO
const server = http.createServer(app)

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingInterval: 30000,
    pingTimeout: 20000,
})

// Setup Socket.IO call signaling handlers for PeerJS
setupCallHandlers(io)

// Make io and onlineUsers available to routes
app.set('io', io)
app.set('onlineUsers', onlineUsers)

// Security & Performance middleware
app.use(helmet())
app.use(compression())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging (chỉ development)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
}

// Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    })
})

// API Routes
app.use('/api/client', clientRoutes)
app.use('/api/admin', adminRoutes)

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    })
})

// Global error handler (PHẢI ĐẶT CUỐI CÙNG)
app.use(errorHandler)

const startServer = async () => {
    try {
        if (!process.env.MONGO_URL) {
            throw new Error('MONGO_URL is missing in environment variables')
        }

        await mongoose.connect(process.env.MONGO_URL)
        console.log('MongoDB connected')

        // Use server.listen instead of app.listen for Socket.IO support
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`)
            console.log(`Socket.IO server is running`)
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
        })

        // Khởi động background jobs
        startChatCleanupJob()

        // Khởi động tải model AI cho Face ID, sau đó warm-up để loại bỏ cold-start latency
        loadFaceModels().then(() => warmupFaceModel()).catch(() => {})
    } catch (error) {
        console.error('Failed to start server:', error.message)
        process.exit(1)
    }
}

startServer()