import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from '@vladmandic/face-api'

interface FaceCameraProps {
	mode?: 'enroll' | 'login'
	onCapture: (data: any) => void
	onClose: () => void
}

// ─── Cấu hình Stable Frame Detection ───────────────────────────────────────
const STABLE_FRAMES_REQUIRED = 3    // Cần 3 frame liên tiếp ở đúng góc
const STABLE_ANGLE_STD_DEV_MAX = 5.0 // Độ lệch chuẩn tối đa (độ) để coi là "đủ ổn định"
// ────────────────────────────────────────────────────────────────────────────

const ENROLL_STEPS = [
	{ id: 'straight', label: 'Nhìn thẳng vào camera', check: (yaw: number, pitch: number) => Math.abs(yaw) <= 15 && Math.abs(pitch) <= 20 },
	{ id: 'left', label: 'Quay mặt sang TRÁI một chút', check: (yaw: number, _pitch: number) => yaw < -10 },
	{ id: 'right', label: 'Quay mặt sang PHẢI một chút', check: (yaw: number, _pitch: number) => yaw > 10 },
]

const shuffleArray = (array: any[]) => {
	const newArr = [...array]
	for (let i = newArr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
			;[newArr[i], newArr[j]] = [newArr[j], newArr[i]]
	}
	return newArr
}

/**
 * Tính độ lệch chuẩn (Standard Deviation) của một mảng số.
 * Dùng để kiểm tra xem đầu người dùng có đang đứng yên không.
 * Độ phức tạp: O(n) với n = số phần tử (thường là 5).
 */
const computeStdDev = (values: number[]): number => {
	if (values.length < 2) return 0
	const mean = values.reduce((s, v) => s + v, 0) / values.length
	const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
	return Math.sqrt(variance)
}

/**
 * Estimates head pose angles (yaw and pitch in degrees) using 68 facial landmarks.
 */
const estimatePose = (landmarks: any) => {
	const positions = landmarks.positions
	if (!positions || positions.length < 68) return { yaw: 0, pitch: 0 }

	// 1. Yaw (horizontal head rotation)
	// Left eye average point (36-41) and Right eye average point (42-47)
	let sumLeftX = 0, sumLeftY = 0
	for (let i = 36; i <= 41; i++) {
		sumLeftX += positions[i].x
		sumLeftY += positions[i].y
	}
	const eyeLeft = { x: sumLeftX / 6, y: sumLeftY / 6 }

	let sumRightX = 0, sumRightY = 0
	for (let i = 42; i <= 47; i++) {
		sumRightX += positions[i].x
		sumRightY += positions[i].y
	}
	const eyeRight = { x: sumRightX / 6, y: sumRightY / 6 }

	const noseTip = positions[30]

	const dLeft = noseTip.x - eyeLeft.x
	const dRight = eyeRight.x - noseTip.x

	const sumX = dLeft + dRight
	const asymmetryX = sumX !== 0 ? (dLeft - dRight) / sumX : 0

	// Multiply by negative factor so that:
	// - turning left (asymmetryX is positive because nose moves right) yields negative yaw (yaw < -15)
	// - turning right (asymmetryX is negative because nose moves left) yields positive yaw (yaw > 15)
	const yaw = -asymmetryX * 50

	// 2. Pitch (vertical head rotation)
	// Midpoint of eyes vertically vs nose tip vs chin (index 8)
	const eyeCenterY = (eyeLeft.y + eyeRight.y) / 2
	const chin = positions[8]

	const dEyeToNose = noseTip.y - eyeCenterY
	const dNoseToChin = Math.max(1, chin.y - noseTip.y)

	const pitchRatio = dEyeToNose / dNoseToChin

	// Baseline pitch ratio when looking straight is around 0.8
	// If looking UP: nose moves closer to eyes, pitchRatio decreases.
	// If looking DOWN: nose moves closer to chin, pitchRatio increases.
	const pitch = (pitchRatio - 0.8) * 45

	return { yaw, pitch }
}

