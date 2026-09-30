# Orbit

Orbit is a premium lost & found application concept focused on image-based matching, precise location reporting, and a futuristic 3D-inspired interface.

## Features

- Report lost items with photos and exact GPS coordinates
- Report found items with photos and location data
- Smart match detection using image hash similarity and proximity scoring
- Real-time visual dashboard inspired by orbital motion and neon glassmorphism
- High-visibility action buttons and easy item tracking
- Built as a web application with a mobile app UI shell

## Stack

- Frontend: React + Vite
- Backend: Express + SQLite
- Image matching: perceptual hash similarity
- Mobile concept: Expo / React Native

## Quick start

1. Install dependencies:

   npm install

2. Start the backend and frontend:

   npm run dev

3. Open the web app at:

   http://localhost:5173

4. Backend API runs at:

   http://localhost:4000/api

## API endpoints

- GET /api/health
- GET /api/items
- GET /api/items/:id
- POST /api/items
- POST /api/items/:id/resolve

## Notes

This is a functional MVP designed to demonstrate the workflow clearly and provide a strong foundation for a production app.

The match engine uses simple image hashing as a lightweight starting point. For a production deployment, this can be upgraded to CLIP, MobileNet, or another embedding-based similarity model.
