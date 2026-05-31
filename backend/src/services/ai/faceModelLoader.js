const path = require('path')
const { Canvas, Image, ImageData } = require('canvas')

let modelsLoaded = false
let faceapi = null

const loadFaceModels = async () => {
	if (modelsLoaded) return

	try {
		if (!faceapi) {
			faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js')
			// Monkey patch môi trường Node để sử dụng canvas như trong trình duyệt
			faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
			
			// Await TF backend to be ready
			await faceapi.tf.ready()
		}

		const modelsDir = path.resolve(
			process.cwd(),
			process.env.FACE_MODELS_DIR || './node_modules/@vladmandic/face-api/model'
		)

		console.log(`[FaceAPI] Tải các mô hình AI từ: ${modelsDir}`)

		// FIX: Dùng tinyFaceDetector thay sðMobilenetV1
		// Đồng bộ với face.service.js và FaceCamera.tsx (frontend)
		// ssdMobilenetv1 và tinyFaceDetector tạo ra vector khác nhau ~0.05-0.08 units
		// nếu dùng lại 2 model khác nhau sẽ khiến so khớp bị sai (false reject)
		await Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromDisk(modelsDir),
			faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir),
			faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir),
		])

		modelsLoaded = true
		console.log('[FaceAPI] Tải mô hình AI thành công (TinyFaceDetector ✓)')
	} catch (error) {
		console.error('[FaceAPI] Lỗi khi tải mô hình AI:', error.message)
		console.warn('[FaceAPI] Face model loading failed. Server will continue without face features.')
	}
}

const isFaceModelsLoaded = () => modelsLoaded

module.exports = {
	loadFaceModels,
	isFaceModelsLoaded,
}
