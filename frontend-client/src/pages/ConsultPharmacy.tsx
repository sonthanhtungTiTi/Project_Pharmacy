interface ConsultPharmacyProps {
	onBackHome?: () => void
}

function ConsultPharmacy({ onBackHome }: ConsultPharmacyProps) {
	// Open the call target selector modal (handled in App.tsx)
	const openCallSelector = () => {
		window.dispatchEvent(new CustomEvent('client:open-call-selector'))
	}

	const openZaloChat = () => {
		window.open('https://zalo.me/0398668953', '_blank', 'noopener,noreferrer')
	}

	const goHome = () => {
		if (onBackHome) {
			onBackHome()
			return
		}

		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	return (
		<div className="min-h-screen bg-[#eceff3] py-6">
			<header className="mx-auto mb-4 flex w-[min(1120px,95vw)] items-center justify-between rounded-xl bg-white px-6 py-4 shadow-sm">
				<h1 className="text-[44px] font-black leading-none text-[#1368e8]">Zalo</h1>
				<p className="text-lg text-slate-700">Ngôn ngữ: <span className="font-semibold text-[#1368e8]">Tiếng Việt</span></p>
			</header>

			<main className="mx-auto grid w-[min(1120px,95vw)] grid-cols-1 gap-6 rounded-2xl bg-[#f6f7f9] p-6 shadow-sm lg:grid-cols-[1fr_300px]">
				<section>
					<div className="mb-7 flex flex-wrap items-start gap-5">
						<span className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
							<img
								src="https://res.cloudinary.com/devdnfoyh/image/upload/v1773639699/logo_ms0x2m.png"
								alt="Avatar"
								className="h-full w-full object-cover"
							/>
						</span>

						<div className="flex-1">
								<div className="mb-2 flex items-center gap-2">
									<h2 className="text-4xl font-extrabold text-slate-900">Nhà Thuốc T&Q</h2>
								<span className="inline-grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-[#ffda15] to-[#c69b01] text-white">
									✓
								</span>
							</div>
							<p className="mb-6 text-3xl text-slate-700">Y tế & Dược phẩm</p>

							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									title="Nhận tin qua Zalo"
									onClick={openZaloChat}
									className="inline-flex h-14 min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#1368e8] px-8 text-2xl font-semibold text-white hover:bg-[#0e58c5]"
								>
									<span>💬</span>
									<span>Nhận tin</span>
								</button>
								<button
									type="button"
									title="Gọi tư vấn với dược sĩ"
									onClick={openCallSelector}
									className="inline-flex h-14 min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#26a06a] px-8 text-2xl font-semibold text-white hover:bg-[#1f8555]"
								>
									<span>📹</span>
									<span>Gọi Tư Vấn</span>
								</button>
							</div>
						</div>
					</div>

					<div className="rounded-2xl bg-white p-6">
						<h3 className="mb-4 text-4xl font-bold text-slate-900">Thông tin chi tiết</h3>
						<ul className="space-y-4 text-[30px] text-slate-700">
							<li className="flex items-center gap-3">
								<span className="text-slate-500">📞</span>
								<a href="tel:0398668953" className="text-[#1368e8] hover:underline">0398668953</a>
							</li>
							<li className="flex items-center gap-3">
								<span className="text-slate-500">🕘</span>
								<span><mark className="rounded bg-transparent font-semibold text-[#26a06a]">Đang mở cửa</mark> • Đóng cửa lúc 22:00</span>
							</li>
							<li className="flex items-center gap-3">
								<span className="text-slate-500">🏠</span>
								<a
									href="http://localhost:5173"
									target="_blank"
									rel="noreferrer"
									className="text-[#1368e8] hover:underline"
								>
									http://localhost:5173
								</a>
							</li>
						</ul>

						<div className="mt-6 border-t border-slate-200 pt-6 text-[28px] leading-relaxed text-slate-700">
				Nhà thuốc An Khang chuyên bán lẻ thuốc, dược phẩm, thực phẩm chức năng, thiết bị y tế.
				 Đồng thời cung cấp thông tin hữu ích về cách phòng trị bệnh, các bác sĩ, bệnh viện,
				hội thảo liên quan về bệnh thuộc tập đoàn Thế Giới Di Động.
						</div>
					</div>
				</section>

				<figure className="rounded-2xl bg-white p-5 text-center">
					<div className="mx-auto mb-4 w-full max-w-[260px] overflow-hidden rounded-xl border border-slate-100 bg-white p-2">
						<img
							src="https://res.cloudinary.com/devdnfoyh/image/upload/v1773640568/qr_xcv9ed.jpg"
							alt="QR-Code"
							className="h-auto w-full"
						/>
					</div>
					<figcaption className="text-xl leading-8 text-slate-600">
					Mở Zalo, bấm quét QR để quét và xem trên điện thoại
					</figcaption>
				</figure>
			</main>

			<div className="mx-auto mt-5 flex w-[min(1120px,95vw)] justify-start">
				<button
					type="button"
					onClick={goHome}
					className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
				>
					Quay về trang chủ
				</button>
			</div>
		</div>
	)
}

export default ConsultPharmacy
