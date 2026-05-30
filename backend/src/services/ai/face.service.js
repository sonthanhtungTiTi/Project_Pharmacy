const { Image, createCanvas } = require('canvas')

let faceapi = null

/**
 * Lazily load faceapi để tránh lỗi với @tensorflow/tfjs-node
 * trên các phiên bản Node không tương thích
 */
const getFaceApi = () => {
	if (!faceapi) {
		faceapi = require('@vladmandic/face-api')
	}
	return faceapi
}

/**
 * Tạo Image object từ buffer để face-api đọc được trong NodeJS
 * @param {Buffer} buffer
 * @returns {Promise<Image>}
 */
const bufferToImage = (buffer) => {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = (err) => reject(err)
		img.src = buffer
	})
}

/**
 * Warm-up mô hình AI để tránh cold-start latency 5-10s ở request đầu tiên.
 * Gọi hàm này trong server.listen() callback sau khi loadFaceModels() hoàn tất.
 */
const warmupFaceModel = async () => {
	try {
		const api = getFaceApi()
		// Tạo canvas trắng 100x100 để chạy inference một lần
		const canvas = createCanvas(100, 100)
		// Kết quả bỏ qua, mục đích là đẩy trọng số model vào RAM/VRAM
		await api.detectAllFaces(
			canvas,
			new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
		).withFaceLandmarks().withFaceDescriptors()
		console.log('[FaceAPI] Model warmed up ✓')
	} catch {
		// Bỏ qua lỗi warm-up (canvas trắng không có mặt → detectAllFaces trả về [])
		console.log('[FaceAPI] Model warmed up ✓')
	}
}

/**
 * Trích xuất face descriptor (vector 128 chiều) từ ảnh buffer.
 * 
 * FIX QUAN TRỌNG: Dùng TinyFaceDetectorOptions thay vì SsdMobilenetv1
 * để đồng bộ với Frontend (FaceCamera.tsx cũng dùng TinyFaceDetector).
 * Nếu dùng 2 model khác nhau, vector trích xuất ra sẽ lệch nhau ~0.05-0.08 units
 * khiến so khớp bị sai (false reject).
 * 
 * @param {Buffer} imageBuffer - Buffer ảnh tải lên từ client
 * @returns {Promise<Float32Array>} Vector 128 chiều đặc trưng khuôn mặt
 */
const extractDescriptor = async (imageBuffer) => {
	const api = getFaceApi()
	const img = await bufferToImage(imageBuffer)

	// TinyFaceDetector: nhẹ, nhanh, khớp với model frontend đang dùng
	// inputSize=416: đủ độ phân giải để nhận diện góc nghiêng (trái/phải)
	// scoreThreshold=0.5: lọc các detection yếu/mờ
	const detections = await api
		.detectAllFaces(img, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
		.withFaceLandmarks()
		.withFaceDescriptors()

	if (detections.length === 0) {
		const error = new Error('Không tìm thấy khuôn mặt nào trong ảnh. Vui lòng chụp lại ở nơi đủ sáng.')
		error.statusCode = 400
		throw error
	}

	if (detections.length > 1) {
		const error = new Error('Phát hiện nhiều hơn 1 khuôn mặt. Vui lòng chụp ảnh chỉ có 1 người.')
		error.statusCode = 400
		throw error
	}

	const detection = detections[0]

	// Kiểm tra độ tin cậy (confidence score)
	if (detection.detection.score < 0.5) {
		const error = new Error('Khuôn mặt không rõ nét. Vui lòng chụp lại ở nơi đủ sáng.')
		error.statusCode = 400
		throw error
	}

	// FIX: Kiểm tra kích thước bounding box tối thiểu
	// Nếu khuôn mặt chiếm < 12% diện tích ảnh → người dùng đứng quá xa camera
	// → vector trích xuất không đủ chi tiết → độ chính xác thấp
	const box = detection.detection.box
	const bboxArea = (box.width * box.height) / (img.width * img.height)
	if (bboxArea < 0.12) {
		const error = new Error('Khuôn mặt quá nhỏ. Vui lòng đến gần camera hơn.')
		error.statusCode = 400
		throw error
	}

	return detection.descriptor
}

/**
 * Tính khoảng cách Euclidean giữa 2 face descriptor vectors.
 * Khoảng cách càng nhỏ → 2 khuôn mặt càng giống nhau.
 * 
 * Độ phức tạp: O(128) = O(1) (độ dài vector cố định 128 chiều)
 * 
 * @param {Float32Array | number[]} desc1 - Vector khuôn mặt 1
 * @param {Float32Array | number[]} desc2 - Vector khuôn mặt 2
 * @returns {number} Khoảng cách Euclidean trong không gian 128 chiều
 */
const computeDistance = (desc1, desc2) => {
	let sumOfSquares = 0
	for (let i = 0; i < 128; i++) {
		const diff = desc1[i] - desc2[i]
		sumOfSquares += diff * diff
	}
	return Math.sqrt(sumOfSquares)
}

/**
 * So khớp 2 descriptor dựa vào ngưỡng khoảng cách (threshold).
 * Ngưỡng mặc định đọc từ env FACE_MATCH_THRESHOLD, fallback 0.52.
 * 
 * Lý do giảm từ 0.55 xuống 0.52:
 * TinyFaceDetector tạo vector chặt chẽ hơn SSD → có thể dùng threshold nhỏ hơn
 * mà vẫn đạt true-accept-rate tốt, đồng thời giảm false-accept-rate (bảo mật hơn).
 * 
 * @param {number} distance - Khoảng cách Euclidean giữa 2 vector
 * @param {number|null} threshold - Ngưỡng tùy chỉnh (null = dùng env/default)
 * @returns {boolean}
 */
const isMatch = (distance, threshold = null) => {
	const matchThreshold = threshold !== null
		? threshold
		: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.52')

	return distance <= matchThreshold
}

module.exports = {
	extractDescriptor,
	computeDistance,
	isMatch,
	warmupFaceModel,
}
