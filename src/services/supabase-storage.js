import { supabase } from '../supabase-config.js';

/**
 * Upload profile picture to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's unique identifier
 * @param {string} fileName - Optional custom filename
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadProfilePicture = async (file, userId, fileName = null) => {
  try {
    if (!file || !userId) {
      return { success: false, error: 'File and userId are required' };
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }

    // Validate file size (5MB max)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      return { success: false, error: 'File size must be less than 5MB' };
    }

    // Generate filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFileName = fileName || `profile_${timestamp}.${fileExtension}`;
    
    // Create file path: profile-pictures/{userId}/{filename}
    const filePath = `profile-pictures/${userId}/${finalFileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images') // Make sure this bucket exists in your Supabase project
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Replace file if it already exists
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return { 
      success: true, 
      url: publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Failed to upload image' };
  }
};

/**
 * Delete profile picture from Supabase Storage
 * @param {string} filePath - The file path in storage
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteProfilePicture = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: 'Failed to delete image' };
  }
};

/**
 * Get profile picture URL from Supabase Storage
 * @param {string} filePath - The file path in storage
 * @returns {string} The public URL of the image
 */
export const getProfilePictureUrl = (filePath) => {
  if (!filePath) return null;
  
  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(filePath);

  return publicUrl;
};
