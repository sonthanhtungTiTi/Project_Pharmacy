import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { useAuthStore } from './stores/authStore'
import { useWebRTCCall } from './hooks/useWebRTCCall'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Support from './pages/Support'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import VideoCallOverlay from './components/calls/VideoCallOverlay'
import FloatingAdminButton from './components/ui/FloatingAdminButton'
import './App.css'

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '')

function CallProvider({ children }: { children: React.ReactNode }) {
  const { token, user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Build user object for the hook
  const callUser = user ? {
    userId: (user as any)._id || (user as any).id,
    fullName: (user as any).fullName || (user as any).name || (user as any).email || 'Admin',
    avatarUrl: (user as any).avatarUrl,
  } : null

  // Initialize Socket.IO when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
      return
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('✅ Admin Socket connected:', newSocket.id)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Admin Socket disconnected:', reason)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, token])

  // PeerJS Call Hook (Zalo-style)
  const {
    phase: callPhase,
    callType,
    ringingDirection,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOn,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTCCall(socket, callUser, {
    onPhaseChange: (newPhase) => {
      if (newPhase === 'IN_CALL') {
        if (durationRef.current) {
          clearInterval(durationRef.current)
        }
        setCallDuration(0)
        durationRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)
      } else {
        if (durationRef.current) {
          clearInterval(durationRef.current)
          durationRef.current = null
        }
        setCallDuration(0)
      }
    },
    onIncomingCall: (data) => {
      console.log('📞 Admin incoming call:', data)
    },
  })

  // Listen for call initiation events from other pages (e.g. Customers page)
  useEffect(() => {
    const handleInitiateCall = (e: Event) => {
      const { peerId, peerName, callType: ct } = (e as CustomEvent).detail
      if (peerId && peerName) {
        initiateCall(peerId, peerName, ct || 'video')
      }
    }

    window.addEventListener('admin:initiate-call', handleInitiateCall)
    return () => {
      window.removeEventListener('admin:initiate-call', handleInitiateCall)
    }
  }, [initiateCall])

  // Cleanup
  useEffect(() => {
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current)
      }
    }
  }, [])

  const peerName = incomingCall?.callerName || 'Khách hàng'
  const peerAvatarUrl = incomingCall?.callerAvatarUrl

  // Floating admin button handlers
  const handleFloatingCallCustomer = () => {
    // This would trigger a modal or navigate to customers page
    const event = new CustomEvent('admin:show-customer-selector')
    window.dispatchEvent(event)
  }

  const handleFloatingViewCustomers = () => {
    navigate('/customers')
  }

  return (
    <>
      {/* Call overlay — always on top of everything */}
      {(callPhase === 'RINGING' || callPhase === 'IN_CALL') && (
        <VideoCallOverlay
          phase={callPhase}
          callType={callType}
          ringingDirection={ringingDirection}
          peerName={peerName}
          peerAvatarUrl={peerAvatarUrl}
          durationSec={callDuration}
          isMuted={isMuted}
          isVideoOn={isVideoOn}
          onMicToggle={toggleAudio}
          onVideoToggle={toggleVideo}
          onAnswer={answerCall}
          onReject={rejectCall}
          onHangup={endCall}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}
      {children}
      {isAuthenticated && (
        <FloatingAdminButton
          onCallCustomer={handleFloatingCallCustomer}
          onViewCustomers={handleFloatingViewCustomers}
        />
      )}
    </>
  )
}

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore()

  // Check auth on app load
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <CallProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Orders />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:orderId"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <OrderDetail />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Products />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Inventory />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Customers />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Reports />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Support />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect root based on auth state to avoid dashboard flash for logged-out users */}
          <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </CallProvider>
    </BrowserRouter>
  )
}

export default App
