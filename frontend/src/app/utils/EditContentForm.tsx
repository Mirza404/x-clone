import CustomLoadBar from '../components/ui/CustomLoadBar';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { getCommentById } from './fetchInfo';
import LoadCircle from '../components/ui/LoadCircle';
import { useEnterSubmit } from './formSubmit';

const EditContentForm = ({
  initialContent,
  handleSave,
  handleCancel,
}: {
  initialContent: string;
  handleSave: () => void;
  handleCancel: () => void;
}) => {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [content]);

  return (
    <>
      <div className="flex justify-center bg-black bg-opacity-50 backdrop-blur-sm max-h-100">
        {/* Insert your custom loading bar here */}
        <CustomLoadBar progress={progress} />

        <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm mt-0 w-[598px] mx-auto px-4 pt-2 border border-gray-700 shadow-lg">
          <div className="pt-2 mr-2">
            <img
              className="flex w-10 h-10 rounded-full object-cover"
              src={session?.user?.image ?? '/Logo.png'}
              alt="User avatar"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex flex-col py-3 flex-1">
            <div className="mb-2">
              <span className="text-gray-400 text-sm">Editing comment</span>
            </div>
            <form  onSubmit={(e) => {
                e.preventDefault();
                if (loading || content.trim() === '') return;

                handleSave;
              }}>

            <textarea
              ref={textareaRef}
              className="w-full min-h-[28px] py-0.5 text-white bg-transparent border-none focus:outline-none text-xl resize-none"
              onKeyDown={useEnterSubmit({
                loading,
                content,
                onSubmit: handleSave,
              })}
              maxLength={380}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
            />

            <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 text-sm">
                  {content.length}/380 characters
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 bg-black text-white  border border-gray-700 rounded-full hover:bg-gray-300 hover:text-black hover:border-black  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={loading || !content.trim()}
                  className="px-4 py-2 bg-white font-bold text-black rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            </form>

          </div>
        </div>
      </div>
    </>
  );
};

export default EditContentForm;
