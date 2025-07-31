import { useState } from "react";
import axios from "axios";
import { useTheme } from "../ThemeContext";

const ReviewAndRatingForm = ({ targetUserType = "worker" , post  , setReviewSubmitted}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage , setSuccessMessage] = useState("");
  const { theme } = useTheme(); // Get current theme

  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };
  
  const handleSubmit = async () => {
    setError("");

    if (!rating) {
      setError("Please provide a rating.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/posts/review`,
        {
          postId: post._id,
          review: review,
          rating: rating,
        },
        { withCredentials: true }
      );

      const payload = {
        rating,
        review,
        target: targetUserType, 
      };

      console.log("Submitting review:", payload);

      await new Promise(resolve => setTimeout(resolve, 1000));

      setRating(0);
      setHoverRating(0);
      setReview("");
      setSuccessMessage(`✅ ${response.data.message}`);
      setTimeout(() => setReviewSubmitted(), 2000);
    } catch (err) {
      console.error("Review submission failed:", err);
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      setError(`❌ ${msg}`);
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const StarIcon = ({ filled, half = false }) => (
    <svg
      className={`w-8 h-8 transition-colors duration-150 ${
        filled ? 'text-yellow-400' : half ? 'text-yellow-200' : 'text-gray-300 dark:text-gray-600'
      }`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  const ratingLabels = {
    1: "Poor",
    2: "Fair", 
    3: "Good",
    4: "Very Good",
    5: "Excellent"
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
        Rate & Review {targetUserType.charAt(0).toUpperCase() + targetUserType.slice(1)}
      </h3>

      {/* Star Rating */}
      <div className="mb-4">
        <label className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Your Rating
        </label>
        
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none rounded transition-transform hover:scale-110 cursor-pointer"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={submitting}
            >
              <StarIcon filled={star <= (hoverRating || rating)} />
            </button>
          ))}
        </div>

        {/* Rating Label */}
        {(hoverRating || rating) > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {ratingLabels[hoverRating || rating]} ({hoverRating || rating} star{(hoverRating || rating) > 1 ? 's' : ''})
          </p>
        )}
      </div>

      {/* Review Text Area */}
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Your Review
        </label>
        <textarea
          maxLength={500}
          className="w-full h-24 p-3 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md resize-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-colors"
          placeholder={`Share your experience with this ${targetUserType}...`}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          disabled={submitting}
        />
        <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
          {review.length}/500
        </div>

      </div>

      {/* Error Message */}
      {(error || successMessage) && (
        <div className={`mb-4 p-3 ${successMessage ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"} border ${successMessage ? 'border-green-200 dark:border-green-500/30' : 'border-red-200 dark:border-red-500/30'} rounded-md`}>
          <p className={`${successMessage ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} text-sm font-medium`}>{error||successMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !rating}
        className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${
          submitting || !rating
            ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            : "bg-teal-400 text-white hover:bg-teal-600 active:transform active:scale-95 shadow-md hover:shadow-lg cursor-pointer"
        }`}
        style={buttonStyle}
      >
        {submitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Submitting...
          </div>
        ) : (
          "Submit Review"
        )}
      </button>

    </div>
  );
};

export default ReviewAndRatingForm;