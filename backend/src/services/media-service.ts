import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import MediaAsset from '../models/MediaAsset';
import { equalsObjectId, toObjectId } from '../utils/object-id';

export const MAX_IMAGE_COUNT = 8;
export const MAX_IMAGE_URL_LENGTH = 2048;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const SIGNED_UPLOAD_PRESET = 'x_clone_signed';

const ALLOWED_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

interface CompleteUploadInput {
  publicId?: unknown;
  version?: unknown;
  signature?: unknown;
  format?: unknown;
  secureUrl?: unknown;
}

interface CloudinaryImageResource {
  public_id?: unknown;
  version?: unknown;
  format?: unknown;
  secure_url?: unknown;
  bytes?: unknown;
  resource_type?: unknown;
}

interface CloudinaryResponseSignatureUtils {
  verify_api_response_signature(
    publicId: string,
    version: number,
    signature: string
  ): boolean;
}

export class MediaValidationError extends Error {
  readonly statusCode = 400 as const;
  readonly code = 'INVALID_MEDIA' as const;

  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

function readCloudinaryCredentials(): CloudinaryCredentials {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary backend credentials are not configured');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret };
}

function userPublicIdPrefix(userId: string): string {
  return `x_clone/users/${userId}/`;
}

function assertUserPublicId(userId: string, publicId: unknown): string {
  if (
    typeof publicId !== 'string' ||
    !publicId.startsWith(userPublicIdPrefix(userId)) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      publicId.slice(userPublicIdPrefix(userId).length)
    )
  ) {
    throw new MediaValidationError('Invalid image public ID');
  }

  return publicId;
}

function assertVersion(version: unknown): number {
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 1
  ) {
    throw new MediaValidationError('Invalid image version');
  }
  return version;
}

function assertFormat(format: unknown): string {
  if (
    typeof format !== 'string' ||
    !ALLOWED_IMAGE_FORMATS.has(format.toLowerCase())
  ) {
    throw new MediaValidationError('Unsupported image format');
  }
  return format.toLowerCase();
}

function assertCanonicalImageUrl(
  value: unknown,
  cloudName: string,
  expected?: { publicId: string; version: number; format: string }
): string {
  const imageUrl = assertImageUrlValue(value);

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new MediaValidationError('Invalid image URL');
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'res.cloudinary.com' ||
    parsed.port !== '' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    !parsed.pathname.startsWith(`/${cloudName}/image/upload/`)
  ) {
    throw new MediaValidationError(
      'Images must use the configured Cloudinary account'
    );
  }

  if (expected) {
    const expectedPath = `/${cloudName}/image/upload/v${expected.version}/${expected.publicId}.${expected.format}`;
    if (parsed.pathname !== expectedPath) {
      throw new MediaValidationError(
        'Image URL does not match the uploaded asset'
      );
    }
  }

  return imageUrl;
}

function assertImageUrlValue(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_IMAGE_URL_LENGTH
  ) {
    throw new MediaValidationError('Invalid image URL');
  }
  return value;
}

