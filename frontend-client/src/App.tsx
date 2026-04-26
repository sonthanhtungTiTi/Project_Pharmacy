import { useEffect, useState, useRef, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import HomePage from './pages/HomePage'
import Category from './pages/Category'
import ProductDetail from './pages/ProductDetail'
import ConsultPharmacy from './pages/ConsultPharmacy'
import HealthNewsDetail from './pages/HealthNewsDetail'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import MomoResultPage from './pages/MomoResultPage'
import VnpayResultPage from './pages/VnpayResultPage'
import ProfilePage from './pages/ProfilePage.tsx'
import VideoCallOverlay from './components/calls/VideoCallComponent.tsx'
import CallTargetSelector from './components/calls/CallTargetSelector'
import FloatingContactButton from './components/ui/FloatingContactButton'
import ClientChatWidget from './components/chat/ClientChatWidget'
import { useWebRTCCall } from './hooks/useWebRTCCall'
import type { IncomingCallData } from './hooks/useWebRTCCall'

// New Functional Modules
import FamilyMedicineCabinet from './pages/FamilyMedicineCabinet'
import AuthenticityCheck from './pages/AuthenticityCheck'
import MyOrders from './pages/MyOrders'
import DoctorAppointment from './pages/DoctorAppointment'
import HealthCheck from './pages/HealthCheck'
import PharmacyPartner from './pages/PharmacyPartner'
import EventPage from './pages/EventPage'

const SOCKET_URL = (() => {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '')
  if (explicitSocketUrl) return explicitSocketUrl

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
  const url = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  console.log('🔌 Socket URL:', url)
  return url
})()

