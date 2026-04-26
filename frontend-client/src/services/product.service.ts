export interface ProductItem {
	id: string
	medicineCode: string
	productName: string
	price: string
	categoryId: string
	categoryName: string
	images: string
	isActive: boolean
}

export interface ProductDetail {
	_id: string
	categoryName: string
	productName: string
	price: string
	usageSummary: string
	mainIngredients: string
	targetUsers: string
	brand: string
	manufacturer: string
	ingredients: string
	usage: string
	dosage: string
	contraindications: string
	sideEffects: string
	precautions: string
	pharmacology: string
	additionalInfo: string
	storage: string
	expiry: string
	manufacturerDetail: string
	characteristics: string
	packaging: string
	images: string
	medicineCode: string
	categoryId: string
	isActive?: boolean
}

interface ListProductsResponse {
	success: boolean
	message: string
	data?: {
		items: ProductItem[]
		pagination: {
			page: number
			limit: number
			total: number
			totalPages: number
		}
	}
	error?: string
}

interface ProductDetailResponse {
	success: boolean
	message: string
	data?: ProductDetail
	error?: string
}

interface ListProductsParams {
	categoryId?: string
	search?: string
	page?: number
	limit?: number
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export const getProducts = async (params: ListProductsParams = {}) => {
	const query = new URLSearchParams()

	if (params.categoryId) {
		query.set('categoryId', params.categoryId)
	}

	if (params.search) {
		query.set('search', params.search)
	}

	if (params.page) {
		query.set('page', String(params.page))
	}

	if (params.limit) {
		query.set('limit', String(params.limit))
	}

	const queryString = query.toString()
	const url = queryString
		? `${API_BASE_URL}/client/products?${queryString}`
		: `${API_BASE_URL}/client/products`

	const response = await fetch(url)
	const payload = (await response.json()) as ListProductsResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Fetch products failed')
	}

	return payload.data
}

export const getProductDetail = async (productId: string) => {
	const response = await fetch(`${API_BASE_URL}/client/products/${productId}`)
	const payload = (await response.json()) as ProductDetailResponse

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.message || payload.error || 'Fetch product detail failed')
	}

	return payload.data
}
