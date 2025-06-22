import Sidebar from "./Sidebar";
import useAuth from "./hooks/useAuth";
import { useState, useEffect } from "react";
import { ArrowLeftIcon, BadgeCheck } from "lucide-react";
import axios from "axios";
import ReportForm from "./reportComp";
import NotificationToggle from "./components/notificationToggle";
import useIsMobile from "./hooks/useIsMobile.js";
import BottomNavbar from "./bottomNavBar";

function Settings() {
    const { user, updateUser } = useAuth();
    const isMobile = useIsMobile();
    const [activeSection, setActiveSection] = useState("yourAccount");
    const [previousSection, setPreviousSection] = useState("yourAccount");

    // State for various inputs
    const [password, setPassword] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newPhoneNumber, setNewPhoneNumber] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [otp, setOtp] = useState("");

    // State for UI and messages
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
    const [passwordVerification, setPasswordVerification] = useState(false);
    
    const isAuth = user.isOAuth;

    const handleLogout = async () => {
        try {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {}, { 
            withCredentials: true 
        });
        // STEP 2: Clear frontend storage
        localStorage.clear();
        sessionStorage.clear();

        // STEP 3: Clear auth context/state
        if (updateUser) {
            updateUser(null);
        }

        // STEP 4: Clear any frontend cookies as backup
        const cookies = document.cookie.split(";");
        cookies.forEach((cookie) => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name) {
            // Clear with different combinations
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost`;
            }
        });
        
        // STEP 5: Force redirect (use replace to prevent back navigation)
        navigate("/");
        
        } catch (error) {
        
        // Fallback: Clear everything and redirect anyway
        localStorage.clear();
        sessionStorage.clear();
        
        if (updateUser) {
            updateUser(null);
        }
        
        // Try to clear cookies anyway
        document.cookie.split(";").forEach((cookie) => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            }
        });
        }
    };

    // --- VALIDATION FUNCTIONS ---
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

    // --- API & HANDLER FUNCTIONS ---
    const handleVerify = async () => {
        setErrorMessage("");
        if (!password) return setErrorMessage("Please enter your password.");
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/user/check`, { email: user.email, password }, { withCredentials: true });
            setPasswordVerification(true);
            setActiveSection("accountInformation");
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Incorrect password.");
        }
    };
    
    const handleChangeUsername = async () => {
        setErrorMessage("");
        if (!newUsername.trim() || newUsername === user.username) {
            return setErrorMessage("Please enter a new, different username.");
        }
        try {
            const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/users/changeUsername/${user.id || user._id}`, { newUsername }, { withCredentials: true });
            updateUser({ ...user, username: response.data.username || newUsername });
            alert("Username updated successfully!");
            setActiveSection("accountInformation");
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
            setPreviousSection(activeSection);
            setActiveSection(type === 'phone' ? 'verifyPhoneOTP' : 'verifyEmailOTP');
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
            alert(`${type === 'phone' ? 'Phone number' : 'Email'} verified and updated successfully!`);
            const updatedField = type === 'phone' ? { phoneNumber: value } : { email: value };
            updateUser({ ...user, ...updatedField, verified: { ...user.verified, [type === 'phone' ? 'phoneNumber' : 'email']: true }});
            setActiveSection("accountInformation");
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Invalid or expired OTP.");
        }
    };
    
    const handleChangePassword = async () => {
        setPasswordErrorMessage("");
        if (!oldPassword) return setPasswordErrorMessage("Please enter your current password.");
        const validation = validatePassword(newPassword);
        if (!validation.valid) return setPasswordErrorMessage(validation.message);
        if (newPassword !== confirmPassword) return setPasswordErrorMessage("New passwords do not match.");

        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/change-password`, { oldPassword, newPassword, email: user.email }, { withCredentials: true });
            alert("Password changed successfully!");
            setActiveSection("yourAccount");
            resetPasswordStates();
        } catch (error) {
            setPasswordErrorMessage(error.response?.data?.message || "Failed to change password.");
        }
    };

    const handleForgotPassword = async () => {
        setErrorMessage("");
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/email/send-otp`, { email: user.email });
            setPreviousSection(activeSection);
            setActiveSection("forgotPasswordOTP");
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Failed to send password reset OTP.");
        }
    };

    const handleVerifyForgotPasswordOTP = async () => {
        setErrorMessage("");
        if (!/^\d{6}$/.test(otp)) return setErrorMessage("Please enter a valid 6-digit OTP.");
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/email/verify-otp`, { email: user.email, otp, userId: user.id || user._id });
            setActiveSection("resetPassword");
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
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/change-password`, { newPassword, email: user.email }, { withCredentials: true });
            alert("Password has been reset successfully. For security, you will be logged out.");
            // Add your logout logic here, then navigate to login page.
            window.location.href = '/logout'; // Example logout redirect
        } catch (error) {
            setPasswordErrorMessage(error.response?.data?.message || "Failed to reset password.");
        }
    };
    
    const resetPasswordStates = () => {
        setOtp(""); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordErrorMessage(""); setErrorMessage("");
    };

    const navigateToForgotPasswordFlow = () => {
        setPreviousSection(activeSection);
        resetPasswordStates();
        setActiveSection("forgotPasswordSend");
    };

    useEffect(() => {
        setErrorMessage("");
        setPasswordErrorMessage("");
    }, [activeSection]);

    const buttonClass = (section) => `w-full py-3 px-4 text-left hover:bg-gray-100 rounded-md ${activeSection === section ? "bg-gray-200 font-medium" : ""}`;
    const backButton = (targetSection) => (
        <button onClick={() => setActiveSection(targetSection)} className="p-2 rounded-full hover:bg-gray-200 text-teal-800"><ArrowLeftIcon className="h-6 w-6" /></button>
    );

    // --- RENDER LOGIC ---
    if (isMobile) {
        return (
            <div className="min-h-screen bg-white pb-20 pt-4 px-4">
                {activeSection === "yourAccount" && (<div className="flex items-center bg-teal-50 mb-6">
                    <h1 className="text-2xl text-teal-800 font-bold ml-2">Settings</h1>
                </div>)}

                {activeSection === "yourAccount" && (
                    <>
                        <div className="space-y-4">
                            <button onClick={() => setActiveSection(isAuth || passwordVerification ? "accountInformation" : "passwordVerification")} className={buttonClass("accountInformation")}>
                                <span className="font-medium">Account Information</span>
                                <p className="text-xs text-gray-500">See your account info like phone and email.</p>
                            </button>
                            {!isAuth && (
                                <button onClick={() => setActiveSection("changePassword")} className={buttonClass("changePassword")}>
                                    <span className="font-medium">Change Password</span>
                                    <p className="text-xs text-gray-500">Change your account password.</p>
                                </button>
                            )}
                            <button onClick={() => setActiveSection("notifications")} className={buttonClass("notifications")}>
                                <span className="font-medium">Notifications</span>
                                <p className="text-xs text-gray-500">Manage your notification settings.</p>
                            </button>
                            <button onClick={() => setActiveSection("report")} className={buttonClass("report")}>
                                <span className="font-medium">Report a Problem</span>
                                <p className="text-xs text-gray-500">Report issues or concerns.</p>
                            </button>
                            <button onClick={handleLogout} className="w-full py-3 px-4 text-left hover:bg-gray-100 rounded-md text-red-600">
                                <span className="font-medium">Logout</span>
                            </button>
                        </div>
                    </>
                )}

                {activeSection === "notifications" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("yourAccount")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Notifications</h1>
                        </div>
                        <div className="space-y-6">
                            <NotificationToggle label="Comment Notifications" type="comments" checked={user.allowNotifications?.comments} />
                            <NotificationToggle label="Bid Notifications" type="bids" checked={user.allowNotifications?.bids} />
                        </div>
                    </>
                )}

                {activeSection === "report" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("yourAccount")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Report a Problem</h1>
                        </div>
                        <div className="py-4">
                            <ReportForm reportedUserId={user._id} />
                        </div>
                    </>
                )}

                {activeSection === "passwordVerification" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("yourAccount")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Account Information</h1>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Verify it's you</h2>
                            <p className="text-sm text-gray-500">Enter your password to continue.</p>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-base" />
                            </div>
                            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                            <div className="flex flex-col space-y-4 mt-4">
                                <button onClick={navigateToForgotPasswordFlow} className="text-md text-teal-600 hover:underline text-center">Forgot Password?</button>
                                <button onClick={handleVerify} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Verify</button>
                            </div>
                        </div>
                    </>
                )}

                {activeSection === "accountInformation" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("yourAccount")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Account Information</h1>
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => setActiveSection("changeUsername")} className={buttonClass("changeUsername")}>
                                <span className="font-medium">Username</span>
                                <p className="text-xs text-gray-500">@{user.username}</p>
                            </button>
                            <button onClick={() => setActiveSection("changePhone")} className={buttonClass("changePhone")}>
                                <span className="font-medium">Phone Number</span>
                                {user.verified?.phoneNumber && <BadgeCheck className="inline h-4 w-4 text-teal-400" />}
                                <p className="text-xs text-gray-500">{user.phoneNumber || "Add a phone number"}</p>
                            </button>
                            <button onClick={() => setActiveSection("changeEmail")} className={buttonClass("changeEmail")}>
                                <span className="font-medium">Email</span>
                                {user.verified?.email && <BadgeCheck className="inline h-4 w-4 text-teal-400" />}
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </button>
                        </div>
                    </>
                )}

                {activeSection === "changeUsername" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("accountInformation")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Change Username</h1>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder={user.username} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-base" />
                            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                            <button onClick={handleChangeUsername} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Save</button>
                        </div>
                    </>
                )}

                {["changePhone", "changeEmail"].includes(activeSection) && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("accountInformation")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">{activeSection === "changePhone" ? "Change Phone Number" : "Change Email"}</h1>
                        </div>
                        <div className="space-y-4">
                            <input 
                                type={activeSection === 'changePhone' ? 'tel' : 'email'} 
                                value={activeSection === 'changePhone' ? newPhoneNumber : newEmail} 
                                onChange={(e) => activeSection === 'changePhone' ? setNewPhoneNumber(e.target.value) : setNewEmail(e.target.value)}
                                className="w-full p-4 border border-gray-300 rounded-lg text-base"
                            />
                            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                            <button onClick={() => handleSendOTP(activeSection === 'changePhone' ? 'phone' : 'email', activeSection === 'changePhone' ? newPhoneNumber : newEmail)} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Send OTP</button>
                        </div>
                    </>
                )}

                {["verifyPhoneOTP", "verifyEmailOTP"].includes(activeSection) && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton(activeSection === 'verifyPhoneOTP' ? 'changePhone' : 'changeEmail')}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Verify Code</h1>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-center text-base tracking-widest" maxLength={6} />
                            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                            <button onClick={() => handleVerifyOTP(activeSection === 'verifyPhoneOTP' ? 'phone' : 'email', activeSection === 'verifyPhoneOTP' ? newPhoneNumber : newEmail, otp)} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Verify</button>
                        </div>
                    </>
                )}

                {activeSection === "changePassword" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("yourAccount")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Change Password</h1>
                        </div>
                        <div className="space-y-4">
                            <input type="password" placeholder="Current Password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-base" />
                            <input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-base" />
                            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-base" />
                            {passwordErrorMessage && <p className="text-red-500 text-sm text-center">{passwordErrorMessage}</p>}
                            <div className="flex flex-col space-y-4 mt-4">
                                <button onClick={navigateToForgotPasswordFlow} className="text-md text-teal-600 hover:underline text-center">Forgot Password?</button>
                                <button onClick={handleChangePassword} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Save Changes</button>
                            </div>
                        </div>
                    </>
                )}

                {activeSection === "forgotPasswordSend" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton(previousSection)}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Forgot Password</h1>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 text-center">We'll send a code to your email: <strong>{user.email}</strong></p>
                            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                            <button onClick={handleForgotPassword} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Send Code</button>
                        </div>
                    </>
                )}

                {activeSection === "forgotPasswordOTP" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("forgotPasswordSend")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Enter Code</h1>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 text-center">Enter the 6-digit code sent to <strong>{user.email}</strong>.</p>
                            <input type="text" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-center text-base tracking-widest" maxLength={6} />
                            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                            <button onClick={handleVerifyForgotPasswordOTP} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Verify</button>
                        </div>
                    </>
                )}

                {activeSection === "resetPassword" && (
                    <>
                        <div className="flex items-center mb-6 bg-teal-50">
                            {backButton("forgotPasswordOTP")}
                            <h1 className="text-2xl font-bold ml-2 text-teal-800">Reset Your Password</h1>
                        </div>
                        <div className="space-y-4">
                            <input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-base" />
                            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 border border-gray-300 rounded-lg text-base" />
                            {passwordErrorMessage && <p className="text-red-500 text-sm text-center">{passwordErrorMessage}</p>}
                            <button onClick={handleResetPassword} className="bg-teal-500 text-white py-3 px-6 rounded-lg hover:bg-teal-600 text-base w-full">Save New Password</button>
                        </div>
                    </>
                )}
                <BottomNavbar/> 
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar user={user} />
            <div className="w-[70%] h-full fixed right-0 top-0 bg-white flex overflow-y-hidden">
                <div className="py-3 w-2/5 h-full flex flex-col border-r border-gray-300">
                    <h1 className="font-bold py-2 px-5 text-2xl">Settings</h1>
                    <button onClick={() => setActiveSection("yourAccount")} className={buttonClass("yourAccount")}>Your Account</button>
                    <button onClick={() => setActiveSection("notifications")} className={buttonClass("notifications")}>Notifications</button>
                    <button onClick={() => setActiveSection("report")} className={buttonClass("report")}>Report a problem</button>
                </div>
                
                <div className="py-3 w-3/5 h-full flex flex-col overflow-y-auto px-5">
                    
                    {/* Your Account Main Screen */}
                    {activeSection === "yourAccount" && (
                        <>
                            <h1 className="font-bold py-2 text-2xl">Your Account</h1>
                            <button onClick={() => setActiveSection(isAuth || passwordVerification ? "accountInformation" : "passwordVerification")} className="py-2 text-left hover:bg-gray-100 p-2 rounded-md">
                                <span className="font-medium">Account Information</span>
                                <p className="text-xs text-gray-500">See your account information like phone number and email address.</p>
                            </button>
                            {!isAuth && (
                                <button onClick={() => setActiveSection("changePassword")} className="py-2 text-left hover:bg-gray-100 p-2 rounded-md">
                                    <span className="font-medium">Change password</span>
                                    <p className="text-xs text-gray-500">Change your account password at any time.</p>
                                </button>
                            )}
                        </>
                    )}

                    {/* Notifications Screen (Restored) */}
                    {activeSection === "notifications" && (
                        <>
                            <h1 className="font-bold py-2 text-2xl">Notifications</h1>
                            <div className="space-y-4 py-2">
                                <NotificationToggle label="Comment Notifications" type="comments" checked={user.allowNotifications?.comments} />
                                <NotificationToggle label="Bid Notifications" type="bids" checked={user.allowNotifications?.bids} />
                            </div>
                        </>
                    )}

                    {/* Report a Problem Screen (Restored) */}
                    {activeSection === "report" && (
                        <>
                            <h1 className="font-bold py-2 text-2xl">Report a Problem</h1>
                            <div className="py-2">
                                <ReportForm reportedUserId={user._id} />
                            </div>
                        </>
                    )}
                    
                    {/* Reusable Password Verification Screen */}
                    {activeSection === "passwordVerification" && (
                         <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton("yourAccount")}
                                <h1 className="ml-4">Account Information</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-2">
                                <h2 className="text-base font-semibold">Verify it's you</h2>
                                <p className="text-sm text-gray-500">To continue, please enter your password.</p>
                                <div className="relative w-full pt-2">
                                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"/>
                                </div>
                                {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                                <div className="flex justify-between items-center mt-4">
                                    <button onClick={navigateToForgotPasswordFlow} className="text-md text-teal-600 hover:underline cursor-pointer">Forgot Password?</button>
                                    <button onClick={handleVerify} className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600">Verify</button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Account Information Screen (Restored) */}
                    {activeSection === "accountInformation" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton("yourAccount")}
                                <h1 className="ml-4">Account Information</h1>
                            </div>
                            <button onClick={() => setActiveSection("changeUsername")} className="py-2 text-left hover:bg-gray-100 p-2 rounded-md">
                                <span className="font-medium">Username</span> <p className="text-xs text-gray-500">@{user.username}</p>
                            </button>
                            <button onClick={() => setActiveSection("changePhone")} className="py-2 text-left hover:bg-gray-100 p-2 rounded-md">
                                <span className="font-medium">Phone Number</span> {user.verified?.phoneNumber && <BadgeCheck className="inline h-4 w-4 text-teal-400"/>} <p className="text-xs text-gray-500">{user.phoneNumber || "Add a phone number"}</p>
                            </button>
                            <button onClick={() => setActiveSection("changeEmail")} className="py-2 text-left hover:bg-gray-100 p-2 rounded-md">
                                <span className="font-medium">Email</span> {user.verified?.email && <BadgeCheck className="inline h-4 w-4 text-teal-400"/>} <p className="text-xs text-gray-500">{user.email}</p>
                            </button>
                        </>
                    )}

                    {/* Change Username Screen (Restored) */}
                    {activeSection === "changeUsername" && (
                         <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton("accountInformation")}
                                <h1 className="ml-4">Change Username</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-4">
                                <input type="text" placeholder={user.username} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"/>
                                {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                                <div className="flex justify-end"><button onClick={handleChangeUsername} className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600">Save</button></div>
                            </div>
                        </>
                    )}
                    
                    {/* Change Phone and Email Screens with OTP (Restored) */}
                    {["changePhone", "changeEmail"].includes(activeSection) && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton("accountInformation")}
                                <h1 className="ml-4">{activeSection === "changePhone" ? "Change Phone Number" : "Change Email"}</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-4">
                                <input 
                                    type={activeSection === 'changePhone' ? 'tel' : 'email'} 
                                    value={activeSection === 'changePhone' ? newPhoneNumber : newEmail} 
                                    onChange={(e) => activeSection === 'changePhone' ? setNewPhoneNumber(e.target.value) : setNewEmail(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md"
                                />
                                {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                                <div className="flex justify-end"><button onClick={() => handleSendOTP(activeSection === 'changePhone' ? 'phone' : 'email', activeSection === 'changePhone' ? newPhoneNumber : newEmail)} className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600">Send OTP</button></div>
                            </div>
                        </>
                    )}
                    
                    {["verifyPhoneOTP", "verifyEmailOTP"].includes(activeSection) && (
                         <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton(activeSection === 'verifyPhoneOTP' ? 'changePhone' : 'changeEmail')}
                                <h1 className="ml-4">Verify Code</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-4">
                                <input type="text" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md tracking-widest text-center" maxLength={6}/>
                                {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                                <div className="flex justify-end"><button onClick={() => handleVerifyOTP(activeSection === 'verifyPhoneOTP' ? 'phone' : 'email', activeSection === 'verifyPhoneOTP' ? newPhoneNumber : newEmail, otp)} className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600">Verify</button></div>
                            </div>
                        </>
                    )}

                    {/* Change Password Screen */}
                    {activeSection === "changePassword" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton("yourAccount")}
                                <h1 className="ml-4">Change Password</h1>
                            </div>
                            <div className="space-y-4 mt-4 px-2">
                                <div className="w-full"><input type="password" placeholder="Current Password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"/></div>
                                <div className="w-full"><input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"/></div>
                                <div className="w-full"><input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"/></div>
                                {passwordErrorMessage && <p className="text-red-500 text-sm text-center">{passwordErrorMessage}</p>}
                                <div className="flex justify-between items-center mt-2">
                                    <button onClick={navigateToForgotPasswordFlow} className="text-md text-teal-600 hover:underline cursor-pointer">Forgot Password?</button>
                                    <button onClick={handleChangePassword} className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600">Save Changes</button>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* --- FORGOT PASSWORD FLOW (Reusable) --- */}
                    {activeSection === "forgotPasswordSend" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton(previousSection)}
                                <h1 className="ml-4">Forgot Password</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-2">
                                <p className="text-sm text-gray-500">We'll send a verification code to your email: <strong>{user.email}</strong></p>
                                {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                                <button onClick={handleForgotPassword} className="w-full mt-4 bg-teal-500 text-white py-2 rounded-md hover:bg-teal-600">Send Code</button>
                            </div>
                        </>
                    )}
                    
                    {activeSection === "forgotPasswordOTP" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton("forgotPasswordSend")}
                                <h1 className="ml-4">Enter Code</h1>
                            </div>
                            <div className="px-2 mt-4 space-y-2">
                                <p className="text-sm text-gray-500">Enter the 6-digit code we sent to <strong>{user.email}</strong>.</p>
                                <input type="text" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md tracking-widest text-center" maxLength={6}/>
                                {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
                                <button onClick={handleVerifyForgotPasswordOTP} className="w-full mt-2 bg-teal-500 text-white py-2 rounded-md hover:bg-teal-600">Verify</button>
                            </div>
                        </>
                    )}

                    {activeSection === "resetPassword" && (
                        <>
                            <div className="font-bold flex items-center py-2 text-2xl">
                                {backButton("forgotPasswordOTP")}
                                <h1 className="ml-4">Reset Your Password</h1>
                            </div>
                             <div className="space-y-4 mt-4 px-2">
                                <div className="w-full"><input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"/></div>
                                <div className="w-full"><input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"/></div>
                                {passwordErrorMessage && <p className="text-red-500 text-sm text-center">{passwordErrorMessage}</p>}
                                <div className="flex justify-end mt-2">
                                    <button onClick={handleResetPassword} className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600">Save New Password</button>
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