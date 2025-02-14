import { useState } from "react";
import axios from "axios";

const FileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const presetName = "x_clone";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);

      // Automatically trigger upload after files are set
      uploadImages(newFiles);
    }
  };

  const uploadImages = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of newFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", presetName);

      try {
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
          formData
        );
        uploadedUrls.push(response.data.secure_url);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }

    setUploading(false);
    setUploadedImages((prevImages) => [...prevImages, ...uploadedUrls]);

    // Pass uploaded images to the parent (Posts Page)
    onImagesUploaded(uploadedUrls);
  };

  // Send the uploaded images to the parent component
  const onImagesUploaded = (imageUrls: string[]) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("imagesUploaded", { detail: imageUrls })
      );
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};

export default FileUpload;
