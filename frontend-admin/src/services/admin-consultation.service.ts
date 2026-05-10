// ============================================================
// admin-consultation.service.ts — Admin consultation API service
// ============================================================

import { apiGet, apiPatch } from '../utils/api.utils'


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

export interface ConsultationStats {
	summary: {
		totalPending: number
		totalConfirmed: number
		totalCompleted: number
		totalCancelled: number
		todayConsultations: number
	}
	timestamp: string
}

export interface StaffOption {
	_id: string
	fullName: string
	email: string
	role: string
	avatar?: string
	isOnline?: boolean
}

// ─── Service ──────────────────────────────────────────────────
const adminConsultationService = {
	/** GET /admin/consultations?status=&userId=&page=&limit= */
	getAll: async (params: {
		status?: ConsultationStatus
		userId?: string
		page?: number
		limit?: number
	} = {}): Promise<ConsultationListResponse> => {
		const q = new URLSearchParams()
		if (params.status) q.set('status', params.status)
		if (params.userId) q.set('userId', params.userId)
		if (params.page) q.set('page', String(params.page))
		if (params.limit) q.set('limit', String(params.limit))
		const data = await apiGet(`/admin/consultations?${q}`)
		return data.data
	},

	/** GET /admin/consultations/stats/dashboard */
	getStats: async (): Promise<ConsultationStats> => {
		const data = await apiGet('/admin/consultations/stats/dashboard')
		return data.data
	},

	/** GET /admin/consultations/upcoming/list */
	getUpcoming: async (): Promise<{ items: Consultation[]; count: number }> => {
		const data = await apiGet('/admin/consultations/upcoming/list')
		return data.data
	},

	/** GET /admin/consultations/staff/my-consultations */
	getMyConsultations: async (params: { status?: ConsultationStatus; page?: number } = {}): Promise<ConsultationListResponse> => {
		const q = new URLSearchParams()
		if (params.status) q.set('status', params.status)
		if (params.page) q.set('page', String(params.page))
		const data = await apiGet(`/admin/consultations/staff/my-consultations?${q}`)
		return data.data
	},

	/** PATCH /admin/consultations/:id/status */
	updateStatus: async (
		id: string,
		body: { status: ConsultationStatus; cancellationReason?: string; meetingLink?: string },
	): Promise<Consultation> => {
		const data = await apiPatch(`/admin/consultations/${id}/status`, body)
		return data.data
	},

	/** PATCH /admin/consultations/:id/assign-staff */
	assignStaff: async (id: string, staffId: string): Promise<Consultation> => {
		const data = await apiPatch(`/admin/consultations/${id}/assign-staff`, { staffId })
		return data.data
	},

	/** PATCH /admin/consultations/:id/staff-note */
	updateStaffNote: async (id: string, staffNote: string): Promise<{ id: string; staffNote: string }> => {
		const data = await apiPatch(`/admin/consultations/${id}/staff-note`, { staffNote })
		return data.data
	},

	/** GET /client/staff/available — list staff with online status */
	getAvailableStaff: async (): Promise<StaffOption[]> => {
		const data = await apiGet('/client/staff/available')
		return data.data
	},
}

export default adminConsultationService
