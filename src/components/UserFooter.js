import React from "react";

function UserFooter() {
  const getSocialLink = (href, additionalClasses, icon) => {
    return <a href={href} className={`w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 text-white hover:scale-110 transition-all text-xl ${additionalClasses}`}
    >
      <i className={`bi ${icon}`}></i>
    </a>
    
  }

  return (
    <footer className="bg-blue-700 text-white pt-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* About Us */}
          <div className="mb-3">
            <h5 className="font-bold text-lg mb-3">About Us</h5>
            <p className="text-white/90 text-sm leading-relaxed">
              MicroBits is your one-stop shop for affordable and reliable IoT
              and electronics components, made to help students, makers, and
              developers build smart projects easily.
            </p>
          </div>

          {/* Contact Us */}
          <div className="mb-3">
            <h5 className="font-bold text-lg mb-3">Contact Us</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-white/90 hover:text-white hover:underline transition-all flex items-start gap-2 group">
                  <i className="bi bi-geo-alt-fill mt-1 flex-shrink-0 group-hover:scale-110 transition-transform"></i>
                  <span>12-7 Samseong-dong, Gangnam-gu, Seoul, South Korea</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-white/90 hover:text-white hover:underline transition-all flex items-center gap-2 group">
                  <i className="bi bi-envelope-fill flex-shrink-0 group-hover:scale-110 transition-transform"></i>
                  <span>microbits.kr@gmail.com</span>
                </a>
              </li>
              <li>
                <a href="#" className="text-white/90 hover:text-white hover:underline transition-all flex items-center gap-2 group">
                  <i className="bi bi-telephone-fill flex-shrink-0 group-hover:scale-110 transition-transform"></i>
                  <span>(+82) 10-3847-6291</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div className="mb-4">
            <h5 className="font-bold text-lg mb-3">Follow Us</h5>
            <div className="flex gap-3">
              {getSocialLink("#", "hover:bg-[#1877F2]", "bi-facebook")}
              {getSocialLink("#", "hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#E1306C] hover:to-[#F77737]", "bi-instagram")}
              {getSocialLink("#", "hover:bg-[#0088CC]", "bi-telegram")}
              {getSocialLink("#", "hover:bg-black", "bi-twitter-x")}
              {getSocialLink("#", "hover:bg-[#FF0000]", "bi-youtube")}
            </div>
          </div>

          {/* Legal */}
          <div className="mb-3">
            <h5 className="font-bold text-lg mb-3">Legal</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-white/90 hover:text-white hover:underline transition-colors inline-block">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="text-white/90 hover:text-white hover:underline transition-colors inline-block">
                  Terms of Use
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center py-3 border-t border-white/20 mt-6">
          <p className="text-sm text-white/80">
            © {new Date().getFullYear()} MicroBits. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default UserFooter;