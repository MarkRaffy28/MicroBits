import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserByEmail } from "../firebase/services/users";
import { ReactComponent as Logo } from "../assets/logo.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faXmarkCircle, faCheckCircle, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import ElectricBorder from ".././react_bits/ElectricBorder";

const ForgotPassword = () => {
  const [email,     setEmail]     = useState("");
  const [error,     setError]     = useState("");
  const [sent,      setSent]      = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Check if email exists in Firestore
      const user = await getUserByEmail(email.trim());

      if (!user) {
        setError("No account found with this email address.");
        setIsLoading(false);
        return;
      }

      // 2. Check if email is verified
      if (user.emailVerified === false) {
        setError("Your email address has not been verified. Please verify your email before resetting your password.");
        setIsLoading(false);
        return;
      }

      // 3. All good — send reset email
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      switch (err.code) {
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please wait a moment and try again.");
          break;
        default:
          setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://www.arduino.cc/cdn-cgi/image/width=1080,quality=60,format=auto/https://www.datocms-assets.com/150482/1763454600-rectangle-943-2x.png')",
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <ElectricBorder color="#7df9ff" speed={1} chaos={0.12} thickness={5} style={{ borderRadius: 16 }}>
          <div className="bg-gray-900/95 rounded-2xl px-8 py-10 flex flex-col gap-6">

            {/* Logo */}
            <div className="flex justify-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-2 rounded-xl">
                  <Logo height="32" />
                </div>
                <span className="text-white text-2xl font-bold tracking-tight">MicroBits</span>
              </div>
            </div>

            {!sent ? (
              <>
                {/* Title */}
                <div className="text-center space-y-1.5">
                  <h1 className="text-white text-2xl font-bold">Reset your password</h1>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Enter the email address linked to your account and we'll send you a reset link.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  {/* Email field */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reset-email" className="text-gray-300 text-sm font-medium">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        required
                        className={`w-full bg-gray-800 text-white text-sm px-4 py-3 pr-11 rounded-xl border
                          transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent
                          placeholder-gray-500
                          ${error
                            ? "border-red-500 focus:ring-red-500 bg-red-500/5"
                            : "border-gray-600 hover:border-gray-500 focus:ring-blue-500"
                          }`}
                      />
                      <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-sm transition-colors ${
                        error ? "text-red-400" : "text-gray-500"
                      }`}>
                        <FontAwesomeIcon icon={faEnvelope} />
                      </span>
                    </div>

                    {/* Inline field error */}
                    {error && (
                      <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
                        <FontAwesomeIcon
                          icon={faXmarkCircle}
                          className="text-red-400 flex-shrink-0 mt-0.5 text-sm"
                        />
                        <p className="text-red-400 text-xs leading-relaxed">{error}</p>
                      </div>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                      text-white font-semibold py-3 rounded-xl transition-all duration-200
                      shadow-lg hover:shadow-blue-500/30 transform hover:scale-[1.02] active:scale-[0.98]
                      disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                      flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Checking...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* ─── Success state ─── */
              <div className="flex flex-col items-center gap-5 py-2 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 text-3xl" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-white text-2xl font-bold">Check your inbox</h1>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We sent a password reset link to{" "}
                    <span className="text-white font-semibold">{email}</span>.
                    Check your inbox and follow the instructions.
                  </p>
                </div>

                <p className="text-gray-600 text-xs">
                  Didn't receive it? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => { setSent(false); setError(""); }}
                    className="text-cyan-400 hover:text-cyan-300 underline transition-colors bg-transparent border-none p-0 cursor-pointer">
                    try again
                  </button>.
                </p>
              </div>
            )}

            {/* Back to login */}
            <div className="text-center border-t border-gray-700/60 pt-2">
              <Link to="/"
                className="text-gray-400 hover:text-white text-sm transition-colors inline-flex items-center gap-2 no-underline group">
                <FontAwesomeIcon
                  icon={faArrowLeft}
                  className="text-xs group-hover:-translate-x-0.5 transition-transform"
                />
                Back to Login
              </Link>
            </div>

          </div>
        </ElectricBorder>
      </div>
    </div>
  );
};

export default ForgotPassword;