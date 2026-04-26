import { useEffect, useState } from 'react'
import PharmacyLayout, { type CategoryItem } from '../components/layout/layout'
import ProductCard from '../components/ui/product-card'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getCategories } from '../services/category.service'
import { getProducts, type ProductItem } from '../services/product.service'
import { getHealthNews, type HealthNewsBlock } from '../services/healthNews.service'

const quickActions = [
	{ label: 'Mua thuốc, tư vấn', icon: 'RX', path: '/mua-thuoc-tu-van' },
	{ label: 'Tủ thuốc gia đình', icon: 'GD', path: '/tu-thuoc-gia-dinh' },
	{ label: 'Tra cứu chính hãng', icon: 'CH', path: '/tra-cuu-chinh-hang' },
	{ label: 'Đơn hàng của tôi', icon: 'DH', path: '/don-hang' },
	{ label: 'Đặt lịch khám bệnh', icon: 'LK', path: '/dat-lich-kham' },
	{ label: 'Kiểm tra sức khỏe', icon: 'SK', path: '/kiem-tra-suc-khoe' },
	{ label: 'Đối tác nhà thuốc', icon: 'DT', path: '/doi-tac-nha-thuoc' },
]

const heroBanners = [
	{
		href: '/chuong-trinh/online-gia-re',
		image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/2b/8c/2b8c19c32ea305b403c4802c013496be.png',
		alt: 'Mung nam moi Ma Dao',
	},
	{
		href: '/chuong-trinh/flashsale',
		image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/ad/a9/ada975d94ec04c14c1e19ab03aa27fcc.png',
		alt: 'Tuan le hanh phuc Alfe',
	},
]

const trustTags = [
	'Cam kết nguồn gốc',
	'Không tính phí cắt liều',
	'Tư vấn dùng thuốc, đúng liều',
	'100% hàng chính hãng',
	'Minh bạch giá và nguồn gốc',
]

const extractFirstImage = (images: string) => {
	if (!images) {
		return ''
	}

	return images
		.split(';')
		.map((item) => item.trim())
		.find((item) => item.length > 0) || ''
}

const parsePriceNumber = (price: string) => {
	const digits = String(price).replace(/[^0-9]/g, '')
	return digits ? Number(digits) : 0
}

