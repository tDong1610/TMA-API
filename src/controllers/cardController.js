/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { StatusCodes } from 'http-status-codes'
import { cardService } from '~/services/cardService'

const createNew = async (req, res, next) => {
  try {
    const createdCard = await cardService.createNew(req.body)
    res.status(StatusCodes.CREATED).json(createdCard)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const cardCoverFile = req.file
    const userInfo = req.jwtDecoded
    const updatedCard = await cardService.update(cardId, req.body, cardCoverFile, userInfo)

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const deleteCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const result = await cardService.deleteCard(cardId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const uploadAttachment = async (req, res, next) => {
  try {
    const cardId = req.params.cardId
    const attachmentFile = req.file
    const result = await cardService.uploadAttachment(cardId, attachmentFile)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const deleteAttachment = async (req, res, next) => {
  try {
    const cardId = req.params.cardId
    const attachmentId = req.params.attachmentId
    const result = await cardService.deleteAttachment(cardId, attachmentId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

export const cardController = {
  createNew,
  update,
  deleteCard,
  uploadAttachment,
  deleteAttachment
}
