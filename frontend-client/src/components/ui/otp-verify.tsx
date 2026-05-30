import { useState } from 'react'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import toast from 'react-hot-toast'

import {
	forgotPassword,
	resetForgotPassword,
	verifyForgotPasswordOtp,
} from '../../services/auth.service'

interface OtpVerifyProps {
	initialEmail?: string
	onBack: () => void
	onVerified?: (email: string) => void
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const otpRegex = /^[0-9]{6}$/

function OtpVerify({ initialEmail = '', onBack, onVerified }: OtpVerifyProps) {
	const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')
	const [email, setEmail] = useState(initialEmail)
	const [otp, setOtp] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showNewPassword, setShowNewPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [maskedEmail, setMaskedEmail] = useState('')
	const [isSendingOtp, setIsSendingOtp] = useState(false)
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
	const [isResettingPassword, setIsResettingPassword] = useState(false)

	const handleSendOtp = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!email.trim()) {
			toast.error('Vui lòng nhập email de khôi phục mat khau')
			return
		}

		if (!emailRegex.test(email.trim())) {
			toast.error('Email khong hop le')
			return
		}

		try {
			setIsSendingOtp(true)
			const result = await forgotPassword({ email: email.trim().toLowerCase() })
			setMaskedEmail(result.maskedEmail)
			setStep('otp')
			toast.success(`OTP đã được gui den ${result.maskedEmail} (hieu luc ${result.expiresInMinutes} phut)`)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Không thể gui OTP')
		} finally {
			setIsSendingOtp(false)
		}
	}

	const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!otpRegex.test(otp.trim())) {
			toast.error('OTP phai gom 6 chu so')
			return
		}

		try {
			setIsVerifyingOtp(true)
			await verifyForgotPasswordOtp({
				email: email.trim().toLowerCase(),
				otp: otp.trim(),
			})
			toast.success('Xác nhận OTP thành công')
			setStep('password')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Xác nhận OTP thất bại')
		} finally {
			setIsVerifyingOtp(false)
		}
	}

	const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!newPassword || !confirmPassword) {
			toast.error('Vui lòng nhập đầy đủ mat khau moi')
			return
		}

		if (newPassword !== confirmPassword) {
			toast.error('Mật khẩu nhập lai không khớp')
			return
		}

		if (newPassword.length < 6 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
			toast.error('Mật khẩu moi phai tu 6 ký tự va gom chữ + số')
			return
		}

		try {
			setIsResettingPassword(true)
			await resetForgotPassword({
				email: email.trim().toLowerCase(),
				newPassword,
				confirmPassword,
			})
			toast.success('Đặt lại mật khẩu thành công, vui lòng đăng nhập lại')
			onVerified?.(email.trim().toLowerCase())
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Đặt lại mật khẩu thất bại')
		} finally {
			setIsResettingPassword(false)
		}
	}

	if (step === 'email') {
		return (
			<>
				<button
					type="button"
					onClick={onBack}
					className="mb-4 text-sm font-semibold text-[#1f9542] hover:underline"
				>
					Quay lại đăng nhập
				</button>

				<form className="space-y-3" onSubmit={handleSendOtp}>
					<label className="block">
						<span className="mb-1 block text-sm font-medium text-slate-600">Email</span>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="Nhập email đã đăng ký"
							className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
						/>
					</label>

					<button
						type="submit"
						disabled={isSendingOtp}
						className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(120deg,#25a53e,#47c95a)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,165,62,0.28)] transition hover:brightness-105"
					>
						{isSendingOtp ? 'Dang gui OTP...' : 'Gui OTP'}
					</button>
				</form>
			</>
		)
	}

	if (step === 'otp') {
		return (
			<>
				<button
					type="button"
					onClick={() => {
						setStep('email')
						setOtp('')
					}}
					className="mb-4 text-sm font-semibold text-[#1f9542] hover:underline"
				>
					Nhập lại email
				</button>

				<form className="space-y-3" onSubmit={handleVerifyOtp}>
					<p className="rounded-xl bg-[#f2f6f3] px-4 py-3 text-xs text-slate-600">
						OTP đã được gửi đến {maskedEmail || email}
					</p>

					<label className="block">
					<span className="mb-1 block text-sm font-medium text-slate-600">Nhập OTP</span>
					<input
						type="text"
						value={otp}
						onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
						placeholder="Nhập mã OTP 6 chữ số"
							className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
						/>
					</label>

					<button
						type="submit"
						disabled={isVerifyingOtp}
						className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(120deg,#25a53e,#47c95a)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,165,62,0.28)] transition hover:brightness-105"
					>
						{isVerifyingOtp ? 'Đang xác nhận...' : 'Xác nhận OTP'}
					</button>
				</form>
			</>
		)
	}

	if (step === 'password') {
		return (
			<>
				<button
					type="button"
					onClick={() => setStep('otp')}
					className="mb-4 text-sm font-semibold text-[#1f9542] hover:underline"
				>
					Quay lại OTP
				</button>

				<form className="space-y-3" onSubmit={handleResetPassword}>
					<p className="rounded-xl bg-[#f2f6f3] px-4 py-3 text-xs text-slate-600">
						OTP đã xác nhận cho {maskedEmail || email}
					</p>

					<label className="block">
					<span className="mb-1 block text-sm font-medium text-slate-600">Mật khẩu mới</span>
					<div className="relative">
						<input
							type={showNewPassword ? 'text' : 'password'}
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							placeholder="Nhập mật khẩu mới"
								className="h-11 w-full rounded-xl border border-slate-200 px-4 pr-11 text-sm outline-none transition focus:border-[#72d27a]"
							/>
							<button
								type="button"
								onClick={() => setShowNewPassword((prev) => !prev)}
								className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-slate-700"
							aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
							>
								{showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
							</button>
						</div>
					</label>

					<label className="block">
					<span className="mb-1 block text-sm font-medium text-slate-600">Nhập lại mật khẩu mới</span>
					<div className="relative">
						<input
							type={showConfirmPassword ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							placeholder="Nhập lại mật khẩu mới"
								className="h-11 w-full rounded-xl border border-slate-200 px-4 pr-11 text-sm outline-none transition focus:border-[#72d27a]"
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword((prev) => !prev)}
								className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-slate-700"
							aria-label={showConfirmPassword ? 'Ẩn nhập lại mật khẩu mới' : 'Hiện nhập lại mật khẩu mới'}
							>
								{showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
							</button>
						</div>
					</label>

					<button
						type="submit"
						disabled={isResettingPassword}
						className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(120deg,#25a53e,#47c95a)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,165,62,0.28)] transition hover:brightness-105"
					>
						{isResettingPassword ? 'Dang cập nhật...' : 'Đặt lại mat khau'}
					</button>
				</form>
			</>
		)
	}

	return null
}

export default OtpVerify

