import PharmacyLayout from '../components/layout/layout'

function PharmacyPartner() {
	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
				<h1 className="mb-4 text-3xl font-black text-slate-800">Đối tác nhà thuốc</h1>
				<p className="mb-8 text-slate-600">Đăng ký trở thành đối tác cung ứng dược phẩm cho hệ thống Nhà Thuốc T&Q.</p>
				<div className="space-y-6">
					<input type="text" placeholder="Tên nhà thuốc / Công ty" className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none" />
					<input type="tel" placeholder="Số điện thoại liên hệ" className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none" />
					<textarea placeholder="Địa chỉ kinh doanh" className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none" rows={3}></textarea>
					<button className="h-14 w-full rounded-xl bg-[#16a34a] text-lg font-bold text-white transition hover:bg-[#15803d]">
						Gửi thông tin hợp tác
					</button>
				</div>
			</section>
		</PharmacyLayout>
	)
}

export default PharmacyPartner
