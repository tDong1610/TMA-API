/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { ObjectId } from 'mongodb'

const createNew = async (reqBody) => {
  try {
    // Xử lý logic dữ liệu tùy đặc thù dự án
    const newCard = {
      ...reqBody
    }
    const createdCard = await cardModel.createNew(newCard)
    const getNewCard = await cardModel.findOneById(createdCard.insertedId)

    if (getNewCard) {
      // Cập nhật mảng cardOrderIds trong collection columns
      await columnModel.pushCardOrderIds(getNewCard)
    }

    return getNewCard
  } catch (error) { throw error }
}

const update = async (cardId, reqBody, cardCoverFile, userInfo) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }

    let updatedCard = {}

    if (cardCoverFile) {
      const uploadResult = await CloudinaryProvider.streamUpload(cardCoverFile.buffer, 'card-covers')
      updatedCard = await cardModel.update(cardId, { cover: uploadResult.secure_url })
    } else if (updateData.commentToAdd) {
      // Tạo dữ liệu comment để thêm vào Database, cần bổ sung thêm những field cần thiết
      const commentData = {
        ...updateData.commentToAdd,
        commentedAt: Date.now(),
        userId: userInfo._id,
        userEmail: userInfo.email
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
    } else if (updateData.incomingMemberInfo) {
      // Trường hợp ADD hoặc REMOVE thành viên ra khỏi Card
      updatedCard = await cardModel.updateMembers(cardId, updateData.incomingMemberInfo)
    } else {
      // Các trường hợp update chung như title, description
      updatedCard = await cardModel.update(cardId, updateData)
    }


    return updatedCard
  } catch (error) { throw error }
}

const deleteCard = async (cardId) => {
  try {
    const card = await cardModel.findOneById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    // Xóa card
    await cardModel.deleteCard(cardId)
    
    // Cập nhật lại mảng cardOrderIds trong column
    await columnModel.pullCardOrderIds(card.columnId, card._id)

    return { message: 'Card deleted successfully' }
  } catch (error) { throw error }
}

const uploadAttachment = async (cardId, attachmentFile) => {
  try {
    // Xác định resource_type dựa trên mimetype
    let resourceType = 'raw' // Mặc định là raw cho các loại file không phải ảnh và video
    if (attachmentFile.mimetype.startsWith('image/')) {
      resourceType = 'image'
    } else if (attachmentFile.mimetype.startsWith('video/')) {
      resourceType = 'video'
    }

    const uploadResult = await CloudinaryProvider.streamUpload(attachmentFile.buffer, 'card-attachments', resourceType)

    const attachment = {
      _id: new ObjectId().toString(),
      name: attachmentFile.originalname,
      url: uploadResult.secure_url,
      size: attachmentFile.size,
      type: attachmentFile.mimetype,
      uploadedAt: Date.now()
    }

    const updatedCard = await cardModel.pushAttachment(cardId, attachment)

    return updatedCard
  } catch (error) {
    // Log chi tiết lỗi ở đây
    console.error('Error in uploadAttachment service:', error)
    throw error
  }
}

const deleteAttachment = async (cardId, attachmentId) => {
  try {
    console.log(`[cardService.deleteAttachment] Attempting to delete attachment ${attachmentId} from card ${cardId}`);

    const card = await cardModel.findOneById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    // Thêm log để kiểm tra dữ liệu trước khi tìm kiếm
    console.log(`[cardService.deleteAttachment] Card attachments: ${JSON.stringify(card.attachments)}`);
    console.log(`[cardService.deleteAttachment] attachmentId from frontend: ${attachmentId}, type: ${typeof attachmentId}`);

    const attachmentToDelete = card.attachments.find(att => att._id === attachmentId)
    if (!attachmentToDelete) {
      throw new Error('Attachment not found')
    }

    console.log(`[cardService.deleteAttachment] Card attachments before pulling: ${JSON.stringify(card.attachments)}`);
    console.log(`[cardService.deleteAttachment] Attachment ID to pull: ${attachmentId}`);

    // Xóa tệp khỏi Cloudinary (cần public_id từ url hoặc lưu trữ riêng public_id)
    // Hiện tại, tôi sẽ giả định bạn có thể trích xuất public_id từ url
    const publicId = attachmentToDelete.url.split('/').pop().split('.')[0]
    // Tạm thời bỏ qua xóa Cloudinary để tập trung vào xóa khỏi DB
    // await CloudinaryProvider.destroy(publicId)

    console.log(`[cardService.deleteAttachment] Calling cardModel.pullAttachment for card ${cardId}, attachment ${attachmentId}`);
    const updatedCard = await cardModel.pullAttachment(cardId, attachmentId)
    console.log(`[cardService.deleteAttachment] Result from pullAttachment: ${JSON.stringify(updatedCard)}`);

    return updatedCard

  } catch (error) {
    throw error
  }
}

export const cardService = {
  createNew,
  update,
  deleteCard,
  uploadAttachment,
  deleteAttachment
}
