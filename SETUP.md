# RehabQuest Enhanced Features - Setup Guide

## 🚀 What's New

Your RehabQuest app now includes all the requested features:

### ✅ Completed Features:

1. **Enhanced Firestore Security Rules**
   - Only authenticated users can write community posts
   - Users can read/write only their own users/{uid}/ subcollections
   - Therapists can read their own therapist profile and assigned bookings
   - Strict privacy controls for all user data

2. **Therapist Selection for Bookings**
   - Book Call form now includes therapist selection dropdown
   - `therapistId` is written to call requests
   - Therapist Dashboard filters bookings by therapist ID

3. **Enhanced Community Features**
   - ✅ Upvote/downvote posts
   - ✅ Comment on posts
   - ✅ Real-time interaction updates
   - ✅ Collapsible comments section

4. **Multi-Game CBT Tools**
   - 🧠 **Thought Record** - Original CBT reframing tool
   - ❤️ **Gratitude Journal** - Daily gratitude practice
   - ⏰ **Breathing Timer** - Guided breathing exercises (1, 3, 5, 10 minutes)
   - 📖 **Daily Affirmations** - Positive affirmations for mental wellness

## 🛠️ Setup Instructions

### Step 1: Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase in your project directory
```bash
cd C:\Users\parth\OneDrive\Desktop\RehabQuest\RehabQuest\rehabquest
firebase init
```

When prompted, select:
- ✅ Firestore: Configure security rules and indexes files
- ✅ Hosting: Configure files for Firebase Hosting

### Step 3: Deploy Firestore Rules and Indexes
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Step 4: Seed Sample Therapist Data
```bash
node seed-therapists.js
```

### Step 5: Build and Deploy Your App
```bash
npm run build
firebase deploy --only hosting
```

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only the web app
firebase deploy --only hosting

# Deploy everything
firebase deploy
```

## 📁 New Files Added

```
rehabquest/
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Database indexes configuration  
├── firebase.json            # Firebase deployment configuration
├── seed-therapists.js       # Script to populate sample therapists
└── SETUP.md                # This setup guide
```

## 🏗️ Database Structure

### Collections:

**therapists/**
```javascript
{
  id: "therapist-1",
  name: "Dr. Sarah Johnson", 
  specialties: ["Anxiety", "Depression", "CBT"],
  location: "New York, NY",
  bio: "Licensed clinical psychologist...",
  availability: "Mon-Fri 9AM-5PM"
}
```

**communityPosts/**
```javascript
{
  uid: "user123",
  name: "John Doe",
  message: "Feeling better today!",
  upvotes: 5,
  downvotes: 0, 
  upvotedBy: ["user456", "user789"],
  downvotedBy: [],
  comments: [
    {
      id: "comment1",
      uid: "user456", 
      name: "Jane Smith",
      message: "So happy to hear that!",
      createdAt: "2024-01-15T10:30:00Z"
    }
  ],
  createdAt: serverTimestamp()
}
```

**callRequests/**
```javascript
{
  uid: "user123",
  therapistId: "therapist-1",
  city: "New York",
  topic: "anxiety",
  time: "2024-01-20T14:00",
  createdAt: serverTimestamp()
}
```

## 🔒 Security Rules Summary

- **Community Posts**: Anyone can read, only authenticated users can write
- **User Data**: Users can only access their own data and subcollections
- **Therapist Data**: Therapists can only access their own profile
- **Bookings**: Users can see their own bookings, therapists see their assigned bookings
- **Interactions**: Only authenticated users can vote/comment

## 🎯 Usage Guide

### For Clients:
1. **Book a Call**: Select a therapist from the dropdown, fill out your details
2. **Community**: Share posts, upvote/downvote, comment on others' posts
3. **CBT Tools**: Use the 4 different wellness exercises
4. **Profile**: Track your progress and bookings

### For Therapists:
1. **Dashboard**: View only your assigned bookings and client lists
2. **Profile Management**: Update your availability and specialties
3. **Privacy**: Your data is protected by security rules

## 🚨 Important Notes

1. **API Keys**: Your Firebase config contains public API keys - this is normal for client-side Firebase apps. Security is handled by Firestore rules.

2. **Therapist Accounts**: To test therapist features, you'll need to:
   - Create user accounts for therapists
   - Add their UID as document ID in the `therapists` collection
   - Use their UID when testing the therapist dashboard

3. **Testing**: Use multiple browser profiles or incognito windows to test different user perspectives.

## 🐛 Troubleshooting

### Common Issues:

**"Permission denied" errors:**
- Make sure your Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Check that users are properly authenticated

**Therapist dropdown empty:**
- Run the seed script: `node seed-therapists.js`  
- Check Firestore console to verify therapist data exists

**Build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check that all imports are correct

## 📧 Next Steps

Your RehabQuest app now has all the requested features! Here are some suggested next steps:

1. **Test all features** with different user accounts
2. **Customize the therapist data** in `seed-therapists.js` with real therapists
3. **Deploy to production** when ready
4. **Add more CBT exercises** by extending the `cbt-games.jsx` component
5. **Implement push notifications** for new bookings/comments

## 🎉 Features in Action

- **Secure Data Access**: Each user only sees their own data
- **Real-time Community**: Vote and comment updates appear instantly  
- **Therapist Assignment**: Bookings are properly assigned and filtered
- **Mental Health Tools**: 4 different CBT exercises for comprehensive support
- **Mobile Responsive**: All new features work great on mobile devices

Your RehabQuest app is now a comprehensive mental health platform with proper security, therapist management, community features, and wellness tools! 🎯
