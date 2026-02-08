import { BrowserRouter, Route, Routes } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import MyBooks from "./pages/MyBooks";
import Profile from "./pages/Profile";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/Navbar";
import { SocketProvider } from "./utils/SocketContext";
import { AuthProvider } from "./utils/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Admin from "./pages/Admin";
import "./assets/styles/theme.scss";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              stacked={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              theme="colored"
              aria-label="Notifications"
            />
            <ProtectedRoute requireAuth={false}>
              <Navbar />
            </ProtectedRoute>
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Auth />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requireAuth={true} requireApproval={true}>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-books"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <MyBooks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAuth={true} adminOnly={true}>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
