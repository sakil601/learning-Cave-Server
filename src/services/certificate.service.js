import Certificate from "../models/Certificate.js";
import Course from "../models/Course.js";
import Product from "../models/Product.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";

function generateCertificateId() {
  return `LC-CERT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function issueCertificateIfEligible({
  userId,
  courseId,
  progress,
}) {
  if (!progress) {
    return null;
  }

  if (progress.progressPercent !== 100) {
    return null;
  }

  if (!progress.completedAt) {
    return null;
  }

  const course = await Course.findById(courseId).lean();

  if (!course) {
    return null;
  }

  if (!course.certificate?.enabled) {
    return null;
  }

  const existingCertificate = await Certificate.findOne({
    user: userId,
    course: courseId,
  });

  if (existingCertificate) {
    return existingCertificate;
  }

  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
    status: "active",
  }).lean();

  if (!enrollment) {
    return null;
  }

  const [product, user, instructor] = await Promise.all([
    Product.findById(course.product).select("title").lean(),

    User.findById(userId).select("name").lean(),

    User.findById(course.instructor).select("name").lean(),
  ]);

  if (!product || !user) {
    return null;
  }

  const certificate = await Certificate.create({
    certificateId: generateCertificateId(),

    user: userId,

    product: course.product,

    course: courseId,

    enrollment: enrollment._id,

    issuedAt: new Date(),

    status: "active",

    metadata: {
      studentName: user.name,
      courseTitle: product.title,
      instructorName: instructor?.name || "",
    },
  });
  await createNotification({
    userId,
    type: "certificate_issued",
    title: "Certificate Issued",
    message: `Your certificate for ${product.title} is now available.`,
    link: `/certificates/${certificate.certificateId}`,
  });

  return certificate;
}
