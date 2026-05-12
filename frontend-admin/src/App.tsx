import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import toast, { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useWebRTCCall } from './hooks/useWebRTCCall'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/dashboard'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Support from './pages/Support'
import Consultations from './pages/Consultations'
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
  const [callPeerName, setCallPeerName] = useState('Khách hàng')
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | undefined>(undefined)

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

  // Prescription order notification
  const playPrescriptionSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const sock = socketRef.current
    if (!sock) return

    const handleNewPrescription = (data: any) => {
      playPrescriptionSound()
      toast(
        (t) => (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <p style={{ fontWeight: 700, margin: 0, color: '#1e293b' }}>Đơn thuốc kê đơn mới!</p>
              <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>
                {data?.productName || 'Sản phẩm kê đơn'} — Mã: {data?.orderCode}
              </p>
              <button
                onClick={() => { toast.dismiss(t.id); window.location.href = '/orders' }}
                style={{ marginTop: 8, padding: '4px 12px', background: '#2563eb', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}
              >
                Xem ngay
              </button>
            </div>
          </div>
        ),
        { duration: 8000, style: { maxWidth: 380, padding: '12px 16px' } }
      )
    }

    sock.on('new_prescription_order', handleNewPrescription)
    return () => { sock.off('new_prescription_order', handleNewPrescription) }
  }, [socket, playPrescriptionSound])

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

        if (newPhase === 'IDLE') {
          setCallPeerName('Khách hàng')
          setCallPeerAvatar(undefined)
        }
      }
    },
    onIncomingCall: (data) => {
      console.log('📞 Admin incoming call:', data)
    },
  })

  // Listen for consultation-based call initiation events
  useEffect(() => {
    const handleInitiateConsultationCall = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const peerId = String(detail.peerId || '')
      const peerName = detail.peerName || 'Khách hàng'
      const callType = detail.callType === 'voice' ? 'voice' : 'video'
      const consultationId = String(detail.consultationId || '')

      if (!peerId || !consultationId) {
        return
      }

      setCallPeerName(peerName)
      setCallPeerAvatar(detail.peerAvatarUrl || undefined)
      initiateCall(peerId, peerName, callType, consultationId).catch((error) => {
        console.error('Call init failed:', error)
      })
    }

    window.addEventListener('admin:initiate-consultation-call', handleInitiateConsultationCall)
    return () => {
      window.removeEventListener('admin:initiate-consultation-call', handleInitiateConsultationCall)
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

  const peerName = incomingCall?.callerName || callPeerName
  const peerAvatarUrl = incomingCall?.callerAvatarUrl || callPeerAvatar

  const handleFloatingViewCustomers = () => {
    navigate('/customers')
  }

  return (
    <>
      <Toaster position="top-right" />
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

          <Route
            path="/consultations"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Consultations />
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
