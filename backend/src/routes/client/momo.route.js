const express = require('express');
const router = express.Router();
const { createMomoPayment, handleMomoCallback } = require('../../services/client/momo.service');
const Order = require('../../models/order.model');
const Cart = require('../../models/cart.model');
const { authenticateClientJwt } = require('../../middleware/auth.middleware');

const parseMomoExtraData = (value) => {
  if (!value || typeof value !== 'string') {
    return {};
  }

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * POST /api/client/momo/create-payment
 * Bước 1: User chọn Momo → Frontend gọi API này
 * → Backend tạo order + Momo payment URL
 * → Redirect user đến Momo
 */
router.post('/create-payment', authenticateClientJwt, async (req, res) => {
  try {
    const { orderId, orderInfo } = req.body;

    // Validate
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Missing orderId' });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.auth.userId,
    }).select('orderCode totalAmount paymentStatus');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.paymentStatus === 'paid' || order.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Cannot create payment for paid or cancelled order',
      });
    }

    const fallbackRedirectUrl = 'http://localhost:5173/checkout/momo-return';
    const fallbackIpnUrl = `${req.protocol}://${req.get('host')}/api/client/momo/callback`;
    const redirectUrl = (process.env.MOMO_REDIRECT_URL || fallbackRedirectUrl).trim();
    const ipnUrl = (process.env.MOMO_IPN_URL || fallbackIpnUrl).trim();

    const momoPaymentData = {
      orderId: String(order._id),
      amount: order.totalAmount,
      orderInfo: orderInfo || `Thanh toan don hang #${order.orderCode}`,
      redirectUrl,
      ipnUrl,
      extraData: {
        userId: req.auth.userId,
        orderId: String(order._id),
        orderCode: order.orderCode,
      },
    };

    // Call Momo service
    const momoResponse = await createMomoPayment(momoPaymentData);

    if (momoResponse.success) {
      // Cập nhật order status thành 'pending_payment'
      await Order.updateOne(
        { _id: order._id },
        { paymentStatus: 'pending', paymentMethod: 'momo' }
      );

      res.json({
        success: true,
        payUrl: momoResponse.payUrl, // Frontend sẽ redirect đến URL này
        orderId: String(order._id),
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create Momo payment',
      });
    }
  } catch (error) {
    const momoResultCode = error?.momoResultCode ?? null;
    const baseMessage = error?.message || 'Failed to create Momo payment';
    const retryHint =
      Number(momoResultCode) === 98
        ? 'MoMo dang ban tao QR, vui long thu lai sau vai giay.'
        : '';

    console.error('Create Momo payment error:', baseMessage);
    res.status(502).json({
      success: false,
      message: retryHint ? `${baseMessage}. ${retryHint}` : baseMessage,
      resultCode: momoResultCode,
    });
  }
});

/**
 * POST /api/client/momo/callback
 * Webhook từ Momo (server-to-server)
 * Momo sẽ gửi kết quả thanh toán tới đây
 */
router.post('/callback', async (req, res) => {
  try {
    const momoData = req.body;
    const extraData = parseMomoExtraData(momoData.extraData);

    // Handle callback
    const result = handleMomoCallback(momoData);
    const targetOrderId = extraData.orderId || result.orderId;

    if (!targetOrderId) {
      return res.status(204).send();
    }

    if (result.success) {
      // Thanh toán thành công → cập nhật payment
      await Order.updateOne(
        { _id: targetOrderId },
        {
          paymentStatus: 'paid',
          transactionId: result.transactionId,
          paymentDate: new Date(),
        }
      );

      // Clear items from user's cart after successful payment
      try {
        const order = await Order.findById(targetOrderId);
        if (order) {
          const cart = await Cart.findOne({ userId: order.userId });
          if (cart) {
            const orderProductIds = order.items.map((item) => String(item.productId));
            cart.items = cart.items.filter((item) => !orderProductIds.includes(String(item.productId)));
            await cart.save();
          }
        }
      } catch (cartError) {
        console.error('Failed to clear cart after Momo success:', cartError.message);
      }

      console.log(`✅ MoMo success for order ${targetOrderId}, awaiting admin confirmation`);
    } else {
      // Thất bại → hủy đơn tự động
      await Order.updateOne(
        { _id: targetOrderId },
        { 
          paymentStatus: 'failed',
          status: 'cancelled',
          cancelReason: 'Thanh toán MoMo thất bại'
        }
      );
      console.log(`❌ MoMo failed for order ${targetOrderId} - AUTO CANCELLED`);
    }

    // Always return 204 to MoMo when callback is received
    return res.status(204).send();
  } catch (error) {
    console.error('Momo callback error:', error.message);
    return res.status(204).send();
  }
});

/**
 * GET /api/client/momo/order-status/:orderId
 * Frontend polling → check xem order đã thanh toán chưa
 */
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).select(
      'orderCode totalAmount paymentStatus paymentMethod transactionId paymentDate updatedAt'
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      orderId: orderId,
      orderCode: order.orderCode,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus, // 'unpaid' | 'pending' | 'paid' | 'failed'
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
      paymentDate: order.paymentDate,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error('Get order status error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
