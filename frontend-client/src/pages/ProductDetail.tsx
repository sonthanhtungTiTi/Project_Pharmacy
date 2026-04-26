import { useEffect, useMemo, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PharmacyLayout, { type CategoryItem } from '../components/layout/layout'
import AddToCartModal from '../components/ui/add-to-cart-modal'
import ProductCard from '../components/ui/product-card'
import { useCart } from '../hooks/useCart'
import {
	getProductDetail,
	getProducts,
	type ProductDetail as ProductDetailData,
	type ProductItem,
} from '../services/product.service'

interface ProductDetailProps {
	productId: string
	onBackHome?: () => void
}

const categories: CategoryItem[] = [
	{ _id: '69b172063c7cbe3ee7beb0b7', categoryName: 'Hô hấp' },
	{ _id: '69b172063c7cbe3ee7beb0b8', categoryName: 'Dầu, Cao Xoa, Miếng Dán' },
	{ _id: '69b172063c7cbe3ee7beb0bb', categoryName: 'Cơ xương khớp, gút' },
	{ _id: '69b172063c7cbe3ee7beb0b4', categoryName: 'Tiêu hóa, gan mật' },
	{ _id: '69b172063c7cbe3ee7beb0b9', categoryName: 'Thần kinh, não bộ' },
	{ _id: '69b199bce7c1196de13c91a0', categoryName: 'Dâu, Cao Xoa, Miếng Dán' },
	{ _id: '69b199bce7c1196de13c91a7', categoryName: 'Hỗ hợp' },
]

const splitImages = (images: string) =>
	String(images || '')
		.split(';')
		.map((item) => item.trim())
		.filter(Boolean)

const detailRows = (product: ProductDetailData) => [
	{ label: 'Công dụng', value: product.usageSummary },
	{ label: 'Thành phần chính', value: product.mainIngredients },
	{ label: 'Đối tượng sử dụng', value: product.targetUsers },
	{ label: 'Thương hiệu', value: product.brand },
	{ label: 'Nhà sản xuất', value: product.manufacturer },
	{ label: 'Thành phần', value: product.ingredients },
	{ label: 'Cách dùng', value: product.usage },
	{ label: 'Liều dùng', value: product.dosage },
	{ label: 'Chống chỉ định', value: product.contraindications },
	{ label: 'Tác dụng phụ', value: product.sideEffects },
	{ label: 'Thận trọng', value: product.precautions },
	{ label: 'Dược lý', value: product.pharmacology },
	{ label: 'Thông tin thêm', value: product.additionalInfo },
	{ label: 'Bảo quản', value: product.storage },
	{ label: 'Hạn dùng', value: product.expiry },
	{ label: 'Chi tiết NSX', value: product.manufacturerDetail },
	{ label: 'Quy cách', value: product.packaging },
	{ label: 'Đặc tính', value: product.characteristics },
].filter((item) => Boolean(item.value))

function ProductDetail({ productId, onBackHome }: ProductDetailProps) {
	const { addItem } = useCart()
	const [product, setProduct] = useState<ProductDetailData | null>(null)
	const [selectedImageIndex, setSelectedImageIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const [isAddModalOpen, setIsAddModalOpen] = useState(false)
	const [addToCartMessage, setAddToCartMessage] = useState('')
	const [relatedProducts, setRelatedProducts] = useState<ProductItem[]>([])
	const [isLoadingRelated, setIsLoadingRelated] = useState(false)
	const [relatedError, setRelatedError] = useState('')

	useEffect(() => {
		const loadDetail = async () => {
			try {
				setIsLoading(true)
				setError('')
				const data = await getProductDetail(productId)
				setProduct(data)
			} catch (apiError) {
				setProduct(null)
				setError(apiError instanceof Error ? apiError.message : 'Không thể tải chi tiết sản phẩm')
			} finally {
				setIsLoading(false)
			}
		}

		void loadDetail()
	}, [productId])

	const imageList = useMemo(() => splitImages(product?.images || ''), [product?.images])
	const currentImage = imageList[selectedImageIndex] || imageList[0] || ''

	useEffect(() => {
		setSelectedImageIndex(0)
	}, [productId, product?.images])

	useEffect(() => {
		const loadRelatedProducts = async () => {
			if (!product?.categoryId) {
				setRelatedProducts([])
				return
			}

			try {
				setIsLoadingRelated(true)
				setRelatedError('')
				const data = await getProducts({
					categoryId: product.categoryId,
					limit: 6,
				})

				setRelatedProducts(data.items.filter((item) => item.id !== productId))
			} catch (apiError) {
				setRelatedProducts([])
				setRelatedError(apiError instanceof Error ? apiError.message : 'Không thể tải sản phẩm liên quan')
			} finally {
				setIsLoadingRelated(false)
			}
		}

		void loadRelatedProducts()
	}, [product?.categoryId, productId])

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

	const openProductDetail = (nextProductId: string) => {
		if (!nextProductId || nextProductId === productId) {
			return
		}

		window.history.pushState({}, '', `/product/${encodeURIComponent(nextProductId)}`)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const openCategoryPage = () => {
		if (!product?.categoryId) {
			return
		}

		window.history.pushState({}, '', `/category/${encodeURIComponent(product.categoryId)}`)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const handleAddToCart = async (quantity: number) => {
		if (!product?._id) {
			throw new Error('Sản phẩm không hợp lệ')
		}

		await addItem(product._id, quantity)
		setAddToCartMessage('Đã thêm vào giỏ thuốc')
	}

	const handleLoginRequired = () => {
		// Trigger auth modal opening through event
		window.dispatchEvent(new CustomEvent('requestAuth'))
	}

	return (
		<PharmacyLayout categories={categories} hideSidebar>
			<div className="mb-1">
				<button
					type="button"
					onClick={onBackHome}
					className="flex items-center gap-2 rounded-full border border-[#38b54a] bg-white px-4 py-2 text-sm font-semibold text-[#1f9542] transition hover:bg-[#ebf9ee]"
				>
					<ArrowBackIcon sx={{ fontSize: 18 }} />
					Quay lại trang chủ
				</button>
			</div>

			{isLoading && (
				<div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm">Đang tải chi tiết sản phẩm...</div>
			)}

			{!isLoading && error && (
				<div className="rounded-2xl bg-white p-6 text-sm font-medium text-red-500 shadow-sm">{error}</div>
			)}

			{!isLoading && !error && product && (
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
					<div className="space-y-4">
						<section className="rounded-2xl bg-white p-4 shadow-sm">
							<div className="mb-3 flex items-center justify-center rounded-2xl bg-[#f7f7f7] p-5">
								{currentImage ? (
									<img
										src={currentImage}
										alt={product.productName}
										className="h-[320px] w-full object-contain"
									/>
								) : (
									<div className="h-[320px] w-full rounded-xl bg-[linear-gradient(145deg,#f0f6e7,#f8f2d9)]" />
								)}
							</div>

							{imageList.length > 0 && (
								<div className="grid grid-cols-6 gap-2 md:grid-cols-8">
									{imageList.map((item, index) => (
										<button
											type="button"
											key={`${item}-${index}`}
											onClick={() => setSelectedImageIndex(index)}
											className={`overflow-hidden rounded-xl border p-1 ${
												selectedImageIndex === index
													? 'border-[#35b548]'
													: 'border-slate-200'
											}`}
										>
											<img src={item} alt={`${product.productName}-${index + 1}`} className="h-14 w-full object-contain" />
										</button>
									))}
								</div>
							)}
						</section>

						<section className="overflow-hidden rounded-2xl bg-white shadow-sm">
							<div className="border-b border-slate-100 px-4 py-3">
								<h3 className="text-2xl font-extrabold text-slate-800">Thông tin sản phẩm</h3>
							</div>
							<div className="divide-y divide-slate-100">
								{detailRows(product).map((row) => (
									<div key={row.label} className="grid gap-2 px-4 py-3 md:grid-cols-[190px_1fr] md:gap-4">
										<div className="text-sm font-semibold text-slate-700">{row.label}</div>
										<div className="text-sm leading-6 text-slate-600">{row.value}</div>
									</div>
								))}
							</div>
						</section>
					</div>

					<div className="space-y-4">
						<section className="rounded-2xl bg-white p-4 shadow-sm">
							<h1 className="text-3xl font-black leading-tight text-slate-800">{product.productName}</h1>
							<div className="mt-2 flex flex-wrap gap-4 text-sm">
								<span className="font-semibold text-[#35b548]">Còn hàng</span>
								<span className="text-slate-600">Mã: {product.medicineCode}</span>
							</div>

							<p className="mt-4 text-[30px] font-extrabold leading-none text-[#f14153]">{product.price}</p>

							<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
								<button
									type="button"
									onClick={() => {
										setAddToCartMessage('')
										setIsAddModalOpen(true)
									}}
									className="h-11 rounded-xl bg-[#35b548] text-base font-semibold text-white transition hover:brightness-95"
								>
									Chọn mua
								</button>
								<button
									type="button"
									className="h-11 rounded-xl bg-[#ebf6ed] text-base font-semibold text-[#1f9542] transition hover:bg-[#dff3e3]"
								>
									Chat Zalo
								</button>
							</div>
							{addToCartMessage && (
								<p className="mt-3 text-sm text-slate-600">{addToCartMessage}</p>
							)}
							<AddToCartModal
								isOpen={isAddModalOpen}
								productName={product.productName}
								priceLabel={product.price}
								onClose={() => setIsAddModalOpen(false)}
								onConfirm={handleAddToCart}							onLoginRequired={handleLoginRequired}							/>
							<p className="mt-3 text-sm text-slate-500">Tư vấn từ 8:00 - 21:30</p>
						</section>

						<section className="rounded-2xl bg-white p-4 shadow-sm">
							<h2 className="text-xl font-bold text-slate-800">Thông tin giao hàng</h2>
							<button
								type="button"
								className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-600"
							>
								<span>Nhập địa chỉ để biết thời gian giao hàng</span>
								<span aria-hidden="true">&gt;</span>
							</button>
						</section>

						<section className="rounded-2xl bg-white p-4 shadow-sm">
							<h2 className="text-xl font-bold text-slate-800">Nhà thuốc có sẵn hàng</h2>
							<div className="mt-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
								Hồ Chí Minh
							</div>
							<ul className="mt-3 space-y-3 text-sm text-slate-600">
								<li className="border-b border-slate-100 pb-3">
									904 Trần Hưng Đạo, Phường An Đông, Thành phố Hồ Chí Minh
								</li>
								<li className="border-b border-slate-100 pb-3">
									515 Lạc Long Quân, Phường Bảy Hiền, Thành phố Hồ Chí Minh
								</li>
								<li className="border-b border-slate-100 pb-3">
									989 Hoàng Sa, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh
								</li>
								<li>7 Bùi Bằng Đoàn, Phường Tân Hưng, Thành phố Hồ Chí Minh</li>
							</ul>
						</section>

						<section className="rounded-2xl bg-white p-4 shadow-sm">
							<div className="mb-3 flex items-center justify-between gap-3">
								<h2 className="text-xl font-bold text-slate-800">Sản phẩm cùng danh mục</h2>
								<span className="text-sm text-slate-500">{product.categoryName}</span>
							</div>

							{isLoadingRelated && (
								<p className="py-4 text-sm text-slate-600">Đang tải sản phẩm liên quan...</p>
							)}

							{!isLoadingRelated && relatedError && (
								<p className="py-4 text-sm font-medium text-red-500">{relatedError}</p>
							)}

							{!isLoadingRelated && !relatedError && relatedProducts.length === 0 && (
								<p className="py-4 text-sm text-slate-600">Chưa có sản phẩm cùng danh mục.</p>
							)}

							{!isLoadingRelated && !relatedError && relatedProducts.length > 0 && (
								<>
									<div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
										{relatedProducts.slice(0, 5).map((item) => {
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
													onViewDetail={openProductDetail}
												/>
											)
										})}
									</div>

									{relatedProducts.length >= 5 && (
										<div className="mt-4 text-center">
											<button
												type="button"
												onClick={openCategoryPage}
												className="rounded-full border border-[#35b548] px-4 py-2 text-sm font-semibold text-[#1f9542] transition hover:bg-[#ebf9ee]"
											>
												Xem trang danh mục này
											</button>
										</div>
									)}
								</>
							)}
						</section>
					</div>
				</div>
			)}
		</PharmacyLayout>
	)
}

export default ProductDetail
