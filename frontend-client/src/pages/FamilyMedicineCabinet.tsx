import PharmacyLayout from '../components/layout/layout'

function FamilyMedicineCabinet() {
	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-black text-slate-800">Tủ thuốc gia đình</h1>
					<button className="rounded-xl bg-[#16a34a] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#15803d]">
						+ Thêm thuốc mới
					</button>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="rounded-xl border border-slate-100 p-6 shadow-sm">
						<h3 className="text-xl font-bold text-slate-800">Paracetamol 500mg</h3>
						<p className="text-slate-500 mt-2">Sáng: 1 viên (Sau ăn)</p>
						<div className="mt-4 flex items-center gap-2">
							<span className="text-xs font-bold bg-[#fefce8] text-[#854d0e] px-2 py-1 rounded">Nhắc nhở: 08:00</span>
						</div>
					</div>
				</div>
			</section>
		</PharmacyLayout>
	)
}

export default FamilyMedicineCabinet
