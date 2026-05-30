const Authenticity = require('../../models/authenticity.model')

const importCodes = async (req, res) => {
  try {
    const { codes } = req.body // Expecting an array of objects: [{ code, productId, batch }]
    if (!codes || !Array.isArray(codes)) {
      return res.status(400).json({ success: false, message: 'Invalid format, expected array of codes' })
    }

    // Insert many, ignore duplicates (depends on mongoose config, we can use ordered: false)
    const result = await Authenticity.insertMany(codes, { ordered: false }).catch(err => {
      // If error is duplicate key, it still inserted the non-duplicates.
      return err.insertedDocs || []
    })

    res.status(201).json({ success: true, message: `Imported ${result.length || result.length === 0 ? result.length : 'some'} codes successfully` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const getCodes = async (req, res) => {
  try {
    const codes = await Authenticity.find({}).populate('productId').sort({ createdAt: -1 })
    res.json({ success: true, data: codes })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { importCodes, getCodes }
