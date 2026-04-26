const crypto = require('crypto');
const axios = require('axios');

const RETRYABLE_RESULT_CODES = new Set([10, 98, 99, 7000, 7002]);
const DEFAULT_REQUEST_TYPE_SEQUENCE = ['captureWallet', 'payWithMethod'];

const MOMO_CONFIG = {
  partnerCode: (process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529').trim(),
  accessKey: (process.env.MOMO_ACCESS_KEY || 'klm05TvNBzhg7h7j').trim(),
  secretKey: (process.env.MOMO_SECRET_KEY || 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa').trim(),
  environment: (process.env.MOMO_ENVIRONMENT || 'sandbox').trim(),
  redirectUrl: (process.env.MOMO_REDIRECT_URL || 'http://localhost:5173/checkout/momo-return').trim(),
};

// Momo endpoints
const MOMO_ENDPOINT = {
  sandbox: process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create',
  production: 'https://payment.momo.vn/v2/gateway/api/create',
};

function getMomoEndpoint() {
  return MOMO_CONFIG.environment === 'production'
    ? MOMO_ENDPOINT.production
    : MOMO_ENDPOINT.sandbox;
}

function generateRequestId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function resolveRequestTypeSequence(explicitRequestType) {
  if (typeof explicitRequestType === 'string' && explicitRequestType.trim()) {
    return [explicitRequestType.trim()];
  }

  const configured = String(process.env.MOMO_REQUEST_TYPES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured.length) {
    return Array.from(new Set(configured));
  }

  return DEFAULT_REQUEST_TYPE_SEQUENCE;
}

function normalizeAmount(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    throw new Error('Invalid amount for MoMo payment');
  }

  const normalizedAmount = Math.max(0, Math.round(numericAmount));
  if (normalizedAmount < 1000) {
    throw new Error('Amount must be at least 1000 VND for MoMo payment');
  }

  return String(normalizedAmount);
}

function normalizeOrderInfo(orderInfo, orderId) {
  const fallback = `Thanh toan don hang #${orderId}`;
  const safeOrderInfo =
    typeof orderInfo === 'string' && orderInfo.trim().length
      ? orderInfo.trim()
      : fallback;

  return safeOrderInfo.replace(/\s+/g, ' ').slice(0, 255);
}

function isBase64Json(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    JSON.parse(decoded);
    return true;
  } catch {
    return false;
  }
}

function encodeExtraData(extraData) {
  if (extraData === null || extraData === undefined || extraData === '') {
    return '';
  }

  if (typeof extraData === 'string') {
    const trimmed = extraData.trim();
    if (!trimmed) {
      return '';
    }

    if (isBase64Json(trimmed)) {
      return trimmed;
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Buffer.from(JSON.stringify(parsed), 'utf8').toString('base64');
    } catch {
      return Buffer.from(JSON.stringify({ value: trimmed }), 'utf8').toString('base64');
    }
  }

  return Buffer.from(JSON.stringify(extraData), 'utf8').toString('base64');
}

function buildCreatePaymentPayload(orderData, requestId, requestType = 'captureWallet') {
  const orderId = String(orderData.orderId || '').trim();
  if (!orderId) {
    throw new Error('Missing orderId for MoMo payment');
  }

  const redirectUrl = String(orderData.redirectUrl || MOMO_CONFIG.redirectUrl || '').trim();
  const ipnUrl = String(orderData.ipnUrl || process.env.MOMO_IPN_URL || '').trim();
  if (!redirectUrl || !ipnUrl) {
    throw new Error('Missing redirectUrl or ipnUrl for MoMo payment');
  }

  const amount = normalizeAmount(orderData.amount);
  const orderInfo = normalizeOrderInfo(orderData.orderInfo, orderId);
  const extraData = encodeExtraData(orderData.extraData);

  const signatureData = {
    accessKey: MOMO_CONFIG.accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode: MOMO_CONFIG.partnerCode,
    redirectUrl,
    requestId,
    requestType,
  };

  const signature = generateSignature(signatureData, MOMO_CONFIG.secretKey);

  return {
    orderId,
    payload: {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      lang: 'vi',
      autoCapture: true,
      extraData,
      signature,
    },
  };
}

