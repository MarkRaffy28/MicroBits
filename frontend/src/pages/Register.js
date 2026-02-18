import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { ReactComponent as Logo } from "../assets/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faXmarkCircle, faArrowLeft, faCheckCircle, faUser } from "@fortawesome/free-solid-svg-icons";
import ElectricBorder from ".././react_bits/ElectricBorder";

const Register = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Step 2
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    middleName: "",
    lastName: "",
    phoneNumber: "",
    address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Step 1: Check username ── */
  const handleCheckUsername = async (e) => {
    e.preventDefault();
    setUsernameError("");
    if (!username.trim()) {
      setUsernameError("Please enter a username.");
      return;
    }
    setIsCheckingUsername(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/users/check/username/${username.trim()}`
      );
      if (res.data.exists) {
        setUsernameError("That username is already taken. Please choose another.");
      } else {
        setStep(2);
      }
    } catch {
      setUsernameError("Unable to check username. Please try again.");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  /* ── Step 2: Submit registration ── */
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError("");
    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post("http://localhost:5000/api/users", {
        username: username.trim(),
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        role: "user",
      });
      addToast("User registered successfully.");
      navigate("/");
    } catch (err) {
      setFormError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  const Label = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-white text-sm font-medium mb-2">
      {children}
    </label>
  );

  const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <>
      {/* ── Fixed background — stays put while form scrolls ── */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage:
            "url('https://www.arduino.cc/cdn-cgi/image/width=1080,quality=60,format=auto/https://www.datocms-assets.com/150482/1763454600-rectangle-943-2x.png')",
        }}
      >
        <div className="absolute inset-0 backdrop-blur-sm bg-black/40" />
      </div>

      {/* ── Scrollable content layer ── */}
      <div className="relative min-h-screen flex items-start justify-center px-4 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <ElectricBorder
            color="#7df9ff"
            speed={1}
            chaos={0.12}
            thickness={5}
            style={{ borderRadius: 16 }}
          >
            <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-700/50">

              {/* Logo */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Logo className="text-white w-10 h-10" />
                  </div>
                  <span className="text-white text-2xl font-semibold">MicroBits</span>
                </div>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2].map((n) => (
                  <React.Fragment key={n}>
                    {n > 1 && (
                      <div
                        className={`h-0.5 w-12 transition-all duration-500 ${
                          step >= n ? "bg-blue-600" : "bg-gray-600"
                        }`}
                      />
                    )}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                        step >= n
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-600 text-gray-500"
                      }`}
                    >
                      {step > n ? (
                        <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4" />
                      ) : (
                        n
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* ─────────── STEP 1 ─────────── */}
              {step === 1 && (
                <>
                  <h1 className="text-white text-2xl font-bold text-center mb-2">
                    Create an account
                  </h1>
                  <p className="text-gray-400 text-sm text-center mb-8">
                    Start by choosing your username
                  </p>

                  <form onSubmit={handleCheckUsername} className="space-y-6">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <input
                          id="username"
                          type="text"
                          className={`${inputCls} pr-12`}
                          placeholder="Choose a unique username"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setUsernameError("");
                          }}
                          autoFocus
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          <FontAwesomeIcon icon={faUser} />
                        </span>
                      </div>
                    </div>

                    {usernameError && (
                      <div className="p-1 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
                        <FontAwesomeIcon
                          icon={faXmarkCircle}
                          className="w-4 h-4 mt-0.5 ps-2 text-red-500 flex-shrink-0"
                        />
                        <p className="text-red-400 text-sm font-medium">{usernameError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isCheckingUsername}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                    >
                      {isCheckingUsername ? (
                        <span className="flex items-center justify-center">
                          <Spinner />
                          Checking availability…
                        </span>
                      ) : (
                        "Continue"
                      )}
                    </button>
                  </form>

                  <p className="text-center text-sm text-gray-400 mt-6">
                    Already have an account?{" "}
                    <a
                      href="/"
                      className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
                    >
                      Log in
                    </a>
                  </p>
                </>
              )}

              {/* ─────────── STEP 2 ─────────── */}
              {step === 2 && (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <h1 className="text-white text-xl font-bold">Complete your profile</h1>
                  </div>

                  {/* Confirmed username badge */}
                  <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-blue-600/20 border border-blue-500/40 rounded-lg">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-blue-400 text-sm" />
                    <span className="text-blue-300 text-sm">
                      Username:{" "}
                      <span className="font-semibold text-white">{username}</span>
                    </span>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Name row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          className={inputCls}
                          placeholder="Juan"
                          value={formData.firstName}
                          onChange={handleChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          className={inputCls}
                          placeholder="Dela Cruz"
                          value={formData.lastName}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="middleName">
                        Middle Name{" "}
                        <span className="text-gray-500 font-normal">(optional)</span>
                      </Label>
                      <input
                        id="middleName"
                        name="middleName"
                        type="text"
                        className={inputCls}
                        placeholder="Santos"
                        value={formData.middleName}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">
                        Email{" "}
                        <span className="text-gray-500 font-normal">(optional)</span>
                      </Label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        className={inputCls}
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">
                        Phone Number{" "}
                        <span className="text-gray-500 font-normal">(optional)</span>
                      </Label>
                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        className={inputCls}
                        placeholder="+63 9XX XXX XXXX"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">
                        Address{" "}
                        <span className="text-gray-500 font-normal">(optional)</span>
                      </Label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        className={inputCls}
                        placeholder="Street, City, Province"
                        value={formData.address}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          className={`${inputCls} pr-12`}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none transition-colors"
                        >
                          <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          className={`${inputCls} pr-12`}
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none transition-colors"
                        >
                          <FontAwesomeIcon icon={showConfirmPassword ? faEye : faEyeSlash} />
                        </button>
                      </div>
                    </div>

                    {formError && (
                      <div className="p-1 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
                        <FontAwesomeIcon
                          icon={faXmarkCircle}
                          className="w-4 h-4 mt-0.5 ps-2 text-red-500 flex-shrink-0"
                        />
                        <p className="text-red-400 text-sm font-medium">{formError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50 mt-2"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <Spinner />
                          Creating account…
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </ElectricBorder>
        </div>
      </div>
    </>
  );
};

export default Register;