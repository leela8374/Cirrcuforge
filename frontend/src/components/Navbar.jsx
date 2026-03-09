import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, LogOut, ChevronDown, GraduationCap, BookMarked, History, Sparkles, Globe, PlusCircle } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon"><BookOpen size={20} /></div>
          <span className="brand-name">CurricuForge</span>
        </Link>

        <div className="navbar-links">
          {user?.role === "faculty" && (
            <>
              <Link to="/generate" className="nav-link"><Sparkles size={15} />Generate</Link>
              <Link to="/add-course" className="nav-link"><PlusCircle size={15} />Add Course</Link>
              <Link to="/history" className="nav-link"><History size={15} />My Curricula</Link>
            </>
          )}
          {user?.role === "student" && (
            <Link to="/student" className="nav-link"><Globe size={15} />Published Curricula</Link>
          )}
          {!user && (
            <Link to="/" className="nav-link">Home</Link>
          )}
        </div>

        <div className="navbar-right">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button className="user-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <span className="user-name">{user.name}</span>
                <div className={`role-badge-nav ${user.role}`}>
                  {user.role === "faculty" ? <BookMarked size={11} /> : <GraduationCap size={11} />}
                  {user.role}
                </div>
                <ChevronDown size={14} className={dropdownOpen ? "rotated" : ""} />
              </button>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-user-info">
                    <div className="du-name">{user.name}</div>
                    <div className="du-email">{user.email}</div>
                    <div className="du-role">{user.role === "faculty" ? "👨‍🏫 Faculty" : "👩‍🎓 Student"}</div>
                  </div>
                  <div className="dropdown-divider" />
                  {user.role === "faculty" && (
                    <>
                      <button className="dropdown-item" onClick={() => { navigate("/generate"); setDropdownOpen(false); }}>
                        <Sparkles size={14} />Generate Curriculum
                      </button>
                      <button className="dropdown-item" onClick={() => { navigate("/add-course"); setDropdownOpen(false); }}>
                        <PlusCircle size={14} />Add New Course
                      </button>
                      <button className="dropdown-item" onClick={() => { navigate("/history"); setDropdownOpen(false); }}>
                        <History size={14} />My Curricula
                      </button>
                    </>
                  )}
                  {user.role === "student" && (
                    <button className="dropdown-item" onClick={() => { navigate("/student"); setDropdownOpen(false); }}>
                      <Globe size={14} />Browse Curricula
                    </button>
                  )}
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} />Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-btns">
              <Link to="/login" className="nav-btn-ghost">Sign in</Link>
              <Link to="/register" className="nav-btn-primary">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
