// ============================================================
// consultation.service.ts — Client consultation API service
// ============================================================

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

const getAuthHeaders = (): Record<string, string> => {
	const token = localStorage.getItem('clientAccessToken') || ''
	if (!token) throw new Error('Vui lòng đăng nhập để tiếp tục')
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
	}
}

const handleResponse = async (res: Response) => {
	const json = await res.json()
	if (!res.ok || !json.success) {
		throw new Error(json.message || `HTTP ${res.status}`)
	}
	return json.data
}

// ─── Types ────────────────────────────────────────────────────
export type ConsultationType = 'online' | 'offline' | 'phone'
export type ConsultationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Consultation {
	id: string
	consultationCode: string
	userId: string
	fullName: string
	phone: string
	email: string
	consultationDate: string
	consultationType: ConsultationType
	topic: string
	description: string
	status: ConsultationStatus
	offlineLocation: string
	meetingLink: string
	note: string
	staffNote: string
	assignedStaff: string | null
	result: string
	confirmedAt: string | null
	cancelledAt: string | null
	cancellationReason: string
	completedAt: string | null
	createdAt: string
	updatedAt: string
}

export interface Pagination {
	page: number
	limit: number
	total: number
	totalPages: number
}

export interface ConsultationListResponse {
	items: Consultation[]
	pagination: Pagination
}

export interface CreateConsultationPayload {
	fullName: string
	phone: string
	email: string
	consultationDate: string // ISO string
	consultationType: ConsultationType
	topic: string
	description?: string
	offlineLocation?: string
	note?: string
}

// ─── API calls ────────────────────────────────────────────────

/** POST /api/client/consultations — tạo lịch tư vấn */
export const createConsultation = async (payload: CreateConsultationPayload): Promise<Consultation> => {
	const res = await fetch(`${API_BASE_URL}/client/consultations`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	})
	return handleResponse(res)
}

/** GET /api/client/consultations?status=&page=&limit= */
export const getMyConsultations = async (params: {
	status?: ConsultationStatus
	page?: number
	limit?: number
}): Promise<ConsultationListResponse> => {
	const q = new URLSearchParams()
	if (params.status) q.set('status', params.status)
	if (params.page) q.set('page', String(params.page))
	if (params.limit) q.set('limit', String(params.limit))
	const res = await fetch(`${API_BASE_URL}/client/consultations?${q}`, {
		headers: getAuthHeaders(),
	})
	return handleResponse(res)
}

/** GET /api/client/consultations/:id */
export const getConsultationDetail = async (consultationId: string): Promise<Consultation> => {
	const res = await fetch(`${API_BASE_URL}/client/consultations/${consultationId}`, {
		headers: getAuthHeaders(),
	})
	return handleResponse(res)
}

/** GET /api/client/consultations/code/:code */
export const getConsultationByCode = async (code: string): Promise<Consultation> => {
	const res = await fetch(`${API_BASE_URL}/client/consultations/code/${code}`, {
		headers: getAuthHeaders(),
	})
	return handleResponse(res)
}

/** PATCH /api/client/consultations/:id/cancel */
export const cancelConsultation = async (consultationId: string, cancellationReason?: string): Promise<Consultation> => {
	const res = await fetch(`${API_BASE_URL}/client/consultations/${consultationId}/cancel`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify({ cancellationReason: cancellationReason || '' }),
	})
	return handleResponse(res)
}
