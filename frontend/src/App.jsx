import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Generate from "./pages/Generate";
import History from "./pages/History";
import CurriculumDetail from "./pages/CurriculumDetail";
import StudentDashboard from "./pages/StudentDashboard";
import StudentCurriculumView from "./pages/StudentCurriculumView";
import AddCourse from "./pages/AddCourse";
import ForgotPassword from "./pages/ForgotPassword";
import "./styles/index.css";

function RoleRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "faculty" ? "/generate" : "/student"} replace />;
  return children;
}

function AuthRedirect({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === "faculty" ? "/generate" : "/student"} replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />
        <Route path="/forgot-password" element={<AuthRedirect><ForgotPassword /></AuthRedirect>} />

        {/* Faculty only */}
        <Route path="/generate" element={<RoleRoute role="faculty"><Generate /></RoleRoute>} />
        <Route path="/history" element={<RoleRoute role="faculty"><History /></RoleRoute>} />
        <Route path="/add-course" element={<RoleRoute role="faculty"><AddCourse /></RoleRoute>} />
        <Route path="/curriculum/:id" element={<RoleRoute role="faculty"><CurriculumDetail /></RoleRoute>} />

        {/* Student only */}
        <Route path="/student" element={<RoleRoute role="student"><StudentDashboard /></RoleRoute>} />
        <Route path="/student/curriculum/:id" element={<RoleRoute role="student"><StudentCurriculumView /></RoleRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
