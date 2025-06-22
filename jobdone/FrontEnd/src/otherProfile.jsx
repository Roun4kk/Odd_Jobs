import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import { BadgeCheck, MoreVertical, Star, ArrowLeft } from "lucide-react";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import UserJobs from "./userJobs";
import { useNavigate } from "react-router-dom";
import ProfileComp from "./profileComp.jsx";
import logo from "./assets/logo/logo-jobddone.svg";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar.jsx";

function OtherProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [verified, setVerified] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [job, setJob] = useState("posts");
  const { user } = useAuth();
  const [comp, setComp] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setHasToken(true);
    } else {
      setHasToken(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}`);
        setProfile(response.data);

        if (response.data?.verified?.email && response.data?.verified?.phoneNumber) {
          setVerified(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setError("Failed to load profile or profile not found");
      }
    };

    fetchProfile();
  }, [userId]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${isMobile ? 'min-h-screen flex flex-col' : 'flex h-screen'}`}>
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-teal-50 flex-shrink-0">
            {hasToken ? (
              <>
                <button 
                  onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/landing")} 
                  className="p-2 rounded-full hover:bg-teal-100"
                >
                  <ArrowLeft className="w-6 h-6 text-teal-700 hover:text-teal-900" />
                </button>
                <h1 className="text-lg font-semibold text-teal-800">Post</h1>
                <div className="w-6 h-6" /> {/* Spacer for alignment */}
              </>
            ) : (
              <>
                <div className="flex items-center justify-start h-12 px-4">
                  <div className="w-full items-center mt-4 justify-center max-w-[160px]">
                    <img
                      src={logo}
                      alt="JobDone Logo"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate("/")}
                    className="px-3 py-1 text-[10px] text-teal-600 border border-teal-600 rounded-full hover:bg-teal-50"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => navigate("/")}
                    className="px-3 py-1 text-[10px] bg-teal-600 text-white rounded-full hover:bg-teal-700"
                  >
                    Sign Up
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Desktop Sidebar */}
        {!isMobile && user && <Sidebar user={user} />}
        
        <div className={`${
          isMobile 
            ? "flex-1 flex justify-center items-center bg-white px-4" 
            : hasToken ? "w-[70%] fixed right-0 bg-white h-full overflow-y-scroll" : "w-full flex justify-center bg-white h-full overflow-y-scroll"
        }`}>
          <div className="flex justify-center items-center h-full text-red-500 text-center">
            {error}
          </div>
        </div>
        
        {/* Mobile Bottom Navbar */}
        {isMobile && hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
            <BottomNavbar />
          </div>
        )}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-teal-50 flex-shrink-0">
          {hasToken ? (
            <>
              <button onClick={() => navigate("/landing")} className="p-2 rounded-full hover:bg-teal-100">
                <ArrowLeft className="w-6 h-6 text-teal-700 hover:text-teal-900" />
              </button>
              <h1 className="text-lg font-semibold text-teal-800">Profile</h1>
              <div className="w-6 h-6" /> {/* Spacer for alignment */}
            </>
          ) : (
            <>
              <div className="flex items-center justify-start h-12 px-4">
                <div className="w-full items-center mt-4 justify-center max-w-[160px]">
                  <img
                    src={logo}
                    alt="JobDone Logo"
                    className="w-full h-auto object-contain"
                    />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm text-teal-600 border border-teal-600 rounded-full hover:bg-teal-50"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm bg-teal-600 text-white rounded-full hover:bg-teal-700"
                >
                  Sign Up
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Profile Content - Constrained container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {profile.blockedUsers?.includes(user?._id) ? (
            <div className="flex items-center justify-center h-full text-gray-500 font-semibold">
              User not available.
            </div>
          ) : (
            <>
              {/* Profile Info Section */}
              <div className="p-4 flex-shrink-0">
                <div className="flex items-start gap-4">
                  {/* User Image */}
                  <button disabled={!hasToken} className="w-20 h-20 cursor-pointer flex-shrink-0">
                    <img
                      src={
                        profile?.userImage ||
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
                          title={profile?.username}
                        >
                          {profile?.username || "User not found"}
                        </h2>
                        {verified && <BadgeCheck className="h-4 w-4 text-teal-400" />}
                      </div>
                      {hasToken && (
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={() => navigate("/messages", { state: { newChatWith: profile } })}
                            className="px-2 py-1 bg-teal-400 text-white rounded-full text-xs hover:bg-teal-600 transition cursor-pointer duration-200"
                          >
                            Message
                          </button>
                          <button
                            onClick={() => setComp(prev => !prev)}
                            className="px-2 py-1 bg-teal-400 text-white rounded-full text-xs hover:bg-teal-600 transition cursor-pointer duration-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    <p className="text-gray-600 text-sm">{profile?.email || "User not found"}</p>
                    <p className="text-gray-600 text-sm mt-2">{profile?.userBio || ""}</p>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile?.userSkills?.map((skill, index) => (
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
                  {typeof profile?.totalRating === 'number' && profile.totalRating > 0 && (
                    <div className="mt-2 flex items-center justify-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(profile.averageRating || 0)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                          fill={i < Math.round(profile.averageRating || 0) ? "#facc15" : "none"}
                        />
                      ))}
                      <span className="text-xs text-gray-600 ml-1">
                        {profile.averageRating?.toFixed(1) || "0.0"}
                      </span>
                      <span className="text-xs text-gray-600">
                        ({profile.totalRating} {profile.totalRating === 1 ? "Review" : "Reviews"})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Tabs - Fixed position */}
              <div className="flex border-t border-gray-200 bg-white flex-shrink-0">
                <button
                  onClick={() => setJob("posts")}
                  className={`flex-1 py-2 text-center text-sm font-medium ${
                    job === "posts" ? "border-t-2 border-teal-400 text-teal-800" : "text-gray-600"
                  }`}
                >
                  Posts
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

              {/* UserJobs Content - Properly constrained scrollable area */}
              <div className="flex-1 overflow-hidden">
                <div 
                  className="h-full overflow-y-auto px-4"
                  style={{
                    paddingBottom: hasToken ? '80px' : '20px' // Account for bottom navbar height
                  }}
                >
                  <div className="w-full max-w-md mx-auto">
                    <UserJobs job={job} userProfile={profile} hasToken={hasToken} />
                  </div>
                </div>
              </div>
            </>
          )}
          {hasToken && comp && <ProfileComp userId={userId} setComp={setComp} />}
        </div>

        {/* Mobile Bottom Navbar - Fixed at bottom */}
        {hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
            <BottomNavbar />
          </div>
        )}
      </div>
    );
  }

  // Desktop UI (Unchanged)
  return (
    <div className="flex h-screen overflow-hidden">
      {hasToken && <Sidebar user={user} />}
      <div className={`h-full overflow-y-scroll ${hasToken ? "fixed right-0 w-[70%]" : "w-full"} bg-white`}>
        { !isMobile && !hasToken && (
          <div className=" flex items-center justify-between p-4 border-b border-gray-200 bg-teal-50 flex-shrink-0">
            <div className="flex items-center justify-start h-12 px-4">
                <div className="w-full items-center mt-4 justify-center max-w-[160px]">
                  <img
                    src={logo}
                    alt="JobDone Logo"
                    className="w-full h-auto object-contain"
                    />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm text-teal-600 border border-teal-600 rounded-full hover:bg-teal-50 cursor-pointer"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm bg-teal-600 text-white rounded-full hover:bg-teal-700 cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
          </div>
          )}
        {profile.blockedUsers?.includes(user?._id) ? (
          <div className="flex items-center text-bold justify-center h-screen text-gray-500">
            User not available.
          </div>
        ) : (
          <div className={`h-full flex flex-col items-center justify-start ${!hasToken ? 'mx-auto max-w-[70%]' : ''}`}>
            {/* Profile Header */}
            <div className="w-2/3 flex items-center justify-start py-6">
              <div className="w-40 h-40 flex-shrink-0">
                <button disabled={!hasToken} className="w-full h-full cursor-pointer">
                  <img
                    src={
                      profile?.userImage ||
                      "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"
                    }
                    alt="User"
                    className="w-full h-full rounded-full border-2 border-white object-cover"
                  />
                </button>
              </div>
              <div className="ml-6 flex-1 flex-col items-start justify-center">
                <div className="flex items-center justify-start w-full gap-2">
                  <button disabled={!hasToken} className="text-2xl font-bold text-gray-800 cursor-pointer">
                    {profile?.username || "User not found"}
                  </button>
                  {verified && <BadgeCheck className="h-6 w-6 text-teal-400" />}
                  <div className="h-full ml-auto">
                    {hasToken && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate("/messages", { state: { newChatWith: profile } })}
                          className="ml-5 px-4 py-2 bg-teal-400 text-white rounded-3xl hover:bg-teal-600 transition cursor-pointer duration-200"
                        >
                          Message
                        </button>
                        <button>
                          <MoreVertical onClick={() => setComp(true)} className="h-6 w-6 text-gray-400 cursor-pointer ml-2" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600">{profile?.email || "User not found"}</p>
                <p className="text-gray-600">{profile?.userBio || ""}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {profile?.userSkills?.map((skill, index) => (
                    <span key={index} className="bg-teal-400 text-white px-2 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                  {typeof profile?.totalRating === 'number' && profile.totalRating > 0 && (
                    <div className="mt-1 flex items-center flex-wrap gap-1 ml-auto">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.round(profile.averageRating || 0)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                          fill={i < Math.round(profile.averageRating || 0) ? "#facc15" : "none"}
                        />
                      ))}
                      <span className="text-sm text-gray-700 font-medium ml-1">
                        {profile.averageRating?.toFixed(1) || "0.0"}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">
                        ({profile.totalRating} {profile.totalRating === 1 ? "Review" : "Reviews"})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Posts / Bids Toggle */}
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
                onClick={() => setJob("reviews")}
                className={`w-1/2 flex justify-center cursor-pointer border-t-4 ${
                  job === "reviews" ? "border-teal-400" : "border-transparent"
                }`}
              >
                <div className="py-2">REVIEWS</div>
              </button>
            </div>

            {/* Posts / Bids Display */}
            <div className="w-5/6 flex items-center justify-center mt-4">
              <UserJobs job={job} userProfile={profile} hasToken={hasToken} />
            </div>
          </div>
        )}
        {hasToken && comp && <ProfileComp userId={userId} setComp={setComp} />}
      </div>
    </div>
  );
}

export default OtherProfile;