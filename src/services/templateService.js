/**
 * Services for Template related operations
 */

import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { templateModel } from '~/models/templateModel'
// import { boardModel } from '~/models/boardModel' // Tạm thời không cần boardModel ở đây
import { userModel } from '~/models/userModel'

const createTemplateService = async (data) => {
  try {
    console.log('[createTemplateService] Data before calling templateModel.createNew:', data);
    const createdTemplateResult = await templateModel.createNew(data);

    // Check if insertion was acknowledged and an insertedId exists
    if (!createdTemplateResult || !createdTemplateResult.acknowledged || !createdTemplateResult.insertedId) {
       throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create template!');
    }

    const newTemplateId = createdTemplateResult.insertedId;

    // Update user's template list
    // Sử dụng createdBy từ data đầu vào và newTemplateId vừa tạo
    console.log(`[createTemplateService] About to call userModel.pushTemplateId with userId: ${data.createdBy} and templateId: ${newTemplateId.toString()}`);
    await userModel.pushTemplateId(data.createdBy, newTemplateId.toString());

    console.log(`[createTemplateService] Template created successfully! ID: ${newTemplateId}`);

    // Lấy lại document template vừa tạo để trả về (tùy theo yêu cầu của frontend)
    const createdTemplate = await templateModel.findOneById(newTemplateId);

    return createdTemplate;
  } catch (error) {
    throw error
  }
}

const getTemplatesService = async (userId) => {
  try {
    console.log('[getTemplatesService] Received userId:', userId);
    if (userId) {
      // Lấy danh sách ID template từ user
      const user = await userModel.findOneById(userId);
      if (!user) {
        console.log('[getTemplatesService] User not found for userId:', userId);
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
      }
      const templateIds = user.templates;
      console.log('[getTemplatesService] User templates IDs:', templateIds);

      // Lấy chi tiết các template dựa trên IDs
      const templates = await templateModel.findManyByIds(templateIds);
      console.log('[getTemplatesService] Templates found:', templates);
      return templates;
    } else {
      // Nếu không có userId, lấy tất cả templates
      console.log('[getTemplatesService] No userId, fetching all templates.');
      const templates = await templateModel.getAll();
      console.log('[getTemplatesService] All templates found:', templates);
      return templates;
    }
  } catch (error) {
    throw error
  }
}

const getTemplateDetailsService = async (id) => {
  try {
    const template = await templateModel.findOneById(id);
    if (!template) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Template not found!');
    }
    return template;
  } catch (error) {
    throw error
  }
}

const updateTemplateService = async (id, data) => {
  try {
    const updatedTemplate = await templateModel.update(id, data);
    if (!updatedTemplate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Template not found or failed to update!');
    }
    return updatedTemplate;
  } catch (error) {
    throw error
  }
}

const deleteTemplateService = async (id, userId) => {
  try {
    console.log(`[deleteTemplateService] Attempting to delete template with ID: ${id} for user: ${userId}`);

    // Attempt to delete template document from templates collection
    const deleteResult = await templateModel.deleteOneById(id);
    console.log(`[deleteTemplateService] deleteOneById result: ${JSON.stringify(deleteResult)}`);

    // We still attempt to remove the template id from the user's list
    console.log(`[deleteTemplateService] Attempting to remove template ID ${id} from user ${userId} list.`);
    await userModel.pullTemplateId(userId, id);
    console.log(`[deleteTemplateService] Successfully attempted to remove template ID ${id} from user ${userId} list.`);

    // Note: We don't necessarily need to throw an error if the template document wasn't found,
    // as the main goal when changing to private is to remove it from the user's list.
    // The boardController already handles ignoring NOT_FOUND from here.

    return { message: 'Template deletion process completed.' };

  } catch (error) {
    console.error(`[deleteTemplateService] Error in template deletion process for ID ${id}:`, error);
    // Re-throw errors other than NOT_FOUND if necessary, or handle them as appropriate
    // For now, re-throw to be caught by the controller
    throw error
  }
}

export { createTemplateService, getTemplatesService, getTemplateDetailsService, updateTemplateService, deleteTemplateService }; 