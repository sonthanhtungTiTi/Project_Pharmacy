import { useEffect, useState } from 'react'
import PharmacyLayout from '../components/layout/layout'
import ProductCard from '../components/ui/product-card'
import { getEventBySlug, type EventData } from '../services/event.service'

interface EventPageProps {
	slug: string
	onOpenProductDetail?: (productId: string) => void
}

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}đ`

function EventPage({ slug, onOpenProductDetail }: EventPageProps) {
	const [data, setData] = useState<EventData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		const loadEvent = async () => {
			if (!slug) return
			
			try {
				setIsLoading(true)
				setError('')
				const eventData = await getEventBySlug(slug)
				setData(eventData)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Lỗi không xác định')
			} finally {
				setIsLoading(false)
			}
		}

		void loadEvent()
	}, [slug])

	const goHome = () => {
		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	if (isLoading) {
		return (
			<PharmacyLayout categories={[]} hideSidebar>
				<div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#16a34a] border-t-transparent" />
					<span className="ml-3 text-slate-600 font-medium">Đang tải sự kiện...</span>
				</div>
			</PharmacyLayout>
		)
	}

	if (error || !data) {
		return (
			<PharmacyLayout categories={[]} hideSidebar>
				<div className="rounded-2xl bg-white p-12 text-center shadow-sm">
					<div className="mx-auto mb-4 text-6xl">⚠️</div>
					<h1 className="mb-4 text-2xl font-bold text-slate-800">{error || '404 - Không tìm thấy sự kiện'}</h1>
					<button onClick={goHome} className="font-semibold text-[#16a34a] hover:underline">
						Quay về trang chủ
					</button>
				</div>
			</PharmacyLayout>
		)
	}

	return (
		<PharmacyLayout categories={[]} hideSidebar>
			{/* 1. Render Banner */}
			<div className="overflow-hidden rounded-2xl bg-white shadow-sm">
				<img src={data.banner} alt={data.title} className="w-full object-cover" />
			</div>

			{/* 2. Render Title & Description */}
			<section className="mt-4 rounded-2xl bg-white p-6 shadow-sm text-center">
				<h1 className="text-3xl font-black text-[#16a34a] uppercase tracking-tight">{data.title}</h1>
				<p className="mt-2 text-lg text-slate-600 font-medium">{data.description}</p>
			</section>

			{/* 2.5 Render Detailed Article Content & Sub-images */}
			{(data.articleContent || (data.subImages && data.subImages.length > 0)) && (
				<section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
					{data.articleContent && (
						<article 
							className="prose prose-slate max-w-none prose-p:text-slate-700 prose-headings:text-slate-900 prose-a:text-[#16a34a] hover:prose-a:text-[#15803d]"
							dangerouslySetInnerHTML={{ __html: data.articleContent }}
						/>
					)}
					
					{data.subImages && data.subImages.length > 0 && (
						<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{data.subImages.map((img, idx) => (
								<figure key={idx} className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
									<img src={img} alt={`Hình ảnh minh hoạ ${idx + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" />
								</figure>
							))}
						</div>
					)}
				</section>
			)}

			{/* 3. Render Product List */}
			<section className="mt-4">
				{data.products.length === 0 ? (
					<div className="rounded-2xl bg-white p-12 text-center shadow-sm text-slate-500 font-medium">
						Chưa có sản phẩm cho chương trình này.
					</div>
				) : (
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{data.products.map((item) => (
							<ProductCard
								key={item.id}
								productId={item.id}
								productCode={item.medicineCode}
								name={item.productName}
								imageUrl={item.image}
								price={String(item.price)}
								originalPrice={item.originalPrice ? formatVnd(item.originalPrice) : undefined}
								sale={item.discountLabel}
								onViewDetail={onOpenProductDetail}
							/>
						))}
					</div>
				)}
			</section>

			<div className="mt-8 text-center">
				<button onClick={goHome} className="text-sm font-semibold text-slate-500 hover:text-[#16a34a]">
					← Quay về trang chủ
				</button>
			</div>
		</PharmacyLayout>
	)
}

export default EventPage
