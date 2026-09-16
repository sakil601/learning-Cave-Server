import Review from "../models/Review.js";
import Product from "../models/Product.js";

export async function recalculateProductRating(productId) {
  const stats = await Review.aggregate([
    {
      $match: {
        product: productId,
        status: "published",
      },
    },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingSummary =
    stats.length > 0
      ? {
          average: Number(stats[0].average.toFixed(1)),
          count: stats[0].count,
        }
      : {
          average: 0,
          count: 0,
        };

  await Product.findByIdAndUpdate(productId, {
    ratingSummary,
  });

  return ratingSummary;
}
