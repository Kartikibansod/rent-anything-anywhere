# Rent Anything Anywhere

A MERN peer-to-peer marketplace for hostel students and nearby locals to buy, sell, and rent items.

## Key Features

- Restored full-screen split login UI with trust badges and Google sign in.
- Email OTP verification on registration and optional OTP-based login 2FA.
- Google OAuth 2.0 login with first-login `userType` onboarding and JWT issuance.
- Stripe payments (`/api/payments/create-intent`) with UPI/card support + webhook confirmation.
- Verified-user-only payment gate (email verified + profile completed + student ID approval for students).
- Cash-on-meetup still supported with in-app dual confirmations.
- AI condition scorer (`gpt-4o`) with condition score, auto condition fill, and reasoning.
- Fraud detection and auto-flagging for suspicious listings, with admin review flow.
- Price history capture on sold/rented completion and chart on listing detail page.
- Optional phone trust workflow using Twilio-backed OTP trigger.

## Structure

- `client/` - React frontend shell
- `server/` - Express API, MongoDB models, JWT auth, Stripe, OTP, AI, and Socket.io bootstrap

## Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

## Required Environment Variables (`server/.env`)

- `MONGO_URI`, `JWT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE`

## Frontend Environment Variables (`client/.env`)

- `VITE_API_URL=https://your-backend.onrender.com`
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
- `VITE_GOOGLE_CLIENT_ID=...`
