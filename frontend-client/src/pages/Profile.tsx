import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { updateProfile, type AuthUser } from '../services/auth.service'
import FaceCamera from '../components/ui/FaceCamera'
import { enrollFaceId, disableFaceId } from '../services/faceAuth.service'
import { getMyOrderDetail, getMyOrders, type OrderData } from '../services/order.service'
import { useAddress } from '../hooks/useAddress'
import { fetchProvinceV1ByCode, fetchProvincesV1 } from '../services/provincesApi.service'
import type { DistrictV1, ProvinceV1, WardV1 } from '../types/Province'

interface ProfileProps {
	user: AuthUser
	onClose?: () => void
	onSave: (updatedUser: AuthUser) => void
	mode?: 'modal' | 'page'
	initialSection?: ProfileSectionKey
}

type ProfileSectionKey = 'orders' | 'voucher' | 'profile' | 'address' | 'notifications' | 'policy'

const formatCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value)))}đ`

const formatDateTime = (value?: string | null) => {
	if (!value) {
		return '-'
	}

	const parsedDate = new Date(value)
	if (Number.isNaN(parsedDate.getTime())) {
		return '-'
	}

	return parsedDate.toLocaleString('vi-VN')
}

const getOrderStatusLabel = (status: OrderData['status']) => {
	if (status === 'pending') return 'Chờ xác nhận'
	if (status === 'confirmed') return 'Đã xác nhận'
	if (status === 'shipping') return 'Đang giao'
	if (status === 'completed') return 'Hoàn tất'
	if (status === 'cancelled') return 'Đã hủy'
	return status
}

const getPaymentStatusLabel = (status: OrderData['paymentStatus']) => {
	if (status === 'unpaid') return 'Chưa thanh toán'
	if (status === 'pending') return 'Đang xử lý'
	if (status === 'paid') return 'Đã thanh toán'
	if (status === 'failed') return 'Thanh toán thất bại'
	if (status === 'refunded') return 'Đã hoàn tiền'
	return status
}

const getPaymentMethodLabel = (method: OrderData['paymentMethod']) => {
	if (method === 'cod') return 'Thanh toán khi nhận hàng'
	if (method === 'bank_transfer') return 'Thanh toán VNPay'
	if (method === 'e_wallet') return 'Ví điện tử'
	if (method === 'momo') return 'MoMo'
	return method
}

const getStatusClassName = (status: OrderData['status']) => {
	if (status === 'completed') return 'bg-emerald-100 text-emerald-700'
	if (status === 'shipping') return 'bg-blue-100 text-blue-700'
	if (status === 'confirmed') return 'bg-cyan-100 text-cyan-700'
	if (status === 'cancelled') return 'bg-rose-100 text-rose-700'
	return 'bg-amber-100 text-amber-700'
}

const getPaymentStatusClassName = (status: OrderData['paymentStatus']) => {
	if (status === 'paid') return 'bg-emerald-100 text-emerald-700'
	if (status === 'failed') return 'bg-rose-100 text-rose-700'
	if (status === 'pending') return 'bg-blue-100 text-blue-700'
	if (status === 'refunded') return 'bg-slate-200 text-slate-700'
	return 'bg-slate-100 text-slate-600'
}

const toDateInputValue = (value?: string) => {
	if (!value) {
		return ''
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value
	}

	const parsedDate = new Date(value)

	if (Number.isNaN(parsedDate.getTime())) {
		return ''
	}

	return parsedDate.toISOString().slice(0, 10)
}

function Profile({ user, onClose, onSave, mode = 'modal', initialSection = 'orders' }: ProfileProps) {
	const { addresses, defaultAddress, addAddress, editAddress, chooseDefaultAddress } = useAddress()

	const [fullName, setFullName] = useState(user.fullName || '')
	const [email, setEmail] = useState(user.email || '')
	const [phone, setPhone] = useState(user.phone || '')
	const [avatar, setAvatar] = useState(user.avatar || '')
	const [address, setAddress] = useState(user.address || '')
	const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(user.dateOfBirth))
	const [recipientName, setRecipientName] = useState(defaultAddress?.recipientName || user.fullName || '')
	const [recipientPhone, setRecipientPhone] = useState(defaultAddress?.phone || user.phone || '')
	const [street, setStreet] = useState(defaultAddress?.street || '')
	const [addressNote, setAddressNote] = useState(defaultAddress?.note || '')
	const [label, setLabel] = useState<'home' | 'office' | 'other'>(defaultAddress?.label || 'home')
	const [provinceCode, setProvinceCode] = useState(defaultAddress?.provinceCode || '')
	const [districtCode, setDistrictCode] = useState(defaultAddress?.districtCode || '')
	const [wardCode, setWardCode] = useState(defaultAddress?.wardCode || '')
	const [provinces, setProvinces] = useState<ProvinceV1[]>([])
	const [districts, setDistricts] = useState<DistrictV1[]>([])
	const [wards, setWards] = useState<WardV1[]>([])
	const [isLoadingAddressData, setIsLoadingAddressData] = useState(false)
	const [selectedAddressId, setSelectedAddressId] = useState('')
	const [addressFormMode, setAddressFormMode] = useState<'create' | 'edit'>('create')
	const [isAddressDefault, setIsAddressDefault] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [showFaceCamera, setShowFaceCamera] = useState(false)
	const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(Boolean(user.faceIdEnabled))
	const [activeSection, setActiveSection] = useState<ProfileSectionKey>(initialSection)
	const isAddressAutoSelectedRef = useRef(false)
	const preferredOrderId = useMemo(() => new URLSearchParams(window.location.search).get('orderId') || '', [])
	const selectedOrderIdRef = useRef(preferredOrderId)
	const [orders, setOrders] = useState<OrderData[]>([])
	const [ordersPage, setOrdersPage] = useState(1)
	const [ordersTotalPages, setOrdersTotalPages] = useState(1)
	const [ordersTotal, setOrdersTotal] = useState(0)
	const [isLoadingOrders, setIsLoadingOrders] = useState(false)
	const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false)
	const [ordersError, setOrdersError] = useState('')
	const [selectedOrderId, setSelectedOrderId] = useState(preferredOrderId)
	const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderData | null>(null)
	const isPageMode = mode === 'page'

	const selectedAddress = useMemo(
		() => addresses.find((item) => item.id === selectedAddressId) || null,
		[addresses, selectedAddressId],
	)

	const selectedProvince = useMemo(
		() => provinces.find((item) => String(item.code) === String(provinceCode)) || null,
		[provinceCode, provinces],
	)

	const selectedDistrict = useMemo(
		() => districts.find((item) => String(item.code) === String(districtCode)) || null,
		[districtCode, districts],
	)

	const selectedWard = useMemo(
		() => wards.find((item) => String(item.code) === String(wardCode)) || null,
		[wardCode, wards],
	)

	const selectedAddressText = useMemo(() => {
		const parts = [street.trim(), selectedWard?.name || '', selectedDistrict?.name || '', selectedProvince?.name || '']
		return parts.filter(Boolean).join(', ')
	}, [street, selectedWard, selectedDistrict, selectedProvince])

	const handleSelectOrder = async (orderId: string, fallbackOrders?: OrderData[]) => {
		if (!orderId) {
			return
		}

		setSelectedOrderId(orderId)
		selectedOrderIdRef.current = orderId
		setOrdersError('')

		const sourceOrders = fallbackOrders || orders
		const matchedOrder = sourceOrders.find((item) => item.id === orderId) || null
		if (matchedOrder) {
			setSelectedOrderDetail(matchedOrder)
		}

		setIsLoadingOrderDetail(true)
		try {
			const orderDetail = await getMyOrderDetail(orderId)
			setSelectedOrderDetail(orderDetail)

			if (isPageMode) {
				const query = new URLSearchParams(window.location.search)
				query.set('section', 'orders')
				query.set('orderId', orderId)
				window.history.replaceState({}, '', `/profile?${query.toString()}`)
			}
		} catch (error) {
			if (!matchedOrder) {
				setSelectedOrderDetail(null)
			}
			setOrdersError(error instanceof Error ? error.message : 'Không thể tải chi tiết đơn hàng')
		} finally {
			setIsLoadingOrderDetail(false)
		}
	}

	const loadOrders = async (page = 1) => {
		setIsLoadingOrders(true)
		setOrdersError('')

		try {
			const result = await getMyOrders({ page, limit: 10 })
			const items = result.items || []

			setOrders(items)
			setOrdersPage(result.pagination?.page || page)
			setOrdersTotalPages(result.pagination?.totalPages || 1)
			setOrdersTotal(result.pagination?.total || items.length)

			if (items.length === 0) {
				setSelectedOrderDetail(null)
				setSelectedOrderId('')
				selectedOrderIdRef.current = ''
				return
			}

			const activeOrderId = selectedOrderIdRef.current || preferredOrderId
			const hasActiveOrder = activeOrderId && items.some((item) => item.id === activeOrderId)
			const nextSelectedOrderId = hasActiveOrder ? activeOrderId : items[0].id

			if (nextSelectedOrderId) {
				await handleSelectOrder(nextSelectedOrderId, items)
			}
		} catch (error) {
			setOrdersError(error instanceof Error ? error.message : 'Không thể tải lịch sử mua hàng')
		} finally {
			setIsLoadingOrders(false)
		}
	}

	const refreshOrders = () => {
		void loadOrders(ordersPage)
	}

	const openPreviousOrdersPage = () => {
		if (ordersPage <= 1 || isLoadingOrders) {
			return
		}

		void loadOrders(ordersPage - 1)
	}

	const openNextOrdersPage = () => {
		if (ordersPage >= ordersTotalPages || isLoadingOrders) {
			return
		}

		void loadOrders(ordersPage + 1)
	}

	useEffect(() => {
		if (activeSection !== 'orders') {
			return
		}

		void loadOrders(1)
	}, [activeSection])

	useEffect(() => {
		if (!isAddressAutoSelectedRef.current && !selectedAddressId && defaultAddress?.id) {
			setSelectedAddressId(defaultAddress.id)
			setAddressFormMode('edit')
			isAddressAutoSelectedRef.current = true
		}
	}, [defaultAddress?.id, selectedAddressId])

	useEffect(() => {
		if (selectedAddress) {
			setRecipientName(selectedAddress.recipientName || user.fullName || '')
			setRecipientPhone(selectedAddress.phone || user.phone || '')
			setStreet(selectedAddress.street || '')
			setAddressNote(selectedAddress.note || '')
			setLabel(selectedAddress.label || 'home')
			setProvinceCode(selectedAddress.provinceCode || '')
			setDistrictCode(selectedAddress.districtCode || '')
			setWardCode(selectedAddress.wardCode || '')
			setIsAddressDefault(Boolean(selectedAddress.isDefault))
			return
		}

		setRecipientName(user.fullName || '')
		setRecipientPhone(user.phone || '')
		setStreet('')
		setAddressNote('')
		setLabel('home')
		setProvinceCode('')
		setDistrictCode('')
		setWardCode('')
		setIsAddressDefault(addresses.length === 0)
	}, [selectedAddress, user.fullName, user.phone, addresses.length])

	useEffect(() => {
		const loadProvinces = async () => {
			try {
				setIsLoadingAddressData(true)
				const provinceList = await fetchProvincesV1(1)
				setProvinces(provinceList)
			} catch {
				setProvinces([])
			} finally {
				setIsLoadingAddressData(false)
			}
		}

		void loadProvinces()
	}, [])

	useEffect(() => {
		if (!provinceCode) {
			setDistricts([])
			setDistrictCode('')
			setWards([])
			setWardCode('')
			return
		}

		const loadProvinceDetail = async () => {
			try {
				setIsLoadingAddressData(true)
				const provinceData = await fetchProvinceV1ByCode(provinceCode, 3)
				const districtList = provinceData.districts || []
				setDistricts(districtList)

				const districtExists = districtList.some((item) => String(item.code) === String(districtCode))
				if (!districtExists) {
					setDistrictCode('')
					setWards([])
					setWardCode('')
				}
			} catch {
				setDistricts([])
				setDistrictCode('')
				setWards([])
				setWardCode('')
			} finally {
				setIsLoadingAddressData(false)
			}
		}

		void loadProvinceDetail()
	}, [provinceCode, districtCode])

	useEffect(() => {
		if (!districtCode) {
			setWards([])
			setWardCode('')
			return
		}

		const district = districts.find((item) => String(item.code) === String(districtCode))
		const wardList = district?.wards || []
		setWards(wardList)

		const wardExists = wardList.some((item) => String(item.code) === String(wardCode))
		if (!wardExists) {
			setWardCode('')
		}
	}, [districtCode, districts, wardCode])

	const handleCreateNewAddress = () => {
		setAddressFormMode('create')
		setSelectedAddressId('')
		setIsAddressDefault(addresses.length === 0)
	}

	const handleSelectAddressForEdit = (addressId: string) => {
		setAddressFormMode('edit')
		setSelectedAddressId(addressId)
	}

	const handleSetDefaultAddress = async (addressId: string) => {
		try {
			await chooseDefaultAddress(addressId)
			toast.success('Da cập nhật địa chỉ mặc định')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Không thể dat địa chỉ mặc định')
		}
	}

	const buildAddressPayload = () => {
		if (!recipientName.trim() || !recipientPhone.trim() || !street.trim() || !selectedProvince || !selectedDistrict || !selectedWard) {
			throw new Error('Vui lòng nhập đầy đủ thong tin địa chỉ nhận hàng')
		}

		return {
			label,
			recipientName: recipientName.trim(),
			phone: recipientPhone.trim(),
			provinceCode: String(selectedProvince.code),
			provinceName: selectedProvince.name,
			districtCode: String(selectedDistrict.code),
			districtName: selectedDistrict.name,
			wardCode: String(selectedWard.code),
			wardName: selectedWard.name,
			street: street.trim(),
			note: addressNote.trim(),
			isDefault: isAddressDefault,
		}
	}

	const handleSaveAddressOnly = async () => {
		try {
			const payload = buildAddressPayload()

			if (addressFormMode === 'edit' && selectedAddressId) {
				if (selectedAddress?.isDefault && !isAddressDefault) {
					throw new Error('Không thể bo mặc định địa chỉ hiện tại. Hay dat địa chỉ khác làm mặc định trước.')
				}

				await editAddress(selectedAddressId, payload)
				toast.success('Da cập nhật địa chỉ')
				return
			}

			await addAddress(payload)
			setAddressFormMode('create')
			setSelectedAddressId('')
			toast.success('Da them địa chỉ moi')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Lưu địa chỉ thất bại')
		}
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!fullName || !email) {
			toast.error('Vui lòng nhập đầy đủ ho ten va email')
			return
		}

		const submitProfile = async () => {
			try {
				setIsSaving(true)

				const updatedUser = await updateProfile(user.id, {
					fullName: fullName.trim(),
					email: email.trim().toLowerCase(),
					phone: phone.trim(),
					avatar: avatar.trim(),
					address: address.trim(),
					dateOfBirth,
				})

				onSave(updatedUser)
				onClose?.()
				toast.success('Cập nhật thong tin thành công')
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Cập nhật thất bại')
			} finally {
				setIsSaving(false)
			}
		}

		void submitProfile()
	}

	return (
		<div className={isPageMode ? 'w-full' : 'fixed inset-0 z-[2000] overflow-y-auto bg-slate-950/45 px-4 py-8'}>
			<div className={isPageMode ? 'w-full rounded-3xl bg-white shadow-sm' : 'mx-auto w-full max-w-3xl rounded-3xl bg-white shadow-[0_24px_65px_rgba(7,44,18,0.28)]'}>
				<div className="flex items-center justify-between rounded-t-3xl bg-[linear-gradient(120deg,#39b54a,#6adf7d)] px-6 py-5 text-white">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Thông tin cá nhân</p>
						<h2 className="mt-1 text-3xl font-black">Profile tài khoản</h2>
					</div>
					{!isPageMode && onClose && (
						<button
							type="button"
							onClick={onClose}
							className="grid h-8 w-8 place-items-center rounded-full bg-white/25 text-white"
						>
							x
						</button>
					)}
				</div>

				<div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[240px_1fr]">
					<aside className="rounded-2xl bg-[#f6faf6] p-4">
						<img
							src={avatar || 'https://ui-avatars.com/api/?name=User'}
							alt={fullName}
							className="mx-auto h-24 w-24 rounded-full border-4 border-white object-cover shadow-sm"
						/>
						<h3 className="mt-3 text-center text-lg font-bold text-slate-800">{fullName || 'Khach hang'}</h3>
						<p className="text-center text-sm text-slate-500">{phone || 'Chua co số điện thoại'}</p>

						<nav className="mt-4 space-y-1">
							{[
								{ key: 'orders', label: 'Đơn hàng của tôi' },
								{ key: 'voucher', label: 'Vi voucher' },
								{ key: 'profile', label: 'Thông tin cá nhân' },
								{ key: 'address', label: 'Địa chỉ nhận hàng' }
								// { key: 'notifications', label: 'Thông báo' },
								// { key: 'policy', label: 'Chính sách An Khang' },
							].map((item) => {
								const isActive = activeSection === item.key

								return (
									<button
										key={item.key}
										type="button"
										onClick={() => setActiveSection(item.key as ProfileSectionKey)}
										className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${isActive ? 'bg-[#e8f8ec] text-[#1f9542]' : 'text-slate-700 hover:bg-white'
											}`}
									>
										{item.label}
									</button>
								)
							})}
						</nav>
					</aside>

					{activeSection === 'profile' ? (
						<form className="space-y-4" onSubmit={handleSubmit}>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<label className="block">
									<span className="mb-1 block text-sm font-medium text-slate-600">Ho va ten</span>
									<input
										type="text"
										value={fullName}
										onChange={(event) => setFullName(event.target.value)}
										className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
									/>
								</label>

								<label className="block">
									<span className="mb-1 block text-sm font-medium text-slate-600">So dien thoai</span>
									<input
										type="tel"
										value={phone}
										onChange={(event) => setPhone(event.target.value)}
										className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
									/>
								</label>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<label className="block">
									<span className="mb-1 block text-sm font-medium text-slate-600">Email</span>
									<input
										type="email"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
									/>
								</label>

								<label className="block">
									<span className="mb-1 block text-sm font-medium text-slate-600">Ngay sinh</span>
									<input
										type="date"
										value={dateOfBirth}
										onChange={(event) => setDateOfBirth(event.target.value)}
										className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
									/>
								</label>
							</div>



							<label className="block">
								<span className="mb-1 block text-sm font-medium text-slate-600">URL avatar</span>
								<input
									type="url"
									value={avatar}
									onChange={(event) => setAvatar(event.target.value)}
									placeholder="https://..."
									className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
								/>
							</label>

							<div className="rounded-3xl border border-[#d8efdc] bg-[#f7fcf8] p-8">
								<h3 className="mb-8 text-lg font-bold text-[#1f9542]">Cài đặt bảo mật</h3>
								
								{!isFaceIdEnabled ? (
									<div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-[#86c790] bg-white/50 p-8">
										<div className="relative">
											{/* Circular ring effect */}
											<div className="absolute inset-0 animate-pulse rounded-full border-2 border-[#72d27a]" style={{ animationDuration: '2s' }}></div>
											<div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-[#86c790] bg-gradient-to-br from-[#e8f8ec] to-[#f7fcf8]">
												<svg className="h-16 w-16 text-[#1f9542]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
												</svg>
											</div>
										</div>

										<div className="text-center">
											<p className="text-lg font-bold text-slate-800">Đăng nhập bằng Face ID</p>
											<p className="mt-2 text-sm text-slate-600">Sử dụng khuôn mặt để đăng nhập nhanh và an toàn hơn</p>
										</div>

										<div className="w-full rounded-xl bg-slate-50 p-4">
											<p className="text-xs font-semibold text-slate-700 mb-3">Hướng dẫn:</p>
											<ol className="space-y-2 text-xs text-slate-600">
												<li className="flex gap-2">
													<span className="font-bold text-[#1f9542]">1.</span>
													<span>Đặt khuôn mặt vào khung camera</span>
												</li>
												<li className="flex gap-2">
													<span className="font-bold text-[#1f9542]">2.</span>
													<span>Di chuyển đầu chậm để hoàn thành vòng tròn</span>
												</li>
												<li className="flex gap-2">
													<span className="font-bold text-[#1f9542]">3.</span>
													<span>Chờ xác nhận khuôn mặt</span>
												</li>
											</ol>
										</div>

										<button
											type="button"
											onClick={() => setShowFaceCamera(true)}
											className="flex items-center justify-center gap-2 rounded-xl bg-[#1f9542] px-6 py-3 font-semibold text-white transition-all hover:bg-[#168035] hover:shadow-lg"
										>
											<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
											Bắt đầu thiết lập
										</button>
									</div>
								) : (
									<div className="flex items-center justify-between rounded-2xl border-2 border-[#86c790] bg-gradient-to-r from-[#e8f8ec] to-[#f7fcf8] p-6">
										<div className="flex items-center gap-4">
											<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1f9542]">
												<svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
												</svg>
											</div>
											<div>
												<p className="text-lg font-bold text-slate-800">Face ID đã bật</p>
												<p className="text-sm text-slate-600">Bạn có thể đăng nhập bằng khuôn mặt</p>
											</div>
										</div>
										<button
											type="button"
											onClick={() => {
												disableFaceId().then(() => {
													setIsFaceIdEnabled(false)
													toast.success('Đã tắt Face ID')
													const updatedUser = { ...user, faceIdEnabled: false }
													localStorage.setItem('clientUser', JSON.stringify(updatedUser))
													onSave(updatedUser)
												}).catch(err => toast.error(err.message))
											}}
											className="h-11 rounded-lg border border-[#86c790] bg-white px-4 text-sm font-semibold text-[#1f9542] transition-all hover:bg-slate-50"
										>
											Tắt Face ID
										</button>
									</div>
								)}
							</div>

							<div className="flex flex-wrap items-center justify-end gap-3 pt-2">
								{!isPageMode && onClose && (
									<button
										type="button"
										onClick={onClose}
										className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
									>
										Đóng
									</button>
								)}
								<button
									type="submit"
									disabled={isSaving}
									className="h-10 rounded-xl bg-[linear-gradient(120deg,#25a53e,#47c95a)] px-5 text-sm font-bold text-white"
								>
									{isSaving ? 'Dang luu...' : 'Lưu thay doi'}
								</button>
							</div>
						</form>
					) : activeSection === 'address' ? (
						<section className="rounded-2xl border border-slate-200 bg-white p-5">
							<div className="rounded-2xl border border-[#d8efdc] bg-[#f7fcf8] p-4">
								<p className="mb-3 text-sm font-bold text-[#1f9542]">Dia chi nhận hàng (API Tinh/Huyen/Xa)</p>

								<div className="mb-4 space-y-2 rounded-xl bg-white p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-semibold text-slate-700">Dia chi da luu</p>
										<button
											type="button"
											onClick={handleCreateNewAddress}
											className="rounded-lg border border-[#86c790] px-3 py-1.5 text-xs font-semibold text-[#1f9542]"
										>
											+ Them địa chỉ moi
										</button>
									</div>

									<p className="text-xs text-slate-500">
										Che do: {addressFormMode === 'edit' ? 'Dang sua địa chỉ da chon' : 'Dang tao địa chỉ moi'}
									</p>

									{addresses.length === 0 && <p className="text-xs text-slate-500">Chua co địa chỉ nao.</p>}

									{addresses.map((item) => (
										<div key={item.id} className="rounded-lg border border-slate-200 p-2">
											<p className="text-xs font-semibold text-slate-700">
												{item.recipientName} - {item.phone}
											</p>
											<p className="mt-1 text-xs text-slate-600">{item.fullAddress}</p>
											<div className="mt-2 flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => handleSelectAddressForEdit(item.id)}
													className={`rounded px-2 py-1 text-xs font-semibold ${selectedAddressId === item.id
														? 'bg-[#e9f9ed] text-[#1f9542]'
														: 'bg-slate-100 text-slate-700'
														}`}
												>
													Chon sua
												</button>

												{!item.isDefault && (
													<button
														type="button"
														onClick={() => void handleSetDefaultAddress(item.id)}
														className="rounded bg-[#fef3c7] px-2 py-1 text-xs font-semibold text-[#b45309]"
													>
														Dat mặc định
													</button>
												)}

												{item.isDefault && (
													<span className="rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#15803d]">Mac dinh</span>
												)}
											</div>
										</div>
									))}
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Nguoi nhan</span>
										<input
											type="text"
											value={recipientName}
											onChange={(event) => setRecipientName(event.target.value)}
											className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
										/>
									</label>

									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">So dien thoai nhận hàng</span>
										<input
											type="tel"
											value={recipientPhone}
											onChange={(event) => setRecipientPhone(event.target.value)}
											className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
										/>
									</label>
								</div>

								<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Tinh/Thanh</span>
										<select
											value={provinceCode}
											onChange={(event) => setProvinceCode(event.target.value)}
											className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#72d27a]"
										>
											<option value="">Chon tinh/thanh</option>
											{provinces.map((item) => (
												<option key={item.code} value={String(item.code)}>
													{item.name}
												</option>
											))}
										</select>
									</label>

									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Quan/Huyen</span>
										<select
											value={districtCode}
											onChange={(event) => setDistrictCode(event.target.value)}
											disabled={!provinceCode}
											className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#72d27a] disabled:bg-slate-100"
										>
											<option value="">Chon quan/huyen</option>
											{districts.map((item) => (
												<option key={item.code} value={String(item.code)}>
													{item.name}
												</option>
											))}
										</select>
									</label>

									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Phuong/Xa</span>
										<select
											value={wardCode}
											onChange={(event) => setWardCode(event.target.value)}
											disabled={!districtCode}
											className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#72d27a] disabled:bg-slate-100"
										>
											<option value="">Chon phuong/xa</option>
											{wards.map((item) => (
												<option key={item.code} value={String(item.code)}>
													{item.name}
												</option>
											))}
										</select>
									</label>
								</div>

								<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">So nha, ten duong</span>
										<input
											type="text"
											value={street}
											onChange={(event) => setStreet(event.target.value)}
											className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
										/>
									</label>

									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-600">Loai địa chỉ</span>
										<select
											value={label}
											onChange={(event) => setLabel(event.target.value as 'home' | 'office' | 'other')}
											className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#72d27a]"
										>
											<option value="home">Nha rieng</option>
											<option value="office">Van phong</option>
											<option value="other">Khac</option>
										</select>
									</label>
								</div>

								<label className="mt-4 block">
									<span className="mb-1 block text-sm font-medium text-slate-600">Ghi chu giao hang</span>
									<input
										type="text"
										value={addressNote}
										onChange={(event) => setAddressNote(event.target.value)}
										className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#72d27a]"
									/>
								</label>

								<label className="mt-3 flex items-center gap-2">
									<input
										type="checkbox"
										checked={isAddressDefault}
										onChange={(event) => setIsAddressDefault(event.target.checked)}
										className="h-4 w-4 rounded border-slate-300 text-[#2ea847] focus:ring-[#7bd58a]"
									/>
									<span className="text-sm text-slate-700">Dat địa chỉ nay lam mặc định</span>
								</label>

								<div className="mt-3 flex justify-end">
									<button
										type="button"
										onClick={() => void handleSaveAddressOnly()}
										className="h-10 rounded-xl border border-[#86c790] bg-white px-4 text-sm font-semibold text-[#1f9542]"
									>
										{addressFormMode === 'edit' ? 'Cập nhật địa chỉ' : 'Them địa chỉ moi'}
									</button>
								</div>

								{isLoadingAddressData && <p className="mt-2 text-xs text-slate-500">Dang tai du lieu địa chỉ...</p>}
							</div>
						</section>
					) : activeSection === 'orders' ? (
						<section className="rounded-2xl border border-slate-200 bg-white p-5">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h3 className="text-lg font-bold text-slate-800">Lịch sử mua sản phẩm</h3>
									<p className="mt-1 text-sm text-slate-500">Chọn một đơn hàng để xem chi tiết sản phẩm và thông tin liên quan.</p>
								</div>
								<button
									type="button"
									onClick={refreshOrders}
									disabled={isLoadingOrders}
									className="rounded-lg border border-[#86c790] px-3 py-1.5 text-xs font-semibold text-[#1f9542] disabled:cursor-not-allowed disabled:opacity-60"
								>
									{isLoadingOrders ? 'Đang tải...' : 'Tải lại lịch sử'}
								</button>
							</div>

							{ordersError && (
								<p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{ordersError}</p>
							)}

							<div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
									<div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
										{isLoadingOrders && orders.length === 0 && (
											<p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500">Đang tải danh sách đơn hàng...</p>
										)}

										{!isLoadingOrders && orders.length === 0 && (
											<p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500">Bạn chưa có đơn hàng nào.</p>
										)}

										{orders.map((order) => {
											const isActive = selectedOrderId === order.id

											return (
												<div
													key={order.id}
													className={`rounded-lg border p-3 transition ${isActive ? 'border-[#72d27a] bg-[#ecf9ef]' : 'border-slate-200 bg-white'
														}`}
												>
													<div className="flex items-start justify-between gap-2">
														<p className="text-sm font-bold text-slate-800">{order.orderCode}</p>
														<span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${getStatusClassName(order.status)}`}>
															{getOrderStatusLabel(order.status)}
														</span>
													</div>
													<p className="mt-1 text-xs text-slate-500">Đặt lúc: {formatDateTime(order.placedAt || order.createdAt)}</p>
													<p className="mt-1 text-sm font-semibold text-[#15803d]">Tổng tiền: {formatCurrency(order.totalAmount)}</p>
													<button
														type="button"
														onClick={() => {
															void handleSelectOrder(order.id)
														}}
														className="mt-2 w-full rounded-lg border border-[#86c790] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f9542]"
													>
														Xem chi tiết sản phẩm
													</button>
												</div>
											)
										})}
									</div>

									{ordersTotalPages > 1 && (
										<div className="mt-3 flex items-center justify-between">
											<button
												type="button"
												onClick={openPreviousOrdersPage}
												disabled={ordersPage <= 1 || isLoadingOrders}
												className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Trang trước
											</button>
											<span className="text-xs text-slate-500">
												Trang {ordersPage}/{ordersTotalPages} - {ordersTotal} đơn
											</span>
											<button
												type="button"
												onClick={openNextOrdersPage}
												disabled={ordersPage >= ordersTotalPages || isLoadingOrders}
												className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Trang sau
											</button>
										</div>
									)}
								</div>

								<div className="rounded-xl border border-slate-200 bg-white p-4">
									{isLoadingOrderDetail && !selectedOrderDetail && (
										<p className="text-sm text-slate-500">Đang tải chi tiết đơn hàng...</p>
									)}

									{!selectedOrderDetail && !isLoadingOrderDetail && (
										<p className="text-sm text-slate-500">Hãy chọn một đơn hàng để xem chi tiết sản phẩm.</p>
									)}

									{selectedOrderDetail && (
										<div className="space-y-4">
											<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
												<div>
													<h4 className="text-base font-bold text-slate-800">Chi tiết đơn {selectedOrderDetail.orderCode}</h4>
													<p className="text-xs text-slate-500">Ngày đặt: {formatDateTime(selectedOrderDetail.placedAt || selectedOrderDetail.createdAt)}</p>
												</div>
												<div className="flex flex-wrap items-center gap-2">
													<span className={`rounded px-2 py-0.5 text-xs font-semibold ${getStatusClassName(selectedOrderDetail.status)}`}>
														{getOrderStatusLabel(selectedOrderDetail.status)}
													</span>
													<span className={`rounded px-2 py-0.5 text-xs font-semibold ${getPaymentStatusClassName(selectedOrderDetail.paymentStatus)}`}>
														{getPaymentStatusLabel(selectedOrderDetail.paymentStatus)}
													</span>
												</div>
											</div>

											<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
												<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
													<p><span className="font-semibold">Phương thức:</span> {getPaymentMethodLabel(selectedOrderDetail.paymentMethod)}</p>
													<p className="mt-1"><span className="font-semibold">Thanh toán:</span> {getPaymentStatusLabel(selectedOrderDetail.paymentStatus)}</p>
													<p className="mt-1"><span className="font-semibold">Mã giao dịch:</span> {selectedOrderDetail.transactionId || '-'}</p>
													<p className="mt-1"><span className="font-semibold">Thời gian thanh toán:</span> {formatDateTime(selectedOrderDetail.paymentDate)}</p>
													<p className="mt-1"><span className="font-semibold">Tổng tiền:</span> {formatCurrency(selectedOrderDetail.totalAmount)}</p>
												</div>

												<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
													<p className="font-semibold text-slate-800">Thông tin nhận hàng</p>
													<p className="mt-1">{selectedOrderDetail.shippingAddress.recipientName} - {selectedOrderDetail.shippingAddress.phone}</p>
													<p className="mt-1">{selectedOrderDetail.shippingAddress.fullAddress}</p>
													<p className="mt-1">Ghi chú: {selectedOrderDetail.note || 'Không có'} {selectedOrderDetail.cancelReason ? `(Hủy: ${selectedOrderDetail.cancelReason})` : ''}</p>
												</div>
											</div>

											<div className="space-y-2">
												<p className="text-sm font-bold text-slate-800">Sản phẩm trong đơn</p>
												{selectedOrderDetail.items.map((item) => (
													<div key={`${selectedOrderDetail.id}-${item.productId}`} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[64px_1fr_auto]">
														<div className="h-16 w-16 overflow-hidden rounded-md bg-slate-100">
															<img
																src={item.productImage || 'https://via.placeholder.com/200x200?text=SP'}
																alt={item.productName}
																className="h-full w-full object-cover"
															/>
														</div>
														<div>
															<p className="text-sm font-semibold text-slate-800">{item.productName}</p>
															<p className="mt-1 text-xs text-slate-500">Mã sản phẩm: {item.medicineCode || '-'}</p>
															<p className="mt-1 text-xs text-slate-600">Số lượng: {item.quantity} - Đơn giá: {formatCurrency(item.unitPrice)}</p>
														</div>
														<p className="text-sm font-bold text-slate-900">{formatCurrency(item.lineTotal)}</p>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</section>
					) : (
						<section className="rounded-2xl border border-slate-200 bg-white p-5">
							<h3 className="text-lg font-bold text-slate-800">
								{activeSection === 'voucher' && 'Vi voucher'}
								{activeSection === 'notifications' && 'Thông báo'}
								{activeSection === 'policy' && 'Chính sách An Khang'}
							</h3>
							<p className="mt-2 text-sm text-slate-600">
								Tính năng này giữ nguyên luồng cũ. Bấm mục <strong>Thông tin cá nhân</strong> để mở lại form <strong>Profile tài khoản</strong>.
							</p>
							<button
								type="button"
								onClick={() => setActiveSection('profile')}
								className="mt-4 h-10 rounded-xl bg-[linear-gradient(120deg,#25a53e,#47c95a)] px-4 text-sm font-bold text-white"
							>
								Mở form Profile tài khoản
							</button>
						</section>
					)}
				</div>
			</div>

			{showFaceCamera && (
				<FaceCamera
					onClose={() => setShowFaceCamera(false)}
					onCapture={async (descriptors) => {
						try {
							await enrollFaceId(descriptors)
							setIsFaceIdEnabled(true)
							toast.success('Đăng ký Face ID thành công!')
							setShowFaceCamera(false)

							const updatedUser = { ...user, faceIdEnabled: true }
							localStorage.setItem('clientUser', JSON.stringify(updatedUser))
							onSave(updatedUser)
						} catch (err: any) {
							toast.error(err.message || 'Lỗi không xác định')
							setShowFaceCamera(false)
						}
					}}
				/>
			)}
		</div>
	)
}

export default Profile