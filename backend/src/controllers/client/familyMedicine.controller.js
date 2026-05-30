const FamilyMedicine = require('../../models/familyMedicine.model')

const getFamilyMedicines = async (req, res) => {
  try {
    const medicines = await FamilyMedicine.find({ userId: req.auth.userId })
    res.json({ success: true, data: medicines })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const addFamilyMedicine = async (req, res) => {
  try {
    const { name, dosage, scheduleTimes, reminderEnabled, note } = req.body
    const medicine = await FamilyMedicine.create({
      userId: req.auth.userId,
      name,
      dosage,
      scheduleTimes,
      reminderEnabled,
      note
    })
    res.status(201).json({ success: true, data: medicine })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const updateFamilyMedicine = async (req, res) => {
  try {
    const medicine = await FamilyMedicine.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      req.body,
      { new: true }
    )
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' })
    res.json({ success: true, data: medicine })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const deleteFamilyMedicine = async (req, res) => {
  try {
    const medicine = await FamilyMedicine.findOneAndDelete({ _id: req.params.id, userId: req.auth.userId })
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' })
    res.json({ success: true, message: 'Deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { getFamilyMedicines, addFamilyMedicine, updateFamilyMedicine, deleteFamilyMedicine }
