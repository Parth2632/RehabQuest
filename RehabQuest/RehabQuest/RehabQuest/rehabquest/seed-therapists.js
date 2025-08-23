// Run this script once to populate your Firestore with sample therapist data
// Usage: node seed-therapists.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBzExrcsHlHJy_drIUWL0f9BeHZfwNTNzo",
  authDomain: "rehabquest-29b03.firebaseapp.com",
  projectId: "rehabquest-29b03",
  storageBucket: "rehabquest-29b03.appspot.com",
  messagingSenderId: "612318637179",
  appId: "1:612318637179:web:f506c8cca69305cd0c86de",
  measurementId: "G-WB2VPLC6EM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleTherapists = [
  {
    id: 'therapist-1',
    name: 'Dr. Sarah Johnson',
    specialties: ['Anxiety', 'Depression', 'CBT'],
    location: 'New York, NY',
    bio: 'Licensed clinical psychologist specializing in cognitive behavioral therapy.',
    availability: 'Mon-Fri 9AM-5PM'
  },
  {
    id: 'therapist-2',
    name: 'Dr. Michael Chen',
    specialties: ['PTSD', 'Trauma', 'EMDR'],
    location: 'Los Angeles, CA',
    bio: 'Trauma specialist with over 10 years of experience.',
    availability: 'Mon-Thu 10AM-6PM'
  },
  {
    id: 'therapist-3',
    name: 'Dr. Emily Rodriguez',
    specialties: ['Addiction', 'Family Therapy', 'Group Therapy'],
    location: 'Chicago, IL',
    bio: 'Addiction counselor and family therapist.',
    availability: 'Tue-Sat 8AM-4PM'
  },
  {
    id: 'therapist-4',
    name: 'Dr. James Wilson',
    specialties: ['Mindfulness', 'Stress Management', 'Life Coaching'],
    location: 'Austin, TX',
    bio: 'Mindfulness-based therapist focusing on stress reduction.',
    availability: 'Mon-Wed-Fri 1PM-8PM'
  }
];

async function seedTherapists() {
  try {
    console.log('Seeding therapist data...');
    
    for (const therapist of sampleTherapists) {
      await addDoc(collection(db, 'therapists'), therapist);
      console.log(`Added therapist: ${therapist.name}`);
    }
    
    console.log('✅ Successfully seeded therapist data!');
    console.log('\nNext steps:');
    console.log('1. Deploy the Firestore rules: firebase deploy --only firestore:rules');
    console.log('2. Deploy the indexes: firebase deploy --only firestore:indexes');
    console.log('3. Build and deploy your app: npm run build && firebase deploy --only hosting');
    
  } catch (error) {
    console.error('Error seeding therapists:', error);
  }
}

// Run the seeding function
seedTherapists();
