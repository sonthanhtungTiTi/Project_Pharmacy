import { useEffect, useState } from 'react'
import PharmacyLayout from '../components/layout/layout'
import Profile from './Profile'
import type { AuthUser } from '../services/auth.service'

interface ProfilePageProps {
	onBackHome?: () => void
}

function ProfilePage({ onBackHome }: ProfilePageProps) {
	const [authUser, setAuthUser] = useState<AuthUser | null>(null)

	useEffect(() => {
		const userRaw = localStorage.getItem('clientUser')
		if (!userRaw) {
			setAuthUser(null)
			return
		}

		try {
			setAuthUser(JSON.parse(userRaw) as AuthUser)
		} catch {
			localStorage.removeItem('clientUser')
			setAuthUser(null)
		}
	}, [])

	const goHome = () => {
		if (onBackHome) {
			onBackHome()
			return
		}

		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	if (!authUser) {
		return (
			<PharmacyLayout categories={[]} hideSidebar>
				<section className="rounded-2xl bg-white p-6 shadow-sm">
					<h1 className="text-2xl font-black text-slate-800">Thông tin cá nhân</h1>
					<p className="mt-2 text-sm text-slate-600">Bạn cần đăng nhập để xem trang hồ sơ tài khoản.</p>
					<button
						type="button"
						onClick={goHome}
						className="mt-4 rounded-lg border border-[#16a34a] px-4 py-2 text-sm font-semibold text-[#16a34a]"
					>
						Về trang chủ
					</button>
				</section>
			</PharmacyLayout>
		)
	}

	const query = new URLSearchParams(window.location.search)
	const returnTo = query.get('returnTo')
	const section = query.get('section') as any

	const goBackToCart = () => {
		window.history.pushState({}, '', '/gio-hang')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<Profile
				user={authUser}
				onClose={goHome}
				onSave={(updatedUser) => {
					localStorage.setItem('clientUser', JSON.stringify(updatedUser))
					setAuthUser(updatedUser)
				}}
				mode="page"
				initialSection={section || 'orders'}
			/>
			{returnTo === 'cart' && (
				<div className="mt-6 flex justify-center pb-8">
					<button
						type="button"
						onClick={goBackToCart}
						className="rounded-xl bg-[#35b548] px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-95"
					>
						Quay lại giỏ hàng để tiếp tục mua
					</button>
				</div>
			)}
		</PharmacyLayout>
	)
}

export default ProfilePage
