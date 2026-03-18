import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useToast } from "../context/ToastContext";
import { ReactComponent as Logo } from "../assets/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faUser, faXmarkCircle } from "@fortawesome/free-solid-svg-icons";
import ElectricBorder from ".././react_bits/ElectricBorder";
import "../styles/Login.scss";

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

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(decoded));

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
    <div className="login-page">
      <div
        className="login-bg"
        style={{
          backgroundImage:
            "url('https://www.arduino.cc/cdn-cgi/image/width=1080,quality=60,format=auto/https://www.datocms-assets.com/150482/1763454600-rectangle-943-2x.png')",
        }}
      >
        <div className="login-bg-overlay"></div>
      </div>

      <div className="login-container">
        <ElectricBorder
          color="#7df9ff"
          speed={1}
          chaos={0.12}
          thickness={5}
          style={{ borderRadius: 16 }}
        >
          <div className="login-card">
            {/* Logo */}
            <div className="login-logo-wrapper">
              <div className="login-logo-inner">
                <div className="login-logo-icon">
                  <Logo />
                </div>
                <span className="login-brand-name">MicroBits</span>
              </div>
            </div>

            <h1 className="login-title">Login to your account</h1>

            <form onSubmit={handleLogin} className="login-form">
              {/* Username */}
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <div className="input-wrapper">
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <span className="input-icon">
                    <FontAwesomeIcon icon={faUser} />
                  </span>
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input has-icon-right"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                  >
                    {showPassword ? (
                      <FontAwesomeIcon icon={faEye} />
                    ) : (
                      <FontAwesomeIcon icon={faEyeSlash} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="login-error">
                  <FontAwesomeIcon
                    icon={faXmarkCircle}
                    className="error-icon"
                  />
                  <div className="error-content">
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Remember me / Forgot password */}
              <div className="login-options">
                <label className="remember-me-label">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot-password-link">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="login-btn"
              >
                {isLoading ? (
                  <span className="login-btn-loading">
                    <svg
                      className="spin-icon"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="spinner-track"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="spinner-fill"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  "Log in to your account"
                )}
              </button>
            </form>

            <p className="login-signup-text">
              Don't have an account?{" "}
              <Link to="/register" className="signup-link">
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