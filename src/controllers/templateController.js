/**
 * Template Controllers
 */
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { 
  getTemplatesService,
  createTemplateService,
  getTemplateDetailsService,
  updateTemplateService,
  deleteTemplateService
} from '~/services/templateService'

const getTemplates = async (req, res, next) => {
  try {
    // Lấy userId từ req.jwtDecoded nếu có (sau khi xác thực)
    const userId = req.jwtDecoded?._id;
    const templates = await getTemplatesService(userId);
    res.status(StatusCodes.OK).json(templates);
  } catch (error) {
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    // Lấy userId từ req.jwtDecoded
    const userId = req.jwtDecoded._id;
    // Dữ liệu template mới từ req.body
    const newTemplateData = { ...req.body, createdBy: userId };
    const createdTemplate = await createTemplateService(newTemplateData);
    res.status(StatusCodes.CREATED).json(createdTemplate);
  } catch (error) {
    next(error);
  }
};

const getTemplateDetails = async (req, res, next) => {
  try {
    // Lấy template ID từ req.params
    const templateId = req.params.id;
    const template = await getTemplateDetailsService(templateId);
    if (!template) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Template not found');
    }
    res.status(StatusCodes.OK).json(template);
  } catch (error) {
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    // Lấy template ID từ req.params
    const templateId = req.params.id;
    // Dữ liệu cập nhật từ req.body
    const updateData = req.body;
    const updatedTemplate = await updateTemplateService(templateId, updateData);
    if (!updatedTemplate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Template not found');
    }
    res.status(StatusCodes.OK).json(updatedTemplate);
  } catch (error) {
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    // Lấy template ID từ req.params
    const templateId = req.params.id;
     // Lấy userId từ req.jwtDecoded
    const userId = req.jwtDecoded._id;
    const result = await deleteTemplateService(templateId, userId);
    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Template not found');
    }
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

export const templateController = {
  getTemplates,
  createTemplate,
  getTemplateDetails,
  updateTemplate,
  deleteTemplate
}; 