import { useNavigate } from "react-router-dom";
import { Navbar, Nav, Container, Form, Button } from "react-bootstrap";

import "./Stylesheet.css";

import { ReactComponent as Logo } from "../assets/logo.svg";
import { ReactComponent as Burger } from "../assets/burger.svg";

function UserNavigation() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <Navbar className="bg-blue-700" expand="lg" data-bs-theme="dark">
      <Container fluid>
        <Navbar.Brand href="/home">
          <Logo className="inline" height="26" />{" "}
          <span className="fw-bold navbar-title">MicroBits</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbar-content">
          <Burger height="24" />
        </Navbar.Toggle>
        <Navbar.Collapse id="navbar-content">
          <Nav className="me-auto mb-2 mb-lg-0">
            <Nav.Link href="/home" className="fw-bold">
              Home
            </Nav.Link>
          </Nav>
          <div className="d-flex">
            <Button variant="success" className="me-3">{user?.username}</Button>
            <Button variant="danger" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default UserNavigation;
