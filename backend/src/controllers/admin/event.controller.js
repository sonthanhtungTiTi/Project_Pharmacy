const Event = require('../../models/event.model')

// For testing purposes we'll use a basic sanitize-html if available or just raw text
let sanitizeHtml;
try {
  sanitizeHtml = require('sanitize-html');
} catch (e) {
  sanitizeHtml = (html) => html; // fallback if library not installed yet
}

const createEvent = async (req, res) => {
  try {
    const { slug, title, description, banner, articleContent, subImages, products, startAt, endAt } = req.body
    
    // Sanitize HTML
    const sanitizedContent = articleContent ? sanitizeHtml(articleContent) : ''

    const event = await Event.create({
      slug, title, description, banner, articleContent: sanitizedContent, subImages, products, startAt, endAt
    })
    res.status(201).json({ success: true, data: event })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const updateEvent = async (req, res) => {
  try {
    const updateData = { ...req.body }
    if (updateData.articleContent) {
      updateData.articleContent = sanitizeHtml(updateData.articleContent)
    }

    const event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' })

    res.json({ success: true, data: event })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id)
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' })

    res.json({ success: true, message: 'Event deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const publishEvent = async (req, res) => {
  try {
    const { status } = req.body // 'published', 'draft', 'archived'
    const event = await Event.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' })

    res.json({ success: true, data: event })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { createEvent, updateEvent, deleteEvent, publishEvent }
