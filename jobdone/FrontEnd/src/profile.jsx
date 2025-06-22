import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "./hooks/useAuth.jsx";
import Sidebar from "./Sidebar";
import { BadgeCheck, Star, ArrowLeft } from "lucide-react";
import UserJobs from "./userJobs";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar.jsx";

function Profile() {
  const { user, updateUser, loading } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState("posts");
  const [verified, setVerified] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const isMobile = useIsMobile();

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

  useEffect(() => {
    if (user) {
      checkVerified();
    }
  }, [user?._id]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  // Show loading screen briefly while redirect is happening
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <img src={logo} alt="Redirecting..." className="w-40 h-40 animate-pulse" />
        <div className="ml-4 text-gray-600">Redirecting to login...</div>
      </div>
    );
  }

  const reviewCount = user?.totalRating || user?.ratings?.length || 0;

  if (isMobile) {
    return (
      <div className="min-h-screen">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-teal-50">
          <button onClick={() => navigate("/landing")} className="p-2 rounded-full hover:bg-teal-100">
            <ArrowLeft className="w-6 h-6 text-teal-700 hover:text-teal-900" />
          </button>
          <h1 className="text-lg font-semibold text-teal-800">Profile</h1>
          <div className="w-6 h-6" /> {/* Spacer for alignment */}
        </div>

        {/* Mobile Profile Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-start gap-4">
            {/* User Image */}
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

            {/* Right Side: Username, Buttons, Bio, Skills */}
            <div className="flex-1 flex flex-col">
              {/* Username and Buttons Row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <h2
                    className="text-lg font-bold text-gray-800 truncate max-w-[120px]"
                    title={user?.username}
                  >
                    {user?.username || "User not found"}
                  </h2>
                  {verified && <BadgeCheck className="h-4 w-4 text-teal-400" />}
                </div>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => navigate("/EditProfile")}
                    className="px-2 py-1 bg-teal-400 text-white rounded-full text-xs hover:bg-teal-600 transition cursor-pointer duration-200"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      const publicUrl = `${window.location.origin}/profile/${user._id}`;
                      navigator.clipboard.writeText(publicUrl);
                      alert("Public profile link copied to clipboard!");
                    }}
                    className="px-2 py-1 bg-teal-400 text-white rounded-full text-xs hover:bg-teal-600 transition cursor-pointer duration-200"
                  >
                    Public Profile
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{user?.email || "User not found"}</p>
              <p className="text-gray-600 text-sm mt-2">{user?.userBio || ""}</p>

              {/* Skills */}
              <div className="flex flex-wrap gap-2 mt-2">
                {user?.userSkills?.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-teal-400 text-white px-2 py-1 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Email and Reviews (Centered) */}
          <div className="mt-4 text-center">
            {reviewCount > 0 && (
              <div className="mt-2 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(user?.averageRating || 0)
                        ? "text-yellow-400"
                        : "text-gray-300"
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
                  className="text-xs text-gray-600 ml-1"
                >
                  {user?.averageRating?.toFixed(1)}
                </span>
                <span className="text-xs text-gray-600">
                  ({reviewCount} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Mobile Tabs */}
          <div className="flex border-t border-gray-200 mt-6 overflow-x-auto">
            <button
              onClick={() => setJob("posts")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "posts" ? "border-t-2 border-teal-400 text-teal-800" : "text-gray-600"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setJob("bids")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "bids" ? "border-t-2 border-teal-400 text-teal-800" : "text-gray-600"
              }`}
            >
              Bids
            </button>
            <button
              onClick={() => setJob("saved")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "saved" ? "border-t-2 border-teal-400 text-teal-800" : "text-gray-600"
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => setJob("reviews")}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                job === "reviews" ? "border-t-2 border-teal-400 text-teal-800" : "text-gray-600"
              }`}
            >
              Reviews
            </button>
          </div>

          {/* Mobile UserJobs */}
          <div 
            className="w-full overflow-y-auto" // Removed padding and flex properties
            style={{ 
              height: 'calc(100dvh - 7rem)',
            }}
          > 
            <div className="w-full max-w-md mx-auto px-4">
              <UserJobs job={job} hasToken={hasToken} />
            </div>
          </div>
        </div>
        {/* Mobile Bottom Navbar */}
        {hasToken && <BottomNavbar />}
      </div>
    );
  }

  // Desktop UI (Unchanged)
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="w-[70%] h-full fixed right-0 top-0 bg-white flex flex-col items-center justify-start overflow-y-scroll">
        <div className="w-2/3 flex items-center justify-start py-6">
          <div className="w-40 h-40 flex-shrink-0">
            <button className="w-full h-full cursor-pointer">
              <img
                src={
                  user?.userImage ||
                  "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
                }
                alt="User"
                className="w-full h-full rounded-full border-2 border-white object-cover"
              />
            </button>
          </div>

          <div className="ml-6 flex-1 flex-col items-start justify-center">
            <div className="flex items-center justify-start w-full gap-2">
              <button
                className="text-2xl font-bold text-gray-800 cursor-pointer truncate max-w-[200px] overflow-hidden whitespace-nowrap"
                title={user?.username}
              >
                {user?.username || "User not found"}
              </button>
              {verified && <BadgeCheck className="h-6 w-6 text-teal-400" />}
              <div className="h-full ml-auto flex gap-2">
                <button
                  onClick={() => navigate("/EditProfile")}
                  className="px-4 py-2 bg-teal-400 text-white rounded-3xl hover:bg-teal-600 transition cursor-pointer duration-200"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    const publicUrl = `${window.location.origin}/profile/${user._id}`;
                    navigator.clipboard.writeText(publicUrl);
                    alert("Public profile link copied to clipboard!");
                  }}
                  className="px-4 py-2 bg-teal-400 text-white rounded-3xl hover:bg-teal-600 transition cursor-pointer duration-200"
                >
                  Public Profile
                </button>
              </div>
            </div>
            <p className="text-gray-600">{user?.email || "User not found"}</p>
            <p className="text-gray-600">{user?.userBio || ""}</p>
            <div className="flex gap-2 mt-2 flex-wrap w-full items-center">
              {user?.userSkills?.map((skill, index) => (
                <span
                  key={index}
                  className="bg-teal-400 text-white px-2 py-1 rounded-full text-sm"
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
                          : "text-gray-300"
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
                    className="text-sm text-gray-600 ml-1"
                  >
                    {user?.averageRating?.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">
                    ({reviewCount} reviews)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-5/6 flex items-center justify-center border-t">
          <button
            onClick={() => setJob("posts")}
            className={`w-1/2 flex justify-center cursor-pointer border-t-4 ${
              job === "posts" ? "border-teal-400" : "border-transparent"
            }`}
          >
            <div className="py-2">POSTS</div>
          </button>

          <button
            onClick={() => setJob("bids")}
            className={`w-1/2 flex justify-center cursor-pointer border-t-4 ${
              job === "bids" ? "border-teal-400" : "border-transparent"
            }`}
          >
            <div className="py-2">BIDS</div>
          </button>

          <button
            onClick={() => setJob("saved")}
            className={`w-1/2 flex justify-center cursor-pointer border-t-4 ${
              job === "saved" ? "border-teal-400" : "border-transparent"
            }`}
          >
            <div className="py-2">SAVED</div>
          </button>

          <button
            onClick={() => setJob("reviews")}
            className={`w-1/2 flex justify-center cursor-pointer border-t-4 ${
              job === "reviews" ? "border-teal-400" : "border-transparent"
            }`}
          >
            <div className="py-2">REVIEWS</div>
          </button>
        </div>

        <div className="w-5/6 flex items-center justify-center mt-4">
          <UserJobs job={job} hasToken={hasToken} />
        </div>
      </div>
    </div>
  );
}

export default Profile;