import PharmacyLayout from '../components/layout/layout'

function DoctorAppointment() {
	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
				<h1 className="mb-6 text-3xl font-black text-slate-800">Đặt lịch khám bệnh</h1>
				<div className="space-y-6">
					<div>
						<label className="mb-2 block text-sm font-bold text-slate-700">Chọn bác sĩ</label>
						<select className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none">
							<option>Bác sĩ Nội tổng quát</option>
							<option>Bác sĩ Da liễu</option>
							<option>Bác sĩ Nhi khoa</option>
						</select>
					</div>
					<div>
						<label className="mb-2 block text-sm font-bold text-slate-700">Ngày khám</label>
						<input type="date" className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none" />
					</div>
					<button className="h-14 w-full rounded-xl bg-[#16a34a] text-lg font-bold text-white transition hover:bg-[#15803d]">
						Xác nhận đặt lịch
					</button>
				</div>
			</section>
		</PharmacyLayout>
	)
}

export default DoctorAppointment
