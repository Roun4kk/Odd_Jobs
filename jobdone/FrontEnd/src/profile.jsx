import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "./hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import { BadgeCheck, Star, ArrowLeft } from "lucide-react";
import UserJobs from "./userJobs";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar.jsx";
import toast from 'react-hot-toast';
import { useTheme } from "./ThemeContext"; // Import useTheme

function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState("posts");
  const [verified, setVerified] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const isMobile = useIsMobile();
  const { theme } = useTheme(); // Get current theme

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("No user found, redirecting to login");
        navigate("/");
      } else {
        console.log("User found, setting hasToken to true");
        setHasToken(true);
      }
    }
  }, [user, loading, navigate]);

  const checkVerified = () => {
    if (user?.verified?.email && user.verified.phoneNumber) {
      setVerified(true);
    }
  };
  const headingStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#f0fdfa' // This is the hex code for teal-400
  };
  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };

  useEffect(() => {
    if (user) {
      checkVerified();
    }
  }, [user?._id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <img src={logo} alt="Redirecting..." className="w-40 h-40 animate-pulse" />
        <div className="ml-4 text-gray-600 dark:text-gray-300">Redirecting to login...</div>
      </div>
    );
  }

  const reviewCount = user?.totalRating || user?.ratings?.length || 0;

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex z-10 items-center justify-center w-full h-16 shadow-sm border-b border-gray-200 dark:border-gray-700" style={headingStyle}>
          <h1 className="text-2xl font-semibold text-teal-800 dark:text-teal-400">Profile</h1>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 flex-shrink-0">
            <div className="flex items-start gap-4">
              <button className="w-20 h-20 cursor-pointer flex-shrink-0">
                <img
                  src={
                    user?.userImage ||
                    "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
                  }
                  alt="User"
                  className="w-full h-full rounded-full border-2 border-teal-400 object-cover"
                />
              </button>

              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <h2
                      className="text-lg font-bold text-gray-800 dark:text-white truncate max-w-[80px]"
                      title={user?.username}
                    >
                      {user?.username || "User not found"}
                    </h2>
                    {verified && <BadgeCheck className="h-4 w-4 text-teal-400" />}
                  </div>
                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => navigate("/EditProfile")}
                      className="px-2 py-1 text-[10px] text-white rounded-full hover:bg-teal-600 transition cursor-pointer duration-200"
                      style={buttonStyle}
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        const publicUrl = `${window.location.origin}/profile/${user._id}`;
                        navigator.clipboard.writeText(publicUrl);
                        toast.success("Public profile link copied to clipboard!");
                      }}
                      className="px-2 py-1 text-white rounded-full text-[10px] hover:bg-teal-600 transition cursor-pointer duration-200"
                      style={buttonStyle}
                    >
                      Public Profile
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm truncate max-w-[200px]">{user?.email || "User not found"}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{user?.userBio || ""}</p>

                <div className="flex flex-wrap gap-2 mt-2">
                  {user?.userSkills?.map((skill, index) => (
                    <span
                      key={index}
                      className=" text-white px-2 py-1 rounded-full text-xs max-w-60 sm:max-w-none truncate"
                      style ={ buttonStyle }
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              {reviewCount > 0 && (
                <div className="mt-2 flex items-center justify-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(user?.averageRating || 0)
                          ? "text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                      fill={
                        i < Math.round(user?.averageRating || 0)
                          ? "#facc15"
                          : "none"
                      }
                    />
                  ))}
                  <span
                    title="Average user rating"
                    className="text-xs text-gray-600 dark:text-gray-400 ml-1"
                  >
                    {user?.averageRating?.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    ({reviewCount} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            <button
              onClick={() => setJob("posts")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "posts" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setJob("bids")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "bids" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Bids
            </button>
            <button
              onClick={() => setJob("saved")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "saved" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => setJob("reviews")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "reviews" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Reviews
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto px-4"
              style={{
                paddingBottom: hasToken ? '80px' : '20px'
              }}
            >
              <div className="w-full max-w-md mx-auto">
                <UserJobs job={job} hasToken={hasToken} />
              </div>
            </div>
          </div>
        </div>

        {hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <BottomNavbar />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden dark:bg-gray-900">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 bg-white dark:bg-gray-900 flex flex-col items-center justify-start overflow-y-scroll">
        <div className="w-2/3 flex items-center justify-start py-6">
          <div className="w-40 h-40 flex-shrink-0">
            <button className="w-full h-full cursor-pointer">
              <img
                src={
                  user?.userImage ||
                  "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
                }
                alt="User"
                className="w-full h-full rounded-full border-4 border-teal-400 object-cover"
              />
            </button>
          </div>

          <div className="ml-6 flex-1 flex-col items-start justify-center">
            <div className="flex items-center justify-start w-full gap-2">
              <button
                className="text-2xl font-bold text-gray-800 dark:text-white cursor-pointer truncate max-w-[200px] overflow-hidden whitespace-nowrap"
                title={user?.username}
              >
                {user?.username || "User not found"}
              </button>
              {verified && <BadgeCheck className="h-6 w-6 text-teal-400" />}
              <div className="h-full ml-auto flex gap-2">
                <button
                  onClick={() => navigate("/EditProfile")}
                  className="px-4 py-2 text-white rounded-3xl hover:bg-teal-600 transition cursor-pointer duration-200"
                  style={buttonStyle}
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    const publicUrl = `${window.location.origin}/profile/${user._id}`;
                    navigator.clipboard.writeText(publicUrl);
                    toast.success("Public profile link copied to clipboard!");
                  }}
                  className="px-4 py-2 text-white rounded-3xl hover:bg-teal-600 transition cursor-pointer duration-200"
                  style={buttonStyle}
                >
                  Public Profile
                </button>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{user?.email || "User not found"}</p>
            <p className="text-gray-600 dark:text-gray-400">{user?.userBio || ""}</p>
            <div className="flex gap-2 mt-2 flex-wrap w-full items-center">
              {user?.userSkills?.map((skill, index) => (
                <span
                  key={index}
                  className=" text-white px-2 py-1 rounded-full text-sm max-w-130 truncate"
                  style={buttonStyle}
                >
                  {skill}
                </span>
              ))}

              {reviewCount > 0 && (
                <div className="mt-1 flex items-center gap-1 ml-auto">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(user?.averageRating || 0)
                          ? "text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                      fill={
                        i < Math.round(user?.averageRating || 0)
                          ? "#facc15"
                          : "none"
                      }
                    />
                  ))}
                  <span
                    title="Average user rating"
                    className="text-sm text-gray-600 dark:text-gray-400 ml-1"
                  >
                    {user?.averageRating?.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                    ({reviewCount} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-5/6 flex items-center justify-center border-t dark:border-gray-700">
          <button
              onClick={() => setJob("posts")}
              className={`flex-1 py-2 text-center text-lg font-medium ${
                job === "posts" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setJob("bids")}
              className={`flex-1 py-2 text-center text-lg font-medium ${
                job === "bids" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Bids
            </button>
            <button
              onClick={() => setJob("saved")}
              className={`flex-1 py-2 text-center text-lg font-medium ${
                job === "saved" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => setJob("reviews")}
              className={`flex-1 py-2 text-center text-lg font-medium ${
                job === "reviews" ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Reviews
            </button>
        </div>

        <div className="w-5/6 flex items-center justify-center mt-4 ">
          <UserJobs job={job} hasToken={hasToken} />
        </div>
      </div>
    </div>
  );
}

export default Profile;