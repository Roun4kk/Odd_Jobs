import { useState , useEffect } from "react";
import useAuth from "./hooks/useAuth.jsx";
import JobPostInput from "./components/jobpostinput.jsx";
import JobFeed from "./components/jobfeed.jsx";
import Sidebar from "./Sidebar";
import logo from "./assets/logo/logo-jobddone-cropped.svg";
import logoDark from"./assets/logo/logo-dark.svg";
import headerLogo from "./assets/logo/logo-jobdone-dark.svg"
import loadingLogo from "./assets/logo/logo-transparent-jobdone.svg";
import SearchSkills from "./components/searchSkills.jsx";
import BottomNavbar from "./bottomNavBar.jsx";
import useIsMobile from "./hooks/useIsMobile";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext"; // Import useTheme

function Landing() {
  const { user, loading } = useAuth();
  const { theme } = useTheme(); // Get current theme
  const isMobile = useIsMobile();
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [showJobPost, setShowJobPost] = useState(false);
  const [showSkillsSearch, setShowSkillsSearch] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const navigate = useNavigate();

  const headingStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#f0fdfa' // This is the hex code for teal-400
  };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        {theme!=='dark' && (
          <div className=" w-44 h-44">
            <img src={loadingLogo} alt="JobDone Logo" className="object-contain w-full h-full animate-pulse " />
          </div>)}
        {theme === 'dark' && (
          <div className=" w-46 h-46">
            <img src={logoDark} alt="JobDone Logo Dark" className="object-contain w-full h-full animate-pulse " />
          </div>
        )}
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <div className="sticky top-0 border-b border-gray-200 dark:border-gray-700 w-full h-16 z-10 shadow-sm flex-shrink-0" style={headingStyle}>
          <div className="flex items-center justify-center h-12 px-4">
            {theme!=="dark" && (<div className="w-full items-center justify-center max-w-[250px] mt-3">
              <img
                src={logo}
                alt="JobDone Logo"
                className="w-full h-auto object-contain"
              />
            </div>)}
            {theme==="dark" && (
              <div className="w-full items-center justify-center max-w-[130px] mt-3">
                <img
                  src={headerLogo}
                  alt="JobDone Logo Dark"
                  className="w-full h-auto object-contain"
                />
              </div>)
            }
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
            <div 
              className="h-full overflow-y-auto"
              style={{ paddingBottom: '80px', pointerEvents: 'auto' }}
            > 
              {/* JobPostInput is now a direct child and will control its own width */}
              <JobPostInput
                refresh={() => setRefreshFlag((prev) => !prev)}
                user={user}
              />
              {/* A wrapper for JobFeed to constrain its width and add padding */}
              <div className="w-full max-w-md mx-auto px-4">
                <JobFeed refreshFlag={refreshFlag} />
              </div>
            </div>
          </div>

        {/* Bottom Nav - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <BottomNavbar />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar user={user} />
      <div className="w-[70%] h-full overflow-y-scroll overflow-x-hidden">
        <div className="flex min-h-screen">
          {/* Center */}
          <div className="w-[57%] p-4 transform-gpu">
            <div className="flex flex-col items-center ">
              <JobPostInput
                refresh={() => setRefreshFlag((prev) => !prev)}
                user={user}
              />
              <JobFeed refreshFlag={refreshFlag} />
            </div>
          </div>
          {/* Right */}
          <div className="w-[43%] bg-white dark:bg-gray-800 sticky top-0 h-screen border-l border-gray-200 dark:border-gray-700">
            <SearchSkills />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;