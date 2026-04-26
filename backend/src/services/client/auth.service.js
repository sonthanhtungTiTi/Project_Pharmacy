const { OAuth2Client } = require('google-auth-library')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { sendResetOtpEmail } = require('./mail.service')

const User = require('../../models/user.model')
const Otp = require('../../models/otp.model')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const googleCodeClient = new OAuth2Client(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_REDIRECT_URI
)

class AuthServiceError extends Error {
	constructor(message, statusCode = 400) {
		super(message)
		this.statusCode = statusCode
	}
}

const createAccessToken = (user) => {
	const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'

	return jwt.sign(
		{
			userId: user._id,
			email: user.email,
			role: user.role,
		},
		jwtSecret,
		{ expiresIn: '7d' },
	)
}

const sanitizeUser = (user) => ({
	id: user._id,
	fullName: user.fullName,
	email: user.email,
	phone: user.phone,
	avatar: user.avatar || '',
	isAvatarCustom: Boolean(user.isAvatarCustom),
	address: user.address || '',
	dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : '',
	role: user.role,
	provider: user.provider,
})

const maskEmail = (email) => {
	const [name, domain] = String(email).split('@')
	if (!name || !domain) {
		return email
	}

	if (name.length <= 2) {
		return `${name[0] || '*'}***@${domain}`
	}

	return `${name.slice(0, 2)}***@${domain}`
}

const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000))

const updateUserProfile = async (userId, profilePayload) => {
	if (!userId) {
		throw new AuthServiceError('userId is required', 400)
	}

	const user = await User.findById(userId)

	if (!user) {
		throw new AuthServiceError('User not found', 404)
	}

	const nextEmail = profilePayload.email
		? String(profilePayload.email).toLowerCase().trim()
		: user.email
	const nextPhone = profilePayload.phone
		? String(profilePayload.phone).trim()
		: user.phone

	if (nextEmail !== user.email) {
		const emailOwner = await User.findOne({ email: nextEmail, _id: { $ne: user._id } })
		if (emailOwner) {
			throw new AuthServiceError('Email already exists', 409)
		}
	}

	if (nextPhone && nextPhone !== user.phone) {
		const phoneOwner = await User.findOne({ phone: nextPhone, _id: { $ne: user._id } })
		if (phoneOwner) {
			throw new AuthServiceError('Phone already exists', 409)
		}
	}

	user.fullName = profilePayload.fullName ? String(profilePayload.fullName).trim() : user.fullName
	user.email = nextEmail
	user.phone = nextPhone
	if (typeof profilePayload.avatar === 'string') {
		const nextAvatar = profilePayload.avatar.trim()
		user.avatar = nextAvatar
		user.isAvatarCustom = Boolean(nextAvatar)
	}
	user.address = profilePayload.address ? String(profilePayload.address).trim() : ''
	user.dateOfBirth = profilePayload.dateOfBirth || null

	await user.save()

	return sanitizeUser(user)
}

const registerLocalUser = async ({ fullName, email, phone, password }) => {
	if (!fullName || !email || !phone || !password) {
		throw new AuthServiceError('fullName, email, phone and password are required', 400)
	}

	if (password.length < 6) {
		throw new AuthServiceError('Password must be at least 6 characters', 400)
	}

	const normalizedEmail = String(email).toLowerCase().trim()
	const normalizedPhone = String(phone).trim()

	const existingUser = await User.findOne({
		$or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
	})

	if (existingUser) {
		if (existingUser.email === normalizedEmail) {
			throw new AuthServiceError('Email already exists', 409)
		}
		throw new AuthServiceError('Phone already exists', 409)
	}

	const passwordHash = await bcrypt.hash(password, 10)

	const user = await User.create({
		fullName: String(fullName).trim(),
		email: normalizedEmail,
		phone: normalizedPhone,
		password: passwordHash,
		provider: 'local',
		role: 'customer',
		isActive: true,
		lastLoginAt: new Date(),
	})

	const accessToken = createAccessToken(user)

	return {
		accessToken,
		user: sanitizeUser(user),
	}
}

