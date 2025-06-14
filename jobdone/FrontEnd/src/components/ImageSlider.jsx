import {ChevronRight , ChevronLeft } from "lucide-react";
import { useState } from "react";
function ImageSlider({ mediaUrls }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? mediaUrls.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === mediaUrls.length - 1 ? 0 : prevIndex + 1));
  };

  return (
    <div className="relative w-full flex justify-center items-center">
      <img src={mediaUrls[currentIndex]} alt={`Media ${currentIndex}`} className="w-full aspect-square object-contain rounded-md bg-gray-100" />
      
      {mediaUrls.length > 1 && (
        <>
          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-2 bg-white p-2 rounded-full cursor-pointer"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
          >
            <ChevronLeft size={24} />
          </button>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-2 bg-white p-2 rounded-full cursor-pointer"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
}

export default ImageSlider;