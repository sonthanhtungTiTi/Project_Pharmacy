import { useCallback, useEffect, useState } from 'react'
import {
	addToCart,
	clearCart,
	getCart,
	removeCartItem,
	type CartData,
	updateCartItemQuantity,
} from '../services/cart.service'

const CART_UPDATED_EVENT = 'cart:updated'

export const notifyCartUpdated = () => {
	window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

const emptyCart: CartData = {
	userId: '',
	items: [],
	totalQuantity: 0,
	totalAmount: 0,
	updatedAt: null,
}

export const useCart = () => {
	const [cart, setCart] = useState<CartData>(emptyCart)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')

	const refreshCart = useCallback(async () => {
		const accessToken = localStorage.getItem('clientAccessToken') || ''

		if (!accessToken) {
			setCart(emptyCart)
			setError('')
			return emptyCart
		}

		try {
			setIsLoading(true)
			setError('')
			const data = await getCart()
			setCart(data)
			return data
		} catch (apiError) {
			const message = apiError instanceof Error ? apiError.message : 'Không thể tải giỏ hàng'
			setError(message)
			setCart(emptyCart)
			return emptyCart
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		void refreshCart()

		const handleCartUpdated = () => {
			void refreshCart()
		}

		const handleStorage = (event: StorageEvent) => {
			if (event.key === 'clientAccessToken') {
				void refreshCart()
			}
		}

		window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated)
		window.addEventListener('storage', handleStorage)

		return () => {
			window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated)
			window.removeEventListener('storage', handleStorage)
		}
	}, [refreshCart])

	const addItem = useCallback(
		async (productId: string, quantity = 1) => {
			const data = await addToCart(productId, quantity)
			setCart(data)
			setError('')
			notifyCartUpdated()
			return data
		},
		[],
	)

	const updateItem = useCallback(async (productId: string, quantity: number) => {
		const data = await updateCartItemQuantity(productId, quantity)
		setCart(data)
		setError('')
		notifyCartUpdated()
		return data
	}, [])

	const removeItem = useCallback(async (productId: string) => {
		const data = await removeCartItem(productId)
		setCart(data)
		setError('')
		notifyCartUpdated()
		return data
	}, [])

	const clearAllItems = useCallback(async () => {
		const data = await clearCart()
		setCart(data)
		setError('')
		notifyCartUpdated()
		return data
	}, [])

	return {
		cart,
		cartCount: cart.totalQuantity,
		isLoading,
		error,
		refreshCart,
		addItem,
		updateItem,
		removeItem,
		clearAllItems,
	}
}
