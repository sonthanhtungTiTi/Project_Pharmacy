const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export interface EventProduct {
	id: string
	productName: string
	price: number
	originalPrice?: number
	discountLabel?: string
	image: string
	medicineCode: string
}

export interface EventData {
	title: string
	banner: string
	description: string
	articleContent?: string
	subImages?: string[]
	products: EventProduct[]
}

export const getEventBySlug = async (slug: string): Promise<EventData> => {
	// Giả lập API call - Trong thực tế sẽ gọi:
	// const res = await fetch(`${API_BASE_URL}/client/events/${slug}`)
	// return res.json()
	
	await new Promise(resolve => setTimeout(resolve, 500)) // Fake delay

	if (slug === 'online-gia-re') {
		return {
			title: 'Mừng Năm Mới - Mã Đáo An Khang',
			banner: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/2b/8c/2b8c19c32ea305b403c4802c013496be.png',
			description: 'Mua nhiều giảm nhiều - Ưu đãi lên đến 35%',
			articleContent: `
				<p class="mb-4 text-lg leading-relaxed text-slate-700">Khởi đầu năm mới với thật nhiều may mắn và sức khỏe!<br>Chương trình <strong>“Mã Đáo An Khang”</strong> mang đến hàng loạt ưu đãi hấp dẫn giúp bạn và gia đình chăm sóc sức khỏe trọn vẹn hơn.</p>
				
				<h3 class="text-xl font-bold mt-6 mb-3 text-[#16a34a]">🎯 Ưu đãi đặc biệt:</h3>
				<ul class="list-disc pl-6 mb-6 text-lg text-slate-700 space-y-2">
					<li>Giảm đến <strong>35%</strong> cho nhiều sản phẩm thiết yếu</li>
					<li>Giảm sâu <strong>30%</strong> cho dòng sản phẩm chăm sóc sắc đẹp</li>
					<li>Áp dụng cho cả mua online và tại cửa hàng</li>
				</ul>

				<h3 class="text-xl font-bold mt-6 mb-3 text-[#16a34a]">🌟 VÌ SAO KHÔNG NÊN BỎ LỠ?</h3>
				<ul class="list-disc pl-6 mb-6 text-lg text-slate-700 space-y-2">
					<li>Giá tốt đầu năm – hiếm khi lặp lại</li>
					<li>Sản phẩm chính hãng, đảm bảo chất lượng</li>
					<li>Mua càng nhiều – ưu đãi càng lớn</li>
				</ul>

				<div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
					<h4 class="font-bold text-red-700 mb-2">⚠️ LƯU Ý</h4>
					<ul class="list-disc pl-5 text-red-600 space-y-1">
						<li>Chương trình áp dụng trong thời gian giới hạn</li>
						<li>Số lượng ưu đãi có hạn</li>
						<li>Sản phẩm không thay thế thuốc chữa bệnh</li>
					</ul>
				</div>

				<h3 class="text-xl font-bold mt-6 mb-3 text-center text-[#16a34a]">🎯 HÀNH ĐỘNG NGAY</h3>
				<p class="text-lg text-center leading-relaxed text-slate-700 mb-4">Đừng để năm mới trôi qua mà bỏ lỡ cơ hội chăm sóc sức khỏe với chi phí tốt nhất.</p>
				<p class="text-xl font-bold text-center text-[#ef4444]">👉 Mua ngay – Ưu đãi đang chờ bạn!</p>
			`,
			subImages: [
				'https://img.tgdd.vn/imgt/ankhang/f_webp,fit_outside,quality_95/https://cdn.tgdd.vn/Products/Images/10243/144589/otibone-1500-mac-dinh-2.jpg'
			],
			products: [
				{
					id: '67b36a1820685601d670404f',
					productName: 'Bông tẩy trang CALLA - Mềm mại, an toàn cho da',
					price: 25000,
					originalPrice: 35000,
					discountLabel: '-35%',
					image: 'https://cdn.tgdd.vn/Products/Images/10243/144589/otibone-1500-mac-dinh-2.jpg',
					medicineCode: '105605'
				},
				{
					id: '67b36a1820685601d6704050',
					productName: 'Nước uống Collagen ALFE - Chống lão hóa',
					price: 450000,
					originalPrice: 600000,
					discountLabel: '-25%',
					image: 'https://img.tgdd.vn/imgt/ankhang/f_webp,fit_outside,quality_95/https://cdn.tgdd.vn/Products/Images/10243/144589/otibone-1500-mac-dinh-2.jpg',
					medicineCode: '105606'
				},
				{
					id: '67b36a1820685601d6704051',
					productName: 'Thực phẩm chức năng chăm sóc sức khỏe',
					price: 150000,
					originalPrice: 200000,
					discountLabel: '-25%',
					image: 'https://cdn.tgdd.vn/Products/Images/10243/144589/otibone-1500-mac-dinh-2.jpg',
					medicineCode: '105607'
				}
			]
		}
	}

	if (slug === 'flashsale') {
		return {
			title: 'Tuần Lễ Hạnh Phúc - Flash Sale 50%',
			banner: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/ad/a9/ada975d94ec04c14c1e19ab03aa27fcc.png',
			description: 'Khỏe mạnh mỗi ngày - Ưu đãi trao tay',
			articleContent: `
				<p class="mb-4 text-lg leading-relaxed text-slate-700">Một tuần đặc biệt dành riêng cho bạn và gia đình – nơi sức khỏe được quan tâm đúng cách với mức giá chưa từng có!</p>
				<p class="mb-6 text-lg leading-relaxed text-slate-700">Trong khuôn khổ chương trình <strong>“Tuần lễ Hạnh Phúc”</strong>, hàng loạt sản phẩm chăm sóc sức khỏe, thực phẩm bổ sung và dinh dưỡng cao cấp đang được giảm giá sâu lên đến <strong>50%</strong>.</p>
				
				<h3 class="text-xl font-bold mt-6 mb-3 text-[#ef4444]">🔥 Ưu đãi nổi bật:</h3>
				<ul class="list-disc pl-6 mb-6 text-lg text-slate-700 space-y-2">
					<li>Giảm giá trực tiếp đến <strong>50%</strong> cho nhiều sản phẩm hot</li>
					<li><strong>FREESHIP</strong> toàn quốc cho đơn hàng từ 150.000đ</li>
					<li>Số lượng có hạn – ưu đãi kết thúc sớm khi hết hàng</li>
				</ul>

				<div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
					<h4 class="font-bold text-red-700 mb-2">⚠️ LƯU Ý QUAN TRỌNG</h4>
					<ul class="list-disc pl-5 text-red-600 space-y-1">
						<li>Sản phẩm không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh</li>
						<li>Chương trình có thể kết thúc sớm khi số lượng ưu đãi đã hết</li>
					</ul>
				</div>

				<h3 class="text-xl font-bold mt-6 mb-3 text-center text-[#ef4444]">🚀 ĐỪNG BỎ LỠ!</h3>
				<p class="text-lg text-center leading-relaxed text-slate-700 mb-4">Một tuần – một cơ hội để chăm sóc sức khỏe với chi phí tối ưu nhất.</p>
				<p class="text-xl font-bold text-center text-[#ef4444]">👉 Mua ngay hôm nay để không bỏ lỡ ưu đãi 50%!</p>
			`,
			subImages: [
				'https://cdnv2.tgdd.vn/mwg-static/ankhang/Banner/ad/a9/ada975d94ec04c14c1e19ab03aa27fcc.png'
			],
			products: [
				{
					id: '67b36a1820685601d6704060',
					productName: 'Sữa dinh dưỡng Ensure Gold',
					price: 750000,
					originalPrice: 850000,
					discountLabel: '-12%',
					image: 'https://cdn.tgdd.vn/Products/Images/10243/144589/otibone-1500-mac-dinh-2.jpg',
					medicineCode: 'ENSURE_01'
				},
				{
					id: '67b36a1820685601d6704061',
					productName: 'Viên uống bổ sung vitamin tổng hợp',
					price: 250000,
					originalPrice: 500000,
					discountLabel: '-50%',
					image: 'https://img.tgdd.vn/imgt/ankhang/f_webp,fit_outside,quality_95/https://cdn.tgdd.vn/Products/Images/10243/144589/otibone-1500-mac-dinh-2.jpg',
					medicineCode: 'VITA_02'
				},
				{
					id: '67b36a1820685601d6704062',
					productName: 'Thực phẩm bổ sung collagen & làm đẹp',
					price: 350000,
					originalPrice: 700000,
					discountLabel: '-50%',
					image: 'https://cdn.tgdd.vn/Products/Images/10243/144589/otibone-1500-mac-dinh-2.jpg',
					medicineCode: 'COL_03'
				}
			]
		}
	}

	throw new Error('Sự kiện không tồn tại')
}
