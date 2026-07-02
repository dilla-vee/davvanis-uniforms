const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('WARNING: Supabase URL and Key are not set — skipping Supabase Storage client init.');
}

/**
 * Upload a file buffer to Supabase Storage and return its public URL.
 * @param {Buffer} buffer File buffer
 * @param {string} originalName Original filename
 * @param {string} mimeType File MIME type
 * @param {string} bucketName Target bucket name (defaults to 'uniforms')
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadToSupabase(buffer, originalName, mimeType, bucketName = 'uniforms') {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Check your environment variables.');
  }

  // Create a unique filename
  const extension = originalName.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
  const filePath = `${fileName}`; // Upload directly to bucket root

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

module.exports = {
  supabase,
  uploadToSupabase
};