const getProductIdFromPath = () => {
  const match = window.location.pathname.match(/^\/product\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : ''
}

const getCategoryIdFromPath = () => {
	const match = window.location.pathname.match(/^\/category\/([^/]+)$/)
	return match ? decodeURIComponent(match[1]) : ''
}

const isConsultPagePath = () => /^\/mua-thuoc-tu-van\/?$/.test(window.location.pathname)
const isCartPagePath = () => /^\/gio-hang\/?$/.test(window.location.pathname)
const isCheckoutPagePath = () => /^\/thanh-toan\/?$/.test(window.location.pathname)
const isMomoResultPagePath = () => /^\/checkout\/momo-return\/?$/.test(window.location.pathname)
const isVnpayResultPagePath = () => /^\/checkout\/vnpay-return\/?$/.test(window.location.pathname)
const isProfilePagePath = () => /^\/profile\/?$/.test(window.location.pathname)

// 7 New Functional Module Paths
const isFamilyMedicinePath = () => /^\/tu-thuoc-gia-dinh\/?$/.test(window.location.pathname)
const isAuthenticityCheckPath = () => /^\/tra-cuu-chinh-hang\/?$/.test(window.location.pathname)
const isMyOrdersPath = () => /^\/don-hang\/?$/.test(window.location.pathname)
const isDoctorAppointmentPath = () => /^\/dat-lich-kham\/?$/.test(window.location.pathname)
const isHealthCheckPath = () => /^\/kiem-tra-suc-khoe\/?$/.test(window.location.pathname)
const isPharmacyPartnerPath = () => /^\/doi-tac-nha-thuoc\/?$/.test(window.location.pathname)
const isEventPagePath = () => /^\/chuong-trinh\/[^/]+\/?$/.test(window.location.pathname)

const getEventSlugFromPath = () => {
  const match = window.location.pathname.match(/^\/chuong-trinh\/([^/]+)\/?$/)
  return match ? match[1] : ''
}

const getHealthNewsIdFromPath = () => {
  const match = window.location.pathname.match(/^\/ban-tin-suc-khoe\/(1|2|3|4|5|6)$/)
  return match ? match[1] : ''
}

function App() {
	const [activeProductId, setActiveProductId] = useState(getProductIdFromPath())
	const [activeCategoryId, setActiveCategoryId] = useState(getCategoryIdFromPath())
  const [isConsultPage, setIsConsultPage] = useState(isConsultPagePath())
  const [isCartPage, setIsCartPage] = useState(isCartPagePath())
  const [isCheckoutPage, setIsCheckoutPage] = useState(isCheckoutPagePath())
  const [isMomoResultPage, setIsMomoResultPage] = useState(isMomoResultPagePath())
  const [isVnpayResultPage, setIsVnpayResultPage] = useState(isVnpayResultPagePath())
  const [isProfilePage, setIsProfilePage] = useState(isProfilePagePath())
  const [activeHealthNewsId, setActiveHealthNewsId] = useState(getHealthNewsIdFromPath())

  // New states for the 7 modules
  const [isFamilyMedicinePage, setIsFamilyMedicinePage] = useState(isFamilyMedicinePath())
  const [isAuthenticityCheckPage, setIsAuthenticityCheckPage] = useState(isAuthenticityCheckPath())
  const [isMyOrdersPage, setIsMyOrdersPage] = useState(isMyOrdersPath())
  const [isDoctorAppointmentPage, setIsDoctorAppointmentPage] = useState(isDoctorAppointmentPath())
  const [isHealthCheckPage, setIsHealthCheckPage] = useState(isHealthCheckPath())
  const [isPharmacyPartnerPage, setIsPharmacyPartnerPage] = useState(isPharmacyPartnerPath())

  const [isEventPage, setIsEventPage] = useState(isEventPagePath())
  const [activeEventSlug, setActiveEventSlug] = useState(getEventSlugFromPath())

  // ==================== CALL TARGET SELECTOR ====================
  const [showCallSelector, setShowCallSelector] = useState(false)
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false)

  // ==================== SOCKET.IO CONNECTION ====================
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // Get user info from localStorage
  const getUserInfo = useCallback(() => {
    try {
      const userStr = localStorage.getItem('clientUser')
      if (userStr) return JSON.parse(userStr)
    } catch { /* ignore */ }
    return null
  }, [])

  const [user, setUser] = useState(getUserInfo())

  // Initialize Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('clientAccessToken')
    if (!token) {
      console.log('⚠️  No token found - skipping socket connection')
      return
    }

    console.log('🔌 Attempting to connect socket to:', SOCKET_URL)
    const userInfo = getUserInfo()
    setUser(userInfo)

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
    })

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [getUserInfo])

  // ==================== PEERJS CALL HOOK ====================
  const [callDuration, setCallDuration] = useState(0)
  const [callPeerName, setCallPeerName] = useState('Người dùng')
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | undefined>(undefined)
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  } = useWebRTCCall(socket, user, {
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
          setCallPeerName('Người dùng')
          setCallPeerAvatar(undefined)
        }
      }
    },
    onIncomingCall: (data: IncomingCallData) => {
      console.log('📞 Incoming call:', data)
      setCallPeerName(data.callerName || 'Người dùng')
      setCallPeerAvatar(data.callerAvatarUrl)
    },
  })

  // Cleanup duration timer
  useEffect(() => {
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current)
      }
    }
  }, [])

  // Listen for call events from other components (ConsultPharmacy page)
  useEffect(() => {
    const handleOpenCallSelector = () => {
      setShowCallSelector(true)
    }

    window.addEventListener('client:open-call-selector', handleOpenCallSelector)
    return () => {
      window.removeEventListener('client:open-call-selector', handleOpenCallSelector)
    }
  }, [])

  // Handle selecting a call target from the modal
  const handleSelectCallTarget = (staffId: string, staffName: string, staffAvatar: string, callType: 'video' | 'voice') => {
    setCallPeerName(staffName)
    setCallPeerAvatar(staffAvatar || undefined)
    initiateCall(staffId, staffName, callType)
  }

  // Get peer info for call overlay
  const peerName = incomingCall?.callerName || callPeerName
  const peerAvatarUrl = incomingCall?.callerAvatarUrl || callPeerAvatar

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const onPopState = () => {
		setActiveProductId(getProductIdFromPath())
		setActiveCategoryId(getCategoryIdFromPath())
    setIsConsultPage(isConsultPagePath())
    setIsCartPage(isCartPagePath())
    setIsCheckoutPage(isCheckoutPagePath())
    setIsMomoResultPage(isMomoResultPagePath())
    setIsVnpayResultPage(isVnpayResultPagePath())
    setIsProfilePage(isProfilePagePath())
    setActiveHealthNewsId(getHealthNewsIdFromPath())

    // Update new module states
    setIsFamilyMedicinePage(isFamilyMedicinePath())
    setIsAuthenticityCheckPage(isAuthenticityCheckPath())
    setIsMyOrdersPage(isMyOrdersPath())
    setIsDoctorAppointmentPage(isDoctorAppointmentPath())
    setIsHealthCheckPage(isHealthCheckPath())
    setIsPharmacyPartnerPage(isPharmacyPartnerPath())

    setIsEventPage(isEventPagePath())
    setActiveEventSlug(getEventSlugFromPath())
    }

    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

	useEffect(() => {
		scrollToTop()
	}, [activeProductId, activeCategoryId])

  useEffect(() => {
    scrollToTop()
  }, [activeHealthNewsId])

  const openProductDetail = (productId: string) => {
    if (!productId) return
    const nextPath = `/product/${encodeURIComponent(productId)}`
    window.history.pushState({}, '', nextPath)
    setActiveProductId(productId)
    setActiveCategoryId('')
    setIsConsultPage(false)
    setIsCartPage(false)
    setIsCheckoutPage(false)
    setIsMomoResultPage(false)
    setIsVnpayResultPage(false)
    setIsProfilePage(false)
    setActiveHealthNewsId('')
  }

  const openCategory = (categoryId: string) => {
    if (!categoryId) return
    const nextPath = `/category/${encodeURIComponent(categoryId)}`
    window.history.pushState({}, '', nextPath)
    setActiveCategoryId(categoryId)
    setActiveProductId('')
    setIsConsultPage(false)
    setIsCartPage(false)
    setIsCheckoutPage(false)
    setIsMomoResultPage(false)
    setIsVnpayResultPage(false)
    setIsProfilePage(false)
    setActiveHealthNewsId('')
  }

  const openConsultPage = () => {
    window.history.pushState({}, '', '/mua-thuoc-tu-van')
    setActiveProductId('')
    setActiveCategoryId('')
    setIsConsultPage(true)
    setIsCartPage(false)
    setIsCheckoutPage(false)
    setIsMomoResultPage(false)
    setIsVnpayResultPage(false)
    setIsProfilePage(false)
    setActiveHealthNewsId('')
  }

  const openHealthNewsPage = (newsId: string) => {
    if (!newsId) return
    window.history.pushState({}, '', `/ban-tin-suc-khoe/${encodeURIComponent(newsId)}`)
    setActiveProductId('')
    setActiveCategoryId('')
    setIsConsultPage(false)
    setIsCartPage(false)
    setIsCheckoutPage(false)
    setIsMomoResultPage(false)
    setIsVnpayResultPage(false)
    setIsProfilePage(false)
    setActiveHealthNewsId(newsId)
  }

  const backHome = () => {
    window.history.pushState({}, '', '/')
    setActiveProductId('')
    setActiveCategoryId('')
    setIsConsultPage(false)
    setIsCartPage(false)
    setIsCheckoutPage(false)
    setIsMomoResultPage(false)
    setIsVnpayResultPage(false)
    setIsProfilePage(false)
    setActiveHealthNewsId('')
  }

  // Floating button handler — open call target selector
  const handleFloatingCall = () => {
    setShowCallSelector(true)
  }

  const handleFloatingZaloChat = () => {
    window.open('https://zalo.me/0398668953', '_blank', 'noopener,noreferrer')
  }

  const handleFloatingAiChat = () => {
    setIsChatWidgetOpen(true)
  }

  // ==================== SHARED OVERLAYS ====================
  const renderCallOverlays = () => (
    <>
      {/* Call target selector modal */}
      <CallTargetSelector
        isOpen={showCallSelector}
        onClose={() => setShowCallSelector(false)}
        onSelectTarget={handleSelectCallTarget}
        socket={socket}
      />

      {/* Active call overlay */}
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
    </>
  )

  const renderSupportTools = () => (
    <>
      <FloatingContactButton
        onVideoCall={handleFloatingCall}
        onVoiceCall={handleFloatingCall}
        onZaloChat={handleFloatingZaloChat}
        onAiChat={handleFloatingAiChat}
      />
      <ClientChatWidget
        socket={socket}
        isOpen={isChatWidgetOpen}
        onClose={() => setIsChatWidgetOpen(false)}
      />
    </>
  )

  // ==================== RENDER PAGES ====================

  if (activeProductId) {
    return (
      <>
        {renderCallOverlays()}
        <ProductDetail productId={activeProductId} onBackHome={backHome} />
        {renderSupportTools()}
      </>
    )
  }

  if (activeCategoryId) {
    return (
      <>
        {renderCallOverlays()}
        <Category
          categoryId={activeCategoryId}
          onBackHome={backHome}
          onOpenProductDetail={openProductDetail}
        />
        {renderSupportTools()}
      </>
    )
  }

  if (isConsultPage) {
    return (
      <>
        {renderCallOverlays()}
        <ConsultPharmacy onBackHome={backHome} />
        {renderSupportTools()}
      </>
    )
  }

  if (isCartPage) {
    return (
      <>
        {renderCallOverlays()}
        <CartPage onBackHome={backHome} />
        {renderSupportTools()}
      </>
    )
  }

  if (isCheckoutPage) {
    return (
      <>
        {renderCallOverlays()}
        <CheckoutPage
          onBackToCart={() => {
            window.history.pushState({}, '', '/gio-hang')
            window.dispatchEvent(new PopStateEvent('popstate'))
          }}
          onBackHome={backHome}
        />
        {renderSupportTools()}
      </>
    )
  }

  if (isMomoResultPage) {
    return (
      <>
        {renderCallOverlays()}
        <MomoResultPage />
        {renderSupportTools()}
      </>
    )
  }

  if (isVnpayResultPage) {
    return (
      <>
        {renderCallOverlays()}
        <VnpayResultPage />
        {renderSupportTools()}
      </>
    )
  }

  if (isProfilePage) {
    return (
      <>
        {renderCallOverlays()}
        <ProfilePage onBackHome={backHome} />
        {renderSupportTools()}
      </>
    )
  }

  // --- RENDERING NEW FUNCTIONAL MODULES ---

  if (isFamilyMedicinePage) {
    return (
      <>
        {renderCallOverlays()}
        <FamilyMedicineCabinet />
        {renderSupportTools()}
      </>
    )
  }

  if (isAuthenticityCheckPage) {
    return (
      <>
        {renderCallOverlays()}
        <AuthenticityCheck />
        {renderSupportTools()}
      </>
    )
  }

  if (isMyOrdersPage) {
    return (
      <>
        {renderCallOverlays()}
        <MyOrders />
        {renderSupportTools()}
      </>
    )
  }

  if (isDoctorAppointmentPage) {
    return (
      <>
        {renderCallOverlays()}
        <DoctorAppointment />
        {renderSupportTools()}
      </>
    )
  }

  if (isHealthCheckPage) {
    return (
      <>
        {renderCallOverlays()}
        <HealthCheck />
        {renderSupportTools()}
      </>
    )
  }

  if (isPharmacyPartnerPage) {
    return (
      <>
        {renderCallOverlays()}
        <PharmacyPartner />
        {renderSupportTools()}
      </>
    )
  }

  if (isEventPage) {
    return (
      <>
        {renderCallOverlays()}
        <EventPage slug={activeEventSlug} onOpenProductDetail={openProductDetail} />
        {renderSupportTools()}
      </>
    )
  }

  if (activeHealthNewsId) {
    return (
      <>
        {renderCallOverlays()}
        <HealthNewsDetail newsId={activeHealthNewsId} onBackHome={backHome} />
        {renderSupportTools()}
      </>
    )
  }

  return (
    <>
      {renderCallOverlays()}
      <HomePage
        onOpenProductDetail={openProductDetail}
        onOpenCategory={openCategory}
        onOpenConsultPage={openConsultPage}
        onOpenHealthNews={openHealthNewsPage}
      />
      {renderSupportTools()}
    </>
  )
}

export default App