const loginLocalUser = async ({ phoneOrEmail, password }) => {
	if (!phoneOrEmail || !password) {
		throw new AuthServiceError('phoneOrEmail and password are required', 400)
	}

	const identity = String(phoneOrEmail).trim()
	const identityQuery = identity.includes('@')
		? { email: identity.toLowerCase() }
		: { phone: identity }

	const user = await User.findOne(identityQuery)

	if (!user) {
		throw new AuthServiceError('Invalid phone/email or password', 401)
	}

	if (!user.password) {
		throw new AuthServiceError('This account must login with Google', 400)
	}

	const isPasswordValid = await bcrypt.compare(password, user.password)

	if (!isPasswordValid) {
		throw new AuthServiceError('Invalid phone/email or password', 401)
	}

	user.lastLoginAt = new Date()
	await user.save()

	const accessToken = createAccessToken(user)

	return {
		accessToken,
		user: sanitizeUser(user),
	}
}

const forgotPasswordByEmail = async ({ email }) => {
	if (!email) {
		throw new AuthServiceError('email is required', 400)
	}

	const normalizedEmail = String(email).toLowerCase().trim()
	const user = await User.findOne({ email: normalizedEmail })

	if (!user) {
		throw new AuthServiceError('Email is not registered', 404)
	}

	if (user.provider === 'google' && !user.password) {
		throw new AuthServiceError('This account uses Google login and cannot reset local password', 400)
	}

const otpCode = createOtpCode()
	const otpHash = await bcrypt.hash(otpCode, 10)
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

	await Otp.deleteMany({
		userId: user._id,
		email: user.email,
		purpose: 'reset-password',
		verifiedAt: null,
	})

	await Otp.create({
		userId: user._id,
		email: user.email,
		purpose: 'reset-password',
		otpHash,
		expiresAt,
	})

	await sendResetOtpEmail({
		toEmail: user.email,
		fullName: user.fullName,
		otpCode,
	})

	return {
		maskedEmail: maskEmail(user.email),
		expiresInMinutes: 10,
	}
}

const verifyForgotPasswordOtp = async ({ email, otp }) => {
	if (!email || !otp) {
		throw new AuthServiceError('email and otp are required', 400)
	}

	const normalizedEmail = String(email).toLowerCase().trim()
	const otpCode = String(otp).trim()

	const otpRecord = await Otp.findOne({
		email: normalizedEmail,
		purpose: 'reset-password',
		verifiedAt: null,
		expiresAt: { $gt: new Date() },
	}).sort({ createdAt: -1 })

	if (!otpRecord) {
		throw new AuthServiceError('OTP is invalid or expired', 400)
	}

	if (otpRecord.attempts >= 5) {
		await Otp.deleteOne({ _id: otpRecord._id })
		throw new AuthServiceError('OTP has exceeded maximum attempts', 400)
	}

	const isOtpValid = await bcrypt.compare(otpCode, otpRecord.otpHash)

	if (!isOtpValid) {
		otpRecord.attempts += 1
		await otpRecord.save()
		throw new AuthServiceError('OTP is incorrect', 400)
	}

	otpRecord.verifiedAt = new Date()
	await otpRecord.save()

	return { verified: true }
}

