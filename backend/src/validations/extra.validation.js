const Joi = require('joi')

const createEventSchema = Joi.object({
  slug: Joi.string().trim().required(),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().allow(''),
  banner: Joi.string().trim().allow(''),
  articleContent: Joi.string().allow(''),
  subImages: Joi.array().items(Joi.string()).default([]),
  products: Joi.array().items(Joi.string()).default([]),
  startAt: Joi.date().iso(),
  endAt: Joi.date().iso()
})

const updateEventSchema = createEventSchema.fork(['slug', 'title'], (schema) => schema.optional())

const familyMedicineSchema = Joi.object({
  name: Joi.string().trim().required(),
  dosage: Joi.string().trim().required(),
  scheduleTimes: Joi.array().items(Joi.string().pattern(/^([01]\d|2[0-3]):?([0-5]\d)$/)).default([]),
  reminderEnabled: Joi.boolean().default(true),
  note: Joi.string().trim().allow('')
})

const authenticityCheckSchema = Joi.object({
  code: Joi.string().trim().required()
})

const importAuthenticitySchema = Joi.object({
  codes: Joi.array().items(Joi.object({
    code: Joi.string().trim().required(),
    productId: Joi.string().required(),
    batch: Joi.string().trim().required()
  })).min(1).required()
})

const createAppointmentSchema = Joi.object({
  doctorId: Joi.string().required(),
  appointmentTime: Joi.date().iso().required(),
  note: Joi.string().trim().allow('')
})

const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').required()
})

const partnerRequestSchema = Joi.object({
  companyName: Joi.string().trim().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  note: Joi.string().trim().allow('')
})

const updatePartnerStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'contacted', 'approved', 'rejected').required()
})

module.exports = {
  createEventSchema,
  updateEventSchema,
  familyMedicineSchema,
  authenticityCheckSchema,
  importAuthenticitySchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  partnerRequestSchema,
  updatePartnerStatusSchema
}
