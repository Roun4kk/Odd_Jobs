import Sidebar from "./Sidebar";
import useAuth from "./hooks/useAuth";
import { useState , useEffect } from "react";
import {ArrowLeftIcon ,BadgeCheck } from "lucide-react"
import axios from "axios";
import ReportForm from "./reportComp";
import NotificationToggle from "./components/notificationToggle";

function Settings() {
    const { user, updateUser } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [activeSection, setActiveSection] = useState("yourAccount");
    const [errorMessage, setErrorMessage] = useState("");
    const [notifications, setNotifications] = useState(false);
    const [passwordVerification,setPasswordVerification] = useState(false);
    const [newUsername , setNewUsername] = useState("");
    const [newPhoneNumber , setNewPhoneNumber] = useState("");
    const [otpErrorMessage, setOtpErrorMessage] = useState("");
    const [otpSuccessMessage, setOtpSuccessMessage] = useState("");
    const [otp,setOtp] = useState("")
    const [newEmail, setNewEmail] = useState("");
    const [emailOtp, setEmailOtp] = useState("");
    const [emailErrorMessage, setEmailErrorMessage] = useState("");
    const [emailOtpErrorMessage, setEmailOtpErrorMessage] = useState("");
    const [emailOtpSuccessMessage, setEmailOtpSuccessMessage] = useState("");
    const [verified ,setVerified] = useState(false);
    const [oldPassword , setOldPassword] = useState("");
    const [newPassword , setNewPassword] = useState("");
    const [confirmPassword , setConfirmPassword] = useState("");
    const [passwordErrorMessage , setPasswordErrorMessage] = useState("");

    const isAuth = user.isOAuth ;

    const checkVerified = () => {
        if((user.verified.email === true) && (user.verified.phoneNumber === true) ){
            setVerified(true);
        }
        console.log("checkverified" , user.verified.email);
    }

    const SignInUser = async (email, password) => {
        try {
          const response = await axios.post("/user/check", {
            email,
            password,
          }, { withCredentials: true });
          return response.data;
        } catch (error) {
          throw error.response ? error.response.data : { message: "Network error" };
        }
    };

    const handleVerify = async() => {
        try {
            await SignInUser(user.email, password);
            setPasswordVerification(true);
            setActiveSection("accountInformation");
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const handleChange = async (newUsername) => {

        if(newUsername === user.username){
            setErrorMessage("Please write a new username")
            return ;
        }
        try {
            const response = await axios.put(`/users/changeUsername/${user.id||user._id}`, {newUsername},{ withCredentials: true })
            const updatedUserData = response.data || {username: newUsername} ;
            const updatedUser = { ...user, ...updatedUserData };
            updateUser(updatedUser);
            alert("username updated");
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message);
        }
    }

    const handleSendOTP = async (newPhoneNumber) => {
        if(newPhoneNumber === user.phoneNumber){
            setErrorMessage("Please write a new phone number")
            return ;
        }
        try {
            const response =  await axios.post("/users/phoneNumber/send-otp", {
                phoneNumber: newPhoneNumber
              }, { withCredentials: true })
            setActiveSection("verifyOTP");
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message);
        }
    }

    const handleVerifyOTP = async (newPhoneNumber, otp) => {
        console.log("phone number" , newPhoneNumber);
        if(newPhoneNumber === user.phoneNumber){
            setErrorMessage("Please write a new phone number")
            return ;
        }
        if (!/^\d{6}$/.test(otp)) {
            setOtpErrorMessage("Please enter a valid OTP");
            return;
        }
        try {
            const response =  await axios.post("/users/phoneNumber/verify-otp", {
                phoneNumber: newPhoneNumber,
                otp: otp,
                userId: user.id||user._id,
              }, { withCredentials: true })
            if(response.data.message !== "OTP verified" ){
                setOtpErrorMessage("Invalid OTP")
            }
            setOtpSuccessMessage("Phone number verified");
            const updatedUser = { ...user, phoneNumber: newPhoneNumber };
            updateUser(updatedUser);

            setActiveSection("accountInformation");
            setOtpErrorMessage("");
            setOtpSuccessMessage("");
        } catch (error) {
            setOtpErrorMessage(error?.response?.data?.message || error.message);
        }
    }

    const handleSendEmailOTP = async (newEmail) => {
        console.log("Sending OTP for email:", newEmail);
        try {
            const response = await axios.post("/users/email/send-otp", {
                email: newEmail
            }, { withCredentials: true });
    
            setActiveSection("verifyEmailOTP");
        } catch (error) {
            setEmailErrorMessage(error?.response?.data?.message || error.message);
        }
    };

    const handleVerifyEmailOTP = async (newEmail, emailOtp) => {
    
        if (!/^\d{6}$/.test(emailOtp)) {
            setEmailOtpErrorMessage("Please enter a valid OTP");
            return;
        }
        try {
            const response = await axios.post("/users/email/verify-otp", {
                email: newEmail,
                otp: emailOtp,
                userId: user.id || user._id,
            }, { withCredentials: true });
    
            if (response.data.message !== "Email verified") {
                setEmailOtpErrorMessage("Invalid OTP");
                return;
            }
    
            setEmailOtpSuccessMessage("Email verified");
    
            const updatedUser = { ...user, email: newEmail };
            updateUser(updatedUser);
    
            setActiveSection("accountInformation");
            setEmailOtpErrorMessage("");
            setEmailOtpSuccessMessage("");
        } catch (error) {
            setEmailOtpErrorMessage(error?.response?.data?.message || error.message);
        }
    };
    
    const handleChangePassword = async (oldPassword, newPassword, confirmPassword) => {
        if (newPassword !== confirmPassword) {
            setPasswordErrorMessage("New password and confirm password do not match.");
            return;
        }
    
        try {
            const response = await axios.post("/users/change-password", {
                oldPassword,
                newPassword,
                email: user.email,
            }, { withCredentials: true });
            
            const updatedUser = { ...user, password: newPassword, isAuth: false };
            updateUser(updatedUser);

            setPasswordErrorMessage(""); 
            setActiveSection("yourAccount");
            alert(`Password ${oldPassword? "changed" : "created"} successfully`); 
        } catch (error) {
            setPasswordErrorMessage(error?.response?.data?.message || error.message);
        }
    };
    
    useEffect(() => {
        setEmailErrorMessage("");
        setErrorMessage("");
        checkVerified();
      }, [activeSection]);

    const buttonClass = (section) =>
        `w-full py-2 px-5 text-left hover:bg-gray-200 cursor-pointer ${
            activeSection === section ? "bg-gray-200 font-medium" : ""
        }`;
    const buttonClassNoSection = () =>
            `w-full py-2 px-5 text-left hover:bg-gray-200 cursor-pointer`;

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar user={user} />

            <div className="w-[70%] h-full fixed right-0 top-0 bg-white flex overflow-y-hidden">
                {/* Left Section */}
                <div className="py-3 w-2/5 h-full flex flex-col">
                    <h1 className="font-bold py-2 px-5 text-2xl">Settings</h1>
                    <button
                        onClick={() => setActiveSection("yourAccount")}
                        className={buttonClass("yourAccount")}
                    >
                        Your Account
                    </button>
                    <button
                        onClick={() => setActiveSection("notifications")}
                        className={buttonClass("notifications")}
                    >
                        Notifications
                    </button>
                    <button
                        onClick={() => setActiveSection("report")}
                        className={buttonClass("report")}
                    >
                        Report a problem
                    </button>
                </div>

                {/* Divider */}
                <div className="w-px h-full bg-gray-300" />

                {/* Right Section */}
                <div className="py-3 w-2/4 h-full flex flex-col">
                    {activeSection === "yourAccount" && 
                        (
                            <>
                            <h1 className="font-bold py-2 px-5 text-2xl">Your Account</h1>
                            <button onClick ={
                                () => setActiveSection(isAuth || passwordVerification ? "accountInformation" : "passwordVerification")
                            }
                            className="w-full py-2 px-5 text-left hover:bg-gray-200 flex flex-col cursor-pointer"> Account Information
                                <p className="text-xs text-gray-500">See your account information like phone number and email address</p>
                            </button>
                            <button onClick ={
                                () => setActiveSection("changePassword")
                            }
                            className="w-full py-2 px-5 text-left hover:bg-gray-200 flex flex-col cursor-pointer"> Change password
                                <p className="text-xs text-gray-500">Change your account password at any time</p>
                            </button>
                            </>
                        )
                    }
                    {activeSection === "notifications" && 
                        (
                            <>
                            <h1 className="font-bold py-2 px-5 text-2xl">Notification</h1>
                            <div className="space-y-4 px-5 py-2">
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
                        )
                    }
                    {activeSection === "report" && 
                        (
                            <>
                            <h1 className="font-bold py-2 px-5 text-2xl">Report</h1>
                            <div className="space-y-4 px-5 py-2">
                                <ReportForm reportedUserId={user._id}/>
                            </div>
                            </>
                        )
                    }
                    {
                        activeSection === "passwordVerification" && (
                            <>
                            <div className="font-bold flex py-2 px-5 text-2xl ">
                                <button onClick={() => setActiveSection("yourAccount")}
                                className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200" >
                                    <ArrowLeftIcon className="h-6 w-6"/>
                                </button>
                                <h1 className="font-bold py-2 px-5 text-2xl">Account information</h1>
                            </div>
                            <div className="px-4">
                                <h2 className="text-base font-semibold">Password</h2>
                                <p className="text-xs text-gray-500">Please enter your password to proceed</p>
                                
                                <div className="relative w-full mt-2">
                                    <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    id="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md pr-20"
                                    />

                                    {password && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="cursor-pointer absolute right-24 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:opacity-60 transition"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                    )}

                                    <button
                                    type="button"
                                    onClick={() => handleVerify()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer bg-teal-500 text-white text-sm px-3 py-1 rounded hover:bg-teal-600 transition"
                                    >
                                    Verify
                                    </button>
                                </div>
                                {errorMessage && <p className="text-red-500 text-center">{errorMessage}</p>}
                            </div>
                            </>
                        )
                    }
                    {activeSection === "accountInformation"  &&
                        (
                            <>
                            <div className="font-bold flex py-2 px-5 text-2xl ">
                                <button onClick={() => setActiveSection("yourAccount")}
                                className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200" >
                                    <ArrowLeftIcon className="h-6 w-6"/>
                                </button>
                                <h1 className="font-bold py-2 px-5 text-2xl">Account information</h1>
                            </div>
                            <div className="w-full py-2 px-5 text-left flex flex-col justify-between items-center">
                                <button onClick={
                                    () => setActiveSection("changeUsername")
                                } className={buttonClassNoSection()}>
                                    Username
                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                </button>
                                <button onClick={()=> setActiveSection("addPhone")}
                                className={buttonClassNoSection()}>
                                    <div className="flex items-center gap-2 ">
                                    <h2>Phone Number</h2>
                                    {user.verified.phoneNumber && (
                                        <BadgeCheck  className="h-4 w-4 ml-auto text-teal-400"/>
                                    )}
                                    </div>
                                    <p className="text-xs text-gray-500">{user.phoneNumber || ""}</p>
                                </button >
                                <button onClick={()=> setActiveSection("addEmail")}
                                className={buttonClassNoSection()}>
                                    <div className="flex items-center gap-2 ">
                                    <h2>Email</h2>
                                    {user.verified.email && (
                                        <BadgeCheck  className="h-4 w-4 ml-auto text-teal-400"/>
                                    )}
                                    </div>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </button>
                                <div className="w-full py-2 px-5 text-left ">
                                    <div className="flex items-center gap-2 ">
                                    <h2>Verified</h2>
                                    {verified && (
                                        <BadgeCheck  className="h-4 w-4 text-teal-400"/>
                                    )}
                                    </div>
                                    <p className="text-xs text-gray-500">To get verified you have to register both email address and phone number</p>
                                </div>
                            </div>
                            </>
                        )
                    }
                    {activeSection === "changeUsername" && (
                        <>
                        <div className="font-bold flex py-2 px-5 text-2xl ">
                                <button onClick={() => setActiveSection("accountInformation")}
                                className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200" >
                                    <ArrowLeftIcon className="h-6 w-6"/>
                                </button>
                                <h1 className="font-bold py-2 px-5 text-2xl">Change Username</h1>
                        </div>
                        <div className="w-full relative mt-2 px-2">
                            <input
                                type="text"
                                name="username"
                                id="username"
                                placeholder={user.username}
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md pr-20"
                            />
                            <button
                                type="button"
                                onClick={() => handleChange(newUsername)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-teal-500 text-white text-sm px-3 py-1 rounded hover:bg-teal-600 transition"
                                >
                                Change
                            </button>
                        </div>
                        {errorMessage && <p className="text-red-500 text-center">{errorMessage}</p>}
                        </>
                    )
                    }
                    {activeSection === "addPhone" && (
                        <>
                        <div className="font-bold flex py-2 px-5 text-2xl ">
                                <button onClick={() => setActiveSection("accountInformation")}
                                className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200" >
                                    <ArrowLeftIcon className="h-6 w-6"/>
                                </button>
                                <h1 className="font-bold py-2 px-5 text-2xl"> {user.phoneNumber ? "Change " : "Add "} Phone Number</h1>
                        </div>
                        <div className="w-full relative mt-2 px-2">
                            <input
                                type="text"
                                name="newPhoneNumber"
                                id="newPhoneNumber"
                                placeholder={user.phoneNumber}
                                value={newPhoneNumber}
                                onChange={(e) => setNewPhoneNumber(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md pr-20"
                            />
                            <button
                                type="button"
                                onClick={() => handleSendOTP(newPhoneNumber)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-teal-500 text-white text-sm px-3 py-1 rounded hover:bg-teal-600 transition"
                                >
                                Send-OTP
                            </button>
                        </div>
                        {errorMessage && <p className="text-red-500 text-center">{errorMessage}</p>}
                        </>
                    )
                    }
                    {activeSection === "verifyOTP" && (
                        <>
                            <div className="font-bold flex py-2 px-5 text-2xl ">
                            <button
                                onClick={() => setActiveSection("addPhone")}
                                className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200"
                            >
                                <ArrowLeftIcon className="h-6 w-6" />
                            </button>
                            <h1 className="font-bold py-2 px-5 text-2xl">Verify OTP</h1>
                            </div>
                            <div className="w-full relative mt-2 px-2">
                            <input
                                type="text"
                                name="otp"
                                id="otp"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md pr-20"
                            />
                            <button
                                type="button"
                                onClick={() => handleVerifyOTP(newPhoneNumber , otp)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 transition"
                            >
                                Verify
                            </button>
                            </div>
                            {otpErrorMessage && <p className="text-red-500 text-center">{otpErrorMessage}</p>}
                            {otpSuccessMessage && <p className="text-green-500 text-center">{otpSuccessMessage}</p>}
                        </>
                    )}
                    {activeSection === "addEmail" && (
                        <>
                            <div className="font-bold flex py-2 px-5 text-2xl">
                            <button
                                onClick={() => setActiveSection("accountInformation")}
                                className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200"
                            >
                                <ArrowLeftIcon className="h-6 w-6" />
                            </button>
                            <h1 className="font-bold py-2 px-5 text-2xl">Change Email</h1>
                            </div>
                            <div className="w-full relative mt-2 px-2">
                            <input
                                type="email"
                                name="newEmail"
                                id="newEmail"
                                placeholder={user.email}
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md pr-20"
                            />
                            <button
                                type="button"
                                onClick={() => {console.log("New email value:", newEmail), handleSendEmailOTP(newEmail)}}
                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-teal-500 text-white text-sm px-3 py-1 rounded hover:bg-teal-600 transition"
                            >
                                Send-OTP
                            </button>
                            </div>
                            {emailErrorMessage && <p className="text-red-500 text-center">{emailErrorMessage}</p>}
                        </>
                    )}
                    {activeSection === "verifyEmailOTP" && (
                        <>
                            <div className="font-bold flex py-2 px-5 text-2xl">
                            <button
                                onClick={() => setActiveSection("addEmail")}
                                className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200"
                            >
                                <ArrowLeftIcon className="h-6 w-6" />
                            </button>
                            <h1 className="font-bold py-2 px-5 text-2xl">Verify Email OTP</h1>
                            </div>
                            <div className="w-full relative mt-2 px-2">
                            <input
                                type="text"
                                name="emailOtp"
                                id="emailOtp"
                                placeholder="Enter OTP"
                                value={emailOtp}
                                onChange={(e) => setEmailOtp(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md pr-20"
                            />
                            <button
                                type="button"
                                onClick={() => handleVerifyEmailOTP(newEmail, emailOtp)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 transition"
                            >
                                Verify
                            </button>
                            </div>
                            {emailOtpErrorMessage && <p className="text-red-500 text-center">{emailOtpErrorMessage}</p>}
                            {emailOtpSuccessMessage && <p className="text-green-500 text-center">{emailOtpSuccessMessage}</p>}
                        </>
                    )}
                    {activeSection === "changePassword" && (
                        <>
                            <div className="font-bold flex py-2 px-5 text-2xl">
                                <button
                                    onClick={() => setActiveSection("yourAccount")}
                                    className="rounded-3xl px-2 cursor-pointer hover:bg-gray-200"
                                >
                                    <ArrowLeftIcon className="h-6 w-6" />
                                </button>
                                <h1 className="font-bold py-2 px-5 text-2xl"> {isAuth? "Change " : "Create "}Password</h1>
                            </div>

                            {/* Old Password */}
                            {!isAuth && <div className="w-full relative mt-2 px-2">
                                <input
                                    type="password"
                                    name="oldPassword"
                                    id="oldPassword"
                                    placeholder="Old Password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md pr-20"
                                />
                            </div>}

                            {/* New Password */}
                            <div className="w-full relative mt-2 px-2">
                                <input
                                    type="password"
                                    name="newPassword"
                                    id="newPassword"
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md pr-20"
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="w-full relative mt-2 px-2">
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    id="confirmPassword"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md pr-20"
                                />
                            </div>

                            {/* Change Password Button */}
                            <div className="w-full relative mt-2 px-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleChangePassword(oldPassword, newPassword, confirmPassword);
                                    }}
                                    className="mt-4 w-full bg-teal-500 text-white text-sm px-3 py-2 rounded hover:bg-teal-600 transition"
                                >
                                    Change Password
                                </button>
                            </div>

                            {/* Error Message */}
                            {passwordErrorMessage && <p className="text-red-500 text-center">{passwordErrorMessage}</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Settings;
