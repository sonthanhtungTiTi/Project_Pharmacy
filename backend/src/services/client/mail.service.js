const nodemailer = require('nodemailer')

const getTransporter = () => {
	const emailUser = process.env.EMAIL_USER
	const emailPassword = process.env.EMAIL_PASSWORD

	if (!emailUser || !emailPassword) {
		throw new Error('EMAIL_USER and EMAIL_PASSWORD must be configured')
	}

	return nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: emailUser,
			pass: emailPassword,
		},
	})
}

const sendResetOtpEmail = async ({ toEmail, fullName, otpCode }) => {
	const transporter = getTransporter()
	const from = `"Nhà Thuốc T&Q" <${process.env.EMAIL_USER}>`
	const html = `
		<div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color: #24292e; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="padding-bottom: 10px; border-bottom: 1px solid #e1e4e8; margin-bottom: 20px;">
				<h2 style="margin: 0; color: #24292e; font-size: 24px;">Nhà Thuốc T&Q</h2>
			</div>
			<p style="font-size: 14px; line-height: 1.5;">Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
			<p style="font-size: 14px; line-height: 1.5;">Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với email <strong>${toEmail}</strong>. Để tiếp tục, vui lòng nhập mã xác thực dưới đây:</p>
			<p style="font-size: 14px; color: #586069; margin-bottom: 5px;">Mã xác thực:</p>
			<div style="font-size: 36px; font-weight: bold; letter-spacing: 6px; padding: 10px 0; color: #0366d6;">
				${otpCode}
			</div>
			<p style="font-size: 14px; line-height: 1.5; color: #586069; margin-top: 20px;">
				Mã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu khôi phục mật khẩu, tài khoản của bạn vẫn an toàn và bạn có thể bỏ qua email này.
			</p>
		</div>
	`

	await transporter.sendMail({
		from,
		to: toEmail,
		subject: 'OTP khoi phuc mat khau - NHA THUOC T&Q ',
		text: [
			`Xin chao ${fullName || 'ban'},`,
			'',
			'OTP khoi phuc mat khau cua ban la:',
			otpCode,
			'',
			'OTP co hieu luc trong 10 phut.',
			'Neu ban khong yeu cau, vui long bo qua email nay.',
		].join('\n'),
		html,
	})
}

const sendRegisterOtpEmail = async ({ toEmail, fullName, otpCode }) => {
	const transporter = getTransporter()
	const from = `"Nhà Thuốc T&Q" <${process.env.EMAIL_USER}>`
	const html = `
		<div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color: #24292e; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="padding-bottom: 10px; border-bottom: 1px solid #e1e4e8; margin-bottom: 20px;">
				<h2 style="margin: 0; color: #24292e; font-size: 24px;">Nhà Thuốc T&Q</h2>
			</div>
			<p style="font-size: 14px; line-height: 1.5;">Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
			<p style="font-size: 14px; line-height: 1.5;">Chúng tôi đã nhận được yêu cầu đăng ký tài khoản mới cho email <strong>${toEmail}</strong>. Để hoàn tất việc đăng ký, vui lòng nhập mã xác thực dưới đây:</p>
			<p style="font-size: 14px; color: #586069; margin-bottom: 5px;">Mã xác thực:</p>
			<div style="font-size: 36px; font-weight: bold; letter-spacing: 6px; padding: 10px 0; color: #28a745;">
				${otpCode}
			</div>
			<p style="font-size: 14px; line-height: 1.5; color: #586069; margin-top: 20px;">
				Mã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký tài khoản, có thể ai đó đang sử dụng nhầm email của bạn. Bạn có thể an tâm bỏ qua email này.
			</p>
		</div>
	`

	await transporter.sendMail({
		from,
		to: toEmail,
		subject: 'OTP Xac thuc dang ky - NHA THUOC T&Q ',
		text: [
			`Xin chao ${fullName || 'ban'},`,
			'',
			'OTP xac thuc dang ky cua ban la:',
			otpCode,
			'',
			'OTP co hieu luc trong 10 phut.',
			'Neu ban khong yeu cau, vui long bo qua email nay.',
		].join('\n'),
		html,
	})
}

module.exports = {
	sendResetOtpEmail,
	sendRegisterOtpEmail,
}
