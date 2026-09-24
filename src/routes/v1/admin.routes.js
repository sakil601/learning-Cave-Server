import { Router } from "express";
import User from "../../models/User.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiError } from "../../utils/api-error.js";
import { requireAuth, allowRoles } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from "../../validators/category.validator.js";
import {
  createCourseSchema,
  updateCourseSchema,
  courseIdSchema,
  createModuleSchema,
  updateModuleSchema,
  moduleIdSchema,
  createLessonSchema,
  updateLessonSchema,
  lessonIdSchema,
} from "../../validators/course.validator.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/category.controller.js";

import {
  createRecordedCourse,
  listManagedCourses,
  getManagedCourse,
  updateRecordedCourse,
  submitCourseForReview,
  publishCourse,
  rejectCourse,
  archiveCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../../controllers/course.controller.js";
import {
  verifyManualPayment,
  rejectManualPayment,
} from "../../controllers/payment.controller.js";
import {
  createQuiz,
  addQuestion,
  getManagedQuiz,
} from "../../controllers/quiz.controller.js";
import {
  createModuleResource,
  updateModuleResource,
  deleteModuleResource,
  getModuleResourcesForAdmin,
} from "../../controllers/module-resource.controller.js";
import {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
} from "../../controllers/coupon.controller.js";
import {
  createLiveCourse,
  createBatch,
  createLiveSession,
  getManagedLiveCourse,
  updateBatch,
  updateLiveSession,
} from "../../controllers/live-course.controller.js";

import {
  createAdminProduct,
  listAdminProducts,
  updateAdminProduct,
  deleteAdminProduct,
} from "../../controllers/admin-product.controller.js";
import {
  createEbook,
  updateEbook,
  getManagedEbook,
} from "../../controllers/ebook.controller.js";

import {
  createDigitalProduct,
  getManagedDigitalProduct,
  updateDigitalProduct,
} from "../../controllers/digital-product.controller.js";

import {
  uploadEbookPdf,
  uploadDigitalProductFile,
} from "../../middlewares/upload.middleware.js";

import {
  uploadEbookAsset,
  uploadDigitalProductAsset,
} from "../../controllers/asset.controller.js";
import {
  createBundle,
  getManagedBundle,
  updateBundle,
} from "../../controllers/bundle.controller.js";

const router = Router();
router.use(requireAuth, allowRoles("admin"));
router.get("/categories", listCategories);
router.post("/categories", validate(createCategorySchema), createCategory);
router.patch("/categories/:id", validate(updateCategorySchema), updateCategory);
router.delete("/categories/:id", validate(categoryIdSchema), deleteCategory);
router.get("/courses", listManagedCourses);
router.post("/courses", validate(createCourseSchema), createRecordedCourse);
router.get("/courses/:id", validate(courseIdSchema), getManagedCourse);
router.patch(
  "/courses/:id",
  validate(updateCourseSchema),
  updateRecordedCourse,
);
router.post(
  "/courses/:id/submit-review",
  validate(courseIdSchema),
  submitCourseForReview,
);
router.post("/courses/:id/publish", validate(courseIdSchema), publishCourse);
router.post("/courses/:id/reject", validate(courseIdSchema), rejectCourse);
router.post("/courses/:id/archive", validate(courseIdSchema), archiveCourse);

router.post(
  "/courses/:courseId/modules",
  validate(createModuleSchema),
  createModule,
);
router.patch("/modules/:moduleId", validate(updateModuleSchema), updateModule);
router.delete("/modules/:moduleId", validate(moduleIdSchema), deleteModule);
router.post(
  "/modules/:moduleId/lessons",
  validate(createLessonSchema),
  createLesson,
);
router.patch("/lessons/:lessonId", validate(updateLessonSchema), updateLesson);
router.delete("/lessons/:lessonId", validate(lessonIdSchema), deleteLesson);
router.patch("/payments/:id/verify", verifyManualPayment);
router.patch("/payments/:id/reject", rejectManualPayment);
router.post("/modules/:moduleId/quiz", createQuiz);

router.post("/quizzes/:quizId/questions", addQuestion);

router.get("/quizzes/:quizId", getManagedQuiz);

router.post("/modules/:moduleId/resources", createModuleResource);

router.get("/modules/:moduleId/resources", getModuleResourcesForAdmin);

router.patch("/module-resources/:resourceId", updateModuleResource);

router.delete("/module-resources/:resourceId", deleteModuleResource);
router.post("/coupons", createCoupon);

router.get("/coupons", listCoupons);

router.patch("/coupons/:id", updateCoupon);

router.delete("/coupons/:id", deleteCoupon);

router.post("/live-courses", createLiveCourse);

router.get("/live-courses/:liveCourseId", getManagedLiveCourse);

router.post("/live-courses/:liveCourseId/batches", createBatch);
router.patch("/live-sessions/:sessionId", updateLiveSession);

router.post("/batches/:batchId/sessions", createLiveSession);

router.patch("/batches/:batchId", updateBatch);

router.post("/products", createAdminProduct);

router.get("/products", listAdminProducts);

router.patch("/products/:id", updateAdminProduct);

router.delete("/products/:id", deleteAdminProduct);
router.post("/products/:productId/ebook", createEbook);

router.get("/products/:productId/ebook", getManagedEbook);

router.patch("/ebooks/:ebookId", updateEbook);

router.post("/assets/ebook", uploadEbookPdf, uploadEbookAsset);

router.post("/products/:productId/digital-product", createDigitalProduct);

router.get("/products/:productId/digital-product", getManagedDigitalProduct);

router.patch("/digital-products/:digitalProductId", updateDigitalProduct);

router.post(
  "/assets/digital-product",
  uploadDigitalProductFile,
  uploadDigitalProductAsset,
);

router.post("/products/:productId/bundle", createBundle);

router.get("/products/:productId/bundle", getManagedBundle);

router.patch("/bundles/:bundleId", updateBundle);

router.patch(
  "/instructors/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!["active", "rejected", "suspended"].includes(status)) {
      throw new ApiError(400, "INVALID_STATUS", "Invalid instructor status.");
    }

    const instructor = await User.findOne({
      _id: req.params.id,
      role: "instructor",
    });

    if (!instructor) {
      throw new ApiError(404, "INSTRUCTOR_NOT_FOUND", "Instructor not found.");
    }

    instructor.accountStatus = status;
    await instructor.save();

    res.json({
      success: true,
      message: `Instructor status changed to ${status}.`,
      data: {
        user: {
          id: instructor._id,
          name: instructor.name,
          email: instructor.email,
          role: instructor.role,
          accountStatus: instructor.accountStatus,
        },
      },
    });
  }),
);
export default router;
