const Authenticity = require('../../models/authenticity.model')

const checkAuthenticity = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' })

    const authenticity = await Authenticity.findOne({ code }).populate('productId')

    if (!authenticity) {
      return res.status(200).json({
        success: true,
        data: { isValid: false, message: 'Invalid or fake code' }
      })
    }

    // Mark as scanned if valid
    let historyMessage = 'This product is authentic.'
    if (authenticity.status === 'valid') {
      authenticity.status = 'scanned'
      authenticity.verifiedAt = new Date()
      if (req.auth && req.auth.userId) authenticity.firstVerifiedBy = req.auth.userId
      await authenticity.save()
      historyMessage = 'This product is authentic and this is the first scan.'
    } else if (authenticity.status === 'scanned') {
      historyMessage = `This product is authentic, but it was already verified on ${authenticity.verifiedAt}. Please beware of counterfeits if you didn't scan this before.`
    }

    res.json({
      success: true,
      data: {
        isValid: true,
        message: historyMessage,
        productInfo: authenticity.productId,
        batch: authenticity.batch,
        verifiedAt: authenticity.verifiedAt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { checkAuthenticity }
