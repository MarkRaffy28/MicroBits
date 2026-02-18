import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ReactComponent as Logo } from "../assets/logo.svg"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faUser, faXmarkCircle } from "@fortawesome/free-solid-svg-icons"; 
import ElectricBorder from ".././react_bits/ElectricBorder"

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    setIsLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      const token = res.data.token;
      const decoded = jwtDecode(token); // contains id, username, role, exp

      // Save token and user to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(decoded));

      // Redirect to dashboard
      if (decoded.role === "admin") {
        navigate("admin");
      } else {
        navigate("user");
      }
    } catch (err) {
      setError("Invalid username or password");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://www.arduino.cc/cdn-cgi/image/width=1080,quality=60,format=auto/https://www.datocms-assets.com/150482/1763454600-rectangle-943-2x.png')",
        }}
      >
        <div className="absolute inset-0 backdrop-blur-sm bg-black/40"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <ElectricBorder
          color="#7df9ff"
          speed={1}
          chaos={0.12}
          thickness={5}
          style={{ borderRadius: 16 }}
        >
          <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-700/50">
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Logo className="text-white w-10 h-10" />
                </div>
                <span className="text-white text-2xl font-semibold">MicroBits</span>
              </div>
            </div>
            
            <h1 className="text-white text-2xl font-bold text-center mb-8">
              Login to your account
            </h1>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-white text-sm font-medium mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <FontAwesomeIcon icon={faUser} />
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? (
                      <FontAwesomeIcon icon={faEye} />
                    ) : (
                      <FontAwesomeIcon icon={faEyeSlash} />
                    )}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="mb-6 p-1 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
                  <FontAwesomeIcon icon={faXmarkCircle} className="w-4 h-4 mt-0.5 ps-2 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 cursor-pointer"
                  />
                  <span className="ml-2 text-gray-300 text-sm">Remember me</span>
                </label>
                <a href="#" className="text-blue-500 hover:text-blue-400 text-sm font-medium transition-colors">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Log in to your account'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </ElectricBorder>
      </div>
    </div>
  );
};
export default Login;
