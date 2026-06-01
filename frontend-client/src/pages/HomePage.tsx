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

const getBackendUrl = () => {
	const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
	return apiUrl.replace(/\/api\/?$/, '')
}

const cleanProxyUrl = (url: string) => {
	if (!url) return ''

	// Detect complex proxy URLs like https://img.tgdd.vn/imgt/ankhang/.../https://cdnv2.tgdd.vn/...
	// We want to extract the second part which is the real image URL
	const doubleHttpsIndex = url.lastIndexOf('https://')
	if (doubleHttpsIndex > 0) {
		return url.substring(doubleHttpsIndex)
	}

	const doubleHttpIndex = url.lastIndexOf('http://')
	if (doubleHttpIndex > 0) {
		return url.substring(doubleHttpIndex)
	}

	return url
}

const extractFirstImage = (images: string | string[]) => {
	if (!images) {
		return ''
	}

	let firstUrl = ''
	if (Array.isArray(images)) {
		firstUrl = images.find((img) => typeof img === 'string' && img.trim()) || ''
	} else {
		const trimmed = images.trim()
		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed)
				if (Array.isArray(parsed)) {
					firstUrl = parsed.find((img) => typeof img === 'string' && img.trim()) || ''
				}
			} catch {
				firstUrl = trimmed
			}
		} else {
			// Split by common separators, prioritize ';' to avoid breaking URLs with commas
			let parts: string[] = []
			if (trimmed.includes(';')) {
				parts = trimmed.split(';').map((s) => s.trim())
			} else if (trimmed.includes('|')) {
				parts = trimmed.split('|').map((s) => s.trim())
			} else if (trimmed.includes(',')) {
				if (!trimmed.includes('f_webp,') && !trimmed.includes('quality_')) {
					parts = trimmed.split(',').map((s) => s.trim())
				} else {
					parts = [trimmed]
				}
			} else {
				parts = [trimmed]
			}
			firstUrl = parts.find(Boolean) || ''
		}
	}

	const cleaned = cleanProxyUrl(firstUrl)

	if (cleaned && cleaned.startsWith('/') && !cleaned.startsWith('//')) {
		return `${getBackendUrl()}${cleaned}`
	}

	return cleaned
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
	onOpenHealthNews?: (newsId: string) => void
}

interface CategorySection {
	category: CategoryItem
	products: ProductItem[]
}

