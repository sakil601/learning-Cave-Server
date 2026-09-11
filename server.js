import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const port = Number(process.env.PORT || 5000);

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Learning Cave API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
