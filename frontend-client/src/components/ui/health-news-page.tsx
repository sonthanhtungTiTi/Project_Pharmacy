import PharmacyLayout from '../layout/layout'

export interface HealthNewsSection {
	heading: string
	paragraphs: string[]
	bullets?: string[]
	image?: string
	imageAlt?: string
	imageCaption?: string
}

export interface HealthNewsRelated {
	id: string
	title: string
	date: string
	image: string
}

interface HealthNewsPageProps {
	title: string
	updatedAt: string
	views: number
	summary: string
	author: string
	heroImage?: string
	sections: HealthNewsSection[]
	related: HealthNewsRelated[]
	onBackHome?: () => void
}

function formatViewCount(value: number) {
	return new Intl.NumberFormat('vi-VN').format(Math.max(0, value))
}

function HealthNewsPage({
	title,
	updatedAt,
	views,
	summary,
	author,
	heroImage,
	sections,
	related,
	onBackHome,
}: HealthNewsPageProps) {
	const openHome = () => {
		if (onBackHome) {
			onBackHome()
			return
		}

		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	const openRelatedArticle = (id: string) => {
		window.history.pushState({}, '', `/ban-tin-suc-khoe/${encodeURIComponent(id)}`)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<button
				type="button"
				onClick={openHome}
				className="fixed bottom-5 right-5 z-20 rounded-full bg-[#2aa443] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-[#218a37]"
			>
				Back về trang chủ
			</button>

			<section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
				<div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
					<button type="button" onClick={openHome} className="font-semibold text-[#2aa443] hover:text-[#1f8a36]">
						Nhà thuoc T&Q
					</button>
					<span>/</span>
					<span>Bản tin sức khoẻ</span>
				</div>

				<h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">{title}</h1>

				<div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
					<p>Cập nhật: {updatedAt}</p>
					<p>Lượt xem: {formatViewCount(views)}</p>
				</div>

				<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-sm font-semibold text-slate-700">Tóm tắt nhanh</p>
					<p className="mt-2 text-[15px] leading-6 text-slate-700">{summary}</p>
				</div>

				{heroImage && (
					<figure className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
						<img src={heroImage} alt={title} className="h-auto w-full object-cover" />
					</figure>
				)}

				<div className="mt-6 space-y-6">
					{sections.map((section) => (
						<article key={section.heading}>
							<h2 className="text-xl font-bold text-slate-900">{section.heading}</h2>
							<div className="mt-2 space-y-2 text-[15px] leading-6 text-slate-700">
								{section.paragraphs.map((paragraph) => (
									<p key={paragraph}>{paragraph}</p>
								))}
							</div>
							{section.bullets && section.bullets.length > 0 && (
								<ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-6 text-slate-700">
									{section.bullets.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							)}
							{section.image && (
								<figure className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
									<img
										src={section.image}
										alt={section.imageAlt || section.heading}
										className="h-auto w-full object-cover"
									/>
									{section.imageCaption && (
										<figcaption className="px-3 py-2 text-xs text-slate-500">{section.imageCaption}</figcaption>
									)}
								</figure>
							)}
						</article>
					))}
				</div>

				<div className="mt-6 border-t border-dashed border-slate-200 pt-4 text-sm text-slate-600">
					<p>Nguoi bien tap: {author}</p>
				</div>
			</section>

			<section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
				<h3 className="text-xl font-bold text-slate-900">Cac bai lien quan</h3>
				<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{related.map((item) => (
						<article
							key={item.id}
							role="button"
							tabIndex={0}
							onClick={() => openRelatedArticle(item.id)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault()
									openRelatedArticle(item.id)
								}
							}}
							className="cursor-pointer rounded-lg border border-slate-200 p-2 transition hover:border-[#7fcf8a] hover:shadow-sm"
						>
							<img src={item.image} alt={item.title} className="h-[110px] w-full rounded-md object-cover" />
							<h4 className="mt-2 text-sm font-semibold leading-5 text-slate-800">{item.title}</h4>
							<p className="mt-1 text-xs text-slate-500">{item.date}</p>
						</article>
					))}
				</div>
			</section>
		</PharmacyLayout>
	)
}

export default HealthNewsPage
