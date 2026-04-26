const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAccessToken = () => localStorage.getItem('clientAccessToken') || '';

export class MomoPaymentError extends Error {
  resultCode: number | null

  constructor(message: string, resultCode: number | null = null) {
    super(message)
    this.name = 'MomoPaymentError'
    this.resultCode = resultCode
  }
}

/**
 * Tạo Momo payment URL
 * @param {string} orderId - ID của order
 * @param {number} amount - Số tiền thanh toán (VND)
 * @param {string} orderInfo - Mô tả order
 */
export const createMomoPayment = async (orderId: string, amount: number, orderInfo: string = '') => {
  try {
    const response = await fetch(`${API_URL}/client/momo/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({
        orderId,
        amount,
        orderInfo,
      }),
    });

    const data = await response.json().catch(() => null);
    const resultCode = typeof data?.resultCode === 'number' ? data.resultCode : null;

    if (!response.ok || !data?.success) {
      throw new MomoPaymentError(data?.message || 'Failed to create Momo payment', resultCode);
    }

    return data;
  } catch (error) {
    console.error('Momo payment error:', error);
    throw error;
  }
};

/**
 * Check order payment status
 * Polling từ frontend để check xem Momo callback đã cập nhật payment status chưa
 */
export const checkOrderPaymentStatus = async (orderId: string) => {
  try {
    const response = await fetch(`${API_URL}/client/momo/order-status/${orderId}`, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check order status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Check order status error:', error);
    throw error;
  }
};

/**
 * Get order details
 */
export const getOrderDetails = async (orderId: string) => {
  try {
    const response = await fetch(`${API_URL}/client/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get order details');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get order details error:', error);
    throw error;
  }
};
