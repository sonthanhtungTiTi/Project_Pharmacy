import PharmacyLayout from '../components/layout/layout'

function MyOrders() {
	const orders = [
		{ id: 'DH001', date: '22/04/2026', total: '250.000đ', status: 'Đang giao' },
		{ id: 'DH002', date: '20/04/2026', total: '120.000đ', status: 'Hoàn thành' },
	]

	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
				<h1 className="mb-6 text-3xl font-black text-slate-800">Đơn hàng của tôi</h1>
				<div className="space-y-4">
					{orders.map(order => (
						<div key={order.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:bg-slate-50">
							<div>
								<p className="font-bold text-slate-800">Mã đơn: {order.id}</p>
								<p className="text-sm text-slate-500">Ngày đặt: {order.date}</p>
							</div>
							<div className="text-right">
								<p className="font-bold text-[#ef4444]">{order.total}</p>
								<span className="text-xs font-medium text-[#16a34a] bg-[#f0fdf4] px-2 py-1 rounded-full">
									{order.status}
								</span>
							</div>
						</div>
					))}
				</div>
			</section>
		</PharmacyLayout>
	)
}

export default MyOrders
