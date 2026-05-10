import { useState, useEffect, useCallback } from 'react'
import adminConsultationService, {
	type Consultation,
	type ConsultationStatus,
	type StaffOption,
	type ConsultationStats,
} from '../services/admin-consultation.service'
import { useAuthStore } from '../stores/authStore'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmt = (d: string | null | undefined) => {
	if (!d) return '—'
	return new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

const STATUS_LABEL: Record<ConsultationStatus, string> = {
	pending: 'Chờ xác nhận',
	confirmed: 'Đã xác nhận',
	cancelled: 'Đã hủy',
	completed: 'Hoàn tất',
}

const STATUS_COLOR: Record<ConsultationStatus, string> = {
	pending: 'bg-amber-100 text-amber-700 border-amber-200',
	confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
	cancelled: 'bg-red-100 text-red-700 border-red-200',
	completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const TYPE_LABEL: Record<string, string> = {
	online: '💻 Trực tuyến',
	offline: '🏪 Tại nhà thuốc',
	phone: '📞 Điện thoại',
}

const CALL_WINDOW_MINUTES = Math.max(1, Number(import.meta.env.VITE_CALL_WINDOW_MINUTES || 60))
const ALLOW_OFFLINE_CALLS = import.meta.env.VITE_ALLOW_OFFLINE_CALLS === 'true'

const isWithinCallWindow = (value: string | null | undefined) => {
	if (!value) return false
	const ts = new Date(value).getTime()
	if (Number.isNaN(ts)) return false
	return Math.abs(ts - Date.now()) <= CALL_WINDOW_MINUTES * 60 * 1000
}

const isAllowedCallType = (consultationType: string, callType: 'video' | 'voice') => {
	if (consultationType === 'phone') return callType === 'voice'
	if (consultationType === 'offline') return ALLOW_OFFLINE_CALLS
	return true
}

function StatusBadge({ status }: { status: ConsultationStatus }) {
	return (
		<span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[status]}`}>
			{STATUS_LABEL[status]}
		</span>
	)
}

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<div className={`rounded-2xl border p-4 ${color}`}>
			<p className="text-xs font-medium opacity-70">{label}</p>
			<p className="mt-1 text-3xl font-black">{value}</p>
		</div>
	)
}

// ─────────────────────────────────────────────────────────────
// Detail / Action panel
// ─────────────────────────────────────────────────────────────
interface DetailPanelProps {
	consultation: Consultation
	staffList: StaffOption[]
	onRefresh: () => void
	isStaffView?: boolean
	currentUserId: string | null
}

function DetailPanel({ consultation: c, staffList, onRefresh, isStaffView = false, currentUserId }: DetailPanelProps) {
	// Status update state
	const [newStatus, setNewStatus] = useState<ConsultationStatus>(c.status)
	const [meetingLink, setMeetingLink] = useState(c.meetingLink || '')
	const [cancelReason, setCancelReason] = useState(c.cancellationReason || '')
	const [updatingStatus, setUpdatingStatus] = useState(false)

	// Staff assignment
	const [assignStaffId, setAssignStaffId] = useState(c.assignedStaff || '')
	const [assigning, setAssigning] = useState(false)

	// Staff note
	const [staffNote, setStaffNote] = useState(c.staffNote || '')
	const [savingNote, setSavingNote] = useState(false)
	const [noteSaved, setNoteSaved] = useState(false)

	const callType: 'video' | 'voice' = c.consultationType === 'phone' ? 'voice' : 'video'
	const assignedStaffId = c.assignedStaff ? String(c.assignedStaff) : ''
	const isAssignedToCurrent = Boolean(currentUserId && assignedStaffId && String(currentUserId) === assignedStaffId)
	const isConfirmed = c.status === 'confirmed'
	const canCallWindow = isWithinCallWindow(c.consultationDate)
	const canCallByType = isAllowedCallType(c.consultationType, callType)
	const canCall = isConfirmed && isAssignedToCurrent && canCallWindow && canCallByType

	const callBlockedReason = !isConfirmed
		? 'Chỉ gọi khi lịch đã xác nhận'
		: !assignedStaffId
			? 'Chưa gán nhân viên tư vấn'
			: !isAssignedToCurrent
				? 'Chỉ nhân viên được gán mới có thể gọi'
				: !canCallWindow
					? `Chỉ gọi trong ±${CALL_WINDOW_MINUTES} phút quanh giờ hẹn`
					: !canCallByType
						? 'Lịch tư vấn không hỗ trợ gọi trực tuyến'
						: ''

	// Reset on consultation change
	useEffect(() => {
		setNewStatus(c.status)
		setMeetingLink(c.meetingLink || '')
		setCancelReason(c.cancellationReason || '')
		setAssignStaffId(c.assignedStaff || '')
		setStaffNote(c.staffNote || '')
		setNoteSaved(false)
	}, [c.id])

	const handleStatusUpdate = async () => {
		if (newStatus === c.status && !meetingLink && !cancelReason) return
		setUpdatingStatus(true)
		try {
			await adminConsultationService.updateStatus(c.id, {
				status: newStatus,
				meetingLink: newStatus === 'confirmed' ? meetingLink : undefined,
				cancellationReason: newStatus === 'cancelled' ? cancelReason : undefined,
			})
			onRefresh()
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Cập nhật thất bại')
		} finally {
			setUpdatingStatus(false)
		}
	}

	const handleAssign = async () => {
		if (!assignStaffId) return
		setAssigning(true)
		try {
			await adminConsultationService.assignStaff(c.id, assignStaffId)
			onRefresh()
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Gán nhân viên thất bại')
		} finally {
			setAssigning(false)
		}
	}

	const handleSaveNote = async () => {
		setSavingNote(true)
		try {
			await adminConsultationService.updateStaffNote(c.id, staffNote)
			setNoteSaved(true)
			onRefresh()
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Lưu ghi chú thất bại')
		} finally {
			setSavingNote(false)
		}
	}

	const handleStartCall = () => {
		if (!assignedStaffId) return
		window.dispatchEvent(
			new CustomEvent('admin:initiate-consultation-call', {
				detail: {
					peerId: c.userId,
					peerName: c.fullName,
					callType,
					consultationId: c.id,
				},
			}),
		)
	}

	const inputCls =
		'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
	const selectCls = inputCls + ' cursor-pointer'

	return (
		<div className="space-y-4">
			{/* Meta */}
			<div className="rounded-xl border border-slate-200 bg-white p-4">
				<div className="mb-3 flex items-center justify-between">
					<span className="font-mono text-sm font-bold text-blue-600">{c.consultationCode}</span>
					<StatusBadge status={c.status} />
				</div>
				<dl className="divide-y divide-slate-100 text-sm">
					{[
						['Khách hàng', `${c.fullName} — ${c.phone}`],
						['Email', c.email],
						['Hình thức', TYPE_LABEL[c.consultationType] || c.consultationType],
						['Ngày tư vấn', fmt(c.consultationDate)],
						['Chủ đề', c.topic],
						['Mô tả', c.description || '—'],
						['Ghi chú khách', c.note || '—'],
					].map(([label, val]) => (
						<div key={label} className="flex gap-3 py-2">
							<dt className="w-32 shrink-0 text-slate-500">{label}</dt>
							<dd className="flex-1 text-slate-800">{val}</dd>
						</div>
					))}
					{c.meetingLink && (
						<div className="flex gap-3 py-2">
							<dt className="w-32 shrink-0 text-slate-500">Link họp</dt>
							<dd className="flex-1">
								<a href={c.meetingLink} target="_blank" rel="noreferrer" className="break-all text-blue-600 underline">
									{c.meetingLink}
								</a>
							</dd>
						</div>
					)}
					{c.cancellationReason && (
						<div className="flex gap-3 py-2">
							<dt className="w-32 shrink-0 text-slate-500">Lý do hủy</dt>
							<dd className="flex-1 text-red-600">{c.cancellationReason}</dd>
						</div>
					)}
				</dl>
			</div>

			{/* Staff Note — visible to both admin and staff */}
			<div className="rounded-xl border border-slate-200 bg-white p-4">
				<p className="mb-2 text-sm font-semibold text-slate-700">📝 Ghi chú nội bộ (Staff)</p>
				<textarea
					rows={3}
					className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
					value={staffNote}
					onChange={(e) => {
						setStaffNote(e.target.value)
						setNoteSaved(false)
					}}
					placeholder="Kết quả tư vấn, chẩn đoán, thuốc khuyên dùng..."
				/>
				<div className="mt-2 flex items-center gap-3">
					<button
						type="button"
						onClick={handleSaveNote}
						disabled={savingNote}
						className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
					>
						{savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
					</button>
					{noteSaved && <span className="text-xs font-semibold text-emerald-600">✓ Đã lưu</span>}
				</div>
			</div>

			{/* Call action (assigned staff only) */}
			{isConfirmed && (
				<div className="rounded-xl border border-slate-200 bg-white p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold text-slate-700">Gọi tư vấn trực tuyến</p>
							{!canCall && (
								<p className="mt-1 text-xs text-slate-500">{callBlockedReason}</p>
							)}
						</div>
						<button
							type="button"
							onClick={handleStartCall}
							disabled={!canCall}
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
						>
							{callType === 'voice' ? 'Gọi thoại' : 'Gọi video'}
						</button>
					</div>
				</div>
			)}

			{/* Admin-only: Status update + Staff assign */}
			{!isStaffView && (
				<>
					{/* Status update */}
					<div className="rounded-xl border border-slate-200 bg-white p-4">
						<p className="mb-3 text-sm font-semibold text-slate-700">⚙️ Cập nhật trạng thái</p>
						<select
							className={selectCls}
							value={newStatus}
							onChange={(e) => setNewStatus(e.target.value as ConsultationStatus)}
						>
							<option value="pending">Chờ xác nhận</option>
							<option value="confirmed">Xác nhận</option>
							<option value="completed">Hoàn tất</option>
							<option value="cancelled">Hủy</option>
						</select>

						{newStatus === 'confirmed' && (
							<div className="mt-3">
								<label className="mb-1 block text-xs font-medium text-slate-600">
									Link cuộc họp <span className="text-red-500">*</span>
								</label>
								<input
									className={inputCls}
									placeholder="https://meet.google.com/..."
									value={meetingLink}
									onChange={(e) => setMeetingLink(e.target.value)}
								/>
							</div>
						)}

						{newStatus === 'cancelled' && (
							<div className="mt-3">
								<label className="mb-1 block text-xs font-medium text-slate-600">
									Lý do hủy <span className="text-red-500">*</span>
								</label>
								<input
									className={inputCls}
									placeholder="Nhập lý do hủy..."
									value={cancelReason}
									onChange={(e) => setCancelReason(e.target.value)}
								/>
							</div>
						)}

						<button
							type="button"
							onClick={handleStatusUpdate}
							disabled={updatingStatus}
							className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
						>
							{updatingStatus ? 'Đang cập nhật...' : 'Lưu trạng thái'}
						</button>
					</div>

					{/* Staff assignment */}
					<div className="rounded-xl border border-slate-200 bg-white p-4">
						<p className="mb-3 text-sm font-semibold text-slate-700">👨‍⚕️ Gán nhân viên tư vấn</p>
						<select
							className={selectCls}
							value={assignStaffId}
							onChange={(e) => setAssignStaffId(e.target.value)}
						>
							<option value="">— Chưa gán —</option>
							{staffList.map((s) => (
								<option key={s._id} value={s._id}>
									{s.fullName} ({s.role}){s.isOnline ? ' 🟢' : ' ⚪'}
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={handleAssign}
							disabled={assigning || !assignStaffId}
							className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
						>
							{assigning ? 'Đang gán...' : 'Gán nhân viên'}
						</button>
					</div>
				</>
			)}
		</div>
	)
}

// ─────────────────────────────────────────────────────────────
// Admin list view
// ─────────────────────────────────────────────────────────────
function AdminList({ currentUserId }: { currentUserId: string | null }) {
	const [items, setItems] = useState<Consultation[]>([])
	const [selected, setSelected] = useState<Consultation | null>(null)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)
	const [statusFilter, setStatusFilter] = useState<ConsultationStatus | ''>('')
	const [stats, setStats] = useState<ConsultationStats | null>(null)
	const [staffList, setStaffList] = useState<StaffOption[]>([])

	const load = useCallback(async (p: number, sf: ConsultationStatus | '') => {
		setLoading(true)
		try {
			const res = await adminConsultationService.getAll({ page: p, limit: 10, status: sf || undefined })
			setItems(res.items)
			setPage(res.pagination.page)
			setTotalPages(res.pagination.totalPages)
			setTotal(res.pagination.total)
			setSelected((prev) => {
				const refreshed = res.items.find((i) => i.id === prev?.id)
				return refreshed ?? res.items[0] ?? null
			})
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void adminConsultationService.getStats().then(setStats).catch(console.error)
		void adminConsultationService.getAvailableStaff().then(setStaffList).catch(console.error)
	}, [])

	useEffect(() => {
		void load(1, statusFilter)
	}, [statusFilter, load])

	return (
		<div className="space-y-6">
			{/* Stats */}
			{stats && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					<StatCard label="Chờ xác nhận" value={stats.summary.totalPending} color="border-amber-200 bg-amber-50 text-amber-800" />
					<StatCard label="Đã xác nhận" value={stats.summary.totalConfirmed} color="border-blue-200 bg-blue-50 text-blue-800" />
					<StatCard label="Hoàn tất" value={stats.summary.totalCompleted} color="border-emerald-200 bg-emerald-50 text-emerald-800" />
					<StatCard label="Đã hủy" value={stats.summary.totalCancelled} color="border-red-200 bg-red-50 text-red-800" />
					<StatCard label="Hôm nay" value={stats.summary.todayConsultations} color="border-purple-200 bg-purple-50 text-purple-800" />
				</div>
			)}

			{/* Filter row */}
			<div className="flex flex-wrap gap-2">
				{(['', 'pending', 'confirmed', 'completed', 'cancelled'] as Array<ConsultationStatus | ''>) .map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => setStatusFilter(s)}
						className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
							statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
						}`}
					>
						{s === '' ? 'Tất cả' : STATUS_LABEL[s]}
					</button>
				))}
				<span className="ml-auto flex items-center text-xs text-slate-500">{total} lịch</span>
			</div>

			{loading && (
				<div className="flex justify-center py-10">
					<span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
				</div>
			)}

			{!loading && items.length === 0 && (
				<div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
					<p className="text-4xl">📋</p>
					<p className="mt-2 text-sm text-slate-500">Không có lịch tư vấn nào</p>
				</div>
			)}

			{!loading && items.length > 0 && (
				<div className="grid gap-4 xl:grid-cols-[340px_1fr]">
					{/* Left: table list */}
					<div className="space-y-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
						{items.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => setSelected(c)}
								className={`w-full rounded-xl border p-3 text-left transition ${
									selected?.id === c.id
										? 'border-blue-500 bg-blue-50'
										: 'border-slate-200 bg-white hover:border-blue-300'
								}`}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="truncate font-mono text-xs text-slate-500">{c.consultationCode}</span>
									<StatusBadge status={c.status} />
								</div>
								<p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800">{c.topic}</p>
								<p className="mt-0.5 text-xs text-slate-500">
									{c.fullName} · {fmt(c.consultationDate)}
								</p>
								<p className="mt-0.5 text-xs text-slate-400">{TYPE_LABEL[c.consultationType]}</p>
							</button>
						))}

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex justify-center gap-2 pt-2">
								<button
									type="button"
									disabled={page <= 1}
									onClick={() => void load(page - 1, statusFilter)}
									className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-40"
								>
									‹ Trước
								</button>
								<span className="flex items-center text-xs text-slate-500">
									{page}/{totalPages}
								</span>
								<button
									type="button"
									disabled={page >= totalPages}
									onClick={() => void load(page + 1, statusFilter)}
									className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-40"
								>
									Sau ›
								</button>
							</div>
						)}
					</div>

					{/* Right: detail */}
					<div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
						{selected ? (
							<DetailPanel
								key={selected.id}
								consultation={selected}
								staffList={staffList}
								onRefresh={() => void load(page, statusFilter)}
								currentUserId={currentUserId}
							/>
						) : (
							<div className="rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center text-sm text-slate-400">
								Chọn một lịch để xem chi tiết
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

// ─────────────────────────────────────────────────────────────
// Staff view — my assigned consultations
// ─────────────────────────────────────────────────────────────
function StaffList({ currentUserId }: { currentUserId: string | null }) {
	const [items, setItems] = useState<Consultation[]>([])
	const [selected, setSelected] = useState<Consultation | null>(null)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [statusFilter, setStatusFilter] = useState<ConsultationStatus | ''>('')

	const load = useCallback(async (p: number, sf: ConsultationStatus | '') => {
		setLoading(true)
		try {
			const res = await adminConsultationService.getMyConsultations({ page: p, status: sf || undefined })
			setItems(res.items)
			setPage(res.pagination.page)
			setTotalPages(res.pagination.totalPages)
			setSelected((prev) => res.items.find((i) => i.id === prev?.id) ?? res.items[0] ?? null)
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load(1, statusFilter)
	}, [statusFilter, load])

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{(['', 'pending', 'confirmed', 'completed', 'cancelled'] as Array<ConsultationStatus | ''>) .map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => setStatusFilter(s)}
						className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
							statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
						}`}
					>
						{s === '' ? 'Tất cả' : STATUS_LABEL[s]}
					</button>
				))}
			</div>

			{loading && (
				<div className="flex justify-center py-10">
					<span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
				</div>
			)}

			{!loading && items.length === 0 && (
				<div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
					<p className="text-4xl">📋</p>
					<p className="mt-2 text-sm text-slate-500">Chưa có lịch tư vấn nào được gán cho bạn</p>
				</div>
			)}

			{!loading && items.length > 0 && (
				<div className="grid gap-4 xl:grid-cols-[300px_1fr]">
					<div className="space-y-2">
						{items.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => setSelected(c)}
								className={`w-full rounded-xl border p-3 text-left ${
									selected?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-mono text-xs text-slate-500">{c.consultationCode}</span>
									<StatusBadge status={c.status} />
								</div>
								<p className="mt-1 line-clamp-1 text-sm font-semibold">{c.topic}</p>
								<p className="mt-0.5 text-xs text-slate-500">{c.fullName} · {fmt(c.consultationDate)}</p>
							</button>
						))}

						{totalPages > 1 && (
							<div className="flex justify-center gap-2 pt-2">
								<button type="button" disabled={page <= 1} onClick={() => void load(page - 1, statusFilter)} className="rounded border px-3 py-1 text-xs disabled:opacity-40">‹</button>
								<span className="flex items-center text-xs">{page}/{totalPages}</span>
								<button type="button" disabled={page >= totalPages} onClick={() => void load(page + 1, statusFilter)} className="rounded border px-3 py-1 text-xs disabled:opacity-40">›</button>
							</div>
						)}
					</div>

					<div>
						{selected ? (
							<DetailPanel
								key={selected.id}
								consultation={selected}
								staffList={[]}
								onRefresh={() => void load(page, statusFilter)}
								isStaffView
								currentUserId={currentUserId}
							/>
						) : (
							<div className="rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center text-sm text-slate-400">
								Chọn một lịch để xem và cập nhật ghi chú
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

// ─────────────────────────────────────────────────────────────
// Root Page Component
// ─────────────────────────────────────────────────────────────
type PageTab = 'admin' | 'staff'

export default function Consultations() {
	const { user } = useAuthStore()
	const isAdmin = (user as any)?.role === 'admin'
	const currentUserId = (user as any)?._id || (user as any)?.id || null
	const [tab, setTab] = useState<PageTab>(isAdmin ? 'admin' : 'staff')

	return (
		<div className="space-y-6">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-black text-slate-800">📅 Quản lý Tư Vấn</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Xem và xử lý các lịch tư vấn của khách hàng
					</p>
				</div>

				{isAdmin && (
					<div className="flex rounded-xl border border-slate-200 bg-white p-1">
						<button
							type="button"
							onClick={() => setTab('admin')}
							className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
								tab === 'admin' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
							}`}
						>
							Tất cả lịch
						</button>
						<button
							type="button"
							onClick={() => setTab('staff')}
							className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
								tab === 'staff' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
							}`}
						>
							Lịch của tôi
						</button>
					</div>
				)}
			</div>

			{/* Tab content */}
			{tab === 'admin' && isAdmin ? (
				<AdminList currentUserId={currentUserId} />
			) : (
				<StaffList currentUserId={currentUserId} />
			)}
		</div>
	)
}
