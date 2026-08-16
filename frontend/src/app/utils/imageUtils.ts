import api from './apiClient';

type SignedUploadParam = string | number | boolean;

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  uploadUrl: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadPreset: string;
  params: Record<string, SignedUploadParam>;
}

interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  format: string;
  secure_url: string;
}

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCloudinaryUploadUrl = (value: string, cloudName: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'api.cloudinary.com' &&
      url.port === '' &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === '' &&
      url.pathname === `/v1_1/${cloudName}/image/upload`
    );
  } catch {
    return false;
  }
};

const isUploadSignature = (value: unknown): value is UploadSignature => {
  if (!isRecord(value) || !isRecord(value.params)) return false;

  const paramKeys = Object.keys(value.params).sort();
  const paramsAreValid = Object.values(value.params).every(
    (param) =>
      typeof param === 'string' ||
      typeof param === 'number' ||
      typeof param === 'boolean'
  );

  return (
    typeof value.cloudName === 'string' &&
    value.cloudName.length > 0 &&
    typeof value.apiKey === 'string' &&
    value.apiKey.length > 0 &&
    typeof value.uploadUrl === 'string' &&
    value.uploadUrl.length > 0 &&
    isCloudinaryUploadUrl(value.uploadUrl, value.cloudName) &&
    typeof value.timestamp === 'number' &&
    typeof value.signature === 'string' &&
    value.signature.length > 0 &&
    typeof value.publicId === 'string' &&
    value.publicId.length > 0 &&
    typeof value.uploadPreset === 'string' &&
    value.uploadPreset.length > 0 &&
    value.params.timestamp === value.timestamp &&
    value.params.public_id === value.publicId &&
    value.params.upload_preset === value.uploadPreset &&
    value.params.overwrite === false &&
    paramKeys.join(',') === 'overwrite,public_id,timestamp,upload_preset' &&
    paramsAreValid
  );
};

const isCloudinaryUploadResult = (
  value: unknown
): value is CloudinaryUploadResult =>
  isRecord(value) &&
  typeof value.public_id === 'string' &&
  value.public_id.length > 0 &&
  typeof value.version === 'number' &&
  typeof value.signature === 'string' &&
  value.signature.length > 0 &&
  typeof value.format === 'string' &&
  value.format.length > 0 &&
  typeof value.secure_url === 'string' &&
  value.secure_url.length > 0;

export const resizeImage = async (file: File): Promise<File> =>
  new Promise<File>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const rejectResize = () => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to resize image'));
    };

    img.onerror = rejectResize;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          rejectResize();
          return;
        }

        const maxSize = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (maxSize / width) * height;
            width = maxSize;
          } else {
            width = (maxSize / height) * width;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            rejectResize();
            return;
          }
          if (settled) return;

          settled = true;
          URL.revokeObjectURL(objectUrl);
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type);
      } catch {
        rejectResize();
      }
    };
    img.src = objectUrl;
  });

const uploadImage = async (file: File): Promise<string> => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Unsupported image type');
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error('Image exceeds the upload size limit');
  }

  const signatureResponse = await api.post('/api/media/signature');
  const uploadSignature: unknown = signatureResponse.data;

  if (!isUploadSignature(uploadSignature)) {
    throw new Error('Invalid upload signature response');
  }

  const formData = new FormData();
  formData.append('file', file);
  Object.entries(uploadSignature.params).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  formData.append('api_key', uploadSignature.apiKey);
  formData.append('signature', uploadSignature.signature);

  const abortController = new AbortController();
  const timeout = window.setTimeout(() => abortController.abort(), 60_000);
  let cloudinaryResponse: Response;
  try {
    cloudinaryResponse = await fetch(uploadSignature.uploadUrl, {
      method: 'POST',
      body: formData,
      signal: abortController.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }

  if (!cloudinaryResponse.ok) {
    throw new Error(`Cloudinary upload failed (${cloudinaryResponse.status})`);
  }

  const cloudinaryResult: unknown = await cloudinaryResponse.json();
  if (!isCloudinaryUploadResult(cloudinaryResult)) {
    throw new Error('Invalid Cloudinary upload response');
  }

  const completionResponse = await api.post('/api/media/complete', {
    publicId: cloudinaryResult.public_id,
    version: cloudinaryResult.version,
    signature: cloudinaryResult.signature,
    format: cloudinaryResult.format,
    secureUrl: cloudinaryResult.secure_url,
  });
  const completionResult: unknown = completionResponse.data;

  if (
    !isRecord(completionResult) ||
    typeof completionResult.secureUrl !== 'string' ||
    completionResult.secureUrl.length === 0
  ) {
    throw new Error('Invalid upload completion response');
  }

  return completionResult.secureUrl;
};

export const uploadImages = async (files: File[]): Promise<string[]> => {
  if (files.length === 0) return [];

  try {
    const resizedFiles = await Promise.all(files.map(resizeImage));
    return await Promise.all(resizedFiles.map(uploadImage));
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error('Image upload failed. Please try again.');
  }
};
