import Sidebar from "./Sidebar";
import useAuth from "./hooks/useAuth";
import { useState, useEffect, useCallback } from "react";
import logoDark from"./assets/logo/logo-dark.svg";
import loadingLogo from "./assets/logo/logo-transparent-jobdone.svg";
import { ArrowLeftIcon, BadgeCheck, Sun, Moon } from "lucide-react";
import axios from "axios";
import ReportForm from "./reportComp";
import NotificationToggle from "./components/notificationToggle";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTheme } from "./ThemeContext.jsx";

function Settings() {
    const { theme, toggleTheme } = useTheme();
    const { user, updateUser, loading } = useAuth();
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // ✅ STEP 1: All useState hooks - these should remain the same order
    const [navigationStack, setNavigationStack] = useState(["yourAccount"]);
    const [password, setPassword] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newPhoneNumber, setNewPhoneNumber] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
    const [passwordVerification, setPasswordVerification] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    // ✅ STEP 2: Derived values (not hooks)
    const activeSection = navigationStack[navigationStack.length - 1];
    const isAuth = user?.isOAuth ? user.isOAuth : false;

    // ✅ STEP 3: useCallback hooks - MUST be called before any useEffect
    const navigateTo = useCallback((section) => {
        setNavigationStack(prevStack => [...prevStack, section]);
    }, []);

    const handleBack = useCallback(() => {
        if (navigationStack.length > 1) {
            setNavigationStack(prevStack => prevStack.slice(0, -1));
        }
    }, [navigationStack.length]);

    // ✅ STEP 4: All useEffect hooks - MUST come after useState and useCallback
    
    // First useEffect - user authentication check
    useEffect(() => {
        if (!loading) {
            if (!user) {
                console.log("No user found, redirecting to login");
                navigate("/");
            } else {
                setHasToken(true);
            }
        }
    }, [user, loading, navigate]);

    // Second useEffect - browser history integration (ALWAYS call this hook)
    useEffect(() => {
        // Only execute the mobile-specific logic if on mobile, but ALWAYS call the hook
        if (!isMobile) {
            return; // Early return, but hook is still called
        }

        const handlePopState = (event) => {
            handleBack();
        };
        
        // Push a state ONLY when we navigate away from the base layer
        if (navigationStack.length > 1) {
            window.history.pushState({ settingsLayer: navigationStack.length }, "");
        }

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [navigationStack.length, isMobile, handleBack]);

    // Third useEffect - clear error messages on section change
    useEffect(() => {
        setErrorMessage("");
        setPasswordErrorMessage("");
    }, [activeSection]);

    // ✅ STEP 5: Early returns MUST come after all hooks
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
                        <img src={logoDark} alt="JobDone Logo Dark" className="object-contain w-full h-full animate-pulse" />
                    </div>
                )}
            </div>
        );
    }
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

    // --- All API functions remain the same ---
    // Example of how to update an API function:
    const handleVerify = async () => {
        setErrorMessage("");
        if (!password) return setErrorMessage("Please enter your password.");
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/user/check`, { email: user.email, password }, { withCredentials: true });
            setPasswordVerification(true);
            navigateTo("accountInformation"); // USE NAVIGATE_TO
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Incorrect password.");
        }
    };
    const handleLogout = async () => {
        try {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {}, { 
            withCredentials: true 
        });
        // Preserve theme preference
        const theme = localStorage.getItem("theme");
        localStorage.clear();
        if (theme) {
            localStorage.setItem("theme", theme);
        }
        sessionStorage.clear();

        if (updateUser) {
            updateUser(null);
        }

        const cookies = document.cookie.split(";");
        cookies.forEach((cookie) => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost`;
            }
        });
        
        navigate("/");
        
        } catch (error) {
        localStorage.clear();
        sessionStorage.clear();
        
        if (updateUser) {
            updateUser(null);
        }
        
        document.cookie.split(";").forEach((cookie) => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            }
        });
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/users/delete`, { withCredentials: true });
            toast.success("Your account has been deleted successfully.");
            localStorage.clear();
            sessionStorage.clear();
            if (updateUser) {
                updateUser(null);
            }
            navigate("/");
        } catch (error) {
            console.error("Failed to delete account:", error);
            toast.error(error.response?.data?.message || "Failed to delete account. Please try again later.");
        }
    };

    const validateEmail = (email) => {
        if (!email) return { valid: false, message: "Email is required." };
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) return { valid: false, message: "Please enter a valid email address." };
        return { valid: true };
    };

    const validatePassword = (password) => {
        if (!password) return { valid: false, message: "Password is required." };
        if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters long." };
        if (!/[A-Z]/.test(password)) return { valid: false, message: "Include at least one uppercase letter." };
        if (!/[a-z]/.test(password)) return { valid: false, message: "Include at least one lowercase letter." };
        if (!/[0-9]/.test(password)) return { valid: false, message: "Include at least one number." };
        if (!/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) return { valid: false, message: "Include at least one special character." };
        return { valid: true };
    };
    const handleChangeUsername = async () => {
        setErrorMessage("");
        if (!newUsername.trim() || newUsername === user.username) {
            return setErrorMessage("Please enter a new, different username.");
        }
        try {
            const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/users/changeUsername/${user.id || user._id}`, { newUsername }, { withCredentials: true });
            updateUser({ ...user, username: response.data.username || newUsername });
            toast.success("Username updated successfully!");
            handleBack(); // Use handleBack
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Failed to update username.");
        }
    };

    const handleSendOTP = async (type, value) => {
        setErrorMessage("");
        let endpoint = "";
        let payload = {};

        if (type === 'phone') {
            endpoint = "/users/phoneNumber/send-otp";
            payload = { phoneNumber: value };
        } else if (type === 'email') {
            const validation = validateEmail(value);
            if (!validation.valid) return setErrorMessage(validation.message);
            endpoint = "/users/email/send-otp";
            payload = { email: value };
        }

        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, payload, { withCredentials: true });
            navigateTo(type === 'phone' ? 'verifyPhoneOTP' : 'verifyEmailOTP'); // Use navigateTo
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Failed to send OTP.");
        }
    };
    
    const handleVerifyOTP = async (type, value, otp) => {
        setErrorMessage("");
        if (!/^\d{6}$/.test(otp)) return setErrorMessage("Please enter a valid 6-digit OTP.");
        
        let endpoint = "";
        let payload = { otp, userId: user.id || user._id };

        if (type === 'phone') {
            endpoint = "/users/phoneNumber/verify-otp";
            payload.phoneNumber = value;
        } else if (type === 'email') {
            endpoint = "/users/email/verify-otp";
            payload.email = value;
        }

        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, payload, { withCredentials: true });
            toast.success(`${type === 'phone' ? 'Phone number' : 'Email'} verified and updated successfully!`);
            const updatedField = type === 'phone' ? { phoneNumber: value } : { email: value };
            updateUser({ ...user, ...updatedField, verified: { ...user.verified, [type === 'phone' ? 'phoneNumber' : 'email']: true }});
            // Pop twice to go from verifyOTP -> changePhone/Email -> accountInformation
            setNavigationStack(prev => prev.slice(0, -2)); 
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Invalid or expired OTP.");
        }
    };
    
    const handleChangePassword = async () => {
        setPasswordErrorMessage("");
        if (!oldPassword && !isAuth) return setPasswordErrorMessage("Please enter your current password.");
        if(!newPassword || !confirmPassword) return setPasswordErrorMessage("Please enter your new password and confirm it.");
        if (newPassword !== confirmPassword) return setPasswordErrorMessage("New passwords do not match.");
        const validation = validatePassword(confirmPassword);
        if (!validation.valid) return setPasswordErrorMessage(validation.message);

        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/change-password`, { oldPassword, newPassword, email: user.email  , otpVerified: oldPassword? false : true  }, { withCredentials: true });
            toast.success("Password has been reset successfully. For security, you will be logged out.");
            handleLogout(); 
        } catch (error) {
            setPasswordErrorMessage(error.response?.data?.message || "Failed to change password.");
        }
    };

    const handleForgotPassword = async () => {
        setErrorMessage("");
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/email/send-otp`, { email: user.email });
            navigateTo("forgotPasswordOTP"); // Use navigateTo
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Failed to send password reset OTP.");
        }
    };

    const handleVerifyForgotPasswordOTP = async () => {
        setErrorMessage("");
        if (!/^\d{6}$/.test(otp)) return setErrorMessage("Please enter a valid 6-digit OTP.");
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/email/verify-otp`, { email: user.email, otp, userId: user.id || user._id });
            navigateTo("resetPassword"); // Use navigateTo
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Invalid or expired OTP.");
        }
    };
    
    const handleResetPassword = async () => {
        setPasswordErrorMessage("");
        const validation = validatePassword(newPassword);
        if (!validation.valid) return setPasswordErrorMessage(validation.message);
        if (newPassword !== confirmPassword) return setPasswordErrorMessage("New passwords do not match.");
        
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/change-password`, { newPassword, email: user.email , otpVerified:true}, { withCredentials: true });
            toast.success("Password has been reset successfully. For security, you will be logged out.");
            handleLogout(); 
        } catch (error) {
            setPasswordErrorMessage(error.response?.data?.message || "Failed to reset password.");
        }
    };
    
    const resetPasswordStates = () => {
        setOtp(""); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordErrorMessage(""); setErrorMessage("");
    };

    const navigateToForgotPasswordFlow = () => {
        resetPasswordStates();
        navigateTo("forgotPasswordSend"); // Use navigateTo
    };
    
    // --- The JSX now needs to be updated to use the new navigation functions ---
    
    const buttonClass = (section) =>
        `w-full py-3 px-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer ${
            activeSection === section ? "bg-gray-200 dark:bg-gray-700 font-medium" : ""
        }`;
        
    const backButton = () => (
        <button
            onClick={handleBack} // The back button now just calls handleBack
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-teal-800 dark:text-teal-300 cursor-pointer"
        >
            <ArrowLeftIcon className="h-6 w-6" />
        </button>
    );

    if (isMobile) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 px-4">
                {activeSection === "yourAccount" && (
                    <div className="flex items-center justify-center border-b border-gray-200 dark:border-gray-700 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                        <h1 className="text-2xl text-teal-800 dark:text-teal-400 font-bold ml-2">Settings</h1>
                    </div>
                )}

                {activeSection === "yourAccount" && (
                    <>
                        <div className="space-y-4 text-gray-800 dark:text-gray-200">
                            <button
                                onClick={() =>
                                    navigateTo( // USE NAVIGATE_TO
                                        isAuth || passwordVerification
                                            ? "accountInformation"
                                            : "passwordVerification"
                                    )
                                }
                                className={buttonClass("accountInformation")}
                            >
                                <span className="font-medium">Account Information</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    See your account info like phone and email.
                                </p>
                            </button>
                            <button
                                onClick={() => navigateTo("changePassword")} // USE NAVIGATE_TO
                                className={buttonClass("changePassword")}
                            >
                                <span className="font-medium">Change Password</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Change your account password.
                                </p>
                            </button>
                            <button
                                onClick={() => navigateTo("notifications")} // USE NAVIGATE_TO
                                className={buttonClass("notifications")}
                            >
                                <span className="font-medium">Notifications</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Manage your notification settings.
                                </p>
                            </button>
                            <button
                                onClick={() => navigateTo("report")} // USE NAVIGATE_TO
                                className={buttonClass("report")}
                            >
                                <span className="font-medium">Report a Problem</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Report issues or concerns.
                                </p>
                            </button>
                            {/* ... other buttons remain the same */}
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 px-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-red-600 dark:text-red-400 cursor-pointer"
                            >
                                <span className="font-medium">Logout</span>
                            </button>
                            <button
                                onClick={toggleTheme}
                                className="flex items-center gap-2 px-6 py-2 rounded-md transition text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                {theme === 'light' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                                </button>
                        </div>
                    </>
                )}
                
                {/* Now all headers with a back button will work correctly */}
                {activeSection === "notifications" && (
                    <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Notifications
                            </h1>
                        </div>
                        {/* ... content ... */}
                         <div className="space-y-6">
                            <NotificationToggle
                                label="Comment Notifications"
                                type="comments"
                                checked={user.allowNotifications?.comments}
                            />
                            <NotificationToggle
                                label="Bid Notifications"
                                type="bids"
                                checked={user.allowNotifications?.bids}
                            />
                        </div>
                    </>
                )}

                {activeSection === "accountInformation" && (
                     <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Account Information
                            </h1>
                        </div>
                        <div className="space-y-4 text-gray-800 dark:text-gray-200">
                             <button
                                onClick={() => navigateTo("changeUsername")} // USE NAVIGATE_TO
                                className={buttonClass("changeUsername")}
                            >
                                <span className="font-medium">Username</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    @{user.username}
                                </p>
                            </button>
                             <button
                                onClick={() => navigateTo("changePhone")} // USE NAVIGATE_TO
                                className={buttonClass("changePhone")}
                            >
                                <span className="font-medium">Phone Number</span>
                                {user.verified?.phoneNumber && (
                                    <BadgeCheck className="inline h-4 w-4 text-teal-400" />
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {user.phoneNumber || "Add a phone number"}
                                </p>
                            </button>
                             <button
                                onClick={() => navigateTo("changeEmail")} // USE NAVIGATE_TO
                                className={buttonClass("changeEmail")}
                            >
                                <span className="font-medium">Email</span>
                                {user.verified?.email && (
                                    <BadgeCheck className="inline h-4 w-4 text-teal-400" />
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </button>
                             <button
                                onClick={handleDeleteAccount}
                                className="w-full py-3 px-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-red-600 dark:text-red-400 cursor-pointer"
                            >
                                <span className="font-medium">Delete Account</span>
                            </button>
                        </div>
                    </>
                )}
                
                {/* ... The rest of the JSX needs to be updated in the same way ... */}
                {/* Example for one more section */}
                {activeSection === "changeUsername" && (
                    <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Change Username
                            </h1>
                        </div>
                        {/* ... content ... */}
                         <div className="space-y-4">
                            <input
                                type="text"
                                placeholder={user.username}
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-base"
                            />
                            {errorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {errorMessage}
                                </p>
                            )}
                            <button
                                onClick={handleChangeUsername}
                                className="text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                style={buttonStyle}
                            >
                                Save
                            </button>
                        </div>
                    </>
                )}

                {/* --- And so on for all other sections --- */}
                
                {/* ... I will complete the rest of the mobile JSX for you ... */}

                 {activeSection === "report" && (
                    <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Report a Problem
                            </h1>
                        </div>
                        <div className="py-4">
                            <ReportForm reportedUserId={user._id} />
                        </div>
                    </>
                )}

                {activeSection === "passwordVerification" && (
                    <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Account Information
                            </h1>
                        </div>
                        <div className="space-y-4 text-gray-800 dark:text-gray-200">
                            <h2 className="text-lg font-semibold">Verify it's you</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Enter your password to continue.
                            </p>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg text-base"
                                />
                            </div>
                            {errorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {errorMessage}
                                </p>
                            )}
                            <div className="flex flex-col space-y-4 mt-4">
                                <button
                                    onClick={navigateToForgotPasswordFlow}
                                    className="text-md text-teal-600 dark:text-teal-400 hover:underline text-center cursor-pointer"
                                >
                                    Forgot Password?
                                </button>
                                <button
                                    onClick={handleVerify}
                                    className=" text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                    style={buttonStyle}
                                >
                                    Verify
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {["changePhone", "changeEmail"].includes(activeSection) && (
                    <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                {activeSection === "changePhone"
                                    ? "Change Phone Number"
                                    : "Change Email"}
                            </h1>
                        </div>
                        <div className="space-y-4">
                            <input
                                type={activeSection === "changePhone" ? "tel" : "email"}
                                value={
                                    activeSection === "changePhone"
                                        ? newPhoneNumber
                                        : newEmail
                                }
                                onChange={(e) =>
                                    activeSection === "changePhone"
                                        ? setNewPhoneNumber(e.target.value)
                                        : setNewEmail(e.target.value)
                                }
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-base"
                            />
                            {errorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {errorMessage}
                                </p>
                            )}
                            <button
                                onClick={() =>
                                    handleSendOTP(
                                        activeSection === "changePhone"
                                            ? "phone"
                                            : "email",
                                        activeSection === "changePhone"
                                            ? newPhoneNumber
                                            : newEmail
                                    )
                                }
                                className=" text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                style={buttonStyle}
                            >
                                Send OTP
                            </button>
                        </div>
                    </>
                )}

                {["verifyPhoneOTP", "verifyEmailOTP"].includes(activeSection) && (
                    <>
                        <div className="flex items-center bg-teal-50  mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Verify Code
                            </h1>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-center text-base tracking-widest"
                                maxLength={6}
                            />
                            {errorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {errorMessage}
                                </p>
                            )}
                            <button
                                onClick={() =>
                                    handleVerifyOTP(
                                        activeSection === "verifyPhoneOTP"
                                            ? "phone"
                                            : "email",
                                        activeSection === "verifyPhoneOTP"
                                            ? newPhoneNumber
                                            : newEmail,
                                        otp
                                    )
                                }
                                className=" text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                style={buttonStyle}
                            >
                                Verify
                            </button>
                        </div>
                    </>
                )}

                {activeSection === "changePassword" && (
                    <>
                        <div className="flex items-center bg-teal-50  mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Change Password
                            </h1>
                        </div>
                        <div className="space-y-4">
                            {!isAuth && (<input
                                type="password"
                                placeholder="Current Password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-base"
                            />)}
                            <input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-base"
                            />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-base"
                            />
                            {passwordErrorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {passwordErrorMessage}
                                </p>
                            )}
                            <div className="flex flex-col space-y-4 mt-4">
                                {!isAuth && (<button
                                    onClick={navigateToForgotPasswordFlow}
                                    className="text-md text-teal-600 dark:text-teal-400 hover:underline text-center cursor-pointer"
                                >
                                    Forgot Password?
                                </button>)}
                                <button
                                    onClick={handleChangePassword}
                                    className=" text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                    style={buttonStyle}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {activeSection === "forgotPasswordSend" && (
                    <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Forgot Password
                            </h1>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                We'll send a code to your email:{" "}
                                <strong>{user.email}</strong>
                            </p>
                            {errorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {errorMessage}
                                </p>
                            )}
                            <button
                                onClick={handleForgotPassword}
                                className=" text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                style={buttonStyle}
                            >
                                Send Code
                            </button>
                        </div>
                    </>
                )}

                {activeSection === "forgotPasswordOTP" && (
                    <>
                        <div className="flex items-center bg-teal-50 mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Enter Code
                            </h1>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                Enter the 6-digit code sent to{" "}
                                <strong>{user.email}</strong>.
                            </p>
                            <input
                                type="text"
                                placeholder="6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-center text-base tracking-widest"
                                maxLength={6}
                            />
                            {errorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {errorMessage}
                                </p>
                            )}
                            <button
                                onClick={handleVerifyForgotPasswordOTP}
                                className=" text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                style={buttonStyle}
                            >
                                Verify
                            </button>
                        </div>
                    </>
                )}

                {activeSection === "resetPassword" && (
                    <>
                        <div className="flex items-center bg-teal-50  mb-6 w-screen h-16 -mx-4 px-4 shadow-sm z-10" style={headingStyle}>
                            {backButton()}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800 dark:text-teal-400">
                                Reset Your Password
                            </h1>
                        </div>
                        <div className="space-y-4">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-base"
                            />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg text-base"
                            />
                            {passwordErrorMessage && (
                                <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                    {passwordErrorMessage}
                                </p>
                            )}
                            <button
                                onClick={handleResetPassword}
                                className=" text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full cursor-pointer"
                                style={buttonStyle}
                            >
                                Save New Password
                            </button>
                        </div>
                    </>
                )}
                <BottomNavbar /> 
            </div>
        );
    }

    // --- The Desktop JSX also needs to be updated to use the new navigation functions ---
    return (
        <div className="flex h-screen overflow-hidden dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar user={user} />
            <div className="w-[70%] h-full fixed right-0 top-0 bg-white dark:bg-gray-900 flex overflow-y-hidden">
                <div className="py-3 w-2/5 h-full flex flex-col border-r border-gray-300 dark:border-gray-700">
                    <h1 className="font-bold py-2 px-5 text-2xl dark:text-teal-400">Settings</h1>
                    <button
                        onClick={() => setNavigationStack(["yourAccount"])} // Reset to base
                        className={buttonClass("yourAccount")}
                    >
                        Your Account
                    </button>
                    <button
                        onClick={() => setNavigationStack(["notifications"])} // Reset to this section
                        className={buttonClass("notifications")}
                    >
                        Notifications
                    </button>
                    <button
                        onClick={() => setNavigationStack(["report"])} // Reset to this section
                        className={buttonClass("report")}
                    >
                        Report a problem
                    </button>
                </div>
                
                <div className="py-3 w-3/5 h-full flex flex-col overflow-y-auto px-5">
                    
                    {activeSection === "yourAccount" && (
                        <>
                            <h1 className="font-bold py-2 text-2xl dark:text-teal-400">Your Account</h1>
                            <button
                                onClick={() =>
                                    navigateTo( // USE NAVIGATE_TO
                                        isAuth || passwordVerification
                                            ? "accountInformation"
                                            : "passwordVerification"
                                    )
                                }
                                className="py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md cursor-pointer"
                            >
                                <span className="font-medium">Account Information</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    See your account information like phone number and email address.
                                </p>
                            </button>
                            <button
                                onClick={() => navigateTo("changePassword")} // USE NAVIGATE_TO
                                className="py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md cursor-pointer"
                            >
                                <span className="font-medium">Change password</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Change your account password at any time.
                                </p>
                            </button>
                        </>
                    )}
                    
                    {/* ... And so on for all desktop sections ... */}
                    {/* --- I will complete the rest of the desktop JSX for you --- */}
                     {activeSection === "notifications" && (
                        <>
                            <h1 className="font-bold py-2 text-2xl dark:text-teal-400">Notifications</h1>
                            <div className="space-y-4 py-2">
                                <NotificationToggle
                                    label="Comment Notifications"
                                    type="comments"
                                    checked={user.allowNotifications?.comments}
                                />
                                <NotificationToggle
                                    label="Bid Notifications"
                                    type="bids"
                                    checked={user.allowNotifications?.bids}
                                />
                            </div>
                        </>
                    )}

                    {activeSection === "report" && (
                        <>
                            <h1 className="font-bold py-2 text-2xl dark:text-teal-400">Report a Problem</h1>
                            <div className="py-2">
                                <ReportForm reportedUserId={user._id} />
                            </div>
                        </>
                    )}
                    
                    {activeSection === "passwordVerification" && (
                         <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Account Information</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-2">
                                <h2 className="text-base font-semibold">Verify it's you</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    To continue, please enter your password.
                                </p>
                                <div className="relative w-full pt-2">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                    />
                                </div>
                                {errorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </p>
                                )}
                                <div className="flex justify-between items-center mt-4">
                                    <button
                                        onClick={navigateToForgotPasswordFlow}
                                        className="text-md text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                                    >
                                        Forgot Password?
                                    </button>
                                    <button
                                        onClick={handleVerify}
                                        className="text-white px-4 py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                        style={buttonStyle}
                                    >
                                        Verify
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === "accountInformation" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Account Information</h1>
                            </div>
                            <button
                                onClick={() => navigateTo("changeUsername")}
                                className="py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md cursor-pointer"
                            >
                                <span className="font-medium">Username</span>{" "}
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    @{user.username}
                                </p>
                            </button>
                            <button
                                onClick={() => navigateTo("changePhone")}
                                className="py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md cursor-pointer"
                            >
                                <span className="font-medium">Phone Number</span>{" "}
                                {user.verified?.phoneNumber && (
                                    <BadgeCheck className="inline h-4 w-4 text-teal-400" />
                                )}{" "}
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {user.phoneNumber || "Add a phone number"}
                                </p>
                            </button>
                            <button
                                onClick={() => navigateTo("changeEmail")}
                                className="py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md cursor-pointer"
                            >
                                <span className="font-medium">Email</span>{" "}
                                {user.verified?.email && (
                                    <BadgeCheck className="inline h-4 w-4 text-teal-400" />
                                )}{" "}
                                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md cursor-pointer"
                            >
                                <span className="font-medium">Delete Account</span>
                            </button>
                        </>
                    )}

                    {activeSection === "changeUsername" && (
                         <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Change Username</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-4">
                                <input
                                    type="text"
                                    placeholder={user.username}
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                />
                                {errorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </p>
                                )}
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleChangeUsername}
                                        className=" text-white px-4 py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                        style={buttonStyle}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {["changePhone", "changeEmail"].includes(activeSection) && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">
                                    {activeSection === "changePhone"
                                        ? "Change Phone Number"
                                        : "Change Email"}
                                </h1>
                            </div>
                            <div className="px-2 mt-4 space-y-4">
                                <input
                                    type={activeSection === "changePhone" ? "tel" : "email"}
                                    value={
                                        activeSection === "changePhone"
                                            ? newPhoneNumber
                                            : newEmail
                                    }
                                    onChange={(e) =>
                                        activeSection === "changePhone"
                                            ? setNewPhoneNumber(e.target.value)
                                            : setNewEmail(e.target.value)
                                    }
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                />
                                {errorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </p>
                                )}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() =>
                                            handleSendOTP(
                                                activeSection === "changePhone"
                                                    ? "phone"
                                                    : "email",
                                                activeSection === "changePhone"
                                                    ? newPhoneNumber
                                                    : newEmail
                                            )
                                        }
                                        className="text-white px-4 py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                        style={buttonStyle}
                                    >
                                        Send OTP
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {["verifyPhoneOTP", "verifyEmailOTP"].includes(activeSection) && (
                         <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Verify Code</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-4">
                                <input
                                    type="text"
                                    placeholder="6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md tracking-widest text-center"
                                    maxLength={6}
                                />
                                {errorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </p>
                                )}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() =>
                                            handleVerifyOTP(
                                                activeSection === "verifyPhoneOTP"
                                                    ? "phone"
                                                    : "email",
                                                activeSection === "verifyPhoneOTP"
                                                    ? newPhoneNumber
                                                    : newEmail,
                                                otp
                                            )
                                        }
                                        className="text-white px-4 py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                        style={buttonStyle}
                                    >
                                        Verify
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === "changePassword" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Change Password</h1>
                            </div>
                            <div className="space-y-4 mt-4 px-2">
                                {!isAuth && (<div className="w-full">
                                    <input
                                        type="password"
                                        placeholder="Current Password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                    />
                                </div>)}
                                <div className="w-full">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                    />
                                </div>
                                <div className="w-full">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm New Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                    />
                                </div>
                                {passwordErrorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {passwordErrorMessage}
                                    </p>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                    {!isAuth && (<button
                                        onClick={navigateToForgotPasswordFlow}
                                        className="text-md text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                                    >
                                        Forgot Password?
                                    </button>)}
                                    <button
                                        onClick={handleChangePassword}
                                        className="text-white px-4 py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                        style={buttonStyle}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === "forgotPasswordSend" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Forgot Password</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    We'll send a verification code to your email:{" "}
                                    <strong>{user.email}</strong>
                                </p>
                                {errorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </p>
                                )}
                                <button
                                    onClick={handleForgotPassword}
                                    className="w-full mt-4 text-white py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                    style={buttonStyle}
                                >
                                    Send Code
                                </button>
                            </div>
                        </>
                    )}
                    
                    {activeSection === "forgotPasswordOTP" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Enter Code</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Enter the 6-digit code we sent to{" "}
                                    <strong>{user.email}</strong>.
                                </p>
                                <input
                                    type="text"
                                    placeholder="6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md tracking-widest text-center"
                                    maxLength={6}
                                />
                                {errorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {errorMessage}
                                    </p>
                                )}
                                <button
                                    onClick={handleVerifyForgotPasswordOTP}
                                    className="w-full mt-2 text-white py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                    style={buttonStyle}
                                >
                                    Verify
                                </button>
                            </div>
                        </>
                    )}

                    {activeSection === "resetPassword" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton()}
                                <h1 className="ml-4 dark:text-teal-400">Reset Your Password</h1>
                            </div>
                            <div className="space-y-4 mt-4 px-2">
                                <div className="w-full">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                    />
                                </div>
                                <div className="w-full">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm New Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md"
                                    />
                                </div>
                                {passwordErrorMessage && (
                                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                                        {passwordErrorMessage}
                                    </p>
                                )}
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleResetPassword}
                                        className="text-white px-4 py-2 rounded-md hover:bg-teal-600 cursor-pointer"
                                        style={buttonStyle}
                                    >
                                        Save New Password
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Settings;