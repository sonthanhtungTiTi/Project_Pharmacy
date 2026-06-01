import { useEffect, useRef, useState } from 'react'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import SearchIcon from '@mui/icons-material/Search'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import type { AuthUser } from '../../services/auth.service'
import type { ProductItem } from '../../services/product.service'
import CartBadge from '../ui/cart-badge'
import ImageUploadModal from '../ui/ImageUploadModal'

interface HeaderProps {
	authUser: AuthUser | null
	onOpenAuth: () => void
	onOpenProfile: () => void
	onLogout: () => void
	searchKeyword?: string
	onSearchKeywordChange?: (keyword: string) => void
	searchResults?: ProductItem[]
	isSearching?: boolean
	onSearchResultSelect?: (productId: string) => void
}

const topBanners = [
	{
		image: 'https://img.tgdd.vn/imgt/ankhang/f_webp,fit_outside,quality_95/https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/56/ad/56ad38ac332d8eec561f5c5031a9f777.png',
		href: '/chuong-trinh/online-gia-re',
		backgroundColor: '#008f11',
	},
	{
		image: 'https://img.tgdd.vn/imgt/ankhang/f_webp,fit_outside,quality_95/https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/e9/e3/e9e306e744794670bbb16729d59c817f.png',
		href: 'https://www.nhathuocankhang.com/tin-khuyen-mai/tai-app-an-khang-nhan-ngay-uu-dai-1582862',
		backgroundColor: '#6fde75',
	},
	{
		image: 'https://img.tgdd.vn/imgt/ankhang/f_webp,fit_outside,quality_95/https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/a6/db/a6db526821ac95ea9865384d6f2a142c.png',
		href: 'https://www.nhathuocankhang.com/tin-khuyen-mai/mwg-shop-lich-sale-uu-dai-dac-biet-ton-vinh-phai-1590203',
		backgroundColor: '#acfeac',
	},
]

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

