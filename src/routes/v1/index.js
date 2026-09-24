import { Router } from "express";
import authRoutes from "./auth.routes.js";
import productRoutes from "./product.routes.js";
import categoryRoutes from "./category.routes.js";
import courseRoutes from "./course.routes.js";
import instructorRoutes from "./instructor.routes.js";
import adminRoutes from "./admin.routes.js";
import orderRoutes from "./order.routes.js";
import paymentRoutes from "./payment.routes.js";
import enrollmentRoutes from "./enrollment.routes.js";
import progressRoutes from "./progress.routes.js";
import quizRoutes from "./quiz.routes.js";
import certificateRoutes from "./certificate.routes.js";
import moduleResourceRoutes from "./module-resource.routes.js";
import reviewRoutes from "./review.routes.js";
import couponRoutes from "./coupon.routes.js";
import liveCourseRoutes from "./live-course.routes.js";
import ebookRoutes from "./ebook.routes.js";
import digitalProductRoutes from "./digital-product.routes.js";

const router = Router();
router.get("/", (req, res) =>
  res.json({ success: true, service: "Learning Cave API", version: "v1" }),
);
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/courses", courseRoutes);
router.use("/instructor", instructorRoutes);
router.use("/admin", adminRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/progress", progressRoutes);
router.use("/quizzes", quizRoutes);
router.use("/certificates", certificateRoutes);
router.use("/learning", moduleResourceRoutes);
router.use("/reviews", reviewRoutes);
router.use("/coupons", couponRoutes);
router.use("/live-courses", liveCourseRoutes);
router.use("/ebooks", ebookRoutes);
router.use("/digital-products", digitalProductRoutes);

export default router;
