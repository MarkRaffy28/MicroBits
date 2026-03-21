import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      type: "content",
      content: (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-center px-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold">🔥 MicroBits Mega Sale</h1>
            <p className="text-lg md:text-xl mt-4 text-gray-300">
              Arduino • ESP32 • Sensors • Relays • Modules
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-yellow-400 mt-3">Up to 30% OFF</h2>
            <p className="mt-4 text-gray-300">Limited time only. While stocks last.</p>
            <NavLink
              to="/user/shop"
              className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xl font-bold px-8 py-3 rounded-lg mt-6 transition-colors"
            >
              Shop Now
            </NavLink>
          </div>
        </div>
      ),
    },
    {
      type: "image",
      image: "https://www.arduino.cc/cdn-cgi/image/width=1080,quality=60,format=auto/https://www.datocms-assets.com/150482/1763454600-rectangle-943-2x.png",
      title: "Arduino Starter Kit",
      description: "Turn curiosity into understanding and learn the basics behind the tech that powers the world around you.",
    },
    {
      type: "image",
      image: "https://www.electronics-lab.com/wp-content/uploads/2021/08/EspressifSystemsESP32-C3.jpg",
      title: "ESP32 Development Board",
      description: "A feature-rich MCU with integrated Wi-Fi and Bluetooth connectivity for a wide-range of applications",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Slides */}
      <div className="relative h-[calc(100vh-60px)] ">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`transition-opacity duration-700 ${
              index === currentSlide ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
            }`}
          >
            {slide.type === "content" ? (
              slide.content
            ) : (
              <div className="relative h-screen bg-gray-900">
                <div className="flex items-center justify-center h-full">
                  <img
                    src={slide.image}
                    className="w-full h-full object-cover"
                    alt={slide.title}
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 pt-6 bg-gradient-to-t from-black/70 to-transparent text-white text-center p-8">
                  <h5 className="text-2xl md:text-3xl font-bold mb-2">{slide.title}</h5>
                  <p className="mb-20 text-sm md:text-base text-gray-200">{slide.description}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all z-10"
      >
        <i className="bi bi-chevron-left text-2xl"></i>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all z-10"
      >
        <i className="bi bi-chevron-right text-2xl"></i>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? "bg-white w-8"
                : "bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default Home;