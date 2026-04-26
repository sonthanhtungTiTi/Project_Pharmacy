const mongoose = require('mongoose')
const HealthNews = require('./src/models/healthNews.model')

const healthNewsData = [
	{
		newsId: '1',
		title: '11 tac dung cua dau tay voi suc khoe ban nen biet',
		updatedAt: '17/03/2026',
		views: 14451,
		author: 'Le Nguyen Phuong Uyen',
		heroImage:
			'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1564370/dau-tay-co-tac-dung-gi639094412853630624.jpg',
		summary:
			'Dau tay la trai cay it calo, giau chat xo va vitamin C. Neu dung dung cach, dau tay ho tro tim mach, de tieu hoa va giup da khoe hon.',
		sections: [
			{
				heading: 'Dinh duong noi bat',
				paragraphs: [
					'Dau tay chua nhieu nuoc, chat xo va vitamin C, phu hop cho nguoi can kiem soat can nang.',
					'Trai cay nay cung bo sung kali va mot luong chat chong oxy hoa tu nhien.',
				],
				image: 'https://cdn.tgdd.vn/News/1564370/11-tac-dung-cua-dau-tay-voi-suc-khoe-ban-nen-biet1-800x450.jpg',
				imageCaption: 'Dau tay la trai cay pho bien, de ket hop trong che do an hang ngay.',
			},
			{
				heading: 'Loi ich chinh cho suc khoe',
				paragraphs: ['Dung dau tay deu dan co the ho tro mien dich, tim mach va he tieu hoa.'],
				bullets: [
					'Ho tro giam viem nhe nho polyphenol',
					'Giup on dinh duong huyet sau bua an',
					'Gop phan bao ve da nho chat chong oxy hoa',
				],
				image: 'https://cdn.tgdd.vn/News/1564370/11-tac-dung-cua-dau-tay-voi-suc-khoe-ban-nen-biet5-800x450.jpg',
				imageCaption: 'Dung dung luong va deu dan se giup tang hieu qua cho suc khoe.',
			},
			{
				heading: 'Cach dung an toan',
				paragraphs: [
					'Rua sach truoc khi an, uu tien nguon goc ro rang, khong nen an qua nhieu trong mot lan.',
					'Nguoi co co dia di ung trai cay can bat dau voi luong nho de theo doi phan ung.',
				],
				image: 'https://cdn.tgdd.vn/News/1564370/11-tac-dung-cua-dau-tay-voi-suc-khoe-ban-nen-biet20-800x450.jpg',
				imageCaption: 'Rua sach va bao quan dung cach truoc khi su dung.',
			},
		],
		related: [
			{
				id: '2',
				title: 'Top 23 kem chong nang pho rong duoc khuyen dung',
				date: '14/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1534796/top-kem-chong-nang-pho-rong639092741642479141.jpg',
			},
			{
				id: '3',
				title: 'Nen mua duong an kieng loai nao cho che do lanh manh',
				date: '16/03/2026',
				image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1200&q=80',
			},
			{
				id: '4',
				title: 'La lot co tac dung gi va cach dung dung lieu',
				date: '15/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/common/News/1516538/la-lot-la-cay-than-thao-mem-moc-thanh-tung-bui.jpg',
			},
			{
				id: '6',
				title: 'Top 21 sua rua mat cho da dau mun',
				date: '12/03/2026',
				image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=1200&q=80',
			},
		],
	},
	{
		newsId: '2',
		title: 'Top 23 kem chong nang pho rong cac bac si da lieu khuyen dung',
		updatedAt: '14/03/2026',
		views: 20815,
		author: 'Nguyen Thi Ngoc Anh',
		heroImage:
			'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1534796/top-kem-chong-nang-pho-rong639092741642479141.jpg',
		summary:
			'Kem chong nang pho rong giup bao ve da khoi UVA va UVB. Bai viet tong hop tieu chi chon san pham, cach boi dung va sai lam thuong gap.',
		sections: [
			{
				heading: 'Tieu chi de chon kem chong nang',
				paragraphs: ['Nen uu tien san pham co SPF tu 30 tro len, PA+++ hoac cao hon va phu hop loai da.'],
				bullets: [
					'Da dau: uu tien ket cau mong, kho nhanh, khong gay bi',
					'Da kho: uu tien kem co duong am',
					'Da nhay cam: uu tien bo loc vat ly va khong huong lieu manh',
				],
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-1-800x450-1.jpg',
				imageCaption: 'Chon san pham theo loai da de tang do tuong thich.',
			},
			{
				heading: 'Cach boi de dat hieu qua',
				paragraphs: [
					'Boi truoc khi ra ngoai khoang 15 den 20 phut.',
					'Boi lai moi 2 gio, dac biet sau khi do mo hoi nhieu hoac rua mat.',
				],
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-3-800x450.jpg',
				imageCaption: 'Boi lai dung chu ky giup lop bao ve on dinh hon.',
			},
			{
				heading: 'Luu y khi dung hang ngay',
				paragraphs: [
					'Khong bo qua vung co, tai va mu ban tay.',
					'Ket hop non, kinh va che nang de giam tai tia UV vao da.',
				],
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-10-800x450.jpg',
				imageCaption: 'Can ket hop kem chong nang voi cac bien phap che nang co hoc.',
			},
		],
		related: [
			{
				id: '1',
				title: '11 tac dung cua dau tay voi suc khoe',
				date: '17/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1564370/dau-tay-co-tac-dung-gi639094412853630624.jpg',
			},
			{
				id: '5',
				title: 'Cam nang kem chong nang cho da dau va da nhay cam',
				date: '13/03/2026',
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-3-800x450.jpg',
			},
			{
				id: '6',
				title: 'Top 21 sua rua mat cho da dau mun',
				date: '12/03/2026',
				image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=1200&q=80',
			},
			{
				id: '3',
				title: 'Duong an kieng va cach dung an toan',
				date: '16/03/2026',
				image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1200&q=80',
			},
		],
	},
	{
		newsId: '3',
		title: 'Nen mua duong an kieng loai nao cho che do an lanh manh?',
		updatedAt: '16/03/2026',
		views: 31079,
		author: 'Huynh Dam Kim Ngan',
		heroImage: 'https://images.unsplash.com/photo-1515007917921-c4db1d7b4bf7?auto=format&fit=crop&w=1400&q=80',
		summary:
			'Duong an kieng giup giam luong duong nap vao nhung can dung dung cach. Quan trong nhat la chon loai phu hop va kiem soat tong luong su dung moi ngay.',
		sections: [
			{
				heading: 'Duong an kieng la gi',
				paragraphs: [
					'Day la nhom chat tao ngot co it hoac khong co calo, duoc dung thay duong thong thuong trong do uong va nau an.',
				],
				image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1200&q=80',
				imageCaption: 'Duong an kieng co nhieu nhom, can chon theo nhu cau su dung.',
			},
			{
				heading: 'Nhom pho bien tren thi truong',
				paragraphs: ['Moi nhom co uu diem rieng, can uu tien san pham co thong tin ro rang va huong dan cu the.'],
				bullets: [
					'Chat tao ngot tu nhien nhu stevia, monk fruit',
					'Polyol nhu erythritol, xylitol',
					'Chat tao ngot tong hop nhu sucralose, aspartame',
				],
				image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
				imageCaption: 'Moi nhom duong co uu diem rieng va cach dung khac nhau.',
			},
			{
				heading: 'Luu y khi su dung',
				paragraphs: [
					'Nguoi co benh nen, phu nu mang thai hoac dang cho con bu nen hoi y kien bac si truoc khi dung lau dai.',
					'Trang thai day bung, kho tieu co the xuat hien neu dung qua nhieu mot so loai polyol.',
				],
				image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
				imageCaption: 'Can su dung dieu do, khong nen lam dung chat tao ngot.',
			},
		],
		related: [
			{
				id: '1',
				title: 'Dau tay va cac loi ich cho suc khoe',
				date: '17/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1564370/dau-tay-co-tac-dung-gi639094412853630624.jpg',
			},
			{
				id: '2',
				title: 'Top kem chong nang pho rong duoc khuyen dung',
				date: '14/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1534796/top-kem-chong-nang-pho-rong639092741642479141.jpg',
			},
			{
				id: '4',
				title: 'La lot co tac dung gi va cach dung',
				date: '15/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/common/News/1516538/la-lot-la-cay-than-thao-mem-moc-thanh-tung-bui.jpg',
			},
			{
				id: '6',
				title: 'Sua rua mat cho da dau mun duoc khuyen dung',
				date: '12/03/2026',
				image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=1200&q=80',
			},
		],
	},
	{
		newsId: '4',
		title: 'La lot co tac dung gi? Cach dung, lieu dung, bai thuoc va tac dung phu',
		updatedAt: '15/03/2026',
		views: 98996,
		author: 'Ly Thi Thu Ha',
		heroImage:
			'https://cdnv2.tgdd.vn/mwg-static/common/News/1516538/la-lot-la-cay-than-thao-mem-moc-thanh-tung-bui.jpg',
		summary:
			'La lot la thuc pham quen thuoc trong bua an Viet. Ngoai vai tro gia vi, la lot con duoc dung trong mot so bai thuoc dan gian de ho tro giam dau nhe.',
		sections: [
			{
				heading: 'Cong dung thuong gap',
				paragraphs: [
					'La lot co tinh am, thuong duoc dung de ho tro giam kho chiu khi lanh bung hoac dau moi nhe.',
					'Trong dan gian, la lot hay duoc dung ket hop de ngam chan, xoa boi hoac nau canh.',
				],
				image: 'https://cdn.tgdd.vn/Files/2021/09/17/1385342/la-lot-co-tac-dung-gi-cach-dung-lieu-dung-va-luu-y-khi-202112241535175510.jpg',
				imageCaption: 'La lot duoc dung linh hoat trong bua an va mot so meo cham soc dan gian.',
			},
			{
				heading: 'Cach dung don gian',
				paragraphs: ['Ban co the dung la lot trong bua an hoac ngam chan buoi toi de tao cam giac de chiu.'],
				bullets: [
					'Khau phan thong thuong trong ngay nen o muc vua phai',
					'Khong nen lam dung bai thuoc dan gian thay cho dieu tri y te',
					'Neu trieu chung keo dai, nen di kham som',
				],
				image: 'https://cdn.tgdd.vn/Files/2021/09/17/1385342/la-lot-co-tac-dung-gi-cach-dung-lieu-dung-va-luu-y-khi-202112241536468367.jpg',
				imageCaption: 'Nau an dung cach giup toi uu huong vi va de tieu hon.',
			},
			{
				heading: 'Ai can than trong',
				paragraphs: [
					'Nguoi de nong trong, kich ung da day hoac co benh ly man tinh nen tham khao nhan vien y te truoc khi dung thuong xuyen.',
				],
				image: 'https://cdn.tgdd.vn/Files/2021/09/17/1385342/la-lot-co-tac-dung-gi-cach-dung-lieu-dung-va-luu-y-khi-202112241537089077.jpg',
				imageCaption: 'Can than trong neu co benh nen hoac co dia nhay cam voi thao moc.',
			},
		],
		related: [
			{
				id: '1',
				title: 'Dau tay va loi ich cho mien dich',
				date: '17/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1564370/dau-tay-co-tac-dung-gi639094412853630624.jpg',
			},
			{
				id: '3',
				title: 'Duong an kieng cho che do lanh manh',
				date: '16/03/2026',
				image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1200&q=80',
			},
			{
				id: '5',
				title: 'Cam nang kem chong nang dang rut gon',
				date: '13/03/2026',
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-3-800x450.jpg',
			},
			{
				id: '6',
				title: 'Top sua rua mat cho da dau mun',
				date: '12/03/2026',
				image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=1200&q=80',
			},
		],
	},
	{
		newsId: '5',
		title: 'Cam nang kem chong nang pho rong cho da dau va da nhay cam',
		updatedAt: '13/03/2026',
		views: 15220,
		author: 'To bien tap suc khoe T&Q',
		heroImage: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-3-800x450.jpg',
		summary:
			'Day la ban rut gon de ban chon nhanh kem chong nang theo loai da, thoi gian hoat dong va dieu kien thoi tiet. Noi dung gon, de ap dung moi ngay.',
		sections: [
			{
				heading: 'Chon theo loai da',
				paragraphs: ['Moi loai da can mot ket cau khac nhau de tranh bi, kich ung hoac bong dau qua muc.'],
				bullets: [
					'Da dau: gel hoac fluid kho nhanh',
					'Da kho: kem co bo sung duong am',
					'Da nhay cam: uu tien bo loc vat ly, it huong lieu',
				],
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-1-800x450-1.jpg',
				imageCaption: 'Ket cau phu hop giup giam kho chiu khi dung moi ngay.',
			},
			{
				heading: 'Lich boi lai de nho',
				paragraphs: [
					'Neu o ngoai troi lien tuc, nen boi lai sau moi 2 gio.',
					'Neu lam viec van phong, van nen boi lai vao buoi trua, dac biet khi ngoi gan cua kinh.',
				],
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-10-800x450.jpg',
				imageCaption: 'Boi lai dung thoi diem la yeu to quyet dinh hieu qua bao ve.',
			},
			{
				heading: 'Sai lam thuong gap',
				paragraphs: ['Nhieu nguoi bo qua co va tai, hoac chi boi mot lop qua mong nen hieu qua giam ro ret.'],
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-16-800x450.jpg',
				imageCaption: 'Khong bo qua cac vung de tiep xuc nang va boi du luong can thiet.',
			},
		],
		related: [
			{
				id: '2',
				title: 'Top 23 kem chong nang pho rong duoc khuyen dung',
				date: '14/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1534796/top-kem-chong-nang-pho-rong639092741642479141.jpg',
			},
			{
				id: '6',
				title: 'Top 21 sua rua mat cho da dau mun',
				date: '12/03/2026',
				image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=1200&q=80',
			},
			{
				id: '1',
				title: '11 tac dung cua dau tay voi suc khoe',
				date: '17/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1564370/dau-tay-co-tac-dung-gi639094412853630624.jpg',
			},
			{
				id: '3',
				title: 'Duong an kieng va cach dung dung',
				date: '16/03/2026',
				image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=1200&q=80',
			},
		],
	},
	{
		newsId: '6',
		title: 'Top 21 sua rua mat cho da dau mun duoc bac si da lieu khuyen dung',
		updatedAt: '12/03/2026',
		views: 71258,
		author: 'Nguyen Thi Thuy',
		heroImage: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1400&q=80',
		summary:
			'Da dau mun can sua rua mat lam sach du, nhung khong pha vo hang rao bao ve da. Danh sach goi y tap trung vao do diu nhe, kha nang kiem dau va tinh an toan.',
		sections: [
			{
				heading: 'Nguyen tac chon sua rua mat',
				paragraphs: [
					'Uu tien san pham co pH can bang, thanh phan lam sach diu nhe va thong tin ro cho da dau mun.',
					'Tranh dung loai tay rua qua manh vi de gay kho, kich thich tiet dau nguoc tro lai.',
				],
				image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
				imageCaption: 'Chon sua rua mat diu nhe giup giu can bang va han che kich ung.',
			},
			{
				heading: 'Quy trinh rua mat nhanh',
				paragraphs: ['Rua mat dung cach se giup giam bi tac lo chan long va han che mun viem.'],
				bullets: [
					'Rua 2 lan moi ngay, sang va toi',
					'Massage nhe 20 den 30 giay',
					'Lau kho bang khan mem sach va duong am nhe sau do',
				],
				image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80',
				imageCaption: 'Rua mat dung ky thuat se giup lam sach ma khong lam toan thuong da.',
			},
			{
				heading: 'Khi nao can doi san pham',
				paragraphs: [
					'Neu sau 2 den 4 tuan da van do rat, bong troc hoac mun nang hon, ban nen doi san pham va trao doi voi bac si da lieu.',
				],
				image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=1200&q=80',
				imageCaption: 'Theo doi phan ung cua da de dieu chinh san pham phu hop hon.',
			},
		],
		related: [
			{
				id: '2',
				title: 'Top 23 kem chong nang pho rong duoc khuyen dung',
				date: '14/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1534796/top-kem-chong-nang-pho-rong639092741642479141.jpg',
			},
			{
				id: '5',
				title: 'Cam nang kem chong nang cho da dau',
				date: '13/03/2026',
				image: 'https://cdn.tgdd.vn/News/1534796/top-23-kem-chong-nang-pho-rong-tot-nhat-cac-bac-3-800x450.jpg',
			},
			{
				id: '1',
				title: 'Tac dung cua dau tay voi suc khoe',
				date: '17/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/ankhang/News/Thumb/1564370/dau-tay-co-tac-dung-gi639094412853630624.jpg',
			},
			{
				id: '4',
				title: 'La lot co tac dung gi va luu y',
				date: '15/03/2026',
				image: 'https://cdnv2.tgdd.vn/mwg-static/common/News/1516538/la-lot-la-cay-than-thao-mem-moc-thanh-tung-bui.jpg',
			},
		],
	},
]

const seedDatabase = async () => {
	try {
		await mongoose.connect('mongodb+srv://username:password@cluster.mongodb.net/pharmacy', {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})

		// Clear existing data
		await HealthNews.deleteMany({})

		// Insert new data
		await HealthNews.insertMany(healthNewsData)

		console.log('✓ Health news data seeded successfully')
	} catch (error) {
		console.error('Seed error:', error)
	} finally {
		await mongoose.connection.close()
		process.exit(0)
	}
}

seedDatabase()
