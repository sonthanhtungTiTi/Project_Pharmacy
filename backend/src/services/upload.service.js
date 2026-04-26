const cloudinary = require('cloudinary').v2
const multer = require('multer')

// Config Cloudinary từ .env
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Multer memory storage (không lưu file xuống disk)
const storage = multer.memoryStorage()

const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max
	},
	fileFilter: (req, file, cb) => {
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true)
		} else {
			cb(new Error('Only JPEG, PNG, WebP, GIF images are allowed'), false)
		}
	},
})

/**
 * Upload buffer lên Cloudinary
 * @param {Buffer} fileBuffer - Buffer từ multer
 * @param {string} folder - Thư mục trên Cloudinary (vd: 'products', 'reviews')
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'pharmacy') => {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				folder: `pharmacy/${folder}`,
				resource_type: 'image',
				transformation: [
					{ width: 800, height: 800, crop: 'limit' },
					{ quality: 'auto', fetch_format: 'auto' },
				],
			},
			(error, result) => {
				if (error) {
					reject(error)
				} else {
					resolve({
						url: result.secure_url,
						publicId: result.public_id,
					})
				}
			},
		)
		stream.end(fileBuffer)
	})
}

/**
 * Xóa ảnh trên Cloudinary
 * @param {string} publicId
 */
const deleteFromCloudinary = async (publicId) => {
	if (!publicId) return
	try {
		await cloudinary.uploader.destroy(publicId)
	} catch (error) {
		console.error('Failed to delete from Cloudinary:', error.message)
	}
}

module.exports = {
	upload,
	uploadToCloudinary,
	deleteFromCloudinary,
	cloudinary,
}
