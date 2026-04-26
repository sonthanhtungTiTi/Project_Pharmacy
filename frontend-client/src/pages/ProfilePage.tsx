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
				initialSection="orders"
			/>
		</PharmacyLayout>
	)
}

export default ProfilePage
