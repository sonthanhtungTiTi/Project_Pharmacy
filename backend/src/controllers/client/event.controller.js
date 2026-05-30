const Event = require('../../models/event.model')

const getEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: 'published' }).sort({ createdAt: -1 })
    res.json({ success: true, data: events })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const getEventBySlug = async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug, status: 'published' }).populate('products')
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' })
    }
    res.json({ success: true, data: event })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getEvents, getEventBySlug }
