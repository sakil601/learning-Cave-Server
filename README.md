# Learning Cave Server

Separate Express + MongoDB API for Learning Cave web and future mobile clients.

## Current implemented foundation
- Express 5 + Mongoose
- API versioning under `/api/v1`
- Helmet, CORS, JSON limits, rate limiting
- Central error format
- JWT access + refresh token architecture
- httpOnly cookie support for web
- Student / instructor / admin user model
- Instructor approval status
- Registration, login, refresh, logout, `/auth/me`
- Public product listing/detail API with pagination
- Core normalized Mongoose models for products, recorded courses, quizzes, live batches, commerce, access, refunds, certificates, notifications and files
- Admin seed script

## Setup
```bash
cp .env.example .env
npm install
npm run seed:admin
npm run dev
```

Default local API: `http://localhost:5000`

### Health
`GET /health`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Login body uses one `login` field so either email or phone can be used:
```json
{ "login": "student@example.com", "password": "password" }
```

### Products
- `GET /api/v1/products?page=1&limit=12`
- `GET /api/v1/products/:slug`

## Next implementation phase
The folder structure is intentionally ready for controllers/services/routes for categories, courses/modules/lessons, access, progress, quizzes, cart, wishlist, orders, payments, coupons, reviews, certificates, live batches/sessions, downloads, notifications and admin workflows.

## Step 30: Recorded Course CRUD

This build adds working Category, Recorded Course, Module and Lesson APIs.

### Public
- `GET /api/v1/categories`
- `GET /api/v1/categories/:slug`
- `GET /api/v1/products`
- `GET /api/v1/courses/:slug`

### Instructor (active instructor account required)
- `GET /api/v1/instructor/courses`
- `POST /api/v1/instructor/courses`
- `GET /api/v1/instructor/courses/:id`
- `PATCH /api/v1/instructor/courses/:id`
- `POST /api/v1/instructor/courses/:id/submit-review`
- `POST /api/v1/instructor/courses/:courseId/modules`
- `PATCH/DELETE /api/v1/instructor/modules/:moduleId`
- `POST /api/v1/instructor/modules/:moduleId/lessons`
- `PATCH/DELETE /api/v1/instructor/lessons/:lessonId`

### Admin
- Category CRUD under `/api/v1/admin/categories`
- Course CRUD under `/api/v1/admin/courses`
- Publish/reject/archive workflow
- Module/Lesson management

Important: an admin must choose an active instructor when creating a recorded course.
