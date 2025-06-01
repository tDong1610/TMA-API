import { WHITELIST_DOMAINS } from '~/utils/constants'
import { env } from '~/config/environment'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

export const corsOptions = {
  origin: function (origin, callback) {
    console.log('🌐 Request from origin:', origin)

    // Cho phép tất cả ở môi trường dev
    if (env.BUILD_MODE === 'dev') {
      return callback(null, true)
    }

    // Nếu không có origin (Postman, curl...) thì cho phép
    if (!origin) {
      return callback(null, true)
    }

    // Nếu trong whitelist thì cho phép
    if (WHITELIST_DOMAINS.includes(origin)) {
      return callback(null, true)
    }

    // Nếu không thì trả về lỗi
    console.log('⛔ Blocked origin:', origin)
    return callback(
      new ApiError(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`),
      false
    )
  },

  optionsSuccessStatus: 200,
  credentials: true
}
