const mongoose = require('mongoose')

const partnerRequestSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'approved', 'rejected'],
      default: 'pending',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

partnerRequestSchema.index({ status: 1 })

module.exports = mongoose.model('PartnerRequest', partnerRequestSchema)
