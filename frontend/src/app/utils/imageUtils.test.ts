import api from './apiClient';
import { uploadImages } from './imageUtils';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

class FakeImage {
  width = 2000;
  height = 1000;
  onload: () => void = () => {};
  onerror: () => void = () => {};

  set src(_value: string) {
    queueMicrotask(() => this.onload());
  }
}

const signatureResponse = {
  cloudName: 'dhumjqe9v',
  apiKey: 'public-api-key',
  uploadUrl: 'https://api.cloudinary.com/v1_1/dhumjqe9v/image/upload',
  timestamp: 1_787_000_000,
  signature: 'request-signature',
  publicId: 'x-clone/users/user-1/messages/image-1',
  uploadPreset: 'x_clone_signed',
  params: {
    timestamp: 1_787_000_000,
    public_id: 'x-clone/users/user-1/messages/image-1',
    upload_preset: 'x_clone_signed',
    overwrite: false,
  },
};

const cloudinaryResponse = {
  public_id: signatureResponse.publicId,
  version: 1_787_000_001,
  signature: 'response-signature',
  format: 'png',
  secure_url:
    'https://res.cloudinary.com/dhumjqe9v/image/upload/v1787000001/raw.png',
};

describe('uploadImages', () => {
  const mockedApiPost = api.post as jest.Mock;
  const originalImage = global.Image;
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;
  const originalFetch = global.fetch;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;

  beforeEach(() => {
    mockedApiPost.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    global.Image = FakeImage as unknown as typeof Image;
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    HTMLCanvasElement.prototype.getContext = jest
      .fn()
      .mockReturnValue({ drawImage: jest.fn() }) as typeof originalGetContext;
    HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
      callback(new Blob(['resized'], { type: 'image/png' }));
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.Image = originalImage;
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    global.fetch = originalFetch;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    jest.restoreAllMocks();
  });

  const mockSuccessfulUpload = () => {
    mockedApiPost
      .mockResolvedValueOnce({ data: signatureResponse })
      .mockResolvedValueOnce({
        data: {
          secureUrl:
            'https://res.cloudinary.com/dhumjqe9v/image/upload/v1787000001/canonical.png',
        },
      });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(cloudinaryResponse),
    });
  };

  it('resolves to an empty array without making upload requests', async () => {
    await expect(uploadImages([])).resolves.toEqual([]);

    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('signs, uploads, completes, and returns the backend-confirmed URL', async () => {
    mockSuccessfulUpload();
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    const result = await uploadImages([file]);

    expect(result).toEqual([
      'https://res.cloudinary.com/dhumjqe9v/image/upload/v1787000001/canonical.png',
    ]);
    expect(mockedApiPost).toHaveBeenNthCalledWith(1, '/api/media/signature');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [uploadUrl, request] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(uploadUrl).toBe(signatureResponse.uploadUrl);
    expect(request.method).toBe('POST');
    expect(request.signal).toBeInstanceOf(AbortSignal);

    const formData = request.body as FormData;
    expect(formData.get('file')).toBeInstanceOf(File);
    expect((formData.get('file') as File).name).toBe('photo.png');
    expect(formData.get('api_key')).toBe(signatureResponse.apiKey);
    expect(formData.get('signature')).toBe(signatureResponse.signature);
    Object.entries(signatureResponse.params).forEach(([key, value]) => {
      expect(formData.get(key)).toBe(String(value));
    });

    expect(mockedApiPost).toHaveBeenNthCalledWith(2, '/api/media/complete', {
      publicId: cloudinaryResponse.public_id,
      version: cloudinaryResponse.version,
      signature: cloudinaryResponse.signature,
      format: cloudinaryResponse.format,
      secureUrl: cloudinaryResponse.secure_url,
    });
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('throws a friendly error for a malformed signature response', async () => {
    mockedApiPost.mockResolvedValueOnce({ data: { signature: 'incomplete' } });
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'inconsistent signed parameters',
      response: {
        ...signatureResponse,
        params: { ...signatureResponse.params, public_id: 'someone-else' },
      },
    },
    {
      name: 'an untrusted upload URL',
      response: {
        ...signatureResponse,
        uploadUrl: 'https://example.com/collect-upload',
      },
    },
    {
      name: 'an extra signed parameter',
      response: {
        ...signatureResponse,
        params: { ...signatureResponse.params, eager: 'unreviewed-transform' },
      },
    },
  ])('rejects $name before uploading', async ({ response }) => {
    mockedApiPost.mockResolvedValueOnce({ data: response });
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockedApiPost).toHaveBeenCalledTimes(1);
  });

  it('rejects a resized file with an unsupported MIME type before signing', async () => {
    HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
      callback(new Blob(['resized'], { type: 'image/svg+xml' }));
    };
    const file = new File(['content'], 'vector.svg', {
      type: 'image/svg+xml',
    });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a resized file over 5 MiB before signing', async () => {
    HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
      callback(
        new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], {
          type: 'image/png',
        })
      );
    };
    const file = new File(['content'], 'large.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws a friendly error when Cloudinary returns a non-success status', async () => {
    mockedApiPost.mockResolvedValueOnce({ data: signatureResponse });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
    });
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(mockedApiPost).toHaveBeenCalledTimes(1);
  });

  it('throws a friendly error for a malformed Cloudinary response', async () => {
    mockedApiPost.mockResolvedValueOnce({ data: signatureResponse });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ secure_url: 'missing metadata' }),
    });
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(mockedApiPost).toHaveBeenCalledTimes(1);
  });

  it('throws a friendly error for a malformed completion response', async () => {
    mockedApiPost
      .mockResolvedValueOnce({ data: signatureResponse })
      .mockResolvedValueOnce({ data: {} });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(cloudinaryResponse),
    });
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
  });

  it('rejects instead of hanging when the canvas cannot create a blob', async () => {
    HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
      callback(null);
    };
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('rejects instead of hanging when canvas serialization throws', async () => {
    HTMLCanvasElement.prototype.toBlob = function () {
      throw new Error('serialization failed');
    };
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('rejects instead of hanging when the browser cannot load the image', async () => {
    class FailedImage extends FakeImage {
      set src(_value: string) {
        queueMicrotask(() => this.onerror());
      }
    }
    global.Image = FailedImage as unknown as typeof Image;
    const file = new File(['content'], 'broken.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
