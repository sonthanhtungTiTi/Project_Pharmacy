const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const http = require('http')
const { Server } = require('socket.io')
const { ExpressPeerServer } = require('peer') // THÊM MỚI
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
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: false,
    },
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    pingInterval: 30000,
    pingTimeout: 20000,
    maxHttpBufferSize: 10e6,
    destroyUpgrade: false, // Cực kỳ quan trọng: Ngăn Socket.io tự đóng kết nối của PeerJS
})

// Setup Socket.IO call signaling handlers for PeerJS
setupCallHandlers(io)

// Make io and onlineUsers available to routes
app.set('io', io)
app.set('onlineUsers', onlineUsers)

// Security & Performance middleware
// IMPORTANT: cors() must be BEFORE ExpressPeerServer so it can handle preflight requests!
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false,
}))
app.use(compression())
app.use(cors())

// ==================== PEERJS SERVER ====================
// PeerServer mounted on the same HTTP server.
// path: '/myapp' must match VITE_PEER_PATH in frontend .env
// This is the correct approach: set path in options (not via app.use mount)
// so both HTTP routes AND WebSocket upgrades resolve correctly.
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/myapp',
    allow_discovery: true,
})
app.use(peerServer)
peerServer.on('connection', (client) => {
    console.log(`[PeerJS] Client connected: ${client.getId()}`)
})
peerServer.on('disconnect', (client) => {
    console.log(`[PeerJS] Client disconnected: ${client.getId()}`)
})
// ==================== FIX WEBSOCKET CONFLICT ====================
// Tránh lỗi "Invalid frame header" do Socket.IO và PeerJS đụng độ tranh giành sự kiện "upgrade"
const upgradeListeners = server.listeners('upgrade').slice(0)
server.removeAllListeners('upgrade')

server.on('upgrade', (req, socket, head) => {
    const pathname = req.url.split('?')[0]
    if (pathname.startsWith('/socket.io')) {
        // Cho Socket.io xử lý trực tiếp, KHÔNG cho PeerJS đụng vào
        io.engine.handleUpgrade(req, socket, head)
    } else if (pathname.startsWith('/myapp')) {
        // Cho PeerJS xử lý (do destroyUpgrade=false nên Socket.io lắng nghe cũng ko sao)
        upgradeListeners.forEach((listener) => listener(req, socket, head))
    } else {
        socket.destroy()
    }
})


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
            console.log(`Socket.IO server is running on path /socket.io`)
            console.log(`Socket.IO transports: polling, websocket`)
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
        })

        // Socket.IO global middleware logging
        io.use((socket, next) => {
            console.log(`[Socket.IO] Attempting connection from ${socket.handshake.address}`)
            next()
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