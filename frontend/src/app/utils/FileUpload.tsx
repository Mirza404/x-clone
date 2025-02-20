import { useState, useRef } from "react";
import axios from "axios";

const FileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const presetName = "x_clone";
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log("Cloudinary Cloud Name:", cloudinaryCloudName);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);

      // Automatically trigger upload after files are set
      uploadImages(newFiles);
    } else {
      console.error("No files selected");
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
        alert("Upload failed. Please try again.");
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

  const handleSvgClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="hover:bg-[#1D9BF0] hover:bg-opacity-20 transition delay-100 p-2 rounded-full">
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
        ref={fileInputRef}
        style={{ display: "none" }}
      />
      <svg
        className="w-6 h-6 text-gray-800 dark:text-white"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="#1d9bf0"
        viewBox="0 0 24 24"
        onClick={handleSvgClick}
      >
        <path
          fillRule="evenodd"
          d="M13 10a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H14a1 1 0 0 1-1-1Z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12c0 .556-.227 1.06-.593 1.422A.999.999 0 0 1 20.5 20H4a2.002 2.002 0 0 1-2-2V6Zm6.892 12 3.833-5.356-3.99-4.322a1 1 0 0 0-1.549.097L4 12.879V6h16v9.95l-3.257-3.619a1 1 0 0 0-1.557.088L11.2 18H8.892Z"
          clipRule="evenodd"
        />
      </svg>
      {uploading && <p>Uploading...</p>}
    </div>
  );
};

export default FileUpload;
