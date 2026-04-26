import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { useCart } from '../../hooks/useCart'

interface CartBadgeProps {
	onClick?: () => void
}

function CartBadge({ onClick }: CartBadgeProps) {
	const { cartCount } = useCart()

	return (
		<button
			type="button"
			onClick={onClick}
			className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700/30"
		>
			<ShoppingCartIcon sx={{ fontSize: 20 }} />
			<span>Giỏ thuốc</span>
			{cartCount > 0 && (
				<span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-[#ef4444] px-1.5 py-0.5 text-center text-xs font-bold leading-none text-white">
					{cartCount > 99 ? '99+' : cartCount}
				</span>
			)}
		</button>
	)
}

export default CartBadge
