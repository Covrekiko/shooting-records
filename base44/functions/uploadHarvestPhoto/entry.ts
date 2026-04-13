import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: 'Only JPEG, PNG, WebP images allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: 'File must be less than 5MB' },
        { status: 413 }
      );
    }

    // Upload to private storage
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({
      file
    });

    // Create signed URL valid for 7 days
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 7 * 24 * 60 * 60
    });

    return Response.json({ url: signed_url });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});