import type React from "react";
import { useState, useRef } from "react";
import { Image } from "lucide-react";

const FileUpload = ({ onImagesUploaded }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const updatedFiles = [...selectedFiles, ...newFiles];
      setSelectedFiles(updatedFiles);
      onImagesUploaded(updatedFiles);
    }
  };

  const handleSvgClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <button
        onClick={handleSvgClick}
        className="p-2 rounded-full hover:bg-gray-800 transition-colors"
        title="Add photos"
      >
        <Image className="w-5 h-5" />
      </button>
    </div>
  );
};

export default FileUpload;
