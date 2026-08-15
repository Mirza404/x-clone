import { uploadImages } from './imageUtils';

class FakeImage {
  width = 2000;
  height = 1000;
  onload: () => void = () => {};
  set src(_value: string) {
    // src is assigned before onload in resizeImage, so defer until onload
    // has actually been attached.
    queueMicrotask(() => this.onload());
  }
}

describe('uploadImages', () => {
  const originalImage = global.Image;
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;

  beforeEach(() => {
    global.Image = FakeImage as unknown as typeof Image;
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');
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
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    jest.restoreAllMocks();
  });

  it('resolves to an empty array when given no files', async () => {
    const result = await uploadImages([]);
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('resizes and uploads each file, returning the secure URLs', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () =>
        Promise.resolve({ secure_url: 'https://cdn.example/img.png' }),
    });
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    const result = await uploadImages([file]);

    expect(result).toEqual(['https://cdn.example/img.png']);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.cloudinary.com/v1_1/'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws a friendly error when the upload request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await expect(uploadImages([file])).rejects.toThrow(
      'Image upload failed. Please try again.'
    );
  });
});