function Header({
	authUser,
	onOpenAuth,
	onOpenProfile,
	onLogout,
	searchKeyword = '',
	onSearchKeywordChange,
	searchResults = [],
	isSearching = false,
	onSearchResultSelect,
}: HeaderProps) {
	const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
	const [isSearchOpen, setIsSearchOpen] = useState(false)
	const [isImageSearchOpen, setIsImageSearchOpen] = useState(false)
	const searchContainerRef = useRef<HTMLDivElement | null>(null)

	const hasSearchKeyword = searchKeyword.trim().length > 0
	const shouldShowSearchPopover = isSearchOpen && hasSearchKeyword

	const openCartPage = () => {
		window.history.pushState({}, '', '/gio-hang')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	useEffect(() => {
		const interval = window.setInterval(() => {
			setCurrentBannerIndex((prev) => (prev + 1) % topBanners.length)
		}, 4500)

		return () => {
			window.clearInterval(interval)
		}
	}, [])

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			if (!searchContainerRef.current) {
				return
			}

			if (!searchContainerRef.current.contains(event.target as Node)) {
				setIsSearchOpen(false)
			}
		}

		document.addEventListener('mousedown', handleOutsideClick)

		return () => {
			document.removeEventListener('mousedown', handleOutsideClick)
		}
	}, [])

	return (
		<>
			<div className="bg-[#22b245] w-full relative z-0">
				<div className="overflow-hidden">
					<div
						className="flex w-full transition-transform duration-700 ease-in-out"
						style={{ transform: `translate3d(-${currentBannerIndex * 100}%, 0px, 0px)` }}
					>
						{topBanners.map((banner) => (
							<a
								key={banner.image}
								href={banner.href}
								target={banner.href.startsWith('http') ? '_blank' : undefined}
								rel={banner.href.startsWith('http') ? 'noopener noreferrer' : undefined}
								className="block h-[60px] w-full flex-shrink-0"
								style={{ backgroundColor: banner.backgroundColor }}
							>
								<img
									src={banner.image}
									alt="banner"
									className="mx-auto h-[60px] w-full max-w-[1920px] object-cover"
								/>
							</a>
						))}
					</div>
				</div>
			</div>

			<header className="sticky top-0 z-[2] w-full bg-[#2eaf42] text-white shadow-[0_6px_18px_rgba(12,90,31,0.2)]">
				<div className="mx-auto max-w-[1200px] px-4">
					<div className="flex items-center justify-between pt-4">
					<div className="flex items-center gap-2 text-sm">
						<LocalShippingIcon sx={{ fontSize: 20, color: 'white' }} />
							<span className="text-white/90">Giao hàng tại:</span>
							<span className="ml-1 font-semibold">Ho Chi Minh</span>
						</div>
						<div className="text-sm">
							<span className="text-white/95"> Tại app  - Freeship mỗi đơn - Ưu đãi đến 200.000đ</span>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-4 pb-4 pt-2">
<a href="/" className="flex h-8 w-[110px] items-center text-2xl font-black leading-none">
						<p><img src="https://res.cloudinary.com/devdnfoyh/image/upload/v1773639699/logo_ms0x2m.png" alt="" className="h-full w-full object-contain" /></p>
							<span className="ml-1 text-[#dfffa1]"></span>
						</a>

						<div ref={searchContainerRef} className="relative min-w-[320px] flex-1">
							<div className="relative flex h-10 items-center rounded-xl bg-white pl-10 pr-10">
								<SearchIcon sx={{ position: 'absolute', left: 12, fontSize: 20, color: 'rgb(120, 113, 108)' }} />
								<input
									type="text"
									placeholder="Tìm theo tên thuốc, bệnh..."
									value={searchKeyword}
									onFocus={() => setIsSearchOpen(true)}
									onChange={(event) => {
										onSearchKeywordChange?.(event.target.value)
										setIsSearchOpen(true)
									}}
									onKeyDown={(event) => {
										if (event.key === 'Escape') {
											setIsSearchOpen(false)
										}
									}}
									className="w-full bg-transparent text-sm text-slate-700 outline-none"
								/>
								<button 
									type="button" 
									onClick={() => setIsImageSearchOpen(true)}
									className="absolute right-3 flex h-full items-center text-slate-500 hover:text-green-600 transition"
								>
									<CameraAltIcon sx={{ fontSize: 20 }} />
								</button>
							</div>

							{shouldShowSearchPopover && (
								<div className="absolute left-0 right-0 top-[46px] z-[1002] max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.18)]">
									{isSearching && (
											<p className="px-2 py-2 text-sm text-slate-500">Đang tìm sản phẩm...</p>
									)}

									{!isSearching && searchResults.length === 0 && (
											<p className="px-2 py-2 text-sm text-slate-500">Không tìm thấy sản phẩm phù hợp.</p>
									)}

									{!isSearching &&
										searchResults.map((item) => (
											<button
												key={item.id}
												type="button"
												onClick={() => {
													onSearchResultSelect?.(item.id)
													setIsSearchOpen(false)
												}}
												className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[#f4faf4]"
											>
												<div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100">
													<img
														src={(typeof item.images === 'string' ? item.images.split(';')[0]?.trim() : item.images?.[0]?.trim()) || 'https://via.placeholder.com/80x80?text=SP'}
														alt={item.productName}
														className="h-full w-full object-cover"
													/>
												</div>
												<div className="min-w-0 flex-1">
													<p className="line-clamp-2 text-sm font-medium text-slate-700">{item.productName}</p>
													<p className="mt-0.5 text-xs text-[#23a840]">{formatPriceLabel(item.price)}</p>
												</div>
											</button>
										))}
								</div>
							)}
						</div>

						<button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#1f9542]">
							Tra giá thuốc
						</button>

						<CartBadge onClick={openCartPage} />

						{authUser ? (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={onOpenProfile}
									className="flex items-center gap-2 rounded-xl px-2 py-1 text-white transition hover:bg-green-700/30"
								>
									<AccountCircleIcon sx={{ fontSize: 24 }} />
									<span className="max-w-[120px] truncate">{authUser.fullName}</span>
								</button>
								<button
									type="button"
									onClick={onLogout}
									className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#1f9542]"
								>
									Đăng xuất
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={onOpenAuth}
								className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700/30"
							>
								Đăng nhập
							</button>
						)}
					</div>
				</div>
			</header>

			<ImageUploadModal 
				isOpen={isImageSearchOpen} 
				onClose={() => setIsImageSearchOpen(false)} 
				onSearchResults={(results) => {
					// You can either open the search popover with the results, 
					// or redirect to a search page. For now, let's just trigger 
					// the search behavior if possible, or navigate.
					// Since we don't have access to the parent's setState for results,
					// let's pass a custom event or navigate.
					// For simplicity, we can dispatch a custom event that the parent listens to,
					// or redirect to `/tim-kiem?image=true` and store results in sessionStorage.
					sessionStorage.setItem('imageSearchResults', JSON.stringify(results))
					window.history.pushState({}, '', '/tim-kiem?imageSearch=true')
					window.dispatchEvent(new PopStateEvent('popstate'))
				}}
			/>
		</>
	)
}

export default Header