const resetForgotPassword = async ({ email, newPassword, confirmPassword }) => {
	if (!email || !newPassword || !confirmPassword) {
		throw new AuthServiceError('email, newPassword and confirmPassword are required', 400)
	}

	if (newPassword !== confirmPassword) {
		throw new AuthServiceError('Confirm password does not match', 400)
	}

	if (newPassword.length < 6 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
		throw new AuthServiceError('New password must be at least 6 characters and include letters and numbers', 400)
	}

	const normalizedEmail = String(email).toLowerCase().trim()
	const user = await User.findOne({ email: normalizedEmail })

	if (!user) {
		throw new AuthServiceError('Email is not registered', 404)
	}

	const verifiedOtpRecord = await Otp.findOne({
		email: normalizedEmail,
		purpose: 'reset-password',
		verifiedAt: { $ne: null },
		expiresAt: { $gt: new Date() },
	}).sort({ verifiedAt: -1 })

	if (!verifiedOtpRecord) {
		throw new AuthServiceError('Please verify OTP before resetting password', 400)
	}

	if (user.password) {
		const isSamePassword = await bcrypt.compare(newPassword, user.password)
		if (isSamePassword) {
			throw new AuthServiceError('New password must be different from current password', 400)
		}
	}

	user.password = await bcrypt.hash(newPassword, 10)

	if (user.provider === 'google') {
		user.provider = 'google+local'
	}

	await user.save()

	await Otp.deleteMany({
		email: normalizedEmail,
		purpose: 'reset-password',
	})

	return { reset: true }
}

const getGooglePayloadFromIdToken = async (idToken) => {
	if (!idToken) {
		throw new AuthServiceError('idToken is required', 400)
	}

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		})

		const payload = ticket.getPayload()

		if (!payload || !payload.email) {
			throw new AuthServiceError('Invalid Google token payload', 401)
		}

		return payload
	} catch (error) {
		if (error instanceof AuthServiceError) {
			throw error
		}
		throw new AuthServiceError('Google token is invalid', 401)
	}
}

const upsertGoogleUserAndCreateToken = async (payload) => {
	const email = String(payload.email).toLowerCase().trim()
	const googleId = payload.sub
	const fullName = payload.name || email.split('@')[0]
	const avatar = payload.picture || ''

	let user = await User.findOne({
		$or: [{ googleId }, { email }],
	})

	if (!user) {
		user = await User.create({
			fullName,
			email,
			googleId,
			avatar,
			isAvatarCustom: false,
			provider: 'google',
			role: 'customer',
			isActive: true,
			lastLoginAt: new Date(),
		})
	} else {
		if (!user.fullName) {
			user.fullName = fullName
		}
		user.googleId = googleId
		if (avatar && (!user.avatar || !user.isAvatarCustom)) {
			user.avatar = avatar
			user.isAvatarCustom = false
		}
		user.provider = 'google'
		user.lastLoginAt = new Date()
		await user.save()
	}

	const accessToken = createAccessToken(user)

	return {
		accessToken,
		user: sanitizeUser(user),
	}
}

const googleLoginOrRegister = async (idToken) => {
	const payload = await getGooglePayloadFromIdToken(idToken)
	return upsertGoogleUserAndCreateToken(payload)
}

const googleLoginOrRegisterByCode = async (authCode, redirectUri) => {
	if (!authCode) {
		throw new AuthServiceError('authCode is required', 400)
	}

	const resolvedRedirectUri =
	redirectUri || process.env.GOOGLE_REDIRECT_URI

	let idToken

	try {
		const tokenResponse = await googleCodeClient.getToken({
			code: authCode,
			redirect_uri: resolvedRedirectUri,
		})
		idToken = tokenResponse.tokens.id_token
	} catch (error) {
		const googleErrorData = error.response?.data
		const googleError =
			googleErrorData?.error_description ||
			googleErrorData?.error ||
			error.message
		throw new AuthServiceError(`Cannot exchange Google auth code: ${googleError}`, 401)
	}

	if (!idToken) {
		throw new AuthServiceError('Google did not return id_token', 401)
	}

	const payload = await getGooglePayloadFromIdToken(idToken)
	return upsertGoogleUserAndCreateToken(payload)
}

module.exports = {
	registerLocalUser,
	loginLocalUser,
	forgotPasswordByEmail,
	verifyForgotPasswordOtp,
	resetForgotPassword,
	updateUserProfile,
	googleLoginOrRegister,
	googleLoginOrRegisterByCode,
	AuthServiceError,
}
