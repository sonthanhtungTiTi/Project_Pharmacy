const { GoogleGenerativeAI } = require('@google/generative-ai')

class GeminiError extends Error {
	constructor(message, code) {
		super(message)
		this.code = code
	}
}

/**
 * Phân tích ảnh đơn thuốc bằng Gemini Vision
 * @param {Buffer} imageBuffer - Buffer của hình ảnh tải lên
 * @returns {Promise<string[]>} - Mảng chứa tên các loại thuốc
 */
const analyzePrescriptionImage = async (imageBuffer) => {
	const apiKey = process.env.GEMINI_API_KEY
	
	if (!apiKey) {
		throw new Error('GEMINI_API_KEY is not configured in .env')
	}

	const genAI = new GoogleGenerativeAI(apiKey)
	const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

	const prompt = `Bạn là một trợ lý y khoa chuyên phân tích đơn thuốc.
Nhiệm vụ: Trích xuất danh sách các loại thuốc từ hình ảnh đơn thuốc.

Quy tắc BẮT BUỘC:
1. Nếu ảnh quá mờ, nhòe, tối hoặc không thể đọc rõ chữ, BẠN PHẢI TRẢ VỀ CHÍNH XÁC CHUỖI SAU VÀ KHÔNG GÌ KHÁC: ERR_BLURRY
2. Hệ thống CHỈ chấp nhận đơn thuốc in hoặc đánh máy. Nếu đơn thuốc là CHỮ VIẾT TAY, BẠN PHẢI TRẢ VỀ CHÍNH XÁC CHUỖI SAU VÀ KHÔNG GÌ KHÁC: ERR_HANDWRITTEN
3. Nếu đơn thuốc hợp lệ, hãy trả về MỘT MẢNG JSON hợp lệ chứa CHỈ TÊN NGẮN GỌN (TÊN THƯƠNG HIỆU/HOẠT CHẤT CHÍNH) của các loại thuốc.
4. TUYỆT ĐỐI KHÔNG BAO GỒM: Quy cách đóng gói (vỉ, hộp, viên, ml), Công dụng (giảm đau, trị viêm...), Thành phần phụ. (Ví dụ thay vì "Phong Tê Thấp Nhất Nhất trị viêm khớp (3 vỉ x 10 viên)", CHỈ trả về "Phong Tê Thấp Nhất Nhất").
5. KHÔNG tự đoán mò thuốc không có trong ảnh. Chỉ trả về chuỗi mảng JSON, KHÔNG markdown, KHÔNG text giải thích.
Ví dụ đầu ra hợp lệ: ["Oztis", "Paracetamol", "Dưỡng Cốt Hoàn"]`

	const imageParts = [
		{
			inlineData: {
				data: imageBuffer.toString("base64"),
				mimeType: "image/jpeg"
			}
		}
	]

	try {
		const result = await model.generateContent([prompt, ...imageParts])
		const responseText = result.response.text().trim()

		if (responseText === 'ERR_BLURRY') {
			throw new GeminiError('Hình ảnh đơn thuốc bị mờ hoặc không rõ nét. Vui lòng chụp lại.', 'ERR_BLURRY')
		}

		if (responseText === 'ERR_HANDWRITTEN') {
			throw new GeminiError('Hệ thống chỉ chấp nhận đơn thuốc đánh máy hoặc in. Không hỗ trợ đơn thuốc viết tay.', 'ERR_HANDWRITTEN')
		}

		const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
		
		let medicines = []
		try {
			medicines = JSON.parse(cleanJsonStr)
			if (!Array.isArray(medicines)) {
				throw new Error("Không phải mảng")
			}
		} catch (parseError) {
			console.error("Lỗi parse JSON từ AI:", cleanJsonStr)
			throw new GeminiError('Không thể phân tích đơn thuốc, vui lòng thử lại.', 'ERR_PARSE')
		}

		return medicines

	} catch (error) {
		if (error instanceof GeminiError) {
			throw error
		}
		console.error("Gemini API Error:", error)
		throw new Error('Lỗi kết nối AI phân tích ảnh')
	}
}

module.exports = {
	analyzePrescriptionImage,
	GeminiError
}
