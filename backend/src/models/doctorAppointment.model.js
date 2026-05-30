const mongoose = require('mongoose')

const doctorAppointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // User with role 'doctor'
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointmentTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
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

doctorAppointmentSchema.index({ doctorId: 1, appointmentTime: 1 })
doctorAppointmentSchema.index({ userId: 1 })

module.exports = mongoose.model('DoctorAppointment', doctorAppointmentSchema)
