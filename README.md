# AI-Powered Chat System

AI-Powered Chat System is a full-stack chat app inspired by modern AI assistants.  
It includes authentication, OTP-based signup, persistent per-user chat history, and production-ready deployment setup.

## Features

- JWT-based authentication (`login`, `logout`)
- OTP-based signup flow (`request OTP` -> `verify OTP`)
- AI response generation using Groq
- Web search context with Serper before LLM response
- Per-chat session history persisted in MongoDB
- Chat list + message history loaded from database in UI
- Rename chat title manually
- Delete chat session 
- Profile popup with user name and email
- Responsive dark UI for desktop/mobile
- Deployment-ready frontend/backend env setup

## Tech Stack

- Frontend: React, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MongoDB Atlas
- AI Provider: Groq
- Search Provider: Serper
- OTP Delivery: Brevo API

## Project Structure

```text
AI-powered-chat-system-/
  README.md
backend/
    controller/
    middleware/
    model/
    routes/
    config.js
    index.js
    package.json
frontend/
    src/
      components/
      context/
      App.jsx
      main.jsx
    package.json
```

## Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URI=your_mongodb_connection_string
JWT_PASSWORD=your_jwt_secret
NODE_ENV=production_or_development
PORT=4002

GROQ_API_KEY=your_groq_api_key
LLM_MODEL=llama-3.3-70b-versatile
SERPER_API_KEY=your_serper_api_key

FRONTEND_URL=https://your_url.onrender.com(for production)

# Preferred OTP mode (Brevo HTTP API)
BREVO_API_KEY=your_brevo_api_key
SMTP_FROM=verified_sender_email@example.com

```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=https://your_url.onrender.com(for production)
```

## Local Development

### 1) Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Run backend

```bash
cd backend
npm start
```

### 3) Run frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`

## Deployment

### Backend (Render)

1. Create a new Web Service from this repo.
2. Set Root Directory to `backend`.
3. Set Start Command to `npm start`.
4. Add backend environment variables.
5. Deploy.

### Frontend (Vercel)

1. Import repo in Vercel.
2. Set Root Directory to `frontend`.
3. Add env var:
   - `VITE_API_URL=https://your_url.onrender.com`
4. Deploy.

## API Overview

### User Routes

- `POST /api/v1/user/signup/request-otp`
- `POST /api/v1/user/signup/verify-otp`
- `POST /api/v1/user/login`
- `GET /api/v1/user/logout`

### Chat Routes (Auth Required)

- `POST /api/v1/deepseekai/promt`
- `GET /api/v1/deepseekai/chats`
- `GET /api/v1/deepseekai/chat/:chatId/messages`
- `DELETE /api/v1/deepseekai/chat/:chatId`

## Future Improvements

- Add message streaming responses
- Add richer profile management
- Add role-based moderation and safety filters
- Add unit and integration tests
