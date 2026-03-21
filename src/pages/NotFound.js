import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FuzzyText from "../react_bits/FuzzyText";
import Lightning from "../react_bits/Lightning";

function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Lightning Background */}
      <div className="absolute inset-0 bg-gray-900 ">
        <Lightning 
          hue={230} 
          xOffset={0} 
          speed={0.5} 
          intensity={0.8} 
          size={1.5} 
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-8">
            <FuzzyText 
              baseIntensity={0.2}
              hoverIntensity={0.5}
              enableHover
              className="mx-auto"
            >
              404
            </FuzzyText>
          </div>

          <h2 className="text-3xl font-bold text-gray-100 mb-20 drop-shadow-lg">
            Page Not Found
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto drop-shadow-lg">
            Oops! The page you're looking for {' '}
            <span className="font-bold text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:underline hover:underline-offset-4 hover:text-blue-700 transition-colors">
              {location.pathname}
            </span>
            {' '} doesn't exist. It might have been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 border border-gray-600"
            >
              <i className="bi bi-arrow-left mr-2"></i>
              Go Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700/80 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 border border-blue-500"
            >
              <i className="bi bi-house-door mr-2"></i>
              Go Home
            </button>
          </div>

          <div className="mt-12">
            <p className="text-gray-400 text-sm drop-shadow-lg">
              Error Code: 404 | Page Not Found
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFound;