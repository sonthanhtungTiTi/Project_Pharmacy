const mongoose = require('mongoose')

const authenticitySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batch: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['valid', 'scanned', 'invalid'],
      default: 'valid',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    firstVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

authenticitySchema.index({ code: 1 })

module.exports = mongoose.model('Authenticity', authenticitySchema)
