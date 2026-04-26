const API_BASE = 'http://localhost:3000/api/client'

export interface HealthNewsBlock {
	newsId: string
	title: string
	summary: string
	author: string
	heroImage: string
	updatedAt: string
	views: number
	sections: Array<{
		heading: string
		paragraphs: string[]
		bullets?: string[]
		image?: string
		imageCaption?: string
	}>
	related: Array<{
		id: string
		title: string
		date: string
		image: string
	}>
}

export const getHealthNews = async (): Promise<HealthNewsBlock[]> => {
	try {
		const response = await fetch(`${API_BASE}/health-news`)
		if (!response.ok) {
			throw new Error('Failed to fetch health news')
		}
		return await response.json()
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Unable to fetch health news')
	}
}

export const getHealthNewsById = async (newsId: string): Promise<HealthNewsBlock> => {
	try {
		const response = await fetch(`${API_BASE}/health-news/${newsId}`)
		if (!response.ok) {
			throw new Error('Health news not found')
		}
		return await response.json()
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Unable to fetch health news')
	}
}
