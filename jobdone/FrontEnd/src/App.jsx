import { useState, useEffect } from "react";
import logo from "./assets/logo/logo-transparent-jobdone.svg";
import googleIcon from "./assets/icons/google.svg";
import axios from "axios";
import useAuth from "./hooks/useAuth.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSignIn, setIsSignIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [entryStage, setEntryStage] = useState("choose");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { updateUser , user } = useAuth(); 
  const [searchParams] = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user was logged out (to prevent auto-login)
  const [wasLoggedOut, setWasLoggedOut] = useState(false);

  useEffect(() => {
    // Check if we're coming from a logout
    const loggedOut = sessionStorage.getItem('logged_out');
    if (loggedOut) {
      setWasLoggedOut(true);
      sessionStorage.removeItem('logged_out');
      setCheckingAuth(false);
      setAuthChecked(true);
      return;
    }

    if (authChecked) return;
    
    const checkAuthentication = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/me`, { credentials: "include" });
        console.log("newuser" , res);
        if (res.ok) {
          const data = await res.json();
          updateUser(data);
          navigate("/Profile");
          return;
        }
      } catch (error) {
        console.log("Not authenticated");
      } finally {
        
      }
    };

    checkAuthentication();
    setCheckingAuth(false);
    setAuthChecked(true);
  }, [navigate, updateUser, authChecked]);


  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      switch (error) {
        case "google_login_failed":
          setErrorMessage("Google login failed. Please try again.");
          break;
        case "token_processing_failed":
          setErrorMessage("Login processing failed. Please try again.");
          break;
        default:
          setErrorMessage("An error occurred. Please try again.");
      }
    }
  }, [searchParams]);

  const SignUpUser = async (username, email, password) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/info`,
        { username, email, password },
        {
          withCredentials: true,
        },
      );
      console.log(response.data);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Network error" };
    }
  };

  const SignInUser = async (email, password) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/check`,
        { email, password },
        {
          withCredentials: true,
        },
      );
      console.log("cookies set");
      const userRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/me`, {
        withCredentials: true,
      });
      console.log("userset");

      updateUser(userRes.data);
      console.log("Login successful:", userRes.data);
      
      // Clear the logged out flag
      setWasLoggedOut(false);
      
      navigate("/Profile");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: "Network error" };
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      // Clear the logged out flag before Google login
      setWasLoggedOut(false);
      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
    } catch (error) {
      setErrorMessage("Failed to initiate Google login");
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password || (!isSignIn && !username)) {
      setErrorMessage("All fields are required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Invalid email format");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage("");
      if (isSignIn) {
        await SignInUser(email, password);
      } else {
        await SignUpUser(username, email, password);
        setIsSignIn(true);
        setEntryStage("signin");
        setErrorMessage("Account created! Please sign in.");
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSignInMode = () => {
    setIsSignIn(!isSignIn);
    setUsername("");
    setEmail("");
    setPassword("");
    setErrorMessage("");
  };

  if (checkingAuth && !wasLoggedOut) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row min-h-screen">
      <div className="hidden sm:block sm:w-[70%] bg-blue-600/20"></div>

      <div className="flex flex-col items-center justify-center gap-6 bg-teal-400 w-full sm:w-[30%] py-8">
        <div className="flex justify-center mt-2">
          <div className="w-50 h-50 sm:w-48 sm:h-48">
            <img src={logo} alt="logo" className="object-contain w-full h-full" />
          </div>
        </div>


        <div className="w-4/5 min-h-[380px] flex flex-col gap-4 bg-white p-6 rounded-lg shadow-lg">
          {wasLoggedOut && (
            <div className="text-center text-green-600 text-sm mb-2">
              You have been logged out successfully.
            </div>
          )}
          
          {entryStage === "choose" && (
            <>
              <h2 className="text-xl font-bold text-center mb-2">Join JobDone</h2>

              {errorMessage && (
                <p className="text-red-500 text-center text-sm">{errorMessage}</p>
              )}

              <button
                className="w-full flex items-center justify-center gap-3 border rounded-md py-2 hover:shadow cursor-pointer transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <img src={googleIcon} alt="Google" className="w-5 h-5" />
                {isLoading ? "Loading..." : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              <button
                className="w-full bg-teal-400 text-white py-2 rounded-md hover:bg-teal-600 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setEntryStage("signup");
                  setIsSignIn(false);
                }}
                disabled={isLoading}
              >
                Create Account
              </button>

              <p className="text-center text-md text-gray-600">
                Already have an account?
                <button
                  className="ml-2 text-teal-700 hover:underline cursor-pointer"
                  onClick={() => {
                    setEntryStage("signin");
                    setIsSignIn(true);
                  }}
                >
                  Sign In
                </button>
              </p>
            </>
          )}

          {(entryStage === "signup" || entryStage === "signin") && (
            <>
              <h2 className="text-xl font-bold text-center mb-2">
                {isSignIn ? "Sign In" : "Sign Up"}
              </h2>

              {errorMessage && (
                <p
                  className={`text-center text-sm ${
                    errorMessage.includes("created")
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {errorMessage}
                </p>
              )}

              {!isSignIn && (
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={username}
                  placeholder="Username"
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md outline-offset-2 outline-blue-500 focus:outline-3"
                  disabled={isLoading}
                />
              )}

              <input
                type="text"
                name="email"
                id="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md outline-offset-2 outline-blue-500 focus:outline-3"
                disabled={isLoading}
              />

              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md outline-offset-2 outline-blue-500 focus:outline-3"
                  disabled={isLoading}
                />
                {password && (
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center font-medium text-sm cursor-pointer hover:opacity-50 transition disabled:opacity-25"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                )}
              </div>

              <button
                className="w-full bg-teal-400 text-white py-2 rounded-md hover:bg-teal-600 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : isSignIn ? "Sign In" : "Sign Up"}
              </button>

              <div className="text-center text-gray-600">
                {isSignIn ? "Don't have an account?" : "Already have an account?"}
                <button
                  className="ml-2 text-teal-600 cursor-pointer hover:underline disabled:opacity-50"
                  onClick={toggleSignInMode}
                  disabled={isLoading}
                >
                  {isSignIn ? "Sign Up" : "Sign In"}
                </button>
              </div>

              <div className="text-center mt-2">
                <button
                  className="text-sm text-gray-500 underline cursor-pointer disabled:opacity-50"
                  onClick={() => {
                    setEntryStage("choose");
                    setErrorMessage("");
                  }}
                  disabled={isLoading}
                >
                  ← Back to options
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;