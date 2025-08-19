import { useEffect, useState, useRef } from "react";
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
import { useTheme } from "./ThemeContext";
import logoDark from "./assets/logo/logo-jobdone-dark.svg";
import loadingLogo from "./assets/logo/logo-transparent-jobdone.svg";
import loadingLogoDark from "./assets/logo/logo-dark.svg";

function OtherProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [verified, setVerified] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [job, setJob] = useState("posts");
  const { user, loading } = useAuth();
  const [comp, setComp] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [error, setError] = useState(null);
  const { theme } = useTheme();

  // Create refs for the trigger buttons, just like in Sidebar.jsx
  const mobileMoreRef = useRef(null);
  const desktopMoreRef = useRef(null);

  useEffect(() => {
    if (user) {
      setHasToken(true);
    } else {
      setHasToken(false);
    }
  }, [user]);

  const headingStyle = {
    background:
      theme === "dark"
        ? "linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)"
        : "#f0fdfa", // This is the hex code for teal-400
  };
  const buttonStyle = {
    background:
      theme === "dark"
        ? "linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)"
        : "#2dd4bf", // This is the hex code for teal-400
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/users/${userId}`
        );
        setProfile(response.data);

        if (
          response.data?.verified?.email &&
          response.data?.verified?.phoneNumber
        ) {
          setVerified(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setError("Failed to load profile or profile not found");
      }
    };

    fetchProfile();
  }, [userId]);
  if (loading) {
          return (
              <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
                  {theme !== 'dark' && (
                      <div className="w-44 h-44">
                          <img src={loadingLogo} alt="JobDone Logo" className="object-contain w-full h-full animate-pulse" />
                      </div>
                  )}
                  {theme === 'dark' && (
                      <div className="w-46 h-46">
                          <img src={loadingLogoDark} alt="JobDone Logo Dark" className="object-contain w-full h-full animate-pulse" />
                      </div>
                  )}
              </div>
          );
      }
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <img src={logo} alt="Loading..." className="w-40 h-40 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${isMobile ? "min-h-screen flex flex-col" : "flex h-screen"}`}
      >
        {isMobile && (
          <div
            className="flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
            style={headingStyle}
          >
            {hasToken ? (
              <>
                <h1 className="text-2xl font-semibold text-teal-800 dark:text-teal-400">
                  Profile
                </h1>
              </>
            ) : (
              <>
                <div className="flex items-center justify-start h-12 px-4">
                  {theme !== "dark" && (
                    <div className="w-full items-center justify-center max-w-[250px] mt-3">
                      <img
                        src={logo}
                        alt="JobDone Logo"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  )}
                  {theme === "dark" && (
                    <div className="w-full items-center justify-center max-w-[130px] ml-4 mb-1.5">
                      <img
                        src={logoDark}
                        alt="JobDone Logo Dark"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/")}
                    className="px-3 py-1 text-[10px] text-teal-600 border whitespace-nowrap border-teal-600 rounded-full hover:bg-teal"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="px-3 py-1 text-[10px] bg-teal-600 text-white rounded-full hover:bg-teal-700 whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!isMobile && user && <Sidebar user={user} />}

        <div
          className={`${
            isMobile
              ? "flex-1 flex justify-center items-center bg-white dark:bg-gray-900 px-4"
              : hasToken
              ? "w-[70%] fixed right-0 bg-white dark:bg-gray-900 h-full overflow-y-scroll"
              : "w-full flex justify-center bg-white dark:bg-gray-900 h-full overflow-y-scroll"
          }`}
        >
          <div className="flex justify-center items-center h-full text-red-500 text-center">
            {error}
          </div>
        </div>

        {isMobile && hasToken && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <BottomNavbar />
          </div>
        )}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div
          className="flex items-center justify-center border-b z-10 shadow-sm h-16 w-full border-gray-200 dark:border-gray-700 flex-shrink-0"
          style={headingStyle}
        >
          {hasToken ? (
            <>
              <h1 className="text-2xl font-semibold text-teal-800 dark:text-teal-400">
                Profile
              </h1>
            </>
          ) : (
            <div className="flex items-center justify-between h-12 px-4 w-full">
              <div className="flex items-center justify-start flex-1">
                {theme !== "dark" && (
                  <div className="w-full items-center justify-center max-w-[250px] mt-3">
                    <img
                      src={logo}
                      alt="JobDone Logo"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                )}
                {theme === "dark" && (
                  <div className="w-full items-center justify-center max-w-[130px] ml-4 mb-1.5">
                    <img
                      src={logoDark}
                      alt="JobDone Logo Dark"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm text-teal-600 border whitespace-nowrap border-teal-600 rounded-full hover:bg-teal"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="px-3 py-1 text-sm bg-teal-600 text-white rounded-full hover:bg-teal-700 whitespace-nowrap"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {profile.blockedUsers?.includes(user?._id) ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 font-semibold">
              User not available.
            </div>
          ) : (
            <>
              <div className="p-4 flex-shrink-0">
                <div className="flex items-start gap-4">
                  <button
                    disabled={!hasToken}
                    className="w-20 h-20 cursor-pointer flex-shrink-0"
                  >
                    <img
                      src={
                        profile?.userImage ||
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
                          className="text-lg font-bold text-gray-800 dark:text-white truncate max-w-[120px]"
                          title={profile?.name ? profile.name : profile.username || "User not found"}
                        >
                          {profile?.name ? profile.name : profile.username || "User not found"}
                        </h2>
                        {verified && (
                          <BadgeCheck className="h-4 w-4 text-teal-400" />
                        )}
                      </div>
                      {hasToken && (
                        <div className="ml-auto flex gap-1 items-center">
                          <button
                            onClick={() =>
                              navigate("/messages", {
                                state: { newChatWith: profile },
                              })
                            }
                            className="px-2 py-1 text-white rounded-full text-xs hover:bg-teal-600 transition cursor-pointer duration-200"
                            style={buttonStyle}
                          >
                            Message
                          </button>
                          <div className="relative">
                            <button
                              ref={mobileMoreRef}
                              onClick={() => setComp((prev) => !prev)}
                              className="px-2 py-1 text-gray-400 dark:text-gray-300 cursor-pointer duration-200"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {comp && (
                              <ProfileComp
                                userId={userId}
                                setComp={setComp}
                                triggerRef={mobileMoreRef}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {profile?.name ? "@" + profile.name : "User not found"}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                      {profile?.userBio || ""}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile?.userSkills?.map((skill, index) => (
                        <span
                          key={index}
                          className=" text-white px-2 py-1 rounded-full text-xs max-w-60 sm:max-w-none truncate"
                          style={buttonStyle}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  {typeof profile?.totalRating === "number" &&
                    profile.totalRating > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.round(profile.averageRating || 0)
                                ? "text-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                            fill={
                              i < Math.round(profile.averageRating || 0)
                                ? "#facc15"
                                : "none"
                            }
                          />
                        ))}
                        <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                          {profile.averageRating?.toFixed(1) || "0.0"}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          ({profile.totalRating}{" "}
                          {profile.totalRating === 1 ? "Review" : "Reviews"})
                        </span>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                <button
                  onClick={() => setJob("posts")}
                  className={`flex-1 py-2 text-center text-sm font-medium ${
                    job === "posts"
                      ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setJob("reviews")}
                  className={`flex-1 py-2 text-center text-sm font-medium ${
                    job === "reviews"
                      ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Reviews
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <div
                  className="h-full overflow-y-auto px-4"
                  style={{
                    paddingBottom: hasToken ? "80px" : "20px",
                  }}
                >
                  <div className="w-full max-w-md mx-auto">
                    <UserJobs
                      job={job}
                      userProfile={profile}
                      hasToken={hasToken}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
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
      {hasToken && <Sidebar user={user} />}
      <div
        className={`h-full overflow-y-scroll ${
          hasToken ? "fixed right-0 w-[70%]" : "w-full"
        } bg-white dark:bg-gray-900`}
      >
        {!isMobile && !hasToken && (
          <div className=" flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-gray-800 flex-shrink-0">
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
          <div className="flex items-center text-bold justify-center h-screen text-gray-500 dark:text-gray-400">
            User not available.
          </div>
        ) : (
          <div
            className={`h-full flex flex-col items-center justify-start ${
              !hasToken ? "mx-auto max-w-[70%]" : ""
            }`}
          >
            <div className="w-2/3 flex items-center justify-start py-6">
              <div className="w-40 h-40 flex-shrink-0">
                <button
                  disabled={!hasToken}
                  className="w-full h-full cursor-pointer"
                >
                  <img
                    src={
                      profile?.userImage ||
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
                    disabled={!hasToken}
                    className="text-2xl font-bold text-gray-800 dark:text-white cursor-pointer truncate max-w-[300px]"
                  >
                    {profile?.name ? profile?.name : profile?.username || "User not found"}
                  </button>
                  {verified && (
                    <BadgeCheck className="h-6 w-6 text-teal-400" />
                  )}
                  <div className="h-full ml-auto">
                    {hasToken && (
                      <div className="relative flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate("/messages", {
                              state: { newChatWith: profile },
                            })
                          }
                          className="ml-5 px-4 py-2 text-white rounded-3xl hover:bg-teal-600 transition cursor-pointer duration-200"
                          style={buttonStyle}
                        >
                          Message
                        </button>
                        <button
                          ref={desktopMoreRef}
                          onClick={() => setComp((prev) => !prev)}
                        >
                          <MoreVertical className="h-6 w-6 text-gray-400 dark:text-gray-300 cursor-pointer ml-2" />
                        </button>
                        {comp && (
                          <ProfileComp
                            userId={userId}
                            setComp={setComp}
                            triggerRef={desktopMoreRef}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {"@" + profile?.username || "User not found"}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {profile?.userBio || ""}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {profile?.userSkills?.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-teal-400 text-white px-2 py-1 rounded-full text-sm max-w-130 truncate"
                    >
                      {skill}
                    </span>
                  ))}
                  {typeof profile?.totalRating === "number" &&
                    profile.totalRating > 0 && (
                      <div className="mt-1 flex items-center flex-wrap gap-1 ml-auto">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.round(profile.averageRating || 0)
                                ? "text-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                            fill={
                              i < Math.round(profile.averageRating || 0)
                                ? "#facc15"
                                : "none"
                            }
                          />
                        ))}
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium ml-1">
                          {profile.averageRating?.toFixed(1) || "0.0"}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                          ({profile.totalRating}{" "}
                          {profile.totalRating === 1 ? "Review" : "Reviews"})
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
                  job === "posts"
                    ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setJob("reviews")}
                className={`flex-1 py-2 text-center text-lg font-medium ${
                  job === "reviews"
                    ? "border-t-2 border-teal-400 text-teal-800 dark:text-teal-300"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Reviews
              </button>
            </div>

            <div className="w-5/6 flex items-center justify-center mt-4">
              <UserJobs
                job={job}
                userProfile={profile}
                hasToken={hasToken}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OtherProfile;