import { useEffect, useMemo, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import toast from 'react-hot-toast'
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

const getBackendUrl = () => {
	const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
	return apiUrl.replace(/\/api\/?$/, '')
}

const cleanProxyUrl = (url: string) => {
	if (!url) return ''

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

const normalizeImageUrl = (url: string) => {
	const cleaned = cleanProxyUrl(url)
	if (cleaned && cleaned.startsWith('/') && !cleaned.startsWith('//')) {
		return `${getBackendUrl()}${cleaned}`
	}

	return cleaned
}

const splitImages = (images: string | string[]) => {
	const rawItems: string[] = []

	if (Array.isArray(images)) {
		rawItems.push(...images)
	} else {
		const rawText = String(images || '').trim()
		if (!rawText) return []
		if (rawText.startsWith('[')) {
			try {
				const parsed = JSON.parse(rawText)
				if (Array.isArray(parsed)) {
					rawItems.push(...parsed.map((item) => String(item)))
				} else {
					rawItems.push(rawText)
				}
			} catch {
				rawItems.push(rawText)
			}
		} else {
			rawItems.push(rawText)
		}
	}

	return rawItems
		.flatMap((item) => {
			const trimmed = String(item || '').trim()
			if (!trimmed) return []
			if (trimmed.includes(';')) return trimmed.split(';')
			if (trimmed.includes('|')) return trimmed.split('|')
			if (trimmed.includes(',') && !trimmed.includes('f_webp,') && !trimmed.includes('quality_')) {
				return trimmed.split(',')
			}
			return [trimmed]
		})
		.map((item) => normalizeImageUrl(item.trim()))
		.filter(Boolean)
}

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
	const [prescriptionUrl, setPrescriptionUrl] = useState('')
	const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
	const [consultationSent, setConsultationSent] = useState(false)
	const [showPrescriptionWarning, setShowPrescriptionWarning] = useState(false)

	const handlePrescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			const reader = new FileReader()
			reader.onloadend = () => {
				setPrescriptionUrl(reader.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	const handleSubmitConsultation = async () => {
		if (!product?._id || !prescriptionUrl) return

		try {
			setIsSubmittingRequest(true)
			const token = localStorage.getItem('clientAccessToken')
			if (!token) {
				window.dispatchEvent(new CustomEvent('requestAuth'))
				return
			}

			const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')
			const res = await fetch(`${API_BASE_URL}/client/prescriptions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					productId: product._id,
					prescriptionImage: prescriptionUrl
				})
			})

			const data = await res.json()
			if (res.ok && data.success) {
				setConsultationSent(true)
				toast.success('Yêu cầu đã gửi! Nhân viên sẽ tư vấn bạn qua khung chat.')
				setAddToCartMessage('')
				window.dispatchEvent(new CustomEvent('openChatbot'))
			} else {
				toast.error(data.message || 'Lỗi khi gửi yêu cầu')
				setAddToCartMessage('')
			}
		} catch (err) {
			toast.error('Lỗi khi gửi yêu cầu')
			setAddToCartMessage('')
		} finally {
			setIsSubmittingRequest(false)
		}
	}

	useEffect(() => {
		const loadDetail = async () => {
			try {
				setIsLoading(true)
				setError('')
				const data = await getProductDetail(productId)
				setProduct(data)
				if (data?.requiresPrescription) {
					setShowPrescriptionWarning(true)
				}
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

	const extractFirstImage = (images: string | string[]) => splitImages(images)[0] || ''

	const parsePriceNumber = (price: string) => {
		const digits = String(price).replace(/[^0-9]/g, '')
		return digits ? Number(digits) : 0
	}

	const formatVnd = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}đ`

	const formatPriceLabel = (value: string | number | null | undefined) => {
		const rawText = String(value ?? '').trim()
		const digits = rawText.replace(/[^0-9]/g, '')
		if (!digits) {
			return rawText
		}

		const formatted = new Intl.NumberFormat('vi-VN').format(Number(digits))
		const suffix = rawText.replace(/[0-9\s.,]/g, '')
		return suffix ? `${formatted}${suffix}` : formatted
	}

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

	const displayPrice = formatPriceLabel(product?.price)

	return (
		<PharmacyLayout categories={categories} hideSidebar>
			{showPrescriptionWarning && (
				<div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-4">
					<div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
						<div className="bg-red-50 p-6 text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl shadow-sm">
								⚠️
							</div>
							<h3 className="mb-2 text-xl font-bold text-red-600">Thuốc Cần Kê Đơn</h3>
							<p className="text-sm leading-relaxed text-slate-600">
								Sản phẩm này là thuốc kê đơn. Bạn cần <span className="font-semibold text-slate-800">tải lên hình ảnh đơn thuốc</span> để được dược sĩ tư vấn trước khi mua hàng.
							</p>
						</div>
						<div className="bg-white p-4">
							<button
								type="button"
								onClick={() => setShowPrescriptionWarning(false)}
								className="w-full rounded-xl bg-[#35b548] py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-95"
							>
								Tôi đã hiểu
							</button>
						</div>
					</div>
				</div>
			)}
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
											className={`overflow-hidden rounded-xl border p-1 ${selectedImageIndex === index
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
							<div className="mt-2 flex flex-wrap gap-4 text-sm items-center">
								<span className="font-semibold text-[#35b548]">Còn hàng</span>
								<span className="text-slate-600">Mã: {product.medicineCode}</span>
								{product.requiresPrescription && (
									<span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 border border-red-200 flex items-center gap-1">
										<span role="img" aria-label="warning">⚠️</span> Cần đơn thuốc
									</span>
								)}
							</div>

							<p className="mt-4 text-[30px] font-extrabold leading-none text-[#f14153]">{displayPrice}</p>

							{product.requiresPrescription ? (
								consultationSent ? (
									/* ===== BANNER THÀNH CÔNG ===== */
									<div className="mt-5 rounded-xl border border-[#35b548] bg-[#f0faf2] p-5 flex flex-col items-center gap-3 text-center">
										<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#35b548] text-white text-2xl shadow-md">
											✓
										</div>
										<p className="text-base font-bold text-[#1f7a35]">Yêu cầu đã được gửi!</p>
										<p className="text-sm text-slate-600 leading-relaxed">
											Nhân viên dược sĩ đang xem xét đơn thuốc của bạn.
											<br />
											Vui lòng <span className="font-semibold text-[#35b548]">mở khung chat</span> bên góc phải màn hình để nhân viên tư vấn trực tiếp về loại thuốc kê đơn này.
										</p>
										<button
											type="button"
											onClick={() => window.dispatchEvent(new CustomEvent('openChatbot'))}
											className="mt-1 flex items-center gap-2 rounded-xl bg-[#35b548] px-6 py-2.5 text-sm font-semibold text-white shadow hover:brightness-95 transition"
										>
											<span>💬</span> Mở khung chat tư vấn
										</button>
									</div>
								) : (
									/* ===== FORM UPLOAD ĐƠN THUỐC ===== */
									<div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 rounded-xl border border-red-200 bg-red-50 p-4">
										<div className="flex flex-col gap-2">
											<p className="text-sm font-semibold text-slate-700">Tải lên đơn thuốc của bạn</p>
											<label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50">
												{prescriptionUrl ? (
													<img src={prescriptionUrl} alt="Đơn thuốc" className="h-full w-full object-contain p-2" />
												) : (
													<div className="text-center text-slate-500">
														<span className="text-2xl">+</span>
														<p className="text-xs">Bấm để tải ảnh</p>
													</div>
												)}
												<input type="file" className="hidden" accept="image/*" onChange={handlePrescriptionUpload} />
											</label>
										</div>
										<div className="flex flex-col justify-center gap-3">
											<p className="text-sm font-bold text-red-600">
												⚠️ Thuốc chống chỉ định khi chưa có yêu cầu của bác sĩ chuyên môn
											</p>
											<button
												type="button"
												onClick={handleSubmitConsultation}
												disabled={!prescriptionUrl || isSubmittingRequest}
												className={`h-11 rounded-xl text-base font-semibold text-white transition ${!prescriptionUrl || isSubmittingRequest
													? 'bg-slate-300 cursor-not-allowed'
													: 'bg-[#35b548] hover:brightness-95'
													}`}
											>
												{isSubmittingRequest ? 'Đang gửi...' : 'Tư vấn mua hàng'}
											</button>
										</div>
									</div>
								)
							) : (
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
									{addToCartMessage && (
										<p className="mt-3 text-sm text-slate-600 col-span-2">{addToCartMessage}</p>
									)}
								</div>
							)}
							<AddToCartModal
								isOpen={isAddModalOpen}
								productName={product.productName}
								priceLabel={displayPrice}
								onClose={() => setIsAddModalOpen(false)}
								onConfirm={handleAddToCart} onLoginRequired={handleLoginRequired} />
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
													requiresPrescription={item.requiresPrescription}
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
