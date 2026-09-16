import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import { getStudentModuleResources } from "../../controllers/module-resource.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/modules/:moduleId/resources", getStudentModuleResources);

export default router;
