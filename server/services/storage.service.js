const { createClient } = require('@supabase/supabase-js');
const config = require('../utils/config');
const HttpError = require('../utils/httpError');

let client;
function getClient() {
  // Server-side uploads should use the secret/service key (never expose it to the browser).
  const key = process.env.SUPABASE_SERVICE_KEY || config.supabase.anonKey;
  if (!config.supabase.url || !key) throw new HttpError(500, 'Image storage is not configured');
  if (!client) client = createClient(config.supabase.url, key, { auth: { persistSession: false } });
  return client;
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function uploadImage(file, folder) {
  const supabase = getClient();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[file.mimetype] || 'jpg'}`;
  const { error } = await supabase.storage.from(config.supabase.bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw new HttpError(500, `Image upload failed: ${error.message}`);
  return supabase.storage.from(config.supabase.bucket).getPublicUrl(path).data.publicUrl;
}

module.exports = { uploadImage };