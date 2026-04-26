/**
 * Tạo mã OTP 6 chữ số ngẫu nhiên
 */
const generateOTP = () => {
	return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Validate OTP format
 */
const isValidOTP = (otp) => {
	return /^[0-9]{6}$/.test(otp)
}

module.exports = {
	generateOTP,
	isValidOTP,
}
