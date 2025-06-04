/**
* TrungQuanDev: https://youtube.com/@trungquandev
* "A bit of fragrance clings to the hand that gives flowers!"
*/
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE, OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define tạm 2 roles cho user, tùy việc mở rộng dự án như thế nào mà mọi người có thể thêm role tùy ý sao cho phù hợp sau.
const USER_ROLES = {
  CLIENT: 'client',
  ADMIN: 'admin'
}

// Define Collection (name & schema)
const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE), // unique
  password: Joi.string().required(),
  // username cắt ra từ email sẽ có khả năng không unique bởi vì sẽ có những tên email trùng nhau nhưng từ các nhà cung cấp khác nhau
  username: Joi.string().required().trim().strict(),
  displayName: Joi.string().required().trim().strict(),
  avatar: Joi.string().default(null),
  role: Joi.string().valid(...Object.values(USER_ROLES)).default(USER_ROLES.CLIENT),

  isActive: Joi.boolean().default(true),
  verifyToken: Joi.string().strip(),

  // Xóa các trường mới cho OTP
  otp: Joi.string().strip(),
  otpExpires: Joi.date().timestamp('javascript').default(null).strip(),
  otpAttempts: Joi.number().default(0).strip(),
  lastOtpSent: Joi.date().timestamp('javascript').default(null).strip(),

  templates: Joi.array().items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định ra những Fields mà chúng ta không muốn cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = ['_id', 'email', 'username', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
    return createdUser
  } catch (error) { throw new Error(error) }
}

const findOneById = async (userId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ _id: new ObjectId(userId) })
    return result
  } catch (error) { throw new Error(error) }
}

const findOneByEmail = async (emailValue) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email: emailValue })
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (userId, updateData) => {
  try {
    // Lọc những field mà chúng ta không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after' } // sẽ trả về kết quả mới sau khi cập nhật
    )
    return result
  } catch (error) { throw new Error(error) }
}

const pushTemplateId = async (userId, templateId) => {
  try {
    console.log(`[userModel.pushTemplateId] Attempting to push template ID ${templateId} to user ${userId}`);
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $push: { templates: new ObjectId(templateId) } },
      { returnDocument: 'after' }
    );
    return result;
  } catch (error) { throw error; }
}

const pullTemplateId = async (userId, templateId) => {
  try {
    console.log(`[userModel.pullTemplateId] Attempting to remove template ID ${templateId} from user ${userId} list.`);
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $pull: { templates: new ObjectId(templateId) } },
      { returnDocument: 'after' }
    );
    console.log(`[userModel.pullTemplateId] findOneAndUpdate result: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.error(`[userModel.pullTemplateId] Error removing template ID ${templateId} from user ${userId} list:`, error);
    throw error;
  }
}

const updateOTP = async (userId, otp, otpExpires) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          otp,
          otpExpires,
          otpAttempts: 0,
          lastOtpSent: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result.value
  } catch (error) { throw error }
}

const incrementOtpAttempts = async (userId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $inc: { otpAttempts: 1 } },
      { returnDocument: 'after' }
    )
    return result.value
  } catch (error) { throw error }
}

const verifyUser = async (userId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          isActive: true,
          otp: null,
          otpExpires: null,
          otpAttempts: 0,
          lastOtpSent: null,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result.value
  } catch (error) { throw error }
}

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  USER_ROLES,
  createNew,
  findOneById,
  findOneByEmail,
  update,
  pushTemplateId,
  pullTemplateId,
  updateOTP,
  incrementOtpAttempts,
  verifyUser
}
