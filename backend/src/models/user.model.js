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
    // Mảng 3 vector, mỗi vector gồm 128 float.
    // Được trích xuất bằng @vladmandic/face-api TinyFaceDetector (inputSize=416).
    // select: false → không bao giờ trả về trong API response thông thường.
    faceDescriptors: {
      type: [[Number]],
      default: [],
      select: false,
    },
    faceIdEnabled: {
      type: Boolean,
      default: false,
    },
    faceIdEnrolledAt: {
      type: Date,
      default: null,
    },
    // Phiên bản mô hình AI dùng khi đăng ký Face ID.
    // v1 = SsdMobilenetv1 (cũ), v2 = TinyFaceDetector inputSize=416 (hiện tại)
    // Dùng để phát hiện user cần re-enroll khi nâng cấp model
    faceDescriptorVersion: {
      type: Number,
      default: 1,
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
      enum: ['customer', 'pharmacist', 'warehouse_staff', 'sales_staff', 'manager', 'admin', 'banned', 'doctor'],
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
  }
)

// Indexes for role-based queries
userSchema.index({ role: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ role: 1, isActive: 1 })

// Index cho Face ID: dùng cho 1:N lookup (tìm tất cả user đã bật Face ID)
// Hiện tại luồng 1:1 (biết email trước) không cần index này,
// nhưng cần thiết nếu sau này mở rộng sang nhận diện không cần email.
userSchema.index({ faceIdEnabled: 1 })

module.exports = mongoose.model('User', userSchema)
