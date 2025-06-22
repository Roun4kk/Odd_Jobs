import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, X, AlertCircle } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

function JobPostInput({ refresh, user }) {
  const [postText, setPostText] = useState("");
  const [media, setMedia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; // Set to scrollHeight, capped at 120px
    }
  }, [postText]);

  const postUpload = async () => {
    if (media.length === 0) return [];

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < media.length; i++) {
      formData.append("files", media[i]);
    }
    console.log("Uploading FormData:");
    for (let [key, val] of formData.entries()) {
      console.log(key, val);
    }
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/upload`, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload response:", response.data);
      return response.data.urls || [];
    } catch (error) {
      console.error("Error uploading media:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to upload media files");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostSubmit = async () => {
    if (!postText.trim() && media.length === 0) {
      setError("Please enter some text or select files to post.");
      return;
    }

    setError("");
    setIsPosting(true);
    try {
      const mediaUrls = await postUpload();
      console.log("Media URLs:", mediaUrls);

      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/posts`, {
        postDescription: postText,
        postUserId: user._id,
        mediaUrls: mediaUrls,
      }, {
        withCredentials: true,
      });

      console.log("Post response:", response.data);
      setPostText("");
      setMedia([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
      toast.success("Post created successfully!");
    } catch (error) {
      console.error("Error posting:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setError("");

    // Validate maximum number of files
    if (selectedFiles.length > 10) {
      setError("You can select a maximum of 10 files.");
      return;
    }

    // Validate file types and sizes
    const validFiles = selectedFiles.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

      if (!isValidType) {
        setError(`File ${file.name} is not a valid image or video file.`);
        return false;
      }
      if (!isValidSize) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setMedia(validFiles);
  };

  const removeFile = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
  };

  const isDisabled = isUploading || isPosting;

  // Generate thumbnail URL for preview
  const getThumbnail = (file) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    if (file.type.startsWith('video/')) {
      return null; // Could add video thumbnail logic if needed
    }
    return null;
  };

  return (
    <div className="w-full bg-white p-4 flex flex-col gap-4 lg:w-3/4 lg:mx-auto lg:p-6 lg:rounded-xl lg:shadow-lg lg:my-4">
      {/* Textarea */}
      <div className="w-full">
        <textarea
          ref={textareaRef}
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Post a job..."
          className={`w-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 transition duration-200 min-h-[60px] max-h-[120px] overflow-y-auto z-0 pointer-events-auto ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          disabled={isDisabled}
          aria-label="Job post description"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Files Preview */}
      {media.length > 0 && (
        <div className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            {media.map((file, index) => (
              <div key={index} className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {file.type.startsWith('image/') ? (
                  <img
                    src={getThumbnail(file)}
                    alt={file.name}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                    Video: {file.name}
                  </div>
                )}
                <div className="p-2">
                  <span className="text-xs text-gray-600 truncate block" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className={`absolute top-1 right-1 bg-teal-400 text-white rounded-full p-1 hover:bg-teal-600 transition duration-200 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} cursor-pointer`}
                  disabled={isDisabled}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <label
            htmlFor="mediaUpload"
            className={`flex items-center gap-2 cursor-pointer ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-teal-600'}`}
            aria-label="Upload media"
          >
            <ImagePlus className="w-6 h-6 text-teal-500" />
            <span className="text-sm text-gray-600">Add Media</span>
          </label>
          <input
            type="file"
            id="mediaUpload"
            accept="image/*,video/*"
            className="hidden"
            multiple
            onChange={handleFileSelect}
            disabled={isDisabled}
            ref={fileInputRef}
          />
          {media.length > 0 && (
            <span className="text-sm text-gray-500">
              {media.length} file{media.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        <button
          onClick={handlePostSubmit}
          className={`flex items-center gap-2 px-6 py-2 bg-teal-500 text-white rounded-full transition duration-200 font-medium ${
            isDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-teal-600 focus:ring-2 focus:ring-teal-400 focus:ring-offset-2'
          }`}
          disabled={isDisabled}
          aria-label={isPosting ? "Posting" : isUploading ? "Uploading" : "Submit post"}
        >
          <Send className="w-5 h-5" />
          {isPosting ? "Posting..." : isUploading ? "Uploading..." : "Post"}
        </button>
      </div>
    </div>
  );
}

export default JobPostInput;