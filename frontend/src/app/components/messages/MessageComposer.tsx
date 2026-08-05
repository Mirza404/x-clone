'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEnterSubmit } from '@/app/utils/formSubmit';
import { uploadImages } from '@/app/utils/imageUtils';
import FileUpload from '@/app/utils/FileUpload';

const MAX_LENGTH = 2000;

interface MessageComposerProps {
  onSend: (content: string, images: string[]) => void;
  onTyping?: () => void;
}

export default function MessageComposer({
  onSend,
  onTyping,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleImagesUploaded = (files: File[]) => {
    setSelectedFiles(files.map((file) => ({ id: crypto.randomUUID(), file })));
  };

  const removeImage = (fileId: string) => {
    setSelectedFiles((files) => files.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async () => {
    if (content.trim() === '' || uploading) return;

    setUploading(true);
    let images: string[] = [];
    try {
      images = await uploadImages(selectedFiles.map((f) => f.file));
    } catch {
      toast.error('Image upload failed. Please try again.');
      setUploading(false);
      return;
    }
    setUploading(false);

    onSend(content, images);
    setContent('');
    setSelectedFiles([]);
    resetTextareaHeight();
  };

  return (
    <form
      className="flex flex-col gap-2 border-t border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {selectedFiles.map(({ id: fileId, file }) => (
            <div key={fileId} className="group relative aspect-video">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                loading="lazy"
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(fileId)}
                className="absolute right-2 top-2 rounded-full bg-black/75 p-1 text-white/70 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <FileUpload onImagesUploaded={handleImagesUploaded} />
        <textarea
          ref={textareaRef}
          className="h-[44px] max-h-[150px] flex-1 resize-none overflow-hidden bg-input rounded-2xl px-4 py-2.5 text-[15px] leading-6 text-content placeholder-muted focus:outline-none"
          placeholder="Start a new message"
          maxLength={MAX_LENGTH}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping?.();
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = '44px';
            target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
          }}
          onKeyDown={useEnterSubmit({
            loading: uploading,
            content,
            onSubmit: handleSubmit,
          })}
          disabled={uploading}
        />
        <button
          type="submit"
          disabled={content.trim() === '' || uploading}
          className="flex h-9 items-center justify-center rounded-full bg-btn px-4 text-[15px] font-bold text-btn-fg transition-colors hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}