const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}đ`

const buildCardMeta = (item: ProductItem) => {
	const currentPrice = parsePriceNumber(item.price)
	const discountPercent = 8 + (Number(item.medicineCode || '0') % 34)
	const divisor = 1 - discountPercent / 100
	const originalPrice = divisor > 0 ? Math.round(currentPrice / divisor) : currentPrice
	const totalCount = 20
	const soldCount = 16 + (Number(item.medicineCode || '0') % 5)

	return {
		imageUrl: extractFirstImage(item.images),
		discountLabel: `-${discountPercent}%`,
		originalPrice: currentPrice > 0 ? formatVnd(originalPrice) : '',
		soldCount,
		totalCount,
	}
}

interface HomePageProps {
	onOpenProductDetail?: (productId: string) => void
	onOpenCategory?: (categoryId: string) => void
	onOpenConsultPage?: () => void
	onOpenHealthNews?: (newsId: string) => void
}

interface CategorySection {
	category: CategoryItem
	products: ProductItem[]
}

function HomePage({ onOpenProductDetail, onOpenCategory, onOpenConsultPage, onOpenHealthNews }: HomePageProps) {
	const [categories, setCategories] = useState<CategoryItem[]>([])
	const [sections, setSections] = useState<CategorySection[]>([])
	const [searchResults, setSearchResults] = useState<ProductItem[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [isLoadingProducts, setIsLoadingProducts] = useState(false)
	const [productError, setProductError] = useState('')
	const [searchKeyword, setSearchKeyword] = useState('')
	const [healthNews, setHealthNews] = useState<HealthNewsBlock[]>([])
	const [isLoadingHealthNews, setIsLoadingHealthNews] = useState(false)
	const [healthNewsError, setHealthNewsError] = useState('')
	const debouncedSearchKeyword = useDebouncedValue(searchKeyword.trim())

	const openCategoryPage = (categoryId: string) => {
		if (!categoryId) {
			return
		}

		if (onOpenCategory) {
			onOpenCategory(categoryId)
			return
		}

		window.history.pushState({}, '', `/category/${encodeURIComponent(categoryId)}`)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const goTo = (path: string) => {
		window.history.pushState({}, '', path)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const openConsultPage = () => {
		if (onOpenConsultPage) {
			onOpenConsultPage()
			return
		}

		window.history.pushState({}, '', '/mua-thuoc-tu-van')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const openHealthNewsPage = (newsId: string) => {
		if (!newsId) {
			return
		}

		if (onOpenHealthNews) {
			onOpenHealthNews(newsId)
			return
		}

		window.history.pushState({}, '', `/ban-tin-suc-khoe/${encodeURIComponent(newsId)}`)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const scrollToCategorySection = (categoryId: string) => {
		if (!categoryId) {
			return
		}

		const target = document.getElementById(`category-section-${categoryId}`)
		if (target) {
			target.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}

	useEffect(() => {
		const loadHealthNews = async () => {
			try {
				setIsLoadingHealthNews(true)
				setHealthNewsError('')
				const data = await getHealthNews()
				// Lấy 5 bài viết đầu tiên
				setHealthNews(data.slice(0, 5))
			} catch (error) {
				setHealthNews([])
				setHealthNewsError(error instanceof Error ? error.message : 'Khong the tai ban tin suc khoe')
			} finally {
				setIsLoadingHealthNews(false)
			}
		}

		loadHealthNews()
	}, [])

	useEffect(() => {
		const loadProducts = async () => {
			try {
				setIsLoadingProducts(true)
				setProductError('')
				const categoryData = await getCategories()
				setCategories(categoryData)

				if (categoryData.length === 0) {
					setSections([])
					return
				}

				const dataByCategory = await Promise.all(
					categoryData.map(async (category) => {
						const data = await getProducts({
							categoryId: category._id,
							limit: 4,
						})

						return {
							category,
							products: data.items,
						}
					}),
				)

				setSections(dataByCategory.filter((section) => section.products.length > 0))
			} catch (error) {
				setCategories([])
				setSections([])
				setProductError(error instanceof Error ? error.message : 'Khong the tai danh muc va san pham')
			} finally {
				setIsLoadingProducts(false)
			}
		}

		void loadProducts()
	}, [])

	useEffect(() => {
		const loadSearchResults = async () => {
			if (!debouncedSearchKeyword) {
				setSearchResults([])
				setIsSearching(false)
				return
			}

			try {
				setIsSearching(true)
				const data = await getProducts({
					search: debouncedSearchKeyword,
					limit: 8,
				})
				setSearchResults(data.items)
			} catch {
				setSearchResults([])
			} finally {
				setIsSearching(false)
			}
		}

		void loadSearchResults()
	}, [debouncedSearchKeyword])

	const handleSearchResultSelect = (productId: string) => {
		if (!productId) {
			return
		}

		onOpenProductDetail?.(productId)
		setSearchKeyword('')
		setSearchResults([])
	}

	return (
		<PharmacyLayout
			categories={categories}
			onCategorySelect={(category) => openCategoryPage(category._id)}
			searchKeyword={searchKeyword}
			onSearchKeywordChange={setSearchKeyword}
			searchResults={searchResults}
			isSearching={isSearching}
			onSearchResultSelect={handleSearchResultSelect}
		>
			<div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-3 xl:grid-cols-7">
				{quickActions.map((item) => (
					<article
						key={item.label}
						role="button"
						tabIndex={0}
						onClick={() => goTo(item.path)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault()
								goTo(item.path)
							}
						}}
						className="group cursor-pointer rounded-xl border border-[#e6efe6] bg-[#edf5ed] p-3 text-center transition-all duration-200 hover:border-[#16a34a] hover:bg-white hover:shadow-md"
					>
						<div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#8ce270] to-[#2eaf50] shadow-[0_6px_14px_rgba(22,163,74,0.35)] transition-transform group-hover:scale-110">
							<span className="grid h-8 w-8 place-items-center rounded-full bg-white/25 text-[11px] font-bold tracking-wide leading-none text-white">
								{item.icon}
							</span>
						</div>
						<p className="text-sm font-medium text-slate-700 transition-colors group-hover:text-[#16a34a]">
							{item.label}
						</p>
					</article>
				))}
			</div>

			<div className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-3 shadow-sm md:grid-cols-2">
				{heroBanners.map((banner, index) => (
					<article 
						key={banner.image} 
						className="relative min-h-[184px] cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.01]"
						onClick={() => goTo(banner.href)}
					>
						<div className={`w-full h-auto overflow-hidden relative ${index % 2 === 0 ? 'lg:pr-[8px]' : 'lg:pl-[8px]'}`}>
							<img
								src={banner.image}
								alt={banner.alt}
								loading="eager"
								fetchPriority="high"
								decoding="async"
								className="min-h-[176px] w-full rounded-[12px] object-contain transition-opacity duration-300 opacity-100"
							/>
						</div>
					</article>
				))}
			</div>

			<div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
				<div className="flex flex-wrap gap-3 text-sm text-slate-600">
					{trustTags.map((tag) => (
						<span key={tag} className="rounded-full bg-[#effaf0] px-3 py-1.5">
							{tag}
						</span>
					))}
				</div>
			</div>

			{isLoadingProducts && (
				<section className="rounded-2xl bg-white p-4 shadow-sm">
					<p className="py-2 text-sm text-slate-600">Dang tai san pham...</p>
				</section>
			)}

			{!isLoadingProducts && productError && (
				<section className="rounded-2xl bg-white p-4 shadow-sm">
					<p className="py-2 text-sm font-medium text-red-500">{productError}</p>
				</section>
			)}

			{!isLoadingProducts && !productError && sections.length === 0 && (
				<section className="rounded-2xl bg-white p-4 shadow-sm">
					<p className="py-2 text-sm text-slate-600">Chua co san pham theo danh muc.</p>
				</section>
			)}

			{!isLoadingProducts && !productError && sections.length > 0 && (
				<div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_150px]">
					<div className="space-y-4">
						{sections.map((section) => (
							<section
								id={`category-section-${section.category._id}`}
								key={section.category._id}
								className="overflow-hidden rounded-2xl bg-white shadow-sm"
							>
							<div className="flex items-center justify-between bg-[#35b548] px-5 py-4 text-white">
								<h3 className="text-xl font-extrabold uppercase tracking-wide">{section.category.categoryName}</h3>
								<button
									type="button"
									onClick={() => openCategoryPage(section.category._id)}
									className="font-semibold text-white/90 hover:text-white"
								>
									Xem tat ca
								</button>
							</div>

							<div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
								{section.products.map((item) => {
									const meta = buildCardMeta(item)

									return (
										<ProductCard
											key={item.id}
											productCode={item.medicineCode}
											productId={item.id}
											name={item.productName}
											imageUrl={meta.imageUrl}
											price={item.price}
											originalPrice={meta.originalPrice}
											sale={meta.discountLabel}
											soldCount={meta.soldCount}
											totalCount={meta.totalCount}
											onViewDetail={onOpenProductDetail}
										/>
									)
								})}
							</div>
							</section>
						))}
					</div>

					<aside className="hidden self-start xl:sticky xl:top-24 xl:block">
						<div className="rounded-xl border border-[#cce9cf] bg-white p-2.5 shadow-sm">
							<p className="text-xs font-bold text-[#2f6d39]">Danh muc nhanh</p>
							<div className="mt-2 flex flex-col gap-1.5">
								{sections.slice(0, 11).map((section) => (
									<button
										key={`menu-${section.category._id}`}
										type="button"
										onClick={() => scrollToCategorySection(section.category._id)}
										className="rounded-md border border-[#bfe8c3] bg-[#f9fff9] px-2 py-1.5 text-left text-[11px] font-semibold text-[#2f6d39] transition hover:bg-[#ecffef]"
									>
										<span className="line-clamp-2">{section.category.categoryName}</span>
									</button>
								))}
							</div>
						</div>
					</aside>
				</div>
			)}

			<section className="rounded-2xl bg-white p-4 shadow-sm">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-xl font-bold text-[#2aa443]">Ban Tin Suc Khoe</h3>
					<button
						type="button"
						onClick={() => openHealthNewsPage('1')}
						className="text-sm font-medium text-[#2aa443] hover:text-[#228e39]"
					>
						Xem tat ca
					</button>
				</div>

				{isLoadingHealthNews && (
					<p className="py-4 text-sm text-slate-600">Dang tai ban tin suc khoe...</p>
				)}

				{!isLoadingHealthNews && healthNewsError && (
					<p className="py-4 text-sm text-red-500">{healthNewsError}</p>
				)}

				{!isLoadingHealthNews && !healthNewsError && healthNews.length === 0 && (
					<p className="py-4 text-sm text-slate-600">Chua co ban tin suc khoe.</p>
				)}

				{!isLoadingHealthNews && !healthNewsError && healthNews.length > 0 && (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{healthNews.map((item) => (
							<article
								key={item.newsId}
								role="button"
								tabIndex={0}
								onClick={() => openHealthNewsPage(item.newsId)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault()
										openHealthNewsPage(item.newsId)
									}
								}}
								className="cursor-pointer rounded-lg border border-slate-200 p-2 transition hover:border-[#7fcf8a] hover:shadow-sm"
							>
								<div className="overflow-hidden rounded-md">
									<img
										src={item.heroImage}
										alt={item.title}
										loading="lazy"
										className="h-[150px] w-full object-cover"
									/>
								</div>
								<h4 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5 text-slate-800">
									{item.title}
								</h4>
								<p className="mt-1 text-xs text-slate-500">{item.updatedAt}</p>
							</article>
						))}
					</div>
				)}
			</section>
		</PharmacyLayout>
	)
}

export default HomePage
