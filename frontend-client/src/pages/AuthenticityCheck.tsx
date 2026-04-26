import PharmacyLayout from '../components/layout/layout'

function AuthenticityCheck() {
	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
				<h1 className="mb-4 text-3xl font-black text-slate-800">Tra cứu chính hãng</h1>
				<p className="mb-8 text-slate-600">Nhập mã sản phẩm hoặc quét mã QR trên bao bì để kiểm tra thông tin thuốc chính hãng.</p>
				
				<div className="space-y-6">
					<input
						type="text"
						placeholder="Nhập mã xác thực (VD: ANKHANG-12345)"
						className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none"
					/>
					<button className="h-14 w-full rounded-xl bg-[#16a34a] text-lg font-bold text-white transition hover:bg-[#15803d]">
						Kiểm tra ngay
					</button>
				</div>
			</section>
		</PharmacyLayout>
	)
}

export default AuthenticityCheck
