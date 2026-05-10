import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
	createConsultation,
	getMyConsultations,
	cancelConsultation,
	type Consultation,
	type ConsultationStatus,
	type ConsultationType,
	type CreateConsultationPayload,
} from '../services/consultation.service'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const formatDate = (d: string | null | undefined) => {
	if (!d) return '—'
	return new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

const statusLabel: Record<ConsultationStatus, string> = {
	pending: 'Chờ xác nhận',
	confirmed: 'Đã xác nhận',
	cancelled: 'Đã hủy',
	completed: 'Hoàn tất',
}

const statusColors: Record<ConsultationStatus, string> = {
	pending: 'bg-amber-100 text-amber-700',
	confirmed: 'bg-blue-100 text-blue-700',
	cancelled: 'bg-red-100 text-red-700',
	completed: 'bg-emerald-100 text-emerald-700',
}

const typeLabel: Record<ConsultationType, string> = {
	online: '💻 Trực tuyến',
	offline: '🏪 Tại nhà thuốc',
	phone: '📞 Qua điện thoại',
}

const CALL_WINDOW_MINUTES = Math.max(1, Number(import.meta.env.VITE_CALL_WINDOW_MINUTES || 60))
const ALLOW_OFFLINE_CALLS = import.meta.env.VITE_ALLOW_OFFLINE_CALLS === 'true'

const isWithinCallWindow = (value: string | null | undefined) => {
	if (!value) return false
	const ts = new Date(value).getTime()
	if (Number.isNaN(ts)) return false
	return Math.abs(ts - Date.now()) <= CALL_WINDOW_MINUTES * 60 * 1000
}

const isAllowedCallType = (consultationType: ConsultationType, callType: 'video' | 'voice') => {
	if (consultationType === 'phone') return callType === 'voice'
	if (consultationType === 'offline') return ALLOW_OFFLINE_CALLS
	return true
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

/** Pill badge */
function StatusBadge({ status }: { status: ConsultationStatus }) {
	return (
		<span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusColors[status]}`}>
			{statusLabel[status]}
		</span>
	)
}

/** Input field */
function Field({
	label,
	required,
	children,
}: {
	label: string
	required?: boolean
	children: React.ReactNode
}) {
	return (
		<label className="block">
			<span className="mb-1 block text-sm font-medium text-slate-600">
				{label}
				{required && <span className="ml-1 text-red-500">*</span>}
			</span>
			{children}
		</label>
	)
}

const inputCls =
	'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#2ea847] focus:ring-2 focus:ring-[#2ea847]/20'
const selectCls = inputCls + ' cursor-pointer'
const textareaCls =
	'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#2ea847] focus:ring-2 focus:ring-[#2ea847]/20'

// ─────────────────────────────────────────────────────────────
// Booking Form
// ─────────────────────────────────────────────────────────────
interface BookingFormProps {
	onSuccess: () => void
}

function BookingForm({ onSuccess }: BookingFormProps) {
	const getUserInfo = () => {
		try {
			const s = localStorage.getItem('clientUser')
			return s ? JSON.parse(s) : null
		} catch {
			return null
		}
	}
	const user = getUserInfo()

	const tomorrow = new Date()
	tomorrow.setDate(tomorrow.getDate() + 1)
	tomorrow.setHours(9, 0, 0, 0)
	const defaultDate = tomorrow.toISOString().slice(0, 16)

	const [form, setForm] = useState<CreateConsultationPayload>({
		fullName: user?.fullName || '',
		phone: user?.phone || '',
		email: user?.email || '',
		consultationDate: defaultDate,
		consultationType: 'online',
		topic: '',
		description: '',
		offlineLocation: '',
		note: '',
	})
	const [loading, setLoading] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})

	const set = (key: keyof CreateConsultationPayload, value: string) =>
		setForm((f) => ({ ...f, [key]: value }))

	const validate = (): boolean => {
		const errs: Record<string, string> = {}
		if (!form.fullName.trim()) errs.fullName = 'Vui lòng nhập họ tên'
		if (!/^[0-9]{10,11}$/.test(form.phone)) errs.phone = 'Số điện thoại phải có 10–11 chữ số'
		if (!form.email.includes('@')) errs.email = 'Email không hợp lệ'
		if (!form.consultationDate) errs.consultationDate = 'Vui lòng chọn ngày tư vấn'
		else if (new Date(form.consultationDate) <= new Date()) errs.consultationDate = 'Ngày tư vấn phải là tương lai'
		if (form.topic.trim().length < 5) errs.topic = 'Chủ đề phải ít nhất 5 ký tự'
		if (form.consultationType === 'offline' && !form.offlineLocation?.trim())
			errs.offlineLocation = 'Vui lòng nhập địa chỉ chi nhánh'
		setErrors(errs)
		return Object.keys(errs).length === 0
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!validate()) return
		setLoading(true)
		try {
			const payload: CreateConsultationPayload = {
				...form,
				consultationDate: new Date(form.consultationDate).toISOString(),
			}
			await createConsultation(payload)
			toast.success('🎉 Đặt lịch tư vấn thành công!')
			onSuccess()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Đặt lịch thất bại')
		} finally {
			setLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Personal info */}
			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Field label="Họ và tên" required>
						<input
							id="consult-fullName"
							className={inputCls}
							value={form.fullName}
							onChange={(e) => set('fullName', e.target.value)}
							placeholder="Nguyễn Văn A"
						/>
					</Field>
					{errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
				</div>
				<div>
					<Field label="Số điện thoại" required>
						<input
							id="consult-phone"
							className={inputCls}
							value={form.phone}
							onChange={(e) => set('phone', e.target.value)}
							placeholder="0912345678"
							type="tel"
						/>
					</Field>
					{errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
				</div>
			</div>

			<div>
				<Field label="Email" required>
					<input
						id="consult-email"
						className={inputCls}
						value={form.email}
						onChange={(e) => set('email', e.target.value)}
						placeholder="email@example.com"
						type="email"
					/>
				</Field>
				{errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
			</div>

			{/* Appointment */}
			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Field label="Ngày & giờ tư vấn" required>
						<input
							id="consult-date"
							className={inputCls}
							type="datetime-local"
							value={form.consultationDate}
							min={new Date().toISOString().slice(0, 16)}
							onChange={(e) => set('consultationDate', e.target.value)}
						/>
					</Field>
					{errors.consultationDate && <p className="mt-1 text-xs text-red-500">{errors.consultationDate}</p>}
				</div>
				<div>
					<Field label="Hình thức tư vấn" required>
						<select
							id="consult-type"
							className={selectCls}
							value={form.consultationType}
							onChange={(e) => set('consultationType', e.target.value as ConsultationType)}
						>
							<option value="online">💻 Trực tuyến (Zoom / Meet)</option>
							<option value="phone">📞 Qua điện thoại</option>
							<option value="offline">🏪 Tại nhà thuốc</option>
						</select>
					</Field>
				</div>
			</div>

			{/* Offline location */}
			{form.consultationType === 'offline' && (
				<div>
					<Field label="Địa chỉ chi nhánh" required>
						<input
							id="consult-location"
							className={inputCls}
							value={form.offlineLocation}
							onChange={(e) => set('offlineLocation', e.target.value)}
							placeholder="Vd: Chi nhánh Q.1, 123 Nguyễn Trãi"
						/>
					</Field>
					{errors.offlineLocation && <p className="mt-1 text-xs text-red-500">{errors.offlineLocation}</p>}
				</div>
			)}

			{/* Topic */}
			<div>
				<Field label="Chủ đề tư vấn" required>
					<input
						id="consult-topic"
						className={inputCls}
						value={form.topic}
						onChange={(e) => set('topic', e.target.value)}
						placeholder="Vd: Thuốc điều trị tiểu đường, tương tác thuốc..."
					/>
				</Field>
				{errors.topic && <p className="mt-1 text-xs text-red-500">{errors.topic}</p>}
			</div>

			<Field label="Mô tả thêm (không bắt buộc)">
				<textarea
					id="consult-description"
					className={textareaCls}
					rows={3}
					value={form.description}
					onChange={(e) => set('description', e.target.value)}
					placeholder="Mô tả tình trạng sức khoẻ hoặc câu hỏi bạn muốn hỏi..."
				/>
			</Field>

			<Field label="Ghi chú cho dược sĩ (không bắt buộc)">
				<input
					id="consult-note"
					className={inputCls}
					value={form.note}
					onChange={(e) => set('note', e.target.value)}
					placeholder="Yêu cầu đặc biệt hoặc thông tin bổ sung..."
				/>
			</Field>

			<button
				type="submit"
				id="consult-submit"
				disabled={loading}
				className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2ea847] text-sm font-semibold text-white shadow-sm transition hover:bg-[#259b3f] disabled:opacity-60"
			>
				{loading ? (
					<>
						<span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
						Đang gửi...
					</>
				) : (
					<>📅 Đặt lịch tư vấn</>
				)}
			</button>
		</form>
	)
}

// ─────────────────────────────────────────────────────────────
// Consultation Detail Panel
// ─────────────────────────────────────────────────────────────
function ConsultationDetail({
	consultation,
	onCancel,
}: {
	consultation: Consultation
	onCancel: () => void
}) {
	const [cancelling, setCancelling] = useState(false)
	const [reason, setReason] = useState('')
	const [showCancelForm, setShowCancelForm] = useState(false)

	const canCancel = consultation.status !== 'cancelled' && consultation.status !== 'completed'
	const callType: 'video' | 'voice' = consultation.consultationType === 'phone' ? 'voice' : 'video'
	const hasAssignedStaff = Boolean(consultation.assignedStaff)
	const isConfirmed = consultation.status === 'confirmed'
	const canCallWindow = isWithinCallWindow(consultation.consultationDate)
	const canCallByType = isAllowedCallType(consultation.consultationType, callType)
	const canCall = isConfirmed && hasAssignedStaff && canCallWindow && canCallByType

	const callBlockedReason = !isConfirmed
		? 'Chỉ gọi khi lịch đã xác nhận'
		: !hasAssignedStaff
			? 'Chưa được gán dược sĩ'
			: !canCallWindow
				? `Chỉ gọi trong ±${CALL_WINDOW_MINUTES} phút quanh giờ hẹn`
				: !canCallByType
					? 'Lịch tư vấn không hỗ trợ gọi trực tuyến'
					: ''

	const doCancel = async () => {
		setCancelling(true)
		try {
			await cancelConsultation(consultation.id, reason)
			toast.success('Đã hủy lịch tư vấn')
			onCancel()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Hủy thất bại')
		} finally {
			setCancelling(false)
		}
	}

	const rows: Array<[string, React.ReactNode]> = [
		['Mã lịch', <span className="font-mono text-sm font-bold text-[#2ea847]">{consultation.consultationCode}</span>],
		['Trạng thái', <StatusBadge status={consultation.status} />],
		['Hình thức', typeLabel[consultation.consultationType]],
		['Ngày tư vấn', formatDate(consultation.consultationDate)],
		['Chủ đề', consultation.topic],
		['Mô tả', consultation.description || '—'],
		['Ghi chú', consultation.note || '—'],
	]

	if (consultation.status === 'confirmed') {
		rows.push(['Link cuộc họp', consultation.meetingLink ? (
			<a href={consultation.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
				{consultation.meetingLink}
			</a>
		) : '—'])
		rows.push(['Xác nhận lúc', formatDate(consultation.confirmedAt)])
	}

	if (consultation.status === 'cancelled') {
		rows.push(['Lý do hủy', consultation.cancellationReason || '—'])
		rows.push(['Hủy lúc', formatDate(consultation.cancelledAt)])
	}

	if (consultation.status === 'completed') {
		rows.push(['Hoàn tất lúc', formatDate(consultation.completedAt)])
		if (consultation.staffNote) rows.push(['Ghi chú từ dược sĩ', consultation.staffNote])
	}

	const handleStartCall = () => {
		if (!consultation.assignedStaff) return
		window.dispatchEvent(
			new CustomEvent('client:initiate-consultation-call', {
				detail: {
					consultationId: consultation.id,
					staffId: consultation.assignedStaff,
									staffName: 'Dược sĩ tư vấn',
					callType,
				},
			}),
		)
	}

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<dl className="divide-y divide-slate-100">
				{rows.map(([label, value]) => (
					<div key={label} className="flex gap-4 py-3">
						<dt className="w-36 shrink-0 text-sm text-slate-500">{label}</dt>
						<dd className="flex-1 text-sm text-slate-800">{value}</dd>
					</div>
				))}
			</dl>

			{isConfirmed && (
				<div className="mt-4 border-t border-slate-100 pt-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold text-slate-700">Gọi tư vấn trực tuyến</p>
							{!canCall && (
								<p className="mt-1 text-xs text-slate-500">{callBlockedReason}</p>
							)}
						</div>
						<button
							type="button"
							disabled={!canCall}
							onClick={handleStartCall}
							className="rounded-xl bg-[#2ea847] px-4 py-2 text-sm font-semibold text-white hover:bg-[#259b3f] disabled:opacity-50"
						>
							{callType === 'voice' ? 'Gọi thoại' : 'Gọi video'}
						</button>
					</div>
				</div>
			)}

			{canCancel && (
				<div className="mt-4 border-t border-slate-100 pt-4">
					{!showCancelForm ? (
						<button
							type="button"
							onClick={() => setShowCancelForm(true)}
							className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
						>
							Hủy lịch hẹn
						</button>
					) : (
						<div className="space-y-3">
							<textarea
								className={textareaCls}
								rows={2}
								placeholder="Lý do hủy (không bắt buộc)"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
							/>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={doCancel}
									disabled={cancelling}
									className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
								>
									{cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
								</button>
								<button
									type="button"
									onClick={() => setShowCancelForm(false)}
									className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
								>
									Giữ lịch
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

// ─────────────────────────────────────────────────────────────
// My Consultations List
// ─────────────────────────────────────────────────────────────
function MyConsultations() {
	const [items, setItems] = useState<Consultation[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [statusFilter, setStatusFilter] = useState<ConsultationStatus | ''>('')
	const [selected, setSelected] = useState<Consultation | null>(null)

	const load = useCallback(async (p: number, st: ConsultationStatus | '') => {
		setLoading(true)
		setError('')
		try {
			const res = await getMyConsultations({ page: p, limit: 6, status: st || undefined })
			setItems(res.items)
			setPage(res.pagination.page)
			setTotalPages(res.pagination.totalPages)
			setSelected(res.items[0] ?? null)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Không thể tải danh sách')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load(1, statusFilter)
	}, [statusFilter, load])

	return (
		<div>
			{/* Filters */}
			<div className="mb-4 flex flex-wrap items-center gap-3">
				{(['', 'pending', 'confirmed', 'completed', 'cancelled'] as Array<ConsultationStatus | ''>) .map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => setStatusFilter(s)}
						className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
							statusFilter === s ? 'bg-[#2ea847] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
						}`}
					>
						{s === '' ? 'Tất cả' : statusLabel[s]}
					</button>
				))}
			</div>

			{loading && (
				<div className="flex justify-center py-10">
					<span className="h-8 w-8 animate-spin rounded-full border-4 border-[#2ea847] border-t-transparent" />
				</div>
			)}
			{error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}

			{!loading && items.length === 0 && (
				<div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
					<p className="text-4xl">📋</p>
					<p className="mt-2 text-sm text-slate-500">Chưa có lịch tư vấn nào</p>
				</div>
			)}

			{!loading && items.length > 0 && (
				<div className="grid gap-4 lg:grid-cols-[280px_1fr]">
					{/* Left: list */}
					<ul className="space-y-2">
						{items.map((c) => (
							<li key={c.id}>
								<button
									type="button"
									onClick={() => setSelected(c)}
									className={`w-full rounded-xl border p-3 text-left transition ${
										selected?.id === c.id
											? 'border-[#2ea847] bg-[#f0fdf4]'
											: 'border-slate-200 bg-white hover:border-[#2ea847]/50'
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="truncate text-xs font-mono text-slate-500">{c.consultationCode}</span>
										<StatusBadge status={c.status} />
									</div>
									<p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800">{c.topic}</p>
									<p className="mt-0.5 text-xs text-slate-500">{formatDate(c.consultationDate)}</p>
								</button>
							</li>
						))}
					</ul>

					{/* Right: detail */}
					<div>
						{selected ? (
							<ConsultationDetail
								key={selected.id}
								consultation={selected}
								onCancel={() => void load(page, statusFilter)}
							/>
						) : (
							<div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
								Chọn một lịch tư vấn để xem chi tiết
							</div>
						)}
					</div>
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="mt-4 flex justify-center gap-2">
					<button
						type="button"
						disabled={page <= 1}
						onClick={() => void load(page - 1, statusFilter)}
						className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
					>
						‹ Trước
					</button>
					<span className="flex items-center text-sm text-slate-500">
						{page} / {totalPages}
					</span>
					<button
						type="button"
						disabled={page >= totalPages}
						onClick={() => void load(page + 1, statusFilter)}
						className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
					>
						Sau ›
					</button>
				</div>
			)}
		</div>
	)
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
interface ConsultPharmacyProps {
	onBackHome?: () => void
}

type Tab = 'book' | 'history'

export default function ConsultPharmacy({ onBackHome }: ConsultPharmacyProps) {
	const [tab, setTab] = useState<Tab>('book')
	const [historyKey, setHistoryKey] = useState(0) // force re-mount history after booking

	const isLoggedIn = Boolean(localStorage.getItem('clientAccessToken'))

	const goHome = () => {
		if (onBackHome) {
			onBackHome()
			return
		}
		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#ecf8ff] py-8">
			{/* ── Header ── */}
			<header className="mx-auto mb-6 w-[min(960px,95vw)]">
				<button
					type="button"
					onClick={goHome}
					className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-[#2ea847]"
				>
					← Quay về trang chủ
				</button>

				<div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#2ea847] to-[#1a7c32] p-6 text-white shadow-lg">
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-inner">
							💊
						</div>
						<div className="flex-1">
							<h1 className="text-2xl font-black tracking-tight">Tư Vấn Dược Sĩ</h1>
							<p className="mt-0.5 text-sm text-green-100">
								Đặt lịch tư vấn trực tuyến hoặc tại nhà thuốc T&amp;Q — miễn phí, nhanh chóng
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* ── Body ── */}
			<main className="mx-auto w-[min(960px,95vw)]">
				{isLoggedIn ? (
					<div className="rounded-2xl bg-white shadow-sm">
						{/* Tab nav */}
						<nav className="flex border-b border-slate-200">
							{(['book', 'history'] as Tab[]).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setTab(t)}
									className={`flex-1 py-4 text-sm font-semibold transition ${
										tab === t
											? 'border-b-2 border-[#2ea847] text-[#2ea847]'
											: 'text-slate-500 hover:text-slate-700'
									}`}
								>
									{t === 'book' ? '📅 Đặt lịch mới' : '📋 Lịch sử tư vấn'}
								</button>
							))}
						</nav>

						<div className="p-6">
							{tab === 'book' && (
								<BookingForm
									onSuccess={() => {
										setHistoryKey((k) => k + 1)
										setTab('history')
									}}
								/>
							)}
							{tab === 'history' && <MyConsultations key={historyKey} />}
						</div>
					</div>
				) : (
					/* Not logged in */
					<div className="rounded-2xl bg-white p-10 text-center shadow-sm">
						<p className="text-5xl">🔒</p>
						<h2 className="mt-4 text-xl font-bold text-slate-800">Vui lòng đăng nhập</h2>
						<p className="mt-2 text-sm text-slate-500">
							Bạn cần đăng nhập để đặt lịch tư vấn hoặc xem lịch sử.
						</p>
						<button
							type="button"
							onClick={() => {
								window.history.pushState({}, '', '/dang-nhap')
								window.dispatchEvent(new PopStateEvent('popstate'))
							}}
							className="mt-6 rounded-xl bg-[#2ea847] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#259b3f]"
						>
							Đăng nhập ngay
						</button>
					</div>
				)}

				{/* Info cards */}
				<div className="mt-6 grid gap-4 sm:grid-cols-3">
					{[
						{ icon: '💻', title: 'Tư vấn online', desc: 'Zoom, Google Meet — thoải mái tại nhà' },
						{ icon: '📞', title: 'Tư vấn qua điện thoại', desc: 'Gọi điện trực tiếp với dược sĩ' },
						{ icon: '🏪', title: 'Gặp mặt tại nhà thuốc', desc: 'Đến chi nhánh để được tư vấn trực tiếp' },
					].map((c) => (
						<div key={c.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
							<div className="mb-2 text-3xl">{c.icon}</div>
							<h3 className="font-bold text-slate-800">{c.title}</h3>
							<p className="mt-1 text-sm text-slate-500">{c.desc}</p>
						</div>
					))}
				</div>
			</main>
		</div>
	)
}
