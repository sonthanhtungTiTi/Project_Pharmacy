import { useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import toast from 'react-hot-toast'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

import OtpVerify from '../components/ui/otp-verify'
import {
	loginWithForm,
	loginWithGoogle,
	registerWithForm,
	verifyRegisterOtp,
	type AuthUser,
} from '../services/auth.service'
import FaceCamera from '../components/ui/FaceCamera'
import { loginWithFaceId } from '../services/faceAuth.service'

interface LoginAndRegisterProps {
	onClose: () => void
	onAuthSuccess?: (user: AuthUser) => void
}

function LoginAndRegister({ onClose, onAuthSuccess }: LoginAndRegisterProps) {
	const [isRegisterMode, setIsRegisterMode] = useState(false)
	const [isForgotMode, setIsForgotMode] = useState(false)
	const [isRegisterOtpMode, setIsRegisterOtpMode] = useState(false)
	const [registerMaskedEmail, setRegisterMaskedEmail] = useState('')
	const [registerOtp, setRegisterOtp] = useState('')
	const [isVerifyingRegisterOtp, setIsVerifyingRegisterOtp] = useState(false)
	const [showFaceCamera, setShowFaceCamera] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [fullName, setFullName] = useState('')
	const [phone, setPhone] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)

	const handleAuthSuccess = (user: AuthUser, accessToken: string) => {
		localStorage.setItem('clientAccessToken', accessToken)
		localStorage.setItem('clientUser', JSON.stringify(user))
		toast.success('Đăng nhập thành công')
		onAuthSuccess?.(user)
		onClose()
	}

	const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
		const idToken = credentialResponse.credential

		if (!idToken) {
			toast.error('Không lấy được idToken tu Google')
			return
		}

		try {
			setIsGoogleLoading(true)
			const result = await loginWithGoogle(idToken)
			handleAuthSuccess(result.user, result.accessToken)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Đăng nhập Google thất bại')
		} finally {
			setIsGoogleLoading(false)
		}
	}

	const handleSubmitLocalAuth = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const submitForm = async () => {
			try {
				setIsSubmitting(true)

				if (isRegisterMode) {
					if (!fullName || !phone || !email || !password || !confirmPassword) {
						throw new Error('Vui lòng nhập đầy đủ thong tin dang ky')
					}

					if (password !== confirmPassword) {
						throw new Error('Mật khẩu nhập lai không khớp')
					}

					const result = await registerWithForm({
						fullName,
						email,
						phone,
						password,
					})

					toast.success(`OTP đã được gửi đến ${result.maskedEmail}`)
					setRegisterMaskedEmail(result.maskedEmail)
					setIsRegisterOtpMode(true)
					return
				}

				if (!phone || !password) {
					throw new Error('Vui lòng nhập số điện thoại va mat khau')
				}

				const result = await loginWithForm({
					phoneOrEmail: phone,
					password,
				})

				handleAuthSuccess(result.user, result.accessToken)
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Đăng nhập thất bại')
			} finally {
				setIsSubmitting(false)
			}
		}

		void submitForm()
	}

	const handleVerifyRegisterOtp = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!registerOtp || registerOtp.length !== 6) {
			toast.error('OTP phai gom 6 chu so')
			return
		}
		
		try {
			setIsVerifyingRegisterOtp(true)
			const result = await verifyRegisterOtp({
				email: email.trim().toLowerCase(),
				otp: registerOtp.trim(),
			})
			
			toast.success('Xác nhận đăng ký thành công')
			handleAuthSuccess(result.user, result.accessToken)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Xác nhận OTP thất bại')
		} finally {
			setIsVerifyingRegisterOtp(false)
		}
	}

	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6">
			<div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl bg-white shadow-[0_20px_70px_rgba(7,44,18,0.28)]">
				<button
					type="button"
					onClick={onClose}
					className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
				>
					x
				</button>

				<div className="bg-[linear-gradient(120deg,#39b54a,#6adf7d)] px-6 pb-7 pt-8 text-white">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">NHÀ THUỐC T&Q </p>
					<h2 className="mt-3 text-3xl font-black leading-tight">
						{isForgotMode ? 'Khôi phục mat khau' : isRegisterMode ? 'Tạo tài khoản mới' : 'Chào mừng ban quay lại'}
					</h2>
					<p className="mt-2 text-sm text-white/85">
						{isForgotMode
							? 'Nhập email de nhan OTP va xác nhận khôi phục mat khau.'
							: isRegisterMode
								? 'Đăng ký nhanh để theo dõi đơn hàng và ưu đãi cá nhân.'
								: 'Đăng nhập để xem lịch sử mua thuốc và ưu đãi riêng cho bạn.'}
					</p>
				</div>

				<div className="px-6 pb-7 pt-5">
					{isForgotMode ? (
						<OtpVerify
							initialEmail={email}
							onBack={() => setIsForgotMode(false)}
							onVerified={() => setIsForgotMode(false)}
						/>
					) : isRegisterOtpMode ? (
						<>
							<button
								type="button"
								onClick={() => setIsRegisterOtpMode(false)}
								className="mb-4 text-sm font-semibold text-[#1f9542] hover:underline"
							>
								Quay lại đăng ký
							</button>

							<form className="space-y-3" onSubmit={handleVerifyRegisterOtp}>
								<p className="rounded-xl bg-[#f2f6f3] px-4 py-3 text-xs text-slate-600">
									OTP đã được gửi đến {registerMaskedEmail || email}
								</p>

								<label className="block">
								<span className="mb-1 block text-sm font-medium text-slate-600">Nhập OTP</span>
								<input
									type="text"
									value={registerOtp}
									onChange={(event) => setRegisterOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
									placeholder="Nhập mã OTP 6 chữ số"
									className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
								/>
								</label>

								<button
									type="submit"
									disabled={isVerifyingRegisterOtp}
									className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(120deg,#25a53e,#47c95a)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,165,62,0.28)] transition hover:brightness-105"
								>
									{isVerifyingRegisterOtp ? 'Đang xác nhận...' : 'Xác nhận OTP để đăng ký'}
								</button>
							</form>
						</>
					) : (
						<>
							<div className="mb-5 grid grid-cols-2 rounded-xl bg-[#f2f6f3] p-1">
								<button
									type="button"
									onClick={() => setIsRegisterMode(false)}
									className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
										!isRegisterMode ? 'bg-white text-[#1f9542] shadow-sm' : 'text-slate-500'
									}`}
								>
										Đăng nhập
									</button>
								<button
									type="button"
									onClick={() => setIsRegisterMode(true)}
									className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
										isRegisterMode ? 'bg-white text-[#1f9542] shadow-sm' : 'text-slate-500'
									}`}
								>
									Đăng ký
								</button>
							</div>

							<form className="space-y-3" onSubmit={handleSubmitLocalAuth}>
								<label className="block">
									<span className="mb-1 block text-sm font-medium text-slate-600">Số điện thoại</span>
									<input
										type="tel"
										value={phone}
										onChange={(event) => setPhone(event.target.value)}
										placeholder="Nhập số điện thoại"
										className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
									/>
								</label>

								{isRegisterMode && (
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Họ và tên</span>
										<input
											type="text"
											value={fullName}
											onChange={(event) => setFullName(event.target.value)}
											placeholder="Nhập họ và tên"
											className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
										/>
									</label>
								)}

								{isRegisterMode && (
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Email</span>
										<input
											type="email"
											value={email}
											onChange={(event) => setEmail(event.target.value)}
											placeholder="Nhập email"
											className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
										/>
									</label>
								)}

								<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Mật khẩu</span>
									<div className="relative">
										<input
											type={showPassword ? 'text' : 'password'}
											value={password}
											onChange={(event) => setPassword(event.target.value)}
											placeholder={isRegisterMode ? 'Tạo mật khẩu mới' : 'Nhập mật khẩu'}
											className="h-11 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm outline-none transition focus:border-[#72d27a]"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((current) => !current)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
											aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển mật khẩu'}
										>
											{showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
										</button>
									</div>
								</label>

								{!isRegisterMode && (
									<div className="flex justify-end">
										<button
											type="button"
											onClick={() => setIsForgotMode(true)}
											className="text-xs font-semibold text-[#1f9542] hover:underline"
										>
											Quên mật khẩu?
										</button>
									</div>
								)}

								{isRegisterMode && (
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Nhập lại mật khẩu</span>
										<div className="relative">
											<input
												type={showConfirmPassword ? 'text' : 'password'}
												value={confirmPassword}
												onChange={(event) => setConfirmPassword(event.target.value)}
												placeholder="Nhập lại mật khẩu"
												className="h-11 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm outline-none transition focus:border-[#72d27a]"
											/>
											<button
												type="button"
												onClick={() => setShowConfirmPassword((current) => !current)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
												aria-label={showConfirmPassword ? 'Ẩn nhập lại mật khẩu' : 'Hiển nhập lại mật khẩu'}
											>
												{showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
											</button>
										</div>
									</label>
								)}

								<button
									type="submit"
									disabled={isSubmitting}
									className="mt-1 h-11 w-full rounded-xl bg-[linear-gradient(120deg,#25a53e,#47c95a)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,165,62,0.28)] transition hover:brightness-105"
								>
									{isSubmitting ? 'Đang xử lý...' : isRegisterMode ? 'Tạo tài khoản' : 'Đăng nhập'}
								</button>

								<div className="flex items-center gap-3 py-1">
									<span className="h-px flex-1 bg-slate-200" />
									<span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Hoặc</span>
									<span className="h-px flex-1 bg-slate-200" />
								</div>

								<div className="flex justify-center rounded-xl border border-slate-200 bg-white py-2">
									<GoogleLogin
										onSuccess={handleGoogleSuccess}
										onError={() => toast.error('Đăng nhập Google thất bại')}
										text={isRegisterMode ? 'signup_with' : 'signin_with'}
										shape="pill"
										theme="outline"
										size="large"
										width="300"
									/>
								</div>

								{!isRegisterMode && (
									<button
										type="button"
										onClick={() => {
											if (!phone.trim()) {
												toast.error('Vui lòng nhập Email hoặc Số điện thoại trước khi dùng Face ID')
												return
											}
											setShowFaceCamera(true)
										}}
										className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#4ade80] bg-[#f0fdf4] text-sm font-bold text-[#166534] transition hover:bg-[#dcfce7]"
									>
										<span className="text-lg">📷</span> Đăng nhập bằng Face ID
									</button>
								)}

								{isGoogleLoading && <p className="text-sm text-slate-500">Đang xử lý Google...</p>}
							</form>

							<div className="mt-4 text-center text-sm text-slate-500">
								{isRegisterMode ? '\u0110ã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
								<button
									type="button"
									onClick={() => setIsRegisterMode((current) => !current)}
									className="font-semibold text-[#1f9542]"
								>
									{isRegisterMode ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			{showFaceCamera && (
				<FaceCamera 
					mode="login"
					onClose={() => setShowFaceCamera(false)}
					onCapture={async (blob) => {
						try {
							setIsSubmitting(true)
							const result = await loginWithFaceId(phone.trim(), blob)
							handleAuthSuccess(result.user, result.accessToken)
						} catch (error: any) {
							toast.error(error.message || 'Đăng nhập Face ID thất bại')
							setShowFaceCamera(false)
						} finally {
							setIsSubmitting(false)
						}
					}}
				/>
			)}
		</div>
	)
}

export default LoginAndRegister
