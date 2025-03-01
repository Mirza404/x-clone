export const resizeImage = async (file: File): Promise<File> => {
  return new Promise<File>((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const maxSize = 1024; // Adjust based on your needs

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
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: file.type }));
        }
      }, file.type);
    };
  });
};

const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
export const uploadImages = async (files: File[]): Promise<string[]> => {
  if (files.length === 0) return [];

  // Resize images before uploading
  const resizedFiles = await Promise.all(files.map(resizeImage));

  try {
    const uploadPromises = resizedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "x_clone");

      return fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      )
        .then((res) => res.json())
        .then((data) => data.secure_url);
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error("Image upload failed. Please try again.");
  }
};
