import { ApiError } from "../utils/api-error.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body ?? {},
    params: req.params ?? {},
    query: req.query ?? {},
  });

  if (!result.success) {
    return next(
      new ApiError(
        400,
        "VALIDATION_ERROR",
        "Invalid request data.",
        result.error.flatten(),
      ),
    );
  }

  req.validated = result.data;
  next();
};
