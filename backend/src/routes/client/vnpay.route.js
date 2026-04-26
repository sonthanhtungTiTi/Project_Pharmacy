const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Order = require('../../models/order.model');
const Cart = require('../../models/cart.model');
const { authenticateClientJwt } = require('../../middleware/auth.middleware');

const router = express.Router();

const VNPAY_SANDBOX_DEFAULTS = {
  tmnCode: 'DH2F13SW',
  hashSecret: 'NXZM3DWFR0LC4R5VBK850JZS1UE9KI6F',
};

const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

const VNPAY_CONFIG = {
  tmnCode: String(process.env.VNPAY_TMN_CODE || (!isProduction ? VNPAY_SANDBOX_DEFAULTS.tmnCode : '')).trim(),
  hashSecret: String(process.env.VNPAY_HASH_SECRET || (!isProduction ? VNPAY_SANDBOX_DEFAULTS.hashSecret : '')).trim(),
  paymentUrl: String(process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').trim(),
  returnUrl: String(process.env.VNPAY_RETURN_URL || '').trim(),
  frontendReturnUrl: String(process.env.VNPAY_FRONTEND_RETURN_URL || 'http://localhost:5173/checkout/vnpay-return').trim(),
};

const RESPONSE_MESSAGE_MAP = {
  '00': 'Thanh toan thanh cong',
  '01': 'Khong tim thay don hang',
  '02': 'Don hang da duoc cap nhat thanh toan',
  '04': 'So tien khong hop le',
  '24': 'Giao dich bi huy bo',
  '51': 'Tai khoan khong du so du',
  '65': 'Tai khoan vuot qua han muc giao dich trong ngay',
  '75': 'Ngan hang thanh toan dang bao tri',
  '79': 'Nhap sai mat khau thanh toan qua so lan',
  '97': 'Chu ky khong hop le',
  '99': 'Loi khong xac dinh',
};

const getResponseMessage = (code) => RESPONSE_MESSAGE_MAP[String(code || '')] || 'Giao dich dang duoc xu ly';

const firstValue = (value) => {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
};

const normalizeText = (value, maxLength = 255) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const formatVnpDate = (date = new Date()) => {
  // VNPAY expects GMT+7 timestamp format: yyyyMMddHHmmss
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnDate.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
};

const parseVnpDate = (value) => {
  const raw = firstValue(value);
  if (!/^\d{14}$/.test(raw)) {
    return null;
  }

  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const hour = Number(raw.slice(8, 10));
  const minute = Number(raw.slice(10, 12));
  const second = Number(raw.slice(12, 14));

  if ([year, month, day, hour, minute, second].some((item) => Number.isNaN(item))) {
    return null;
  }

  const parsed = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeLanguage = (value) => {
  const language = firstValue(value).toLowerCase();
  return language === 'en' ? 'en' : 'vn';
};

const normalizeBankCode = (value) => {
  const bankCode = firstValue(value).toUpperCase().replace(/[^A-Z0-9_]/g, '');
  return bankCode.slice(0, 20);
};

const parseAmount = (value) => {
  const raw = Number(firstValue(value));
  if (!Number.isFinite(raw)) {
    return 0;
  }

  return Math.max(0, Math.round(raw / 100));
};

const getClientIp = (req) => {
  const forwardedFor = firstValue(req.headers['x-forwarded-for']);
  const rawIp = forwardedFor || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  const ip = String(rawIp).split(',')[0].trim();
  return ip.replace(/^::ffff:/, '') || '127.0.0.1';
};

const resolveBackendReturnUrl = (req) => {
  if (VNPAY_CONFIG.returnUrl) {
    return VNPAY_CONFIG.returnUrl;
  }

  return `${req.protocol}://${req.get('host')}/api/client/vnpay/return`;
};

const resolveFrontendReturnUrl = () => {
  const fallbackUrl = 'http://localhost:5173/checkout/vnpay-return';

  try {
    return new URL(VNPAY_CONFIG.frontendReturnUrl || fallbackUrl);
  } catch {
    return new URL(fallbackUrl);
  }
};

/**
 * Sắp xếp object theo thứ tự alphabet của key (A-Z)
 * @param {Object} obj 
 * @returns {Object}
 */
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

const buildVnpayStrings = (params) => {
  const sortedKeys = Object.keys(params || {}).sort();
  const signDataParts = [];
  const queryStringParts = [];

  sortedKeys.forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && String(value) !== '') {
      // signData: key=value (no encoding)
      signDataParts.push(`${key}=${value}`);
      // queryString: key=encodeURIComponent(value)
      const encodedValue = encodeURIComponent(String(value)).replace(/%20/g, '+');
      queryStringParts.push(`${encodeURIComponent(key)}=${encodedValue}`);
    }
  });

  return {
    signData: signDataParts.join('&'),
    queryString: queryStringParts.join('&'),
  };
};

