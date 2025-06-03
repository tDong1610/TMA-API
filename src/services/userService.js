import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatters'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { Resend } from 'resend'
import { emailService } from './emailService'

// Kiểm tra API key trước khi khởi tạo Resend
if (!env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not defined in environment variables')
  process.exit(1)
}

const resend = new Resend(env.RESEND_API_KEY)

const createNew = async (reqBody) => {
  try {
    // Kiểm tra xem email đã tồn tại trong hệ thống của chúng ta hay chưa
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (existUser) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already exists!')
    }

    // Tạo data để lưu vào Database
    const nameFromEmail = reqBody.email.split('@')[0]
    const newUser = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 8),
      username: nameFromEmail,
      displayName: nameFromEmail,
      isActive: true // Đặt mặc định là true vì không cần xác thực email
    }

    // Thực hiện lưu thông tin user vào Database
    const createdUser = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)

    // Không cần tạo và gửi OTP nữa

    // Trả về thông tin user
    return pickUser(getNewUser)
  } catch (error) { throw error }
}

const verifyAccount = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is already active!')
    
    // Kiểm tra OTP
    if (!existUser.otp || !existUser.otpExpires) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'No OTP found for this account!')
    }
    
    // Kiểm tra OTP có hết hạn chưa
    if (new Date() > existUser.otpExpires) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'OTP has expired!')
    }
    
    // Kiểm tra OTP có đúng không
    if (reqBody.otp !== existUser.otp) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Invalid OTP!')
    }

    // Nếu như mọi thứ ok thì chúng ta bắt đầu update lại thông tin của thằng user để verify account
    const updateData = {
      isActive: true,
      otp: null,
      otpExpires: null
    }
    // Thực hiện update thông tin user
    const updatedUser = await userModel.update(existUser._id, updateData)

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const login = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    
    // Kiểm tra mật khẩu
    if (!bcryptjs.compareSync(reqBody.password, existUser.password)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Email or Password is incorrect!')
    }

    // Không cần kiểm tra tài khoản đã được xác nhận chưa nữa

    /** Tạo Tokens đăng nhập để trả về cho phía FE */
    const userInfo = { _id: existUser._id, email: existUser.email }

    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )

    const refreshToken = await JwtProvider.generateToken(
      userInfo,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_LIFE
    )

    return { accessToken, refreshToken, ...pickUser(existUser) }
  } catch (error) { throw error }
}

const refreshToken = async (clientRefreshToken) => {
  try {
    // Bước 01: Thực hiện giải mã refreshToken xem nó có hợp lệ hay là không
    const refreshTokenDecoded = await JwtProvider.verifyToken(
      clientRefreshToken,
      env.REFRESH_TOKEN_SECRET_SIGNATURE
    )

    // Đoạn này vì chúng ta chỉ lưu những thông tin unique và cố định của user trong token rồi, vì vậy có thể lấy luôn từ decoded ra, tiết kiệm query vào DB để lấy data mới.
    const userInfo = { _id: refreshTokenDecoded._id, email: refreshTokenDecoded.email }

    // Bước 02: Tạo ra cái accessToken mới
    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      // 5 // 5 giây
      env.ACCESS_TOKEN_LIFE
    )

    return { accessToken }
  } catch (error) { throw error }
}

const update = async (userId, reqBody, userAvatarFile) => {
  try {
    // Query User và kiểm tra cho chắc chắn
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Khởi tạo kết quả updated User ban đầu là empty
    let updatedUser = {}

    // Trường hợp change password
    if (reqBody.current_password && reqBody.new_password) {
      // Kiểm tra xem cái current_password có đúng hay không
      if (!bcryptjs.compareSync(reqBody.current_password, existUser.password)) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Current Password is incorrect!')
      }
      // Nếu như current_password là đúng thì chúng ta sẽ hash một cái mật khẩu mới và update lại vào DB:
      updatedUser = await userModel.update(existUser._id, {
        password: bcryptjs.hashSync(reqBody.new_password, 8)
      })
    } else if (userAvatarFile) {
      // Trường hợp upload file lên Cloud Storage, cụ thể là Cloudinary
      const uploadResult = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, 'users')
      // console.log('uploadResult: ', uploadResult)

      // Lưu lại url (secure_url) của cái file ảnh vào trong Database
      updatedUser = await userModel.update(existUser._id, {
        avatar: uploadResult.secure_url
      })
    } else {
      // Trường hợp update các thông tin chung, ví dụ như displayName
      updatedUser = await userModel.update(existUser._id, reqBody)
    }

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const sendOTPVerifyEmail = async (email) => {
  try {
    const existUser = await userModel.findOneByEmail(email)
    if (!existUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000) // OTP expires in 5 minutes

    await userModel.updateOTP(existUser._id, otp, otpExpires)
    await emailService.sendOTP(email, otp, existUser.username)

    return { message: 'OTP sent successfully.' }
  } catch (error) { throw error }
}

export const userService = {
  createNew,
  verifyAccount,
  login,
  refreshToken,
  update,
  sendOTPVerifyEmail
}
