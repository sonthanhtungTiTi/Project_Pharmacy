const DoctorAppointment = require('../../models/doctorAppointment.model')

const getAppointments = async (req, res) => {
  try {
    const appointments = await DoctorAppointment.find({}).populate('doctorId userId', 'fullName email phone').sort({ appointmentTime: 1 })
    res.json({ success: true, data: appointments })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body // pending, confirmed, completed, cancelled
    const appointment = await DoctorAppointment.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' })

    res.json({ success: true, data: appointment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getAppointments, updateAppointmentStatus }
