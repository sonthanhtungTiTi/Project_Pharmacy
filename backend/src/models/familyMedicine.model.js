const mongoose = require('mongoose')

const familyMedicineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    scheduleTimes: {
      type: [String], // Array of time strings like ["08:00", "13:00", "20:00"]
      default: [],
    },
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

familyMedicineSchema.index({ userId: 1 })

module.exports = mongoose.model('FamilyMedicine', familyMedicineSchema)
