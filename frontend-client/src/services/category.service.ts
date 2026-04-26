    import type { CategoryItem } from '../components/layout/layout'

interface CategoryResponse {
	success: boolean
	message: string
	data?: CategoryItem[]
	error?: string
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export const getCategories = async () => {
	const response = await fetch(`${API_BASE_URL}/client/categories`)
	const payload = (await response.json()) as CategoryResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Fetch categories failed')
	}

	return payload.data
}
