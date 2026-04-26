import { useEffect, useState } from 'react'
import HealthNewsPage from '../components/ui/health-news-page'
import { getHealthNewsById, type HealthNewsBlock } from '../services/healthNews.service'

interface HealthNewsDetailProps {
	newsId: string
	onBackHome?: () => void
}

function HealthNewsDetail({ newsId, onBackHome }: HealthNewsDetailProps) {
	const [newsData, setNewsData] = useState<HealthNewsBlock | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		const loadNewsData = async () => {
			try {
				setIsLoading(true)
				setError('')
				const data = await getHealthNewsById(newsId)
				setNewsData(data)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load health news')
			} finally {
				setIsLoading(false)
			}
		}

		if (newsId) {
			loadNewsData()
		}
	}, [newsId])

	if (isLoading) {
		return <div className="flex h-screen items-center justify-center text-slate-600">Loading...</div>
	}

	if (error || !newsData) {
		return <div className="flex h-screen items-center justify-center text-red-500">{error || 'News not found'}</div>
	}

	return (
		<HealthNewsPage
			title={newsData.title}
			updatedAt={newsData.updatedAt}
			views={newsData.views}
			author={newsData.author}
			heroImage={newsData.heroImage}
			summary={newsData.summary}
			sections={newsData.sections}
			related={newsData.related}
			onBackHome={onBackHome}
		/>
	)
}

export default HealthNewsDetail
