import { useState } from 'react'
import PharmacyLayout from '../components/layout/layout'

function HealthCheck() {
	const [height, setHeight] = useState('') // cm
	const [weight, setWeight] = useState('') // kg
	const [bmi, setBmi] = useState<number | null>(null)
	const [result, setResult] = useState('')

	const calculateBMI = () => {
		const h = parseFloat(height) / 100
		const w = parseFloat(weight)
		if (h > 0 && w > 0) {
			const score = w / (h * h)
			setBmi(parseFloat(score.toFixed(1)))

			if (score < 18.5) setResult('Gầy')
			else if (score < 24.9) setResult('Bình thường')
			else if (score < 29.9) setResult('Thừa cân')
			else setResult('Béo phì')
		}
	}

	const goHome = () => {
		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	return (
		<PharmacyLayout categories={[]} hideSidebar>
			<section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
				<h1 className="mb-6 text-3xl font-black text-slate-800">Kiểm tra sức khỏe (BMI)</h1>
				
				<div className="space-y-6">
					<div>
						<label className="mb-2 block text-sm font-bold text-slate-700">Chiều cao (cm)</label>
						<input
							type="number"
							value={height}
							onChange={(e) => setHeight(e.target.value)}
							placeholder="VD: 170"
							className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none"
						/>
					</div>

					<div>
						<label className="mb-2 block text-sm font-bold text-slate-700">Cân nặng (kg)</label>
						<input
							type="number"
							value={weight}
							onChange={(e) => setWeight(e.target.value)}
							placeholder="VD: 65"
							className="w-full rounded-xl border border-slate-200 p-4 focus:border-[#16a34a] focus:outline-none"
						/>
					</div>

					<button
						onClick={calculateBMI}
						className="h-14 w-full rounded-xl bg-[#16a34a] text-lg font-bold text-white transition hover:bg-[#15803d]"
					>
						Tính BMI
					</button>

					{bmi !== null && (
						<div className="mt-8 rounded-2xl bg-[#f0fdf4] p-6 text-center animate-in fade-in zoom-in duration-300">
							<p className="text-sm font-medium text-[#15803d] uppercase tracking-wider">Kết quả của bạn</p>
							<div className="my-2 text-5xl font-black text-[#15803d]">{bmi}</div>
							<p className="text-xl font-bold text-slate-800">Tình trạng: {result}</p>
						</div>
					)}
				</div>

				<button
					onClick={goHome}
					className="mt-8 text-sm font-semibold text-slate-500 hover:text-[#16a34a]"
				>
					← Quay về trang chủ
				</button>
			</section>
		</PharmacyLayout>
	)
}

export default HealthCheck