function HomePage({ onOpenProductDetail, onOpenCategory, onOpenHealthNews }: HomePageProps) {
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
				setHealthNewsError(error instanceof Error ? error.message : 'Không thể tai bản tin sức khỏe')
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
							limit: 10,
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
				setProductError(error instanceof Error ? error.message : 'Không thể tai danh mục và sản phẩm')
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

			<div className="my-2 flex flex-col overflow-hidden bg-[#e9f9ee] md:rounded-2xl md:flex-row shadow-sm">
				<a className="flex justify-start overflow-hidden bg-[#e9f9ee] md:w-[35%]" href="/kiem-tra-suc-khoe">
					<div className="relative h-[229px] w-full overflow-hidden">
						<img
							alt="Health Check Banner"
							loading="lazy"
							className="h-full w-full object-cover transition-opacity duration-300"
							src="https://cdnv2-tmdt.tgdd.vn/webmwg/production-fe/ankhang/public/static/images/health-check-banner.png"
						/>
					</div>
				</a>
				<div className="flex items-center bg-[#e9f9ee] py-5 md:p-5 lg:flex-1">
					<div className="relative mx-auto w-full">
						<div className="overflow-hidden">
							<div className="flex w-full gap-4 overflow-x-auto pb-2 px-4 snap-x">
								<div className="flex-none w-[180px] snap-start">
									<a className="flex h-[189px] flex-col items-center gap-2 rounded-[20px] bg-white px-2 py-4 shadow-sm hover:shadow-md transition-shadow" href="/kiem-tra-suc-khoe/tam-soat-hen">
										<div className="flex shrink-0 items-center justify-center rounded-xl bg-white">
											<div className="relative h-[65px] w-[65px] overflow-hidden">
												<img alt="Nguy cơ mắc bệnh hen" loading="lazy" className="object-contain" src="https://cdnv2.tgdd.vn/pim/cdn/images/202510/icon-Hen132831.png" style={{ width: '65px', height: '65px' }} />
											</div>
										</div>
										<div className="flex flex-col items-center gap-1 text-center">
											<div className="text-sm font-bold text-[#1f9542]">Kiểm tra</div>
											<div className="text-sm text-slate-700">Nguy cơ mắc bệnh hen</div>
										</div>
									</a>
								</div>

								<div className="flex-none w-[180px] snap-start">
									<a className="flex h-[189px] flex-col items-center gap-2 rounded-[20px] bg-white px-2 py-4 shadow-sm hover:shadow-md transition-shadow" href="/kiem-tra-suc-khoe/tam-soat-benh-phoi-tac-nghen-man-tinh">
										<div className="flex shrink-0 items-center justify-center rounded-xl bg-white">
											<div className="relative h-[65px] w-[65px] overflow-hidden">
												<img alt="Nguy cơ mắc bệnh phổi tắc nghẽn mạn tính (COPD)" loading="lazy" className="object-contain" src="https://cdnv2.tgdd.vn/pim/cdn/images/202510/icon-Hen-1132812.png" style={{ width: '65px', height: '65px' }} />
											</div>
										</div>
										<div className="flex flex-col items-center gap-1 text-center">
											<div className="text-sm font-bold text-[#1f9542]">Kiểm tra</div>
											<div className="text-sm text-slate-700">Nguy cơ mắc bệnh phổi tắc nghẽn mạn tính (COPD)</div>
										</div>
									</a>
								</div>

								<div className="flex-none w-[180px] snap-start">
									<a className="flex h-[189px] flex-col items-center gap-2 rounded-[20px] bg-white px-2 py-4 shadow-sm hover:shadow-md transition-shadow" href="/kiem-tra-suc-khoe/danh-gia-nguy-co-lam-dung-thuoc-cat-con-hen">
										<div className="flex shrink-0 items-center justify-center rounded-xl bg-white">
											<div className="relative h-[65px] w-[65px] overflow-hidden">
												<img alt="Nguy cơ lạm dụng thuốc cắt cơn hen và COPD" loading="lazy" className="object-contain" src="https://cdnv2.tgdd.vn/pim/cdn/images/202510/icon-Hen-2132928.png" style={{ width: '65px', height: '65px' }} />
											</div>
										</div>
										<div className="flex flex-col items-center gap-1 text-center">
											<div className="text-sm font-bold text-[#1f9542]">Kiểm tra</div>
											<div className="text-sm text-slate-700">Nguy cơ lạm dụng thuốc cắt cơn hen và COPD</div>
										</div>
									</a>
								</div>

								<div className="flex-none w-[180px] snap-start">
									<a className="flex h-[189px] flex-col items-center gap-2 rounded-[20px] bg-white px-2 py-4 shadow-sm hover:shadow-md transition-shadow" href="/kiem-tra-suc-khoe/danh-gia-nguy-co-trao-nguoc-da-day-thuc-quan">
										<div className="flex shrink-0 items-center justify-center rounded-xl bg-white">
											<div className="relative h-[65px] w-[65px] overflow-hidden">
												<img alt="Nguy cơ trào ngược dạ dày, thực quản (GERD)" loading="lazy" className="object-contain" src="https://cdnv2.tgdd.vn/pim/cdn/images/202510/icon-Hen-3132937.png" style={{ width: '65px', height: '65px' }} />
											</div>
										</div>
										<div className="flex flex-col items-center gap-1 text-center">
											<div className="text-sm font-bold text-[#1f9542]">Kiểm tra</div>
											<div className="text-sm text-slate-700">Nguy cơ trào ngược dạ dày, thực quản (GERD)</div>
										</div>
									</a>
								</div>
							</div>
						</div>
					</div>
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



			{!isLoadingProducts && !productError && sections.length > 0 && (
				<div className="grid grid-cols-1 gap-3">
					<div className="space-y-4">
						{sections.map((section, index) => (
							<div key={section.category._id} className="space-y-4">
								<section
									id={`category-section-${section.category._id}`}
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

									<div className="flex gap-3 overflow-x-auto p-4 pb-6 snap-x snap-mandatory">
										{section.products.map((item) => {
											const meta = buildCardMeta(item)

											return (
												<div key={item.id} className="w-[200px] flex-none snap-start md:w-[220px] lg:w-[220px]">
													<ProductCard
														productCode={item.medicineCode}
														productId={item.id}
														name={item.productName}
														imageUrl={meta.imageUrl}
														price={item.price}
														originalPrice={meta.originalPrice}
														sale={meta.discountLabel}
														soldCount={meta.soldCount}
														totalCount={meta.totalCount}
														requiresPrescription={item.requiresPrescription}
														onViewDetail={onOpenProductDetail}
													/>
												</div>
											)
										})}

										<div className="flex w-[150px] flex-none snap-start items-center justify-center py-4 pr-4">
											<button
												type="button"
												onClick={() => openCategoryPage(section.category._id)}
												className="flex h-[150px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#35b548] text-[#35b548] transition hover:bg-[#f4faf4]"
											>
												<span className="text-3xl leading-none">+</span>
												<span className="mt-2 text-sm font-semibold">Xem thêm</span>
											</button>
										</div>
									</div>
								</section>
								{index < 1 && (
									<div className="overflow-hidden rounded-2xl shadow-sm">
										<img
											alt="Khuyến mãi"
											loading="lazy"
											className="w-full object-contain transition-opacity duration-300"
											src="https://cdnv2-tmdt.tgdd.vn/webmwg/production-fe/ankhang/public/static/images/bg_footer.png"
										/>
									</div>
								)}

							</div>
						))}
					</div>


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
					<p className="py-4 text-sm text-slate-600">Dang tai bản tin sức khỏe...</p>
				)}

				{!isLoadingHealthNews && healthNewsError && (
					<p className="py-4 text-sm text-red-500">{healthNewsError}</p>
				)}

				{!isLoadingHealthNews && !healthNewsError && healthNews.length === 0 && (
					<p className="py-4 text-sm text-slate-600">Chua co bản tin sức khỏe.</p>
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
