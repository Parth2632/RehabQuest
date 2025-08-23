# RehabQuest

A comprehensive rehabilitation and mental health platform built with React and Vite, integrating Firebase for core functionality and Supabase for image storage.

## Tech Stack

- **Frontend**: React + Vite
- **Database & Auth**: Firebase (Firestore, Authentication)
- **Image Storage**: Supabase Storage
- **AI Integration**: OpenAI, Google Gemini
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **3D Graphics**: Three.js, React Three Fiber

## Features

- 🔐 User Authentication (Patients & Therapists)
- 📊 Mood Tracking & Analytics
- 📝 Digital Journaling
- 🤖 AI-Powered Chatbots (OpenAI & Gemini)
- 🎮 CBT Games & Interactive Tools
- 📸 Profile Picture Management (Supabase)
- 👥 Community Features
- 📅 Appointment Booking
- 📈 Progress Visualization

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Firebase (already set up in `src/firebase-config.js`)

3. Set up Supabase Storage:
   - See `SUPABASE_SETUP.md` for detailed instructions
   - Create a `profile-images` bucket in your Supabase dashboard

4. Start development server:
   ```bash
   npm run dev
   ```

## Architecture

### Firebase Integration
- **Authentication**: User login/signup for patients and therapists
- **Firestore**: User data, mood entries, journal entries, therapist profiles
- **Functions**: Server-side logic and API endpoints

### Supabase Integration
- **Storage**: Profile picture uploads and management
- **Features**: File validation, automatic resizing, secure access

## File Structure

```
src/
├── components/          # React components
├── services/           # API and service functions
│   ├── supabase-storage.js  # Supabase image upload service
│   ├── firebase-ai.js       # Firebase AI integration
│   └── ...
├── firebase-config.js   # Firebase configuration
├── supabase-config.js   # Supabase configuration
└── ...
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start backend server
- `npm run dev:all` - Start both frontend and backend

For detailed setup instructions, see `SETUP.md` and `SUPABASE_SETUP.md`.