export default function FaceCamera({ mode = 'enroll', onCapture, onClose }: FaceCameraProps) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const streamRef = useRef<MediaStream | null>(null)

	const [modelsLoaded, setModelsLoaded] = useState(false)
	const [stepIndex, setStepIndex] = useState(0)
	const [message, setMessage] = useState('Đang khởi động camera...')
	const [isCapturing, setIsCapturing] = useState(false)

	// ─── Stable frame state (dùng state để trigger re-render cho indicator) ─
	// 'idle'     = chưa phát hiện góc đúng
	// 'filling'  = đang tích lũy frame ổn định (hiện "Giữ yên...")
	// 'success'  = vừa chụp xong (flash ✓ trong 500ms)
	const [stableState, setStableState] = useState<'idle' | 'filling' | 'success'>('idle')

	const capturedDescriptors = useRef<number[][]>([])

	// Rolling buffer góc Yaw (dùng ref để tránh re-render mỗi frame)
	const angleBufferRef = useRef<number[]>([])

	// Reset buffer mỗi khi chuyển bước
	const stepIndexRef = useRef(0)
	useEffect(() => {
		stepIndexRef.current = stepIndex
		angleBufferRef.current = []     // Xóa buffer khi sang bước mới
		setStableState('idle')
	}, [stepIndex])

	const [STEPS] = useState(() => {
		if (mode === 'enroll') return ENROLL_STEPS
		// Khi login, luôn giữ bước "Nhìn thẳng" ở đầu tiên để camera bắt nét ngay lập tức (nhạy như lúc enroll)
		const straightStep = ENROLL_STEPS.find(s => s.id === 'straight')!
		const otherSteps = shuffleArray(ENROLL_STEPS.filter(s => s.id !== 'straight'))
		return [straightStep, ...otherSteps]
	})

	// ─── 1. Tải mô hình AI ──────────────────────────────────────────────────
	useEffect(() => {
		const loadModels = async () => {
			try {
				await Promise.all([
					faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
					faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
					faceapi.nets.faceRecognitionNet.loadFromUri('/models')
				])
				setModelsLoaded(true)
				setMessage(STEPS[0].label)
			} catch (error) {
				console.error('Lỗi tải mô hình AI:', error)
				setMessage('Lỗi tải AI. Vui lòng thử lại sau.')
			}
		}
		loadModels()
	}, [STEPS])


	// ─── 2. Mở Camera ───────────────────────────────────────────────────────
	useEffect(() => {
		if (!modelsLoaded) return

		const startVideo = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'user', width: 640, height: 480 }
				})
				if (videoRef.current) {
					videoRef.current.srcObject = stream
					streamRef.current = stream
				}
			} catch (error) {
				console.error('Lỗi mở camera:', error)
				setMessage('Không thể mở camera. Vui lòng cấp quyền.')
			}
		}
		startVideo()

		return () => {
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop())
			}
		}
	}, [modelsLoaded])

	// ─── 3. Chụp snapshot chất lượng cao ────────────────────────────────────
	const captureSnapshot = async (): Promise<Blob | null> => {
		return new Promise((resolve) => {
			if (!videoRef.current) { resolve(null); return }
			const canvas = document.createElement('canvas')
			canvas.width = 480
			canvas.height = 360
			const ctx = canvas.getContext('2d')
			if (ctx) {
				ctx.drawImage(videoRef.current, 0, 0, 480, 360)
				canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
			} else {
				resolve(null)
			}
		})
	}

	// ─── 4. Kết thúc: gửi tất cả descriptor về parent ───────────────────────
	const finishCapture = useCallback(async () => {
		if (!videoRef.current || isCapturing) return
		setIsCapturing(true)
		setMessage('Đang gửi dữ liệu khuôn mặt...')

		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => track.stop())
		}

		setMessage('Đang xử lý AI nhận diện khuôn mặt...')
		onCapture(capturedDescriptors.current)
	}, [isCapturing, onCapture])

	// ─── 5. Vòng lặp phát hiện góc mặt + Stable Frame Detection ─────────────
	const processingRef = useRef(false)

	useEffect(() => {
		if (!modelsLoaded || isCapturing) return

		const interval = setInterval(async () => {
			if (!videoRef.current || videoRef.current.readyState !== 4) return
			if (processingRef.current) return

			try {
				processingRef.current = true

				const detection = await faceapi.detectSingleFace(
					videoRef.current,
					new faceapi.TinyFaceDetectorOptions()
				).withFaceLandmarks().withFaceDescriptor()

				if (!detection) {
					// Mặt biến mất → reset buffer
					angleBufferRef.current = []
					setStableState('idle')
					processingRef.current = false
					return
				}
				const landmarks = detection.landmarks
				if (!landmarks) { processingRef.current = false; return }

				const { yaw, pitch } = estimatePose(landmarks)

				const currentIndex = stepIndexRef.current
				const currentStep = STEPS[currentIndex]
				if (!currentStep) { processingRef.current = false; return }

				const poseOk = currentStep.check(yaw, pitch)

				if (!poseOk) {
					// Sai góc → giảm bớt phần tử cũ thay vì xóa hoàn toàn để tránh giật cục/mất công sức tích lũy
					if (angleBufferRef.current.length > 0) {
						angleBufferRef.current.shift()
					}
					setStableState('idle')
					processingRef.current = false
					return
				}

				// ─── STABLE FRAME DETECTION ──────────────────────────────────
				// Góc đúng → thêm vào rolling buffer (chỉ giữ N phần tử gần nhất)
				const buf = angleBufferRef.current
				buf.push(yaw)
				if (buf.length > STABLE_FRAMES_REQUIRED) buf.shift()

				if (buf.length < STABLE_FRAMES_REQUIRED) {
					// Buffer đang tích lũy → hiện "Giữ yên..." nếu đã có ≥ 2 frame
					if (buf.length >= 2) setStableState('filling')
					processingRef.current = false
					return
				}

				// Đủ STABLE_FRAMES_REQUIRED frame → kiểm tra stdDev
				const stdDev = computeStdDev(buf)

				if (stdDev > STABLE_ANGLE_STD_DEV_MAX) {
					// Đầu vẫn đang lắc → tiếp tục chờ, giữ buffer
					setStableState('filling')
					processingRef.current = false
					return
				}

				// ✅ ĐẦU ĐÃ ỔN ĐỊNH ĐỦ LÂU → Chụp ảnh
				angleBufferRef.current = []  // Reset buffer trước khi chụp

				setStableState('success')
				setTimeout(() => setStableState('idle'), 500) // Flash ✓ trong 500ms

				const nextStep = currentIndex + 1

				if (nextStep < STEPS.length) {
					// Lấy vector đặc trưng 128 chiều
					if (detection.descriptor) {
						capturedDescriptors.current.push(Array.from(detection.descriptor))
					}

					setStepIndex(nextStep)
					setMessage(STEPS[nextStep].label)
				} else {
					// Bước cuối cùng
					if (detection.descriptor) {
						capturedDescriptors.current.push(Array.from(detection.descriptor))
					}
					setStepIndex(nextStep)
					setMessage('Hoàn thành! Đang xử lý khuôn mặt...')
					await finishCapture()
				}
				// ─────────────────────────────────────────────────────────────

			} catch {
				// Bỏ qua lỗi detect nhất thời
			} finally {
				processingRef.current = false
			}
		}, 100) // 100ms/frame ≈ ~10 fps để tăng tốc phản hồi và nhận dạng mượt mà hơn

		return () => clearInterval(interval)
	}, [modelsLoaded, isCapturing, finishCapture, STEPS])

	// ─── UI ─────────────────────────────────────────────────────────────────
	const progressPercent = stepIndex === 0 ? 0 : (stepIndex / STEPS.length) * 100
	const numDashes = 72

	// Màu vòng tròn theo trạng thái
	const ringColor = stableState === 'success' ? '#34C759'
		: stableState === 'filling' ? '#FFD60A'
			: '#555555'

	return (
		<div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white">
			{/* Top Bar */}
			<div className="flex h-16 items-center px-6">
				<button
					onClick={onClose}
					className="text-lg text-blue-500 hover:text-blue-400 font-medium"
				>
					Hủy
				</button>
			</div>

			{/* Main Content Area */}
			<div className="flex flex-1 flex-col items-center pt-8">
				{/* Camera Container with Dashes */}
				<div className="relative mb-8 h-80 w-80">
					{/* Video Wrapper inside a circle mask */}
					<div className="absolute inset-8 overflow-hidden rounded-full bg-zinc-900">
						<video
							ref={videoRef}
							autoPlay
							muted
							playsInline
							className="h-full w-full object-cover transform -scale-x-100"
						/>
						{/* Overlay khi đang gửi dữ liệu */}
						{isCapturing && (
							<div className="absolute inset-0 bg-white/20 backdrop-blur-sm transition-all duration-500" />
						)}
						{/* Flash ✓ khi chụp thành công */}
						{stableState === 'success' && (
							<div className="absolute inset-0 flex items-center justify-center bg-[#34C759]/30 transition-all duration-200">
								<span className="text-5xl drop-shadow-lg">✓</span>
							</div>
						)}
					</div>

					{/* Dashes Ring */}
					<div className="absolute inset-0 pointer-events-none">
						<svg width="100%" height="100%" viewBox="0 0 320 320">
							<g transform="translate(160, 160)">
								{Array.from({ length: numDashes }).map((_, i) => {
									const angle = (i * 360) / numDashes
									const isDone = (i / numDashes) * 100 < progressPercent
									// Màu vàng cho phần "đang filling" theo tỷ lệ buffer
									const bufLen = Math.min(angleBufferRef.current.length, STABLE_FRAMES_REQUIRED)
									const isFilling = !isDone && stableState === 'filling'
										&& i < Math.round((bufLen / STABLE_FRAMES_REQUIRED) * numDashes)

									return (
										<rect
											key={i}
											x="-2"
											y="-155"
											width="4"
											height="16"
											rx="2"
											fill={isDone ? '#34C759' : isFilling ? '#FFD60A' : '#333333'}
											transform={`rotate(${angle})`}
											className="transition-colors duration-150"
										/>
									)
								})}
							</g>
						</svg>
					</div>

					{/* Face icon khi chưa load model */}
					{!modelsLoaded && (
						<div className="absolute inset-0 flex items-center justify-center">
							<svg className="h-24 w-24 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
								<path strokeLinecap="round" strokeLinejoin="round" d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.092-1.82-1.092-4.048 0-5.868 1.171-1.952 3.07-1.952 4.242 0 1.092 1.82 1.092 4.048 0 5.868z" />
								<path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121a3 3 0 104.242 0 3 3 0 00-4.242 0z" />
							</svg>
						</div>
					)}
				</div>

				{/* Title and Instructions */}
				<div className="mt-4 px-8 text-center">
					<h2 className="mb-4 text-3xl font-bold tracking-tight">
						{stepIndex >= STEPS.length ? 'Hoàn tất' : 'Thiết lập Face ID'}
					</h2>
					<p className="mx-auto max-w-sm text-lg text-zinc-400">
						{message}
					</p>

					{/* ─── Stable Frame Indicator ───────────────────────────── */}
					{stableState === 'filling' && !isCapturing && (
						<p className="mx-auto mt-3 flex items-center justify-center gap-2 text-sm font-medium text-yellow-400 animate-pulse">
							<span>⏳</span>
							Giữ yên... đang xác nhận góc mặt
						</p>
					)}
					{stableState === 'success' && (
						<p className="mx-auto mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-green-400">
							<span>✓</span>
							Đã ghi nhận!
						</p>
					)}
					{/* ─────────────────────────────────────────────────────── */}

					{stepIndex === 0 && modelsLoaded && stableState === 'idle' && (
						<p className="mx-auto mt-6 max-w-sm text-base text-zinc-500">
							Đầu tiên, đặt khuôn mặt của bạn vào trong khung camera. Sau đó làm theo các chỉ dẫn để hệ thống nhận diện các góc mặt của bạn.
						</p>
					)}
				</div>
			</div>

			{/* Accessibility Option (Like Apple) */}
			<div className="pb-12 pt-8 text-center">
				<button className="text-blue-500 hover:text-blue-400 font-medium">
					Tùy chọn trợ năng
				</button>
			</div>
		</div>
	)
}
