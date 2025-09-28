import React, { useState, useMemo } from "react";
import { useAuth } from "../utils/AuthContext";
import { toast_error } from "../utils/Toasts";
import Logo from "../components/Logo";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import "../assets/styles/pages/Auth.scss";
import { Link } from "react-router-dom";

const rooms = (() => {
  let allRooms = [];
  for (let i = 1; i <= 22; i++) allRooms.push(i.toString().padStart(3, "0"));
  for (let floor = 1; floor <= 4; floor++) {
    for (let i = 1; i <= 22; i++)
      allRooms.push(`${floor}${i.toString().padStart(2, "0")}`);
  }
  for (let i = 1; i <= 20; i++)
    allRooms.push(`5${i.toString().padStart(2, "0")}`);
  for (let i = 1; i <= 5; i++) allRooms.push(`Oficiul ${i}`);
  return allRooms;
})();

function Auth() {
  const { user, loading, register, signInWithGoogle, signUserOut } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredRooms = useMemo(() => {
    if (!inputValue) return rooms;
    return rooms.filter((room) =>
      room.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [inputValue]);

  const validationSchema = Yup.object({
    numeComplet: Yup.string().required("Nume complet este obligatoriu"),
    camera: Yup.string()
      .oneOf(rooms, "Camera trebuie să fie una din lista validă")
      .required("Camera este obligatorie"),
    telefon: Yup.string()
      .matches(/^[0-9]{10}$/, "Telefon invalid (trebuie 10 cifre)")
      .required("Telefon este obligatoriu"),
  });

  const initialValues = {
    numeComplet: "",
    camera: "",
    telefon: "",
  };

  const handleFormSubmit = async (values) => {
    try {
      await register(values);
    } catch (error) {
      toast_error("Eroare la înregistrare!");
      console.error("Registration error:", error);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast_error("Eroare la autentificare!");
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth">
        <div className="auth__container">
          <div className="auth__loading">
            <div className="auth__loading-spinner"></div>
            <p>Se încarcă...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth__container">
        <div className="auth__header">
          <div className="auth__header-logo">
            <Logo />
          </div>
          <h1>
            {user ? "Bine ai venit!" : showRegister ? "Înregistrare" : "Autentificare"}
          </h1>
          <p>
            {user
              ? "Contul tău este configurat și funcțional"
              : showRegister
                ? "Creează un cont nou pentru a accesa spălătoria"
                : "Conectează-te pentru a accesa spălătoria"
            }
          </p>
        </div>

        {user && !loading ? (
          <div className="auth__welcome">
            <img
              src={user.google?.photoURL || "/default-avatar.png"}
              alt={user.numeComplet || "Avatar"}
              className="auth__welcome-avatar"
            />
            <h2 className="auth__welcome-name">
              {user.numeComplet || "Utilizator"}
            </h2>
            <p className="auth__welcome-email">
              {user.google?.email || user.email || "Email necunoscut"}
            </p>
            <p className="auth__welcome-message">
              Ești autentificat cu succes!
            </p>
            <div className="auth__actions">
              <Link to={"/dashboard"}
                className="btn btn-primary"
              >
                Mergi la Programări
              </Link>
              <button
                className="btn btn-secondary"
                onClick={signUserOut}
              >
                Deconectează-te
              </button>
            </div>
          </div>
        ) : !showRegister ? (
          <>
            <div className="auth__actions">
              <button
                className="auth__google-btn"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isSubmitting ? "Se conectează..." : "Conectează-te cu Google"}
              </button>
            </div>

            <div className="auth__divider">
              <span>sau</span>
            </div>

            <div className="auth__actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRegister(true)}
                disabled={isSubmitting}
              >
                Înregistrează-te
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="auth__back-btn"
              onClick={() => setShowRegister(false)}
              disabled={isSubmitting}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Înapoi la autentificare
            </button>

            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleFormSubmit}
            >
              {({ isSubmitting, setFieldValue }) => (
                <Form className="auth__register-form">
                  <div className="form-group">
                    <label>Nume Complet *</label>
                    <Field
                      name="numeComplet"
                      type="text"
                      placeholder="Introdu numele complet"
                    />
                    <ErrorMessage name="numeComplet" component="div" className="error-message" />
                  </div>

                  <div className="form-group" style={{ position: "relative" }}>
                    <label>Cameră *</label>
                    <Field
                      name="camera"
                      type="text"
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setFieldValue("camera", e.target.value);
                        setShowSuggestions(true);
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                      placeholder="Ex: 101, 102, etc."
                      autoComplete="off"
                    />
                    <ErrorMessage name="camera" component="div" className="error-message" />
                    {showSuggestions && filteredRooms.length > 0 && (
                      <ul className="auth__suggestions">
                        {filteredRooms.slice(0, 10).map((room) => (
                          <li
                            key={room}
                            onMouseDown={() => {
                              setInputValue(room);
                              setFieldValue("camera", room);
                              setShowSuggestions(false);
                            }}
                          >
                            {room}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Telefon *</label>
                    <Field
                      name="telefon"
                      type="tel"
                      placeholder="Numărul de telefon (10 cifre)"
                    />
                    <ErrorMessage name="telefon" component="div" className="error-message" />
                  </div>

                  <div className="auth__actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Se înregistrează..." : "Înregistrează-te"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;
