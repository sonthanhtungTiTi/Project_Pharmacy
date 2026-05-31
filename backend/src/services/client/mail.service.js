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
	const from = process.env.EMAIL_USER
	const html = `
		<div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 12px;">
				<tr>
					<td align="center">
						<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e6ebf2;padding:28px;">
							<tr>
								<td style="color:#0f172a;font-size:18px;font-weight:700;padding-bottom:10px;">
									OTP khoi phuc mat khau
								</td>
							</tr>
							<tr>
								<td style="color:#334155;font-size:14px;line-height:1.6;padding-bottom:16px;">
									Xin chao <strong>${fullName || 'ban'}</strong>,<br/>
									He thong da nhan duoc yeu cau khoi phuc mat khau cho tai khoan:
								</td>
							</tr>
							<tr>
								<td style="padding-bottom:16px;">
									<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;color:#1d4ed8;font-size:14px;font-weight:700;word-break:break-word;">
										${toEmail}
									</div>
								</td>
							</tr>
							<tr>
								<td style="color:#334155;font-size:14px;line-height:1.6;padding-bottom:10px;">
									Ma OTP cua ban la:
								</td>
							</tr>
							<tr>
								<td style="padding-bottom:16px;">
									<div style="text-align:center;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:14px;">
										<span style="font-size:30px;letter-spacing:6px;line-height:1;color:#c2410c;font-weight:800;">${otpCode}</span>
									</div>
								</td>
							</tr>
							<tr>
								<td style="color:#475569;font-size:13px;line-height:1.6;">
									OTP co hieu luc trong <strong>10 phut</strong>.<br/>
									Neu ban khong yeu cau, vui long bo qua email nay.
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
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

module.exports = {
	sendResetOtpEmail,
}
