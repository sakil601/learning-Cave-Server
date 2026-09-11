import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import v1Router from './routes/v1/index.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'learning-cave-server', status: 'ok' });
});

app.use('/api/v1', v1Router);
app.use(notFound);
app.use(errorHandler);

export default app;
