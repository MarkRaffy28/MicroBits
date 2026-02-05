import React from "react";
import { Carousel, Container, Row, Col } from "react-bootstrap";
import UserFooter from "../../components/UserFooter";
import UserNavigation from "../../components/UserNavigation";

function Home() {
  return (
    <>
      <style>
        {`@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css');`}
      </style>
      
      <UserNavigation />
      <Carousel data-bs-interval={5000}>
        <Carousel.Item>
          <div className="d-flex align-items-center justify-content-center vh-100 bg-dark text-white text-center">
            <div>
              <h1 className="display-4 fw-bold">🔥 MicroBits Mega Sale</h1>
              <p className="lead mt-3">
                Arduino • ESP32 • Sensors • Relays • Modules
              </p>
              <h2 className="fw-bold text-warning mt-2">Up to 30% OFF</h2>
              <p className="mt-3">Limited time only. While stocks last.</p>
              <a href="#" className="btn btn-warning btn-lg mt-3">
                Shop Now
              </a>
            </div>
          </div>
        </Carousel.Item>
        <Carousel.Item>
          <div className="d-flex align-items-center justify-content-center vh-100 bg-dark text-white text-center">
            <img
              src="https://www.arduino.cc/cdn-cgi/image/width=1080,quality=60,format=auto/https://www.datocms-assets.com/150482/1763454600-rectangle-943-2x.png"
              className="d-block w-100"
              alt="Arduino Starter Kit"
            />
          </div>
          <Carousel.Caption>
            <h5>Arduino Starter Kit</h5>
            <p>
              Turn curiosity into understanding and learn the basics behind the
              tech that powers the world around you.
            </p>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item>
          <div className="d-flex align-items-center justify-content-center vh-100 bg-dark text-white text-center">
            <img
              src="https://www.electronics-lab.com/wp-content/uploads/2021/08/EspressifSystemsESP32-C3.jpg"
              className="d-block w-100"
              alt="ESP32 Development Board"
            />
          </div>
          <Carousel.Caption>
            <h5>ESP32 Development Board</h5>
            <p>
              A feature-rich MCU with integrated Wi-Fi and Bluetooth
              connectivity for a wide-range of applications
            </p>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>
      <UserFooter />
    </>
  );
}

export default Home;
