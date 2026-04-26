// ==========================================
// DEPRECATED - Socket.IO is now initialized directly in App.tsx
// ==========================================
// Tính năng gọi điện dùng Socket.IO trực tiếp trong App.tsx
// và hook useWebRTCCall.ts để điều phối call flow cho PeerJS.
//
// File này được giữ lại để tránh lỗi import từ code cũ.
// ==========================================

import io, { Socket } from 'socket.io-client'

const SOCKET_URL = (() => {
	const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '')
	if (explicitSocketUrl) return explicitSocketUrl

	const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
	return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
})()

let socket: Socket | null = null

export const initializeSocket = (token: string): Socket => {
	if (socket?.connected) {
		return socket
	}

	socket = io(SOCKET_URL, {
		auth: { token },
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		reconnectionAttempts: 5,
		transports: ['websocket', 'polling'],
	})

	socket.on('connect', () => {
		console.log('✅ Socket connected:', socket?.id)
	})

	socket.on('disconnect', (reason) => {
		console.log('❌ Socket disconnected:', reason)
	})

	return socket
}

export const getSocket = (): Socket | null => socket

export const disconnectSocket = () => {
	if (socket?.connected) {
		socket.disconnect()
		socket = null
	}
}

export const emitEvent = (event: string, data?: any) => {
	if (socket?.connected) {
		socket.emit(event, data)
	}
}

export const onEvent = (event: string, callback: (data: any) => void) => {
	if (socket) {
		socket.on(event, callback)
	}
}

export const offEvent = (event: string, callback?: (data: any) => void) => {
	if (socket) {
		if (callback) {
			socket.off(event, callback)
		} else {
			socket.off(event)
		}
	}
}
