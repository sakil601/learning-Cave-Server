export const corsOptions = {
  origin(origin, callback) {
    const allowed = [
      ...(process.env.CLIENT_URL || "http://localhost:3000")
        .split(",")
        .map((x) => x.trim()),

      // SSLCommerz Sandbox
      "https://sandbox-gw.sslcommerz.com",
      "https://sandbox.sslcommerz.com",

      // SSLCommerz Live
      "https://securepay.sslcommerz.com",
    ];

    // Server-to-server request / Postman / REST Client / webhook
    if (!origin) {
      return callback(null, true);
    }

    // Known origins
    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked CORS origin:", origin);

    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },

  credentials: true,
};
