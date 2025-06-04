/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { boardService } from '~/services/boardService'
import { createTemplateService, deleteTemplateService, updateTemplateService } from '~/services/templateService'
import { templateModel } from '~/models/templateModel'



const createNew = async (req, res, next) => {
  try {
    // console.log('req.body: ', req.body)
    // console.log('req.query: ', req.query)
    // console.log('req.params: ', req.params)
    // console.log('req.files: ', req.files)
    // console.log('req.cookies: ', req.cookies)
    // console.log('req.jwtDecoded: ', req.jwtDecoded)

    const userId = req.jwtDecoded._id

    // Điều hướng dữ liệu sang tầng Service
    const createdBoard = await boardService.createNew(userId, req.body)
    
    // Lấy ID của board vừa tạo từ trường _id
    const newBoardId = createdBoard._id;

    // Nếu board có type là public thì lưu vào templates
    if (req.body.type === 'public') {
      // Chuẩn bị dữ liệu cho template, loại bỏ type và đảm bảo boardId, cover đúng định dạng
      const templateData = {
        ...req.body,
        boardId: newBoardId.toString(), // Chuyển ObjectId sang string
        // Cung cấp giá trị hợp lệ cho cover
        cover: 'https://placehold.co/500x300/png' , // TODO: Cần xử lý cover thực tế sau
        createdBy: userId
      };
      // Xóa trường type vì schema template không có
      delete templateData.type;

      await createTemplateService(templateData);
    }

    console.log('[boardController.createNew] About to send response:', createdBoard);
    // Có kết quả thì trả về phía Client
    res.status(StatusCodes.CREATED).json(createdBoard)
  } catch (error) { next(error) }
}

const getDetails = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const boardId = req.params.id
    // Sau này ở khóa MERN Stack Advance nâng cao học trực tiếp sẽ có thêm userId nữa để chỉ lấy board thuộc về user đó thôi chẳng hạn...vv
    const board = await boardService.getDetails(userId, boardId)
    res.status(StatusCodes.OK).json(board)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const boardId = req.params.id
    const updateData = req.body
    const userId = req.jwtDecoded._id

    // Nếu đang chuyển từ private sang public
    if (updateData.type === 'public') {
      // Chuẩn bị dữ liệu cho template, loại bỏ type và đảm bảo boardId, cover đúng định dạng
      const templateData = {
        ...updateData,
        boardId: boardId, // Sử dụng boardId từ params
        // Cung cấp giá trị hợp lệ cho cover (có thể lấy từ updateData hoặc mặc định)
        // Sử dụng cover từ updateData nếu có, nếu không dùng mặc định
        cover: updateData.cover || 'https://placehold.co/500x300/png' , // TODO: Cần xử lý cover thực tế sau
        createdBy: userId
      };
      // Xóa các trường không cần thiết
      delete templateData.type;

      // Kiểm tra xem template đã tồn tại chưa dựa vào boardId
      console.log(`[boardController.update] Searching for template with boardId: ${boardId}`);
      const existingTemplate = await templateModel.findOneByBoardId(boardId);
      console.log(`[boardController.update] Result of findOneByBoardId: ${JSON.stringify(existingTemplate)}`);

      if (existingTemplate) {
        // Nếu template đã tồn tại, cập nhật template đó
        console.log(`[boardController.update] Template with boardId ${boardId} found, updating...`);
        await updateTemplateService(existingTemplate._id.toString(), templateData); // Cập nhật dựa trên _id của template
      } else {
        // Nếu template chưa tồn tại, tạo mới
        console.log(`[boardController.update] Template with boardId ${boardId} not found, creating new...`);
        await createTemplateService(templateData);
      }
    } else if (updateData.type === 'private') {
      // Nếu đang chuyển từ public sang private thì xóa khỏi templates
      try {
        await deleteTemplateService(boardId, userId)
      } catch (error) {
        // Nếu template không tồn tại thì bỏ qua lỗi
        if (error.statusCode !== StatusCodes.NOT_FOUND) {
          throw error
        }
      }
    }

    const updatedBoard = await boardService.update(boardId, updateData)
    res.status(StatusCodes.OK).json(updatedBoard)
  } catch (error) {
    next(error)
  }
}

const moveCardToDifferentColumn = async (req, res, next) => {
  try {
    const result = await boardService.moveCardToDifferentColumn(req.body)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const getBoards = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    // page và itemsPerPage được truyền vào trong query url từ phía FE nên BE sẽ lấy thông qua req.query
    const { page, itemsPerPage, q } = req.query
    const queryFilters = q
    // console.log(queryFilters)

    const results = await boardService.getBoards(userId, page, itemsPerPage, queryFilters)

    res.status(StatusCodes.OK).json(results)
  } catch (error) { next(error) }
}

const deleteBoard = async (req, res, next) => {
  try {
    const boardId = req.params.id
    const userId = req.jwtDecoded._id

    // Lấy thông tin chi tiết của board để kiểm tra type
    const board = await boardService.getDetails(userId, boardId);

    // Chỉ xóa template nếu board có type là 'public'
    if (board && board.type === 'public') {
      // Xóa board khỏi templates nếu có
      try {
        await deleteTemplateService(boardId, userId)
      } catch (error) {
        // Nếu template không tồn tại thì bỏ qua lỗi
        if (error.statusCode !== StatusCodes.NOT_FOUND) {
          throw error
        }
      }
    }

    // Xóa board (luôn luôn thực hiện)
    const result = await boardService.deleteBoard(boardId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const boardController = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  getBoards,
  deleteBoard
}
