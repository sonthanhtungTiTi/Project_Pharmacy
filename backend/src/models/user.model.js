const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
    },
    googleId: {
      type: String,
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    isAvatarCustom: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'google+local'],
      default: 'local',
    },
    role: {
      type: String,
      enum: ['customer', 'pharmacist', 'warehouse_staff', 'sales_staff', 'manager', 'admin', 'banned'],
      default: 'customer',
    },
    permissions: {
      type: [String],
      default: [],
    },
    department: {
      type: String,
      enum: ['warehouse', 'sales', 'pharmacy', 'management', null],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for role-based queries
userSchema.index({ role: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ role: 1, isActive: 1 })

module.exports = mongoose.model('User', userSchema)
