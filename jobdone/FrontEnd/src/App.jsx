import { useState, useEffect, memo, useRef } from "react";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
import logoDark from "./assets/logo/logo-dark.svg"
import googleIcon from "./assets/icons/google.svg";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import useIsMobile from "./hooks/useIsMobile"; // Custom hook for mobile detection
import { useTheme } from "./ThemeContext";
import CookieDisclaimer from "./CookieDisclaimer.jsx";

// Lucide icons
import { Rss, Search as SearchIcon, MessageCircle, User, Bell, ShieldCheck, ArrowDown, Briefcase, Zap, Star, Eye, EyeOff, ArrowLeft } from "lucide-react";

// --- Custom Hooks ---

const useMobileInputFocus = () => {
  const isMobile = useIsMobile();
  const activeElementRef = useRef(null);

  useEffect(() => {
    if (!isMobile) return;

    const handleFocusIn = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        activeElementRef.current = target;
      }
    };

    const handleFocusOut = () => {
      activeElementRef.current = null;
    };

    const handleViewportResize = () => {
      if (activeElementRef.current) {
        setTimeout(() => {
          activeElementRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 100); 
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, [isMobile]);

  return null; 
};


// --- Constants ---
const FEATURES = [
  { icon: <Rss className="w-8 h-8 text-teal-400" />, title: "Real-Time Job Feed", description: "Post jobs instantly and receive bids from skilled workers in a dynamic, social-style interface." },
  { icon: <Briefcase className="w-8 h-8 text-teal-400" />, title: "Personalized Profiles", description: "Showcase your skills, ratings, and completed gigs to build your reputation and attract opportunities." },
  { icon: <SearchIcon className="w-8 h-8 text-teal-400" />, title: "Smart Skill Search", description: "Easily discover relevant workers based on their skills, bio, ratings, or username." },
  { icon: <ShieldCheck className="w-8 h-8 text-teal-400" />, title: "Verified & Rated", description: "Build trust within the community through verified profiles and a transparent user rating system." },
  { icon: <MessageCircle className="w-8 h-8 text-teal-400" />, title: "Direct Messaging", description: "Communicate seamlessly with job posters and workers via our real-time text-based messaging." },
  { icon: <Bell className="w-8 h-8 text-teal-400" />, title: "Custom Notifications", description: "Stay updated on what matters most, from new bids and comments to direct messages." },
];


// --- Components ---

const Introduction = memo(({ onSignInClick, onSignUpClick }) => {
  const isMobile = useIsMobile();

  const scrollToFeatures = (e) => {
    e.preventDefault();
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 antialiased">
      {/* Hero Section */}
      <header className="relative w-full h-screen min-h-[600px] flex flex-col items-center justify-center text-center text-white bg-gradient-to-br from-teal-500 to-teal-700 dark:from-gray-900 dark:to-teal-900">
        <nav className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-2xl tracking-tight">JobDone</span>
          </div>
          {isMobile && (
            <div className="flex gap-2">
              <button
                onClick={onSignInClick}
                className="bg-white/20 backdrop-blur-sm text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-white/30 transition"
                aria-label="Sign In"
              >
                Sign In
              </button>
              <button
                onClick={onSignUpClick}
                className="bg-white text-teal-600 font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-100 transition"
                aria-label="Sign Up"
              >
                Sign Up
              </button>
            </div>
          )}
        </nav>
        <div className="z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 animate-fade-in-down">
            Connect, Collaborate, Complete.
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-white/80 mb-8 animate-fade-in-up">
            JobDone is a real-time gig marketplace bridging the gap between job posters and skilled workers with an intuitive, social-style interface.
          </p>
          <a
            href="#features"
            onClick={scrollToFeatures}
            className="inline-block bg-white text-teal-600 font-bold px-8 py-3 rounded-full text-lg hover:bg-gray-200 transform hover:scale-105 transition-transform duration-300"
            aria-label="Explore Features"
          >
            Explore Features
          </a>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <a href="#features" onClick={scrollToFeatures}>
            <ArrowDown className="w-8 h-8 text-white/50" />
          </a>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">One Platform, Endless Possibilities</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              From posting jobs to getting paid, everything you need is right here.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200/80 dark:border-gray-700 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-teal-100 dark:bg-teal-900/30 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 dark:text-gray-100">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Get Started in Minutes</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">A simple, four-step process to get your job done.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { step: "1", title: "Post a Job", desc: "Describe the task, set your budget, and post to the feed." },
              { step: "2", title: "Receive Bids", desc: "Skilled workers bid in real-time. Review their profiles." },
              { step: "3", title: "Collaborate", desc: "Hire and chat with the best candidate to discuss details." },
              { step: "4", title: "Job Done!", desc: "Mark the job complete and leave a rating." },
            ].map((step, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-center h-16 w-16 mx-auto rounded-full bg-teal-500 text-white font-bold text-2xl mb-4 border-4 border-white dark:border-gray-800 shadow-lg">
                  {step.step}
                </div>
                <h3 className="font-semibold text-xl mb-2 dark:text-gray-100">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="bg-teal-600 dark:bg-gray-800 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-teal-100 dark:text-gray-300 mb-8">Join a growing community of job posters and skilled workers today. Your next opportunity is just a click away.</p>
          {!isMobile && (
            <div className="flex justify-center gap-4">
              <button
                onClick={onSignInClick}
                className="bg-white/20 backdrop-blur-sm text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-white/30 transition"
                aria-label="Sign In"
              >
                Sign In
              </button>
              <button
                onClick={onSignUpClick}
                className="bg-white text-teal-600 font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-gray-100 transition"
                aria-label="Sign Up"
              >
                Create Free Account
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
});

Introduction.displayName = "Introduction";


function App() {
  const {theme} = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSignIn, setIsSignIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [entryStage, setEntryStage] = useState("choose");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUserData, setPendingUserData] = useState(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [showForgotPasswordOtp, setShowForgotPasswordOtp] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [wasLoggedOut, setWasLoggedOut] = useState(false);
  const [showMobileAuth, setShowMobileAuth] = useState(false);

  const isMobile = useIsMobile();
  const keyboardVisible = useMobileInputFocus();

  const buttonStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(180deg, #0D2B29 0%, #1A4D4A 100%)' 
      : '#2dd4bf' // This is the hex code for teal-400
  };

  const validateUsername = (username) => {
    if (!username) return { valid: false, message: "Username is required" };
    if (username.length < 3) return { valid: false, message: "Username must be at least 3 characters long" };
    if (username.length > 20) return { valid: false, message: "Username cannot exceed 20 characters" };
    
    // Check if username consists only of underscores
    if (/^_*$/.test(username)) return { valid: false, message: "Username cannot consist only of underscores" };
    
    // Check allowed characters (letters, numbers, underscores - NO SPACES)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: "Username can only contain letters, numbers, and underscores" };
    
    return { valid: true, message: "" };
  };

  const validateEmail = (email) => {
    if (!email) return { valid: false, message: "Email is required" };
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return { valid: false, message: "Please enter a valid email address" };
    return { valid: true, message: "" };
  };

  const validatePassword = (password) => {
    if (!password) return { valid: false, message: "Password is required" };
    if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters long" };
    if (!/[A-Z]/.test(password)) return { valid: false, message: "Include at least one uppercase letter" };
    if (!/[a-z]/.test(password)) return { valid: false, message: "Include at least one lowercase letter" };
    if (!/[0-9]/.test(password)) return { valid: false, message: "Include at least one number" };
    if (!/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) return { valid: false, message: "Include at least one special character" };
    return { valid: true, message: "" };
  };

  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    if (!authChecked) {
      const loggedOut = sessionStorage.getItem("logged_out");
      if (loggedOut) {
        setWasLoggedOut(true);
        sessionStorage.removeItem("logged_out");
        setCheckingAuth(false);
        setAuthChecked(true);
      } else {
        const checkAuthentication = async () => {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/me`, { credentials: "include" });
            if (res.ok) {
              const data = await res.json();
              updateUser(data);
              navigate("/Profile");
            }
          } catch (error) {
            console.log("Not authenticated");
          } finally {
            setCheckingAuth(false);
            setAuthChecked(true);
          }
        };
        checkAuthentication();
      }
    }
    return () => clearInterval(interval);
  }, [otpTimer, authChecked, navigate, updateUser]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const messages = {
        google_login_failed: "Google login failed. Please try again.",
        token_processing_failed: "Login processing failed. Please try again.",
      };
      setErrorMessage(messages[error] || "An error occurred. Please try again.");
    }
  }, [searchParams]);

  const SignUpUser = async (username, email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/user/info`, { username, email, password }, { withCredentials: true });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Network error" };
    }
  };

  const SignInUser = async (email, password) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/user/check`, { email, password }, { withCredentials: true });
      const userRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/me`, { withCredentials: true });
      updateUser(userRes.data);
      setWasLoggedOut(false);
      navigate("/Profile");
    } catch (error) {
      throw error.response ? error.response.data : { message: "Network error" };
    }
  };

  const sendEmailOtp = async (email) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/email/send-otp`, { email: email? email.toLowerCase() : forgotPasswordEmail.toLowerCase() , isSignUp : !isSignIn }, { withCredentials: true });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Failed to send OTP" };
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/email/verify-otp`, { email, otp });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "OTP verification failed" };
    }
  };

  const changePassword = async (email, newPassword) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/change-password`, { email, newPassword, otpVerified: true }, { withCredentials: true });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Failed to change password" };
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setWasLoggedOut(false);
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  const handleSubmit = async () => {
    let validationResult;
    if (!isSignIn) {
      validationResult = validateUsername(username);
      if (!validationResult.valid) {
        setErrorMessage(validationResult.message);
        return;
      }
    }
    validationResult = validateEmail(email.toLocaleLowerCase());
    if (!validationResult.valid) {
      setErrorMessage(validationResult.message);
      return;
    }
    if(!isSignIn){validationResult = validatePassword(password);
    if (!validationResult.valid) {
      setErrorMessage(validationResult.message);
      return;
    }}

    try {
      setIsLoading(true);
      setErrorMessage("");
      if (isSignIn) {
        await SignInUser(email, password);
      } else {
        setPendingUserData({ username, email, password });
        setPendingEmail(email);
        await sendEmailOtp(email);
        setShowOtpVerification(true);
        setOtpTimer(300);
        setCanResendOtp(false);
        setErrorMessage(`Please verify your email with the OTP sent to ${email}`);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async () => {
    if (!otp || otp.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit OTP");
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage("");
      await verifyEmailOtp(pendingEmail, otp);
      await SignUpUser(pendingUserData.username, pendingUserData.email, pendingUserData.password);
      await SignInUser(pendingUserData.email, pendingUserData.password);
    } catch (error) {
      const messages = { INVALID_OTP: "Invalid OTP. Please check and try again.", OTP_NOT_FOUND: "OTP expired. Please request a new one." };
      setErrorMessage(messages[error.code] || error.message || "Verification failed");
      if (error.code === "OTP_NOT_FOUND") {
        setCanResendOtp(true);
        setOtpTimer(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    const emailValidation = validateEmail(forgotPasswordEmail);
    if (!emailValidation.valid) {
      setErrorMessage(emailValidation.message);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage("");
      await sendEmailOtp(forgotPasswordEmail);
      setPendingEmail(forgotPasswordEmail);
      setShowForgotPasswordOtp(true);
      setOtpTimer(300);
      setCanResendOtp(false);
      setErrorMessage(`OTP sent to ${forgotPasswordEmail} for password reset`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordOtpVerification = async () => {
    if (!otp || otp.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit OTP");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setErrorMessage("Please enter both password fields");
      return;
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setErrorMessage(passwordValidation.message);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      await verifyEmailOtp(pendingEmail, otp);
      await changePassword(pendingEmail, newPassword);
      setShowForgotPasswordOtp(false);
      setEntryStage("signin");
      setIsSignIn(true);
      setEmail(pendingEmail);
      setForgotPasswordEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setPendingEmail("");
      setErrorMessage("Password reset successful! Please sign in.");
    } catch (error) {
      const messages = { INVALID_OTP: "Invalid OTP. Please check and try again.", OTP_NOT_FOUND: "OTP expired. Please request a new one." };
      setErrorMessage(messages[error.code] || error.message || "Password reset failed");
      if (error.code === "OTP_NOT_FOUND") {
        setCanResendOtp(true);
        setOtpTimer(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      await sendEmailOtp(pendingEmail);
      setOtpTimer(300);
      setCanResendOtp(false);
      setOtp("");
      setErrorMessage(`New OTP sent to ${pendingEmail}`);
    } catch (error) {
      const messages = { RATE_LIMIT: "Too many OTP requests. Please wait." };
      setErrorMessage(messages[error.code] || error.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetAuthState = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setErrorMessage("");
    setShowOtpVerification(false);
    setShowForgotPasswordOtp(false);
    setOtp("");
    setPendingUserData(null);
    setPendingEmail("");
    setForgotPasswordEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpTimer(0);
    setCanResendOtp(false);
  };

  const toggleSignInMode = () => {
    setIsSignIn(!isSignIn);
    resetAuthState();
  };

  const handleBackToSignup = () => {
    setShowOtpVerification(false);
    setShowForgotPasswordOtp(false);
    setOtp("");
    setErrorMessage("");
    setOtpTimer(0);
    setCanResendOtp(false);
    if (entryStage === "forgot-password") {
      setEntryStage("signin");
    }
  };

  const renderAuthForm = () => (
    <div
      className={`flex flex-col items-center justify-center gap-4 bg-teal-400 dark:bg-gray-800 w-full p-4 transition-all duration-300 ${
        isMobile ? (keyboardVisible ? "min-h-screen pb-8" : "h-screen") : "h-screen"
      }`}
    >
      <CookieDisclaimer />
      <div className="flex-shrink-0">
        {theme!=='dark' && (<div className=" w-44 h-44">
            <img src={logo} alt="JobDone Logo" className="object-contain w-full h-full" />
          </div>)}
        {theme === 'dark' && (
          <div className=" w-46 h-46">
            <img src={logoDark} alt="JobDone Logo Dark" className="object-contain w-full h-full" />
          </div>
        )}
      </div>
      <div className={`w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg transition-all duration-300 ${keyboardVisible && isMobile ? "mb-4" : ""}`}>
        <div className="flex flex-col gap-4">
          {wasLoggedOut && (
            <div className="text-center text-green-600 dark:text-green-400 text-sm mb-2">You have been logged out successfully.</div>
          )}
          {showOtpVerification && !showForgotPasswordOtp && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2 dark:text-white">Verify Your Email</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter the 6-digit code sent to {pendingEmail}</p>
              </div>
              {errorMessage && (
                <p className={`text-center text-sm ${errorMessage.includes("sent") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{errorMessage}</p>
              )}
              <input
                type="text"
                value={otp}
                placeholder="Enter 6-digit OTP"
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md text-center text-lg tracking-widest focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all duration-200 cursor-text"
                disabled={isLoading}
                maxLength={6}
                aria-label="OTP Input"
              />
              <button
                className="w-full  text-white py-3 rounded-md hover:bg-teal-600 disabled:opacity-50 transition-colors"
                style={buttonStyle}
                onClick={handleOtpVerification}
                disabled={isLoading || otp.length !== 6}
                aria-label="Verify Email"
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {otpTimer > 0 ? (
                  <p>Resend OTP in {formatTime(otpTimer)}</p>
                ) : (
                  <button className="text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50" onClick={handleResendOtp} disabled={isLoading || !canResendOtp} aria-label="Resend OTP">
                    Resend OTP
                  </button>
                )}
              </div>
              <div className="text-center mt-2">
                <button className="text-sm text-gray-500 dark:text-gray-400 underline disabled:opacity-50" onClick={handleBackToSignup} disabled={isLoading} aria-label="Back to Signup">
                  ← Back to signup
                </button>
              </div>
            </>
          )}
          {showForgotPasswordOtp && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2 dark:text-white">Reset Password</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter OTP and set your new password</p>
              </div>
              {errorMessage && (
                <p className={`text-center text-sm ${errorMessage.includes("sent") || errorMessage.includes("successful") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{errorMessage}</p>
              )}
              <input
                type="text"
                value={otp}
                placeholder="Enter 6-digit OTP"
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md text-center focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                disabled={isLoading}
                maxLength={6}
                aria-label="OTP Input"
              />
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={isLoading}
                  aria-label="New Password"
                />
                {newPassword && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onClick={() => setShowNewPassword(!showNewPassword)} disabled={isLoading} aria-label="Toggle New Password Visibility">
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={isLoading}
                  aria-label="Confirm Password"
                />
                {confirmPassword && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading} aria-label="Toggle Confirm Password Visibility">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                )}
              </div>
              <button
                className="w-full  text-white py-3 rounded-md hover:bg-teal-600 disabled:opacity-50 transition-colors"
                style={buttonStyle}
                onClick={handleForgotPasswordOtpVerification}
                disabled={isLoading || otp.length !== 6 || !newPassword || !confirmPassword}
                aria-label="Reset Password"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {otpTimer > 0 ? (
                  <p>Resend OTP in {formatTime(otpTimer)}</p>
                ) : (
                  <button className="text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50" onClick={handleResendOtp} disabled={isLoading || !canResendOtp} aria-label="Resend OTP">
                    Resend OTP
                  </button>
                )}
              </div>
              <div className="text-center mt-2">
                <button className="text-sm text-gray-500 dark:text-gray-400 underline disabled:opacity-50" onClick={handleBackToSignup} disabled={isLoading} aria-label="Back to Sign In">
                  ← Back to sign in
                </button>
              </div>
            </>
          )}
          {entryStage === "forgot-password" && !showForgotPasswordOtp && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2 dark:text-white">Forgot Password</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter your email to receive a reset code</p>
              </div>
              {errorMessage && (<p className={`text-center text-sm ${errorMessage.includes("sent") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{errorMessage}</p>)}
              <input
                type="email"
                placeholder="Email Address"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                disabled={isLoading}
                aria-label="Email Input"
              />
              <button
                className="w-full text-white py-3 rounded-md hover:bg-teal-600 disabled:opacity-50 transition-colors"
                style={buttonStyle}
                onClick={handleForgotPasswordSubmit}
                disabled={isLoading || !forgotPasswordEmail}
                aria-label="Send Reset Code"
              >
                {isLoading ? "Sending..." : "Send Reset Code"}
              </button>
              <div className="text-center mt-4">
                <button
                  className="text-sm text-gray-500 dark:text-gray-400 underline disabled:opacity-50"
                  onClick={() => { setEntryStage("signin"); setIsSignIn(true); resetAuthState(); }}
                  disabled={isLoading}
                  aria-label="Back to Sign In"
                >
                  ← Back to sign in
                </button>
              </div>
            </>
          )}
          {entryStage === "choose" && !showOtpVerification && !showForgotPasswordOtp && (
            <>
              <div className="text-center"><h2 className="text-xl font-bold mb-4 dark:text-white">Join JobDone</h2></div>
              {errorMessage && <p className="text-red-500 dark:text-red-400 text-center text-sm mb-4">{errorMessage}</p>}
              <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-600 rounded-md py-3 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
                <img src={googleIcon} alt="Google Icon" className="w-5 h-5"/>
                <span className="dark:text-white">{isLoading ? "Loading..." : "Continue with Google"}</span>
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div><span className="text-gray-500 dark:text-gray-400 text-sm">or</span><div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
              </div>
              <button onClick={() => { setEntryStage("signup"); setIsSignIn(false); }} className="w-full text-white py-3 rounded-md hover:bg-teal-600 transition-colors" style={buttonStyle}>
                Create Account
              </button>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <button className="text-teal-700 dark:text-teal-400 hover:underline font-medium" onClick={() => { setEntryStage("signin"); setIsSignIn(true); }}>
                  Sign In
                </button>
              </p>
            </>
          )}
          {(entryStage === "signup" || entryStage === "signin") && !showOtpVerification && !showForgotPasswordOtp && (
            <>
              <div className="text-center"><h2 className="text-xl font-bold mb-4 dark:text-white">{isSignIn ? "Sign In" : "Sign Up"}</h2></div>
              {errorMessage && <p className={`text-center text-sm mb-4 ${errorMessage.includes("created") || errorMessage.includes("sent") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{errorMessage}</p>}
              {!isSignIn && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ">Username</label>
                  <input id="username" type="text" value={username} placeholder="Username" onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" disabled={isLoading}/>
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input id="email" type="email" value={email} placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" disabled={isLoading}/>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input id="password" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" disabled={isLoading}/>
                  {password && (<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>)}
                </div>
              </div>
              {isSignIn && (<div className="text-right"><button className="text-sm text-gray-500 dark:text-gray-400 hover:underline" onClick={() => setEntryStage("forgot-password")}>Forgot Password?</button></div>)}
              <button onClick={handleSubmit} disabled={isLoading} className="w-full text-white py-3 rounded-md hover:bg-teal-600 disabled:opacity-50 transition-colors" style={buttonStyle}>
                {isLoading ? "Loading..." : isSignIn ? "Sign In" : "Sign Up"}
              </button>
              <div className="text-center text-gray-600 dark:text-gray-400">
                {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
                <button className="text-teal-600 dark:text-teal-400 hover:underline font-medium" onClick={toggleSignInMode} disabled={isLoading}>{isSignIn ? "Sign Up" : "Sign In"}</button>
              </div>
              <div className="text-center">
                <button className="text-sm text-gray-500 dark:text-gray-400 hover:underline" onClick={() => { setEntryStage("choose"); resetAuthState(); }} disabled={isLoading}>
                  ← Back to options
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (checkingAuth && !wasLoggedOut) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        {theme!=='dark' && (<div className=" w-44 h-44">
            <img src={logo} alt="JobDone Logo" className="object-contain w-full h-full animate-pulse " />
          </div>)}
        {theme === 'dark' && (
          <div className=" w-46 h-46">
            <img src={logoDark} alt="JobDone Logo Dark" className="object-contain w-full h-full animate-pulse " />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
      {isMobile ? (
        <div className="w-full min-h-screen">
          {!showMobileAuth ? (
            <Introduction
              onSignInClick={() => {
                setShowMobileAuth(true);
                setIsSignIn(true);
                setEntryStage("signin");
              }}
              onSignUpClick={() => {
                setShowMobileAuth(true);
                setIsSignIn(false);
                setEntryStage("choose");
              }}
            />
          ) : (
            <div className="relative">
              <button
                className="absolute top-4 left-4 z-20 text-white bg-black/20 backdrop-blur-sm rounded-full p-2 hover:bg-black/30 transition-colors"
                onClick={() => { setShowMobileAuth(false); resetAuthState(); setEntryStage("choose"); }}
                aria-label="Back to landing page"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {renderAuthForm()}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="w-full lg:w-[70%] h-screen overflow-y-auto">
            <Introduction
              onSignInClick={() => {
                setIsSignIn(true);
                setEntryStage("signin");
              }}
              onSignUpClick={() => {
                setIsSignIn(false);
                setEntryStage("choose");
              }}
            />
          </div>
          <div className="w-full lg:w-[30%] h-screen flex items-center justify-center">
            {renderAuthForm()}
          </div>
        </>
      )}
    </div>
  );
}

export default App;