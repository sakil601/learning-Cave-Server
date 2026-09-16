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
export default router;
