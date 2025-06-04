/**
 * Template Model
 * Define template schema and methods for interacting with the database.
 */
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define Collection Name and Schema
const TEMPLATE_COLLECTION_NAME = 'templates'
const TEMPLATE_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().required().min(3).max(256).trim().strict(),
  description: Joi.string().required().min(3).max(256).trim().strict(),
  cover: Joi.string().required().trim().strict(),
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await TEMPLATE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    // Convert createdBy to ObjectId, keep boardId as string
    const insertData = {
      ...validData,
      createdBy: new ObjectId(validData.createdBy)
    }
    const createdTemplate = await GET_DB().collection(TEMPLATE_COLLECTION_NAME).insertOne(insertData)
    return createdTemplate
  } catch (error) { throw new Error(error) }
}

const getAll = async () => {
  try {
    const templates = await GET_DB().collection(TEMPLATE_COLLECTION_NAME).find().toArray();
    return templates;
  } catch (error) { throw new Error(error) }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(TEMPLATE_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: false
    })
    return result
  } catch (error) { throw new Error(error) }
}

const findManyByIds = async (ids) => {
  try {
    const objectIds = ids.map(id => new ObjectId(id));
    const result = await GET_DB().collection(TEMPLATE_COLLECTION_NAME).find({
      _id: { $in: objectIds },
      _destroy: false
    }).toArray();
    return result;
  } catch (error) { throw new Error(error) }
}

const update = async (id, data) => {
  try {
    // Remove immutable fields if present
    const updateData = { ...data }
    delete updateData._id

    // If boardId or createdBy is being updated, convert to ObjectId
    if (updateData.boardId) updateData.boardId = new ObjectId(updateData.boardId)
    if (updateData.createdBy) updateData.createdBy = new ObjectId(updateData.createdBy)

    const result = await GET_DB().collection(TEMPLATE_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const deleteOneById = async (id) => {
  try {
    console.log(`[templateModel.deleteOneById] Attempting to delete document with ID: ${id}`);
    const result = await GET_DB().collection(TEMPLATE_COLLECTION_NAME).deleteOne({
      _id: new ObjectId(id)
    })
    console.log(`[templateModel.deleteOneById] deleteOne result: ${JSON.stringify(result)}`);
    return result
  } catch (error) {
    console.error(`[templateModel.deleteOneById] Error deleting document with ID ${id}:`, error);
    throw new Error(error) // Re-throw to be caught by the service layer
  }
}

const deleteOneByBoardId = async (boardId) => {
  try {
    console.log(`[templateModel.deleteOneByBoardId] Attempting to delete document with boardId: ${boardId}`);
    const result = await GET_DB().collection(TEMPLATE_COLLECTION_NAME).deleteOne({
      boardId: boardId // Tìm theo trường boardId (string)
    });
    console.log(`[templateModel.deleteOneByBoardId] deleteOne result: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.error(`[templateModel.deleteOneByBoardId] Error deleting document with boardId ${boardId}:`, error);
    throw new Error(error);
  }
};

export const templateModel = {
  TEMPLATE_COLLECTION_NAME,
  TEMPLATE_COLLECTION_SCHEMA,
  createNew,
  getAll,
  findOneById,
  findManyByIds,
  update,
  deleteOneById,
  deleteOneByBoardId
} 