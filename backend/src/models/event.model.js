const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    banner: {
      type: String, // URL
      default: '',
    },
    articleContent: {
      type: String, // HTML Content
      default: '',
    },
    subImages: {
      type: [String],
      default: [],
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    startAt: {
      type: Date,
    },
    endAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

eventSchema.index({ slug: 1 })
eventSchema.index({ status: 1 })

module.exports = mongoose.model('Event', eventSchema)
