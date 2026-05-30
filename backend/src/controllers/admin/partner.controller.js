const PartnerRequest = require('../../models/partnerRequest.model')

const getPartnerRequests = async (req, res) => {
  try {
    const requests = await PartnerRequest.find({}).populate('handledBy', 'fullName email').sort({ createdAt: -1 })
    res.json({ success: true, data: requests })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const updatePartnerRequestStatus = async (req, res) => {
  try {
    const { status } = req.body // pending, contacted, approved, rejected
    const request = await PartnerRequest.findByIdAndUpdate(req.params.id, { 
      status,
      handledBy: req.auth.userId // record who updated it
    }, { new: true })
    
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' })

    res.json({ success: true, data: request })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getPartnerRequests, updatePartnerRequestStatus }
