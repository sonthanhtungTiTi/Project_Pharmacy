const authService = require('../../services/client/auth.service')

const register = async (req, res) => {
  try {
    const data = await authService.registerLocalUser(req.body)

    return res.status(201).json({
      success: true,
      message: 'Register successful',
      data,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Register failed',
      error: error.message,
    })
  }
}

const login = async (req, res) => {
  try {
    const data = await authService.loginLocalUser(req.body)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Login failed',
      error: error.message,
    })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const data = await authService.forgotPasswordByEmail(req.body)

    return res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email',
      data,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Forgot password failed',
      error: error.message,
    })
  }
}

const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const data = await authService.verifyForgotPasswordOtp(req.body)

    return res.status(200).json({
      success: true,
      message: 'OTP is valid',
      data,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Verify OTP failed',
      error: error.message,
    })
  }
}

const resetForgotPassword = async (req, res) => {
  try {
    const data = await authService.resetForgotPassword(req.body)

    return res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Reset password failed',
      error: error.message,
    })
  }
}

const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params
    const user = await authService.updateUserProfile(userId, req.body)

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Update profile failed',
      error: error.message,
    })
  }
}

const googleLoginOrRegister = async (req, res) => {
  try {
    const { idToken } = req.body

    const data = await authService.googleLoginOrRegister(idToken)

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Google authentication failed',
      error: error.message,
    })
  }
}

const googleLoginOrRegisterByCode = async (req, res) => {
  try {
    const { authCode, redirectUri } = req.body

    const data = await authService.googleLoginOrRegisterByCode(authCode, redirectUri)

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Google authentication failed',
      error: error.message,
    })
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  updateProfile,
  googleLoginOrRegister,
  googleLoginOrRegisterByCode,
}
