export const corsOptions = {
  origin(origin, callback) {
    const allowed = (process.env.CLIENT_URL || 'http://localhost:3000')
      .split(',')
      .map((x) => x.trim());
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
};
