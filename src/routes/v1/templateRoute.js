/**
 * Template Routes
 */
import express from 'express'
import { templateController } from '~/controllers/templateController'
// import { templateValidation } from '~/validations/templateValidation' // Sẽ thêm sau khi cần validate data
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Route for getting all templates (public) - no authentication required
Router.route('/')
  .get(authMiddleware.isAuthorized, templateController.getTemplates)

// Apply auth middleware to the rest of the template routes
Router.use(authMiddleware.isAuthorized)

Router.route('/')
  .post(templateController.createTemplate) // Create new template

Router.route('/:id')
  .get(templateController.getTemplateDetails) // Get template details by ID
  .put(templateController.updateTemplate) // Update template by ID
  .delete(templateController.deleteTemplate) // Delete template by ID

export const templateRoute = Router 