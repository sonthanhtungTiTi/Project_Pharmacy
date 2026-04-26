import { useEffect, useMemo, useState } from 'react'
import PharmacyLayout, { type CategoryItem } from '../components/layout/layout'
import ProductCard from '../components/ui/product-card'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getCategories } from '../services/category.service'
import { getProducts, type ProductItem } from '../services/product.service'

interface CategoryPageProps {
	categoryId: string
	onBackHome?: () => void
	onOpenProductDetail?: (productId: string) => void
}

function Category({ categoryId, onBackHome, onOpenProductDetail }: CategoryPageProps) {
	const [categories, setCategories] = useState<CategoryItem[]>([])
	const [products, setProducts] = useState<ProductItem[]>([])
	const [searchResults, setSearchResults] = useState<ProductItem[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const [isLoadingCategories, setIsLoadingCategories] = useState(false)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [totalProducts, setTotalProducts] = useState(0)
	const [searchKeyword, setSearchKeyword] = useState('')
	const debouncedSearchKeyword = useDebouncedValue(searchKeyword.trim())

	const PAGE_SIZE = 30

	useEffect(() => {
		const loadCategories = async () => {
			try {
				setIsLoadingCategories(true)
				const data = await getCategories()
				setCategories(data)
			} catch {
				setCategories([])
			} finally {
				setIsLoadingCategories(false)
			}
		}

		void loadCategories()
	}, [])

	useEffect(() => {
		setCurrentPage(1)
	}, [categoryId])

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}, [currentPage])

	useEffect(() => {
		const loadCategoryProducts = async () => {
			if (!categoryId) {
				setProducts([])
				setTotalProducts(0)
				setTotalPages(1)
				return
			}

			try {
				setIsLoading(true)
				setError('')
				const data = await getProducts({
					categoryId,
					page: currentPage,
					limit: PAGE_SIZE,
				})
				setProducts(data.items)
				setTotalProducts(data.pagination.total)
				setTotalPages(data.pagination.totalPages)
			} catch (apiError) {
				setProducts([])
				setTotalProducts(0)
				setTotalPages(1)
				setError(apiError instanceof Error ? apiError.message : 'Khong the tai danh sach san pham')
			} finally {
				setIsLoading(false)
			}
		}

		void loadCategoryProducts()
	}, [categoryId, currentPage])

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

	const categoryLabel = useMemo(() => {
		const fromStatic = categories.find((item) => item._id === categoryId)?.categoryName
		if (fromStatic) {
			return fromStatic
		}

		return products[0]?.categoryName || 'Danh mục'
	}, [categoryId, categories, products])

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

	const openCategoryDetail = (nextCategoryId: string) => {
		if (!nextCategoryId) {
			return
		}

		window.history.pushState({}, '', `/category/${encodeURIComponent(nextCategoryId)}`)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

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
			selectedCategoryId={categoryId}
			onCategorySelect={(category) => openCategoryDetail(category._id)}
			onSelectAllCategories={onBackHome}
			searchKeyword={searchKeyword}
			onSearchKeywordChange={setSearchKeyword}
			searchResults={searchResults}
			isSearching={isSearching}
			onSearchResultSelect={handleSearchResultSelect}
		>
			<div className="mb-1 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
				<div>
					<h1 className="text-2xl font-black text-slate-800">Danh mục: {categoryLabel}</h1>
					<p className="mt-1 text-sm text-slate-500">{totalProducts} sản phẩm</p>
				</div>
				<button
					type="button"
					onClick={onBackHome}
					className="rounded-full border border-[#38b54a] px-4 py-2 text-sm font-semibold text-[#1f9542] transition hover:bg-[#ebf9ee]"
				>
					← Quay lại trang chủ
				</button>
			</div>

			<section className="rounded-2xl bg-white p-4 shadow-sm">
				{isLoadingCategories && <p className="pb-3 text-sm text-slate-500">Dang tai danh muc...</p>}

				{isLoading && <p className="py-4 text-sm text-slate-600">Dang tai san pham danh muc...</p>}

				{!isLoading && error && <p className="py-4 text-sm font-medium text-red-500">{error}</p>}

				{!isLoading && !error && products.length === 0 && (
					<p className="py-4 text-sm text-slate-600">Chua co san pham trong danh muc nay.</p>
				)}

				{!isLoading && !error && products.length > 0 && (
					<>
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
							{products.map((item) => {
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

						{totalPages > 1 && (
							<div className="mt-5 flex flex-wrap items-center justify-center gap-2">
								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Trước
								</button>

								{Array.from({ length: totalPages }, (_, index) => index + 1)
									.filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
									.map((page, index, arr) => {
										const prevPage = arr[index - 1]
										const needDots = prevPage && page - prevPage > 1

										return (
											<div key={`page-wrap-${page}`} className="flex items-center gap-2">
												{needDots && <span className="px-1 text-slate-400">...</span>}
												<button
													type="button"
													onClick={() => setCurrentPage(page)}
													className={`rounded-lg px-3 py-2 text-sm font-semibold ${
														page === currentPage
															? 'bg-[#35b548] text-white'
															: 'border border-slate-300 text-slate-700'
													}`}
												>
													{page}
												</button>
											</div>
										)
									})}

								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Sau
								</button>
							</div>
						)}
					</>
				)}
			</section>
		</PharmacyLayout>
	)
}

export default Category
