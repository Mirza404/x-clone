import type React from 'react';
import { useState, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import IconButton from '../components/ui/IconButton';

interface FileUploadProps {
  onImagesUploaded: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onImagesUploaded }) => {
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

  const handleClick = () => {
    fileInputRef.current?.click();
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
      <IconButton
        icon={ImageIcon}
        accent="blue"
        onClick={handleClick}
        aria-label="Add photos"
      />
    </div>
  );
};

export default FileUpload;
