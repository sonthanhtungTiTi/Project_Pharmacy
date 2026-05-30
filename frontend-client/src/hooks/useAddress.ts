import { useCallback, useEffect, useState } from 'react'
import {
	createMyAddress,
	deleteMyAddress,
	getMyAddresses,
	setMyDefaultAddress,
	updateMyAddress,
	type AddressItem,
	type AddressPayload,
} from '../services/address.service'

export const useAddress = () => {
	const [addresses, setAddresses] = useState<AddressItem[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')

	const refreshAddresses = useCallback(async () => {
		const accessToken = localStorage.getItem('clientAccessToken') || ''

		if (!accessToken) {
			setAddresses([])
			setError('')
			return []
		}

		try {
			setIsLoading(true)
			setError('')
			const data = await getMyAddresses()
			setAddresses(data)
			return data
		} catch (apiError) {
			const message = apiError instanceof Error ? apiError.message : 'Khong the tai danh sach dia chi'
			setError(message)
			return []
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		void refreshAddresses()
	}, [refreshAddresses])

	const addAddress = useCallback(
		async (payload: AddressPayload) => {
			const item = await createMyAddress(payload)
			await refreshAddresses()
			return item
		},
		[refreshAddresses],
	)

	const editAddress = useCallback(
		async (addressId: string, payload: Partial<AddressPayload>) => {
			const item = await updateMyAddress(addressId, payload)
			await refreshAddresses()
			return item
		},
		[refreshAddresses],
	)

	const removeAddress = useCallback(
		async (addressId: string) => {
			const result = await deleteMyAddress(addressId)
			await refreshAddresses()
			return result
		},
		[refreshAddresses],
	)

	const chooseDefaultAddress = useCallback(
		async (addressId: string) => {
			const item = await setMyDefaultAddress(addressId)
			await refreshAddresses()
			return item
		},
		[refreshAddresses],
	)

	const defaultAddress = addresses.find((address) => address.isDefault) || null

	return {
		addresses,
		defaultAddress,
		isLoading,
		error,
		refreshAddresses,
		addAddress,
		editAddress,
		removeAddress,
		chooseDefaultAddress,
	}
}