/**
 * Kiểm tra tính hợp lệ của SecureHash từ VNPAY trả về
 * @param {Object} query - req.query
 * @returns {Object} { isValid, params }
 */
const verifySecureHash = (query) => {
  const vnp_Params = { ...query };
  const secureHash = vnp_Params['vnp_SecureHash'];

  // Loại bỏ các tham số không dùng để băm
  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  // 1. Sắp xếp tham số A-Z
  const sortedParams = sortObject(vnp_Params);

  // 2. Tạo chuỗi dữ liệu băm (key1=value1&key2=value2...)
  // Lưu ý: Đối với VNPAY 2.1.0, giá trị trả về KHÔNG cần encode khi băm để kiểm tra
  const signData = Object.keys(sortedParams)
    .map((key) => `${key}=${sortedParams[key]}`)
    .join('&');

  // 3. Thực hiện băm HMAC-SHA512
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return {
    isValid: secureHash === signed,
    params: sortedParams,
  };
};

const applyPaymentResult = async ({ orderId, responseCode, amount, transactionNo, payDate }) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return { status: 'not_found', order: null };
  }

  if (Math.round(Number(order.totalAmount) || 0) !== Math.round(Number(amount) || 0)) {
    return { status: 'amount_invalid', order };
  }

  if (order.paymentStatus === 'paid') {
    return { status: 'already_paid', order };
  }

  const isSuccess = String(responseCode) === '00';

  order.paymentMethod = 'bank_transfer';

  if (isSuccess) {
    order.paymentStatus = 'paid';
    order.transactionId = firstValue(transactionNo) || order.transactionId || null;
    order.paymentDate = parseVnpDate(payDate) || new Date();

    if (order.status === 'cancelled') {
      order.status = 'pending';
    }

    await order.save();

    // Clear items from user's cart after successful payment
    try {
      const cart = await Cart.findOne({ userId: order.userId });
      if (cart) {
        const orderProductIds = order.items.map((item) => String(item.productId));
        cart.items = cart.items.filter((item) => !orderProductIds.includes(String(item.productId)));
        await cart.save();
      }
    } catch (cartError) {
      console.error('Failed to clear cart after VNPay success:', cartError.message);
    }

    return { status: 'updated_paid', order };
  }

  order.paymentStatus = 'failed';
  order.status = 'cancelled';
  if (!order.cancelReason) {
    order.cancelReason = 'Thanh toan VNPay that bai';
  }

  await order.save();
  return { status: 'updated_failed', order };
};

router.post('/create-payment', authenticateClientJwt, async (req, res) => {
  try {
    if (!VNPAY_CONFIG.tmnCode || !VNPAY_CONFIG.hashSecret) {
      return res.status(500).json({
        success: false,
        message: 'VNPAY credentials are missing. Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET.',
      });
    }

    const orderId = firstValue(req.body?.orderId);
    const language = normalizeLanguage(req.body?.language);
    const bankCode = normalizeBankCode(req.body?.bankCode);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid orderId' });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.auth?.userId,
    }).select('orderCode totalAmount paymentStatus paymentMethod status');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid' || order.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Cannot create payment for paid or cancelled order',
      });
    }

    const totalAmount = Math.max(0, Math.round(Number(order.totalAmount) || 0));
    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    const now = new Date();
    const orderInfoInput = normalizeText(req.body?.orderInfo, 255);
    const orderInfo = orderInfoInput || `Thanh toan don hang #${order.orderCode}`;

    // 1. Chuẩn bị bộ tham số vnp_ theo chuẩn 2.1.0
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNPAY_CONFIG.tmnCode,
      vnp_Locale: language,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(order._id),
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: totalAmount * 100, // Đơn vị: Đồng (nhân 100 theo quy định VNPAY)
      vnp_ReturnUrl: resolveBackendReturnUrl(req),
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: formatVnpDate(now),
    };

    if (bankCode) {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    // 2. Sắp xếp tham số theo thứ tự alphabet (A-Z)
    vnp_Params = sortObject(vnp_Params);

    // 3. Tạo chuỗi dữ liệu băm (signData) và chuỗi truy vấn (queryString)
    // Đối với VNPAY 2.1.0, queryString và signData sử dụng encodeURIComponent
    const signDataParts = [];
    const queryStringParts = [];

    Object.keys(vnp_Params).forEach((key) => {
      const value = vnp_Params[key];
      if (value !== undefined && value !== null && String(value) !== '') {
        // VNPAY 2.1.0: signData uses RAW values (no encoding)
        signDataParts.push(`${key}=${value}`);

        // queryString uses ENCODED values
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(String(value)).replace(/%20/g, '+');
        queryStringParts.push(`${encodedKey}=${encodedValue}`);
      }
    });

    const signData = signDataParts.join('&');
    const queryString = queryStringParts.join('&');

    // 4. Tạo mã băm SecureHash (HMAC-SHA512)
    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
    const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 5. Tạo URL thanh toán hoàn chỉnh
    const payUrl = `${VNPAY_CONFIG.paymentUrl}?${queryString}&vnp_SecureHash=${secureHash}`;

    await Order.updateOne(
      { _id: order._id },
      {
        paymentMethod: 'bank_transfer',
        paymentStatus: 'pending',
      }
    );

    return res.status(200).json({
      success: true,
      payUrl,
      orderId: String(order._id),
      orderCode: order.orderCode,
    });
  } catch (error) {
    console.error('Create VNPay payment error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create VNPay payment',
    });
  }
});