function createMomoError({ resultCode, message, rawResponse }) {
  const normalizedResultCode = Number(resultCode);
  const finalResultCode = Number.isNaN(normalizedResultCode) ? resultCode : normalizedResultCode;
  const momoMessage = message || 'Unknown MoMo error';

  const error = new Error(`MoMo create-payment failed (${finalResultCode ?? 'unknown'}): ${momoMessage}`);
  error.momoResultCode = finalResultCode;
  error.momoRawResponse = rawResponse || null;
  return error;
}

/**
 * Tạo request signature cho Momo
 */
function generateSignature(data, secretKey) {
  // Thứ tự PHẢI đúng theo MoMo specification
  const rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  return signature;
}

/**
 * Tạo Momo payment URL
 * @param {Object} orderData - { orderId, amount, orderInfo, redirectUrl, ipnUrl, extraData }
 */
async function createMomoPayment(orderData) {
  const endpoint = getMomoEndpoint();
  const maxAttempts = 2;
  const requestTypeSequence = resolveRequestTypeSequence(orderData?.requestType);
  let lastError;

  for (let requestTypeIndex = 0; requestTypeIndex < requestTypeSequence.length; requestTypeIndex++) {
    const requestType = requestTypeSequence[requestTypeIndex];
    const hasNextRequestType = requestTypeIndex < requestTypeSequence.length - 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const requestId = generateRequestId();

      try {
        const { orderId, payload } = buildCreatePaymentPayload(orderData, requestId, requestType);
        const response = await axios.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        });

        const responseData = response?.data || {};
        const resultCode = Number(responseData.resultCode);

        if (!Number.isNaN(resultCode) && resultCode === 0 && responseData.payUrl) {
          return {
            success: true,
            payUrl: responseData.payUrl,
            deeplink: responseData.deeplink || '',
            qrCodeUrl: responseData.qrCodeUrl || '',
            orderId,
            requestId,
            requestTypeUsed: requestType,
          };
        }

        const momoError = createMomoError({
          resultCode: responseData.resultCode,
          message: responseData.message,
          rawResponse: responseData,
        });

        lastError = momoError;
        const normalizedResultCode = Number(momoError.momoResultCode);

        // captureWallet có thể trả 98 theo account config. Fallback sang payWithMethod.
        if (normalizedResultCode === 98 && hasNextRequestType) {
          break;
        }

        if (!RETRYABLE_RESULT_CODES.has(normalizedResultCode) || attempt >= maxAttempts) {
          throw momoError;
        }
      } catch (error) {
        if (error?.response?.data) {
          const momoError = createMomoError({
            resultCode: error.response.data.resultCode,
            message: error.response.data.message,
            rawResponse: error.response.data,
          });
          lastError = momoError;

          const normalizedResultCode = Number(momoError.momoResultCode);
          if (normalizedResultCode === 98 && hasNextRequestType) {
            break;
          }

          if (RETRYABLE_RESULT_CODES.has(normalizedResultCode) && attempt < maxAttempts) {
            continue;
          }

          throw momoError;
        }

        lastError = error;
        if (attempt >= maxAttempts) {
          throw error;
        }
      }
    }

    if (lastError && Number(lastError?.momoResultCode) === 98 && hasNextRequestType) {
      continue;
    }
  }

  throw lastError || new Error('MoMo create-payment failed');
}

/**
 * Verify signature từ Momo callback
 */
function verifyMomoSignature(data, signature) {
  const rawData = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;

  const computedSignature = crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawData)
    .digest('hex');

  return computedSignature === signature;
}

/**
 * Handle Momo IPN callback (webhook)
 */
function handleMomoCallback(momoData) {
  // Verify signature
  const isValid = verifyMomoSignature(momoData, momoData.signature);
  const normalizedResultCode = Number(momoData.resultCode);
  
  if (!isValid) {
    throw new Error('Invalid Momo signature');
  }

  // resultCode = 0: thành công
  if (!Number.isNaN(normalizedResultCode) && normalizedResultCode === 0) {
    return {
      success: true,
      orderId: momoData.orderId,
      transactionId: momoData.transId,
      message: momoData.message,
    };
  } else {
    return {
      success: false,
      orderId: momoData.orderId,
      resultCode: Number.isNaN(normalizedResultCode) ? momoData.resultCode : normalizedResultCode,
      message: momoData.message,
    };
  }
}

module.exports = {
  createMomoPayment,
  verifyMomoSignature,
  handleMomoCallback,
};
