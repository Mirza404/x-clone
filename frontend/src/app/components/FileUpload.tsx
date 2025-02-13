import { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {

  
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles([...files, ...Array.from(event.target.files)]);
    }
  };
  
  const uploadImages = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "x_clone");
      
      try {
        const response = await axios.post(
          "https://api.cloudinary.com/v1_1/dhumjqe9v/image/upload",
          formData
        );
        uploadedUrls.push(response.data.secure_url);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
    
    setUploading(false);
    setUploadedImages(uploadedUrls);
    
    // Pass uploaded images to the parent (Posts Page)
    onImagesUploaded(uploadedUrls);
  };
  
// Send the uploaded images to the parent component
const onImagesUploaded = (imageUrls: string[]) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("imagesUploaded", { detail: imageUrls }));
  }
};

return (
  <div>
    <input type="file" multiple onChange={handleFileChange} />
    <button onClick={uploadImages} disabled={uploading}>
      {uploading ? "Uploading..." : "Upload Images"}
    </button>
  </div>
);
}

export default FileUpload;