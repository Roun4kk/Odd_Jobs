import { useState, useEffect } from "react";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
import googleIcon from "./assets/icons/google.svg";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import useIsMobile from "./hooks/useIsMobile"; // Import the new hook

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSignIn, setIsSignIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [entryStage, setEntryStage] = useState("choose"); // "choose", "signup", "signin", "forgot-password"
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Email verification states
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUserData, setPendingUserData] = useState(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Forgot password states
  const [showForgotPasswordOtp, setShowForgotPasswordOtp] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if user was logged out
  const [wasLoggedOut, setWasLoggedOut] = useState(false);

  // Mobile responsiveness
  const isMobile = useIsMobile();
  const [showMobileAuth, setShowMobileAuth] = useState(false);

  // Validation functions
  const validateUsername = (username) => {
    if (!username) return { valid: false, message: "Username is required" };
    if (username.length < 3) return { valid: false, message: "Username must be at least 3 characters long" };
    if (username.length > 20) return { valid: false, message: "Username cannot exceed 20 characters" };
    if (!/^[a-zA-Z0-9 _]+$/.test(username)) return { valid: false, message: "Username can only contain letters, numbers, spaces, and underscores" };
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
    if (!/[A-Z]/.test(password)) return { valid: false, message: "Include at least one uppercase letter in Password" };
    if (!/[a-z]/.test(password)) return { valid: false, message: "Include at least one lowercase letter in Password" };
    if (!/[0-9]/.test(password)) return { valid: false, message: "Include at least one number in Password" };
    if (!/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) return { valid: false, message: "Include at least one special character in Password" };
    return { valid: true, message: "" };
  };

  // Combined useEffect for timers and auth checking
  useEffect(() => {
    // OTP Timer logic
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            setCanResendOtp(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Auth checking logic
    if (!authChecked) {
      const loggedOut = sessionStorage.getItem('logged_out');
      if (loggedOut) {
        setWasLoggedOut(true);
        sessionStorage.removeItem('logged_out');
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
    
  // useEffect for handling URL search parameters
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const messages = {
        "google_login_failed": "Google login failed. Please try again.",
        "token_processing_failed": "Login processing failed. Please try again."
      };
      setErrorMessage(messages[error] || "An error occurred. Please try again.");
    }
  }, [searchParams]);

  // --- API Functions ---
  const SignUpUser = async (username, email, password) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/info`,
        { username, email, password },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Network error" };
    }
  };

  const SignInUser = async (email, password) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/check`,
        { email, password },
        { withCredentials: true }
      );
      const userRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/me`, {
        withCredentials: true,
      });
      updateUser(userRes.data);
      setWasLoggedOut(false);
      navigate("/Profile");
    } catch (error) {
      throw error.response ? error.response.data : { message: "Network error" };
    }
  };

  const sendEmailOtp = async (email) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/users/email/send-otp`,
        { email }
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Failed to send OTP" };
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/users/email/verify-otp`,
        { email, otp }
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "OTP verification failed" };
    }
  };

  const changePassword = async (email, newPassword) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/users/change-password`,
        { email, newPassword , otpVerified: true },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Failed to change password" };
    }
  };

  // --- Event Handlers ---
  const handleGoogleLogin = () => {
    setIsLoading(true);
    setWasLoggedOut(false);
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  const handleSubmit = async () => {
    let validationResult;
    if (!isSignIn) {
      validationResult = validateUsername(username);
      if (!validationResult.valid) { setErrorMessage(validationResult.message); return; }
    }
    validationResult = validateEmail(email);
    if (!validationResult.valid) { setErrorMessage(validationResult.message); return; }
    validationResult = validatePassword(password);
    if (!validationResult.valid) { setErrorMessage(validationResult.message); return; }

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
        setErrorMessage("Please verify your email with the OTP sent to " + email);
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
      const messages = {
        'INVALID_OTP': "Invalid OTP. Please check and try again.",
        'OTP_NOT_FOUND': "OTP expired. Please request a new one."
      };
      setErrorMessage(messages[error.code] || error.message || "Verification failed");
      if (error.code === 'OTP_NOT_FOUND') {
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
      setErrorMessage("OTP sent to " + forgotPasswordEmail + " for password reset");
    } catch (error) {
      setErrorMessage(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordOtpVerification = async () => {
    if (!otp || otp.length !== 6) { setErrorMessage("Please enter a valid 6-digit OTP"); return; }
    if (!newPassword || !confirmPassword) { setErrorMessage("Please enter both password fields"); return; }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) { setErrorMessage(passwordValidation.message); return; }
    if (newPassword !== confirmPassword) { setErrorMessage("Passwords do not match"); return; }
    
    try {
      setIsLoading(true);
      setErrorMessage("");
      await verifyEmailOtp(pendingEmail, otp);
      await changePassword(pendingEmail, newPassword);
      
      // Reset states and go to sign in view
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
      const messages = {
        'INVALID_OTP': "Invalid OTP. Please check and try again.",
        'OTP_NOT_FOUND': "OTP expired. Please request a new one."
      };
      setErrorMessage(messages[error.code] || error.message || "Password reset failed");
      if (error.code === 'OTP_NOT_FOUND') {
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
      setErrorMessage("New OTP sent to " + pendingEmail);
    } catch (error) {
      const messages = { 'RATE_LIMIT': "Too many OTP requests. Please wait." };
      setErrorMessage(messages[error.code] || error.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Helper Functions ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    // 1. OUTER CONTAINER: Uses justify-center to vertically center the content as a whole.
    // Padding is reduced, especially on the vertical axis (py-4).
    <div className="flex flex-col items-center justify-center gap-4 bg-teal-400 w-full sm:w-[30%] p-4 h-screen">
      
      {/* 2. LOGO: Size is reduced to save vertical space. */}
      <div className="flex-shrink-0">
        <div className="w-36 h-36">
          <img src={logo} alt="logo" className="object-contain w-full h-full" />
        </div>
      </div>

      {/* 3. INNER CARD: No scrolling and no growing. It will take the space its content needs. */}
      {/* The gap between this card and the logo will shrink as the screen gets smaller. */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg flex flex-col justify-between h-[500px]">
        <div className="flex flex-col gap-4">
          {wasLoggedOut && (
            <div className="text-center text-green-600 text-sm mb-2">
              You have been logged out successfully.
            </div>
          )}
          
          {/* OTP Verification Stage */}
          {showOtpVerification && !showForgotPasswordOtp && (
            <>
              <h2 className="text-xl font-bold text-center mb-2">Verify Your Email</h2>
              <p className="text-center text-sm text-gray-600 mb-4">
                Enter the 6-digit code sent to {pendingEmail}
              </p>
              {errorMessage && <p className={`text-center text-sm ${errorMessage.includes("sent") ? "text-green-600" : "text-red-500"}`}>{errorMessage}</p>}
              <input
                type="text"
                value={otp}
                placeholder="Enter 6-digit OTP"
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full p-3 border border-gray-300 rounded-md text-center text-lg tracking-widest"
                disabled={isLoading}
                maxLength={6}
              />
              <button
                className="w-full bg-teal-400 text-white py-2 rounded-md hover:bg-teal-600 disabled:opacity-50"
                onClick={handleOtpVerification}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>
              <div className="text-center text-sm text-gray-600">
                {otpTimer > 0 ? (
                  <p>Resend OTP in {formatTime(otpTimer)}</p>
                ) : (
                  <button
                    className="text-teal-600 hover:underline disabled:opacity-50"
                    onClick={handleResendOtp}
                    disabled={isLoading || !canResendOtp}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              <div className="text-center mt-2">
                <button
                  className="text-sm text-gray-500 underline disabled:opacity-50"
                  onClick={handleBackToSignup}
                  disabled={isLoading}
                >
                  ← Back to signup
                </button>
              </div>
            </>
          )}

          {/* Forgot Password OTP Verification */}
          {showForgotPasswordOtp && (
            <>
              <h2 className="text-xl font-bold text-center mb-2">Reset Password</h2>
              <p className="text-center text-sm text-gray-600 mb-4">
                Enter OTP and set your new password
              </p>
              {errorMessage && <p className={`text-center text-sm ${errorMessage.includes("sent") || errorMessage.includes("successful") ? "text-green-600" : "text-red-500"}`}>{errorMessage}</p>}
              <input type="text" value={otp} placeholder="Enter 6-digit OTP" onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full p-3 border border-gray-300 rounded-md text-center" disabled={isLoading} maxLength={6} />
              <div className="relative w-full">
                <input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md" disabled={isLoading}/>
                {newPassword && <button type="button" className="absolute inset-y-0 right-3 text-sm" onClick={() => setShowNewPassword(!showNewPassword)} disabled={isLoading}>{showNewPassword ? "Hide" : "Show"}</button>}
              </div>
              <div className="relative w-full">
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md" disabled={isLoading}/>
                {confirmPassword && <button type="button" className="absolute inset-y-0 right-3 text-sm" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading}>{showConfirmPassword ? "Hide" : "Show"}</button>}
              </div>
              <button className="w-full bg-teal-400 text-white py-2 rounded-md hover:bg-teal-600 disabled:opacity-50" onClick={handleForgotPasswordOtpVerification} disabled={isLoading || otp.length !== 6 || !newPassword || !confirmPassword}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
              <div className="text-center text-sm text-gray-600">
                {otpTimer > 0 ? <p>Resend OTP in {formatTime(otpTimer)}</p> : <button className="text-teal-600 hover:underline disabled:opacity-50" onClick={handleResendOtp} disabled={isLoading || !canResendOtp}>Resend OTP</button>}
              </div>
              <div className="text-center mt-2">
                <button className="text-sm text-gray-500 underline disabled:opacity-50" onClick={handleBackToSignup} disabled={isLoading}>
                  ← Back to sign in
                </button>
              </div>
            </>
          )}
          
          {/* Forgot Password Form */}
          {entryStage === "forgot-password" && !showForgotPasswordOtp && (
            <>
              <h2 className="text-xl font-bold text-center mb-2">Forgot Password</h2>
              <p className="text-center text-sm text-gray-600 mb-4">
                Enter your email to receive a reset code
              </p>
              {errorMessage && <p className={`text-center text-sm ${errorMessage.includes("sent") ? "text-green-600" : "text-red-500"}`}>{errorMessage}</p>}
              <input type="email" placeholder="Email Address" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md" disabled={isLoading}/>
              <button className="w-full bg-teal-400 text-white py-2 rounded-md hover:bg-teal-600 disabled:opacity-50" onClick={handleForgotPasswordSubmit} disabled={isLoading || !forgotPasswordEmail}>
                {isLoading ? "Sending..." : "Send Reset Code"}
              </button>
              <div className="text-center mt-4">
                <button className="text-sm text-gray-500 underline disabled:opacity-50" onClick={() => { setEntryStage("signin"); setIsSignIn(true); resetAuthState(); }} disabled={isLoading}>
                  ← Back to sign in
                </button>
              </div>
            </>
          )}

          {/* Choose Entry Method */}
          {entryStage === "choose" && !showOtpVerification && !showForgotPasswordOtp && (
            <>
              <h2 className="text-xl font-bold text-center mb-2">Join JobDone</h2>
              {errorMessage && <p className="text-red-500 text-center text-sm">{errorMessage}</p>}
              <button className="w-full flex items-center justify-center gap-3 border rounded-md py-2 hover:shadow disabled:opacity-50" onClick={handleGoogleLogin} disabled={isLoading}>
                <img src={googleIcon} alt="Google" className="w-5 h-5" />
                {isLoading ? "Loading..." : "Continue with Google"}
              </button>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              <button className="w-full bg-teal-400 text-white py-2 rounded-md hover:bg-teal-600 disabled:opacity-50" onClick={() => { setEntryStage("signup"); setIsSignIn(false); }}>
                Create Account
              </button>
              <p className="text-center text-md text-gray-600">
                Already have an account?
                <button className="ml-2 text-teal-700 hover:underline" onClick={() => { setEntryStage("signin"); setIsSignIn(true); }}>
                  Sign In
                </button>
              </p>
            </>
          )}
          
          {/* Sign Up / Sign In Forms */}
          {(entryStage === "signup" || entryStage === "signin") && !showOtpVerification && !showForgotPasswordOtp && (
            <>
              <h2 className="text-xl font-bold text-center mb-2">{isSignIn ? "Sign In" : "Sign Up"}</h2>
              {errorMessage && <p className={`text-center text-sm ${errorMessage.includes("created") || errorMessage.includes("sent") ? "text-green-600" : "text-red-500"}`}>{errorMessage}</p>}
              {!isSignIn && <input type="text" value={username} placeholder="Username" onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md" disabled={isLoading}/>}
              <input type="text" value={email} placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md" disabled={isLoading}/>
              <div className="relative w-full">
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md" disabled={isLoading}/>
                {password && <button type="button" className="absolute inset-y-0 right-3 text-sm" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>{showPassword ? "Hide" : "Show"}</button>}
              </div>
              {isSignIn && <div className="text-right"><button className="text-sm text-gray-500 hover:underline" onClick={() => setEntryStage('forgot-password')}>Forgot Password?</button></div>}
              <button className="w-full bg-teal-400 text-white py-2 rounded-md hover:bg-teal-600 disabled:opacity-50" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Loading..." : isSignIn ? "Sign In" : "Sign Up"}
              </button>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {(entryStage === "signup" || entryStage === "signin") && !showOtpVerification && !showForgotPasswordOtp && (
            <>
              <div className="text-center text-gray-600">
                {isSignIn ? "Don't have an account?" : "Already have an account?"}
                <button className="ml-2 text-teal-600 hover:underline" onClick={toggleSignInMode} disabled={isLoading}>
                  {isSignIn ? "Sign Up" : "Sign In"}
                </button>
              </div>

              <div className="text-center">
                <button className="text-sm text-gray-500 underline" onClick={() => { setEntryStage("choose"); resetAuthState(); }} disabled={isLoading}>
                  ← Back to options
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Loading spinner
  if (checkingAuth && !wasLoggedOut) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Main return statement with mobile responsiveness
  return (
    <div className="flex flex-col sm:flex-row min-h-screen">
      {isMobile ? (
        <div className="relative w-full min-h-screen bg-blue-600/20 p-6 flex flex-col justify-center items-center text-center">
            {!showMobileAuth && (
              <>
                <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => { setShowMobileAuth(true); setIsSignIn(true); setEntryStage('signin'); }} className="bg-white text-teal-600 font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-100 transition">Sign In</button>
                    <button onClick={() => { setShowMobileAuth(true); setIsSignIn(false); setEntryStage('choose'); }} className="bg-teal-500 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-teal-600 transition">Sign Up</button>
                </div>
                <div className="w-full">
                    <h1 className="text-4xl font-bold text-white mb-4">What is JobDone?</h1>
                    <p className="text-lg text-white/80 max-w-2xl mx-auto">
                        Welcome to JobDone, your ultimate platform for connecting with skilled professionals and finding the right services for your needs. Get your tasks done efficiently and effectively.
                    </p>
                </div>
              </>
            )}
            {showMobileAuth && renderAuthForm()}
        </div>
      ) : (
        <>
          <div className="hidden sm:block sm:w-[70%] bg-blue-600/20">
            {/* You can add your feature descriptions here for desktop */}
          </div>
          {renderAuthForm()}
        </>
      )}
    </div>
  );
}

export default App;