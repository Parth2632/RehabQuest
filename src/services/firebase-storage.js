import { storage } from '../firebase-config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Upload profile picture to Firebase Storage under profile-pictures/{uid}/{filename}
export async function uploadProfilePictureFirebase(file, uid) {
  if (!file || !uid) return { success: false, error: 'File and user ID required' };
  if (!file.type?.startsWith('image/')) return { success: false, error: 'File must be an image' };
  const max = 5 * 1024 * 1024;
  if (file.size > max) return { success: false, error: 'Max size 5MB' };

  const ext = file.name.split('.').pop();
  const fileName = `profile_${Date.now()}.${ext}`;
  const path = `profile-pictures/${uid}/${fileName}`;
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(storageRef);
    return { success: true, url, path };
  } catch (error) {
    console.error('Firebase upload error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteProfilePictureFirebase(path) {
  if (!path) return { success: false, error: 'Path required' };
  try {
    await deleteObject(ref(storage, path));
    return { success: true };
  } catch (error) {
    console.error('Firebase delete error:', error);
    return { success: false, error: error.message };
  }
}
