const DoctorAppointment = require('../../models/doctorAppointment.model')
const User = require('../../models/user.model')

const getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: true }).select('_id fullName avatar email phone')
    res.json({ success: true, data: doctors })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const getAppointments = async (req, res) => {
  try {
    const appointments = await DoctorAppointment.find({ userId: req.auth.userId }).populate('doctorId', 'fullName avatar email phone').sort({ appointmentTime: 1 })
    res.json({ success: true, data: appointments })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const createAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentTime, note } = req.body

    // Check if doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' })
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' })

    // --- Normalize to fixed 30-min slots ---
    let normalizedTime = new Date(appointmentTime)
    normalizedTime.setSeconds(0)
    normalizedTime.setMilliseconds(0)
    normalizedTime.setMinutes(normalizedTime.getMinutes() < 30 ? 0 : 30)

    // --- Guard: must not be in the past ---
    if (normalizedTime <= new Date()) {
      return res.status(400).json({ success: false, message: 'Không thể đặt lịch trong quá khứ.' })
    }

    // --- Guard: working hours 08:00 – 17:00 (last slot 16:30) ---
    const hour = normalizedTime.getHours()
    const minute = normalizedTime.getMinutes()
    const totalMinutes = hour * 60 + minute
    const workStart = 8 * 60        // 08:00 → 480
    const workEnd   = 16 * 60 + 30  // 16:30 → 990 (last valid slot)
    if (totalMinutes < workStart || totalMinutes > workEnd) {
      return res.status(400).json({
        success: false,
        message: 'Lịch khám chỉ được đặt trong giờ làm việc từ 08:00 đến 17:00.'
      })
    }

    // --- Guard: conflict check ---
    const conflict = await DoctorAppointment.findOne({
      doctorId,
      appointmentTime: normalizedTime,
      status: { $in: ['pending', 'confirmed'] }
    })
    if (conflict) {
      return res.status(409).json({ success: false, message: 'Khung giờ này đã được đặt. Vui lòng chọn giờ khác.' })
    }

    const appointment = await DoctorAppointment.create({
      doctorId,
      userId: req.auth.userId,
      appointmentTime: normalizedTime,
      note
    })

    res.status(201).json({ success: true, data: appointment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await DoctorAppointment.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      { status: 'cancelled' },
      { new: true }
    )
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' })
    res.json({ success: true, data: appointment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getDoctors, getAppointments, createAppointment, cancelAppointment }
