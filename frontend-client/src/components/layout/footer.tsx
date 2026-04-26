function Footer() {
	const infoColumns = [
		{
		title: 'HỆ THỐNG NHÀ THUỐC T&Q',
		items: ['Hệ thống 414 NHÀ THUỐC T&Q', 'Nội quy NHÀ THUỐC T&Q', 'Chất lượng phục vụ'],
		},
		{
			title: 'HỖ TRỢ KHÁCH HÀNG',
			items: [
				'Điều kiện giao dịch chung',
				'Hướng dẫn mua hàng online',
				'Chính sách giao hàng',
				'Chính sách thanh toán',
				'Chính sách đổi trả, bảo hành',
				'Tích điểm Quà tặng VIP',
			],
		},
		{
			title: 'VỀ NHÀ THUỐC T&Q ',
			items: ['Giới thiệu công ty', 'Ban Điều hành', 'Chính sách xử lý dữ liệu cá nhân', 'Chính sách cookies'],
		},
		{
			title: 'BỆNH VIỆN',
			items: ['Tất cả bệnh viện'],
		},
	]

	const highlights = [
		{ title: 'CAM KẾT 100%', desc: 'Thuốc chính hãng', symbol: 'CK' },
		{ title: 'MIỄN PHÍ GIAO HÀNG', desc: 'Đơn hàng từ 150.000đ', symbol: 'GH' },
		{ title: 'GIAO NHANH 2 GIỜ', desc: 'Xem chi tiết', symbol: '2H' },
		{ title: 'ĐỔI TRẢ TRONG 30 NGÀY', desc: 'Xem chi tiết', symbol: 'DT' },
	]

	return (
		<footer className="mt-8 bg-white text-[14px] text-slate-700">
			<section className="bg-[#e8f3e7]">
				<div className="relative mx-auto max-w-[1200px] overflow-hidden px-4 py-8 lg:px-16 lg:py-9">
					<div className="grid grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-8 md:pr-[330px]">
						{highlights.map((item) => (
							<div key={item.title} className="flex items-center gap-4">
								<div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[#35b548] text-xs font-bold text-white">
									{item.symbol}
								</div>
								<div className="flex flex-col gap-1">
									<h4 className="text-[16px] font-semibold uppercase text-slate-800">{item.title}</h4>
									<p className="text-[15px] text-slate-600">{item.desc}</p>
								</div>
							</div>
						))}
					</div>

					<img
						src="https://cdnv2.tgdd.vn/webmwg/production-fe/ankhang/public/static/images/bg_footer.png"
						alt="footer"
						className="pointer-events-none absolute -right-2 bottom-0 hidden h-[248px] w-[446px] object-cover lg:block"
					/>
				</div>
			</section>

			<section className="mx-auto max-w-[1200px] px-4 lg:px-0">
				<div className="grid grid-cols-1 gap-4 border-b border-slate-200 py-6 md:grid-cols-[260px_repeat(4,1fr)] md:gap-3">
					<div>
					<h4 className="mb-4 text-[16px] font-semibold uppercase text-slate-800">TỔNG ĐÀI</h4>
					<p className="font-semibold leading-7">
						Gọi mua: <span className="text-[#1e6fd9]">1900 1572</span>
						<span className="block font-medium text-slate-600">(8:00 - 21:30)</span>
					</p>
					<p className="font-semibold leading-7">
						Khiếu nại: <span className="text-[#1e6fd9]">1900 1275</span>
							<span className="block font-medium text-slate-600">(8:00 - 21:30)</span>
						</p>
					</div>

					{infoColumns.map((column) => (
						<div key={column.title}>
							<h4 className="mb-4 text-[16px] font-semibold uppercase text-slate-800">{column.title}</h4>
							<ul>
								{column.items.map((item) => (
									<li key={item} className="leading-7 text-slate-700">
										{item}
									</li>
								))}
							</ul>
						</div>
					))}

					<div>
						<h4 className="mb-4 text-[16px] font-semibold uppercase text-slate-800">KẾT NỐI VỚI CHÚNG TÔI</h4>
						<div className="flex items-center gap-3">
							<span className="grid h-7 min-w-7 place-items-center rounded bg-[#2579ff] px-2 text-xs font-bold text-white">Zalo</span>
							<span className="grid h-7 w-7 place-items-center rounded bg-[#1877f2] text-xs font-bold text-white">f</span>
							<span className="grid h-7 w-7 place-items-center rounded bg-[#ff0000] text-xs font-bold text-white">YT</span>
						</div>
					</div>

					<div>
						<h4 className="mb-4 text-[16px] font-semibold uppercase text-slate-800">CHỨNG NHẬN BỞI</h4>
						<div className="flex items-center gap-3">
							<span className="rounded border border-[#3aa0ff] px-2 py-1 text-[11px] font-semibold text-[#1877f2]">ĐÃ THÔNG BÁO</span>
							<span className="rounded border border-[#4fbb5b] px-2 py-1 text-[11px] font-semibold text-[#1c8f2e]">DMCA</span>
						</div>
					</div>
				</div>

				<p className="py-4 text-[14px] leading-6 text-slate-600">
					Công ty Cổ phần Dược phẩm Pharma. GPDKKD: 0314587300 do Sở KH & DT TP.HCM cấp ngày
					21/08/2017. Trụ sở chính: 128, Trần Quang Khải, P. Tân Định, TP.HCM. Giấy phép thiết lập trang
					thông tin điện tử tổng hợp số 03/GP-STTTT ngày 21/02/2023 cấp bởi Sở Thông tin và Truyền thông
					TP.HCM. Địa chỉ liên hệ và gửi chứng từ: Lô T2-1.2, Đường D1, P. Tăng Nhơn Phú, TP.HCM. Email:
					cskh@nhathuocankhang.com. Chịu trách nhiệm nội dung: Huỳnh Văn Tót.
				</p>

				<div className="pb-6 text-center">
					<p className="mb-3 text-sm text-slate-600">Ghé thăm các website khác của tập đoàn MWG</p>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<span className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-yellow-300">thegioididong</span>
						<span className="rounded-md bg-[#0a8f43] px-3 py-1.5 text-xs font-semibold text-white">dienmayxanh</span>
						<span className="rounded-md bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white">topzone</span>
						<span className="rounded-md bg-[#e11d48] px-3 py-1.5 text-xs font-semibold text-white">avaKids</span>
						<span className="rounded-md bg-[#15803d] px-3 py-1.5 text-xs font-semibold text-white">bachhoaxanh</span>
						<span className="rounded-md bg-[#f59e0b] px-3 py-1.5 text-xs font-semibold text-blue-800">erablue</span>
					</div>
				</div>
			</section>
		</footer>
	)
}

export default Footer
