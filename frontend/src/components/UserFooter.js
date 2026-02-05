import React from "react";
import { Container, Row, Col } from "react-bootstrap";

function UserFooter() {
  return (
    <footer className="bg-blue-700 pt-4">
      <Container>
        <Row>
          <Col md={3} className="mb-3">
            <h5 className="fw-bold">About Us</h5>
            <p>
              MicroBits is your one-stop shop for affordable and reliable IoT
              and electronics components, made to help students, makers, and
              developers build smart projects easily.
            </p>
          </Col>
          <Col md={3} className="contact-us mb-3">
            <h5 className="fw-bold">Contact Us</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#">
                  <i className="fa-solid fa-location-dot"></i>12-7
                  Samseong-dong, Gangnam-gu, Seoul, South Korea{" "}
                </a>
              </li>
              <li>
                <a href="#">
                  <i className="fa-solid fa-envelope"></i>microbits.kr@gmail.com
                </a>
              </li>
              <li>
                <a href="#">
                  <i className="fa-solid fa-phone"></i>(+82) 10-3847-6291
                </a>
              </li>
            </ul>
          </Col>
          <Col md={3} className="mb-4">
            <h5 className="fw-bold">Follow Us</h5>
            <a href="">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a href="">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="">
              <i className="fa-brands fa-telegram"></i>
            </a>
            <a href="">
              <i className="fa-brands fa-x-twitter"></i>
            </a>
            <a href="">
              <i className="fa-brands fa-youtube"></i>
            </a>
          </Col>
          <Col md={3} className="mb-3">
            <h5 className="fw-bold">Legal</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#">Privacy</a>
              </li>
              <li>
                <a href="#">Terms of Use</a>
              </li>
            </ul>
          </Col>
        </Row>
        <div className="text-center py-3 border-top mt-3">
          © 2026 MicroBits. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}

export default UserFooter;