router.get('/ipn', async (req, res) => {
  try {
    if (!VNPAY_CONFIG.hashSecret) {
      return res.status(200).json({ RspCode: '99', Message: getResponseMessage('99') });
    }

    const { isValid, params } = verifySecureHash(req.query || {});

    if (!isValid) {
      return res.status(200).json({ RspCode: '97', Message: getResponseMessage('97') });
    }

    const orderId = firstValue(params.vnp_TxnRef);
    const responseCode = firstValue(params.vnp_ResponseCode);
    const amount = parseAmount(params.vnp_Amount);
    const transactionNo = firstValue(params.vnp_TransactionNo);
    const payDate = firstValue(params.vnp_PayDate);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(200).json({ RspCode: '01', Message: getResponseMessage('01') });
    }

    const appliedResult = await applyPaymentResult({
      orderId,
      responseCode,
      amount,
      transactionNo,
      payDate,
    });

    if (appliedResult.status === 'not_found') {
      return res.status(200).json({ RspCode: '01', Message: getResponseMessage('01') });
    }

    if (appliedResult.status === 'amount_invalid') {
      return res.status(200).json({ RspCode: '04', Message: getResponseMessage('04') });
    }

    if (appliedResult.status === 'already_paid') {
      return res.status(200).json({ RspCode: '02', Message: getResponseMessage('02') });
    }

    return res.status(200).json({ RspCode: '00', Message: 'Success' });
  } catch (error) {
    console.error('VNPay IPN error:', error.message);
    return res.status(200).json({ RspCode: '99', Message: getResponseMessage('99') });
  }
});

router.get('/return', async (req, res) => {
  let orderId = '';
  let responseCode = '99';
  let amount = 0;
  let transactionNo = '';
  let payDate = '';
  let bankCode = '';

  try {
    const hasSecret = Boolean(VNPAY_CONFIG.hashSecret);

    if (hasSecret) {
      const { isValid, params } = verifySecureHash(req.query || {});

      orderId = firstValue(params.vnp_TxnRef);
      responseCode = isValid ? firstValue(params.vnp_ResponseCode) || '99' : '97';
      amount = parseAmount(params.vnp_Amount);
      transactionNo = firstValue(params.vnp_TransactionNo);
      payDate = firstValue(params.vnp_PayDate);
      bankCode = firstValue(params.vnp_BankCode);

      if (isValid && mongoose.Types.ObjectId.isValid(orderId)) {
        const appliedResult = await applyPaymentResult({
          orderId,
          responseCode,
          amount,
          transactionNo,
          payDate,
        });

        if (appliedResult.status === 'not_found') {
          responseCode = '01';
        } else if (appliedResult.status === 'amount_invalid') {
          responseCode = '04';
        }
      }
    }
  } catch (error) {
    console.error('VNPay return error:', error.message);
    responseCode = '99';
  }

  const frontendReturnUrl = resolveFrontendReturnUrl();
  if (orderId) {
    frontendReturnUrl.searchParams.set('orderId', orderId);
  }

  frontendReturnUrl.searchParams.set('responseCode', responseCode || '99');
  frontendReturnUrl.searchParams.set('message', getResponseMessage(responseCode));

  if (transactionNo) {
    frontendReturnUrl.searchParams.set('transactionNo', transactionNo);
  }

  if (payDate) {
    frontendReturnUrl.searchParams.set('payDate', payDate);
  }

  if (bankCode) {
    frontendReturnUrl.searchParams.set('bankCode', bankCode);
  }

  if (amount > 0) {
    frontendReturnUrl.searchParams.set('amount', String(amount));
  }

  return res.redirect(frontendReturnUrl.toString());
});

router.get('/order-status/:orderId', authenticateClientJwt, async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid orderId' });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.auth?.userId,
    }).select('orderCode totalAmount status paymentStatus paymentMethod transactionId paymentDate updatedAt');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({
      success: true,
      orderId: String(order._id),
      orderCode: order.orderCode,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
      paymentDate: order.paymentDate,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error('VNPay order-status error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch order status' });
  }
});

module.exports = router;