async function createUploadSignature(userId: string) {
  const { cloudName, apiKey, apiSecret } = readCloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${userPublicIdPrefix(userId)}${randomUUID()}`;
  const params = {
    timestamp,
    public_id: publicId,
    upload_preset: SIGNED_UPLOAD_PRESET,
    overwrite: false,
  };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);

  return {
    cloudName,
    apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    timestamp,
    signature,
    publicId,
    uploadPreset: SIGNED_UPLOAD_PRESET,
    params,
  };
}

async function completeUpload(userId: string, input: CompleteUploadInput) {
  const { cloudName } = readCloudinaryCredentials();
  const publicId = assertUserPublicId(userId, input.publicId);
  const version = assertVersion(input.version);

  if (
    typeof input.signature !== 'string' ||
    !/^[0-9a-f]{40}$/i.test(input.signature) ||
    !(
      cloudinary.utils as unknown as CloudinaryResponseSignatureUtils
    ).verify_api_response_signature(publicId, version, input.signature)
  ) {
    throw new MediaValidationError('Invalid Cloudinary response signature');
  }

  const submittedFormat = assertFormat(input.format);
  const submittedSecureUrl = assertCanonicalImageUrl(
    input.secureUrl,
    cloudName,
    { publicId, version, format: submittedFormat }
  );
  const resource = (await cloudinary.api.resource(publicId, {
    resource_type: 'image',
  })) as CloudinaryImageResource;

  if (resource.public_id !== publicId || resource.resource_type !== 'image') {
    throw new MediaValidationError('Cloudinary image could not be verified');
  }

  const authoritativeVersion = assertVersion(resource.version);
  const authoritativeFormat = assertFormat(resource.format);
  const authoritativeSecureUrl = assertCanonicalImageUrl(
    resource.secure_url,
    cloudName,
    {
      publicId,
      version: authoritativeVersion,
      format: authoritativeFormat,
    }
  );

  if (
    authoritativeVersion !== version ||
    authoritativeFormat !== submittedFormat ||
    authoritativeSecureUrl !== submittedSecureUrl
  ) {
    throw new MediaValidationError(
      'Cloudinary response does not match the uploaded image'
    );
  }

  if (
    typeof resource.bytes !== 'number' ||
    !Number.isSafeInteger(resource.bytes) ||
    resource.bytes < 1 ||
    resource.bytes > MAX_IMAGE_BYTES
  ) {
    if (
      typeof resource.bytes === 'number' &&
      Number.isFinite(resource.bytes) &&
      resource.bytes > MAX_IMAGE_BYTES
    ) {
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          invalidate: true,
        });
      } catch (error) {
        console.error(
          'Failed to clean up an oversized Cloudinary image:',
          error
        );
      }
    }
    throw new MediaValidationError('Image must be no larger than 5 MiB');
  }

  const owner = toObjectId(userId);
  await MediaAsset.findOneAndUpdate(
    { publicId, owner },
    {
      $set: {
        publicId,
        version,
        format: authoritativeFormat,
        secureUrl: authoritativeSecureUrl,
      },
      $setOnInsert: { owner },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return { secureUrl: authoritativeSecureUrl };
}

async function assertOwnedImageUrls(
  userId: string,
  images: unknown,
  options: { allowExisting?: string[] } = {}
): Promise<string[]> {
  if (!Array.isArray(images)) {
    throw new MediaValidationError('Images must be an array');
  }
  if (images.length > MAX_IMAGE_COUNT) {
    throw new MediaValidationError('A maximum of 8 images is allowed');
  }
  if (images.length === 0) {
    return [];
  }

  const existing = new Set(options.allowExisting ?? []);
  const stringUrls = images.map(assertImageUrlValue);
  const urlsToVerifyBeforeCanonical = stringUrls.filter(
    (url) => !existing.has(url)
  );

  if (urlsToVerifyBeforeCanonical.length === 0) {
    return stringUrls;
  }

  const { cloudName } = readCloudinaryCredentials();
  const urlsToVerify = [
    ...new Set(
      urlsToVerifyBeforeCanonical.map((url) =>
        assertCanonicalImageUrl(url, cloudName)
      )
    ),
  ];

  const assets = await MediaAsset.find({
    secureUrl: { $in: urlsToVerify },
  })
    .select('owner secureUrl')
    .lean();
  const assetsByUrl = new Map(
    assets.map((asset) => [asset.secureUrl, asset.owner])
  );
  const allowUnregistered =
    process.env.MEDIA_ALLOW_UNREGISTERED_CLOUDINARY === 'true';
  const invalidUrl = urlsToVerify.some((url) => {
    const owner = assetsByUrl.get(url);
    if (!owner) {
      return !allowUnregistered;
    }
    return !equalsObjectId(owner, userId);
  });

  if (invalidUrl) {
    throw new MediaValidationError(
      'Every image must be uploaded by the authenticated user'
    );
  }

  return stringUrls;
}

export const mediaService = {
  createUploadSignature,
  completeUpload,
  assertOwnedImageUrls,
};
