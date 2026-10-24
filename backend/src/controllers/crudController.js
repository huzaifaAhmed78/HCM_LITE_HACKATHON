import { docView } from '../views/docView.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export function makeCrudController(service, label) {
  return {
    list: asyncHandler(async (req, res) => {
      sendSuccess(res, { data: (await service.list()).map(docView) })
    }),
    create: asyncHandler(async (req, res) => {
      const doc = await service.create(req.user, req.body)
      sendSuccess(res, { data: docView(doc), message: `${label} created`, status: 201 })
    }),
    update: asyncHandler(async (req, res) => {
      const doc = await service.update(req.user, req.params.id, req.body)
      sendSuccess(res, { data: docView(doc), message: `${label} updated` })
    }),
    remove: asyncHandler(async (req, res) => {
      await service.remove(req.user, req.params.id)
      sendSuccess(res, { message: `${label} deleted` })
    }),
  }
}
