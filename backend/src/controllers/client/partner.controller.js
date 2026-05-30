const PartnerRequest = require('../../models/partnerRequest.model')

const submitPartnerRequest = async (req, res) => {
  try {
    const { companyName, phone, address, note } = req.body
    
    if (!companyName || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Company name, phone, and address are required' })
    }

    const partnerReq = await PartnerRequest.create({
      companyName,
      phone,
      address,
      note
    })

    res.status(201).json({ success: true, data: partnerReq })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { submitPartnerRequest }
