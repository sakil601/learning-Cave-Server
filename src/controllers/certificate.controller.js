import Certificate from "../models/Certificate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await Certificate.find({
    user: req.user._id,
    status: "active",
  })
    .populate({
      path: "product",
      select: "title slug thumbnail",
    })
    .populate({
      path: "course",
      select: "level language",
    })
    .sort({ issuedAt: -1 })
    .lean();

  res.json({
    success: true,
    data: certificates,
  });
});

export const verifyCertificate = asyncHandler(async (req, res) => {
  const { certificateId } = req.params;

  const certificate = await Certificate.findOne({
    certificateId,
  })
    .select("certificateId issuedAt status metadata")
    .lean();

  if (!certificate) {
    throw new ApiError(404, "CERTIFICATE_NOT_FOUND", "Certificate not found.");
  }

  res.json({
    success: true,
    data: {
      certificateId: certificate.certificateId,

      issuedAt: certificate.issuedAt,

      status: certificate.status,

      studentName: certificate.metadata?.studentName,

      courseTitle: certificate.metadata?.courseTitle,

      instructorName: certificate.metadata?.instructorName,
    },
  });
});
