import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../utils/AuthContext";
import { toast_success, toast_error } from "../utils/Toasts";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import "../assets/styles/pages/Profile.scss";

const rooms = (() => {
  const allRooms = [];
  const addRange = (start, end) => {
    for (let num = start; num <= end; num += 1) {
      const roomNumber = num < 100 ? num.toString().padStart(3, "0") : num.toString();
      allRooms.push(roomNumber);
    }
  };

  addRange(10, 17);
  addRange(19, 26);
  addRange(113, 130);
  addRange(211, 232);
  addRange(311, 332);
  addRange(411, 432);
  addRange(511, 532);

  for (let i = 1; i <= 5; i += 1) {
    allRooms.push(`Oficiul ${i}`);
  }

  return allRooms;
})();

function Profile() {
  const { user, loading, updateUser } = useAuth();
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
    numeComplet: user?.numeComplet || "",
    camera: user?.camera || "",
    telefon: user?.telefon || "",
  };

  useEffect(() => {
    if (user?.camera) {
      setInputValue(user.camera);
    }
  }, [user]);

  const handleFormSubmit = async (values) => {
    if (!user) return;

    try {
      await updateUser(user.uid, values);
      toast_success("Profilul a fost actualizat cu succes!");
    } catch (error) {
      toast_error("Eroare la actualizarea profilului!");
      console.error("Profile update error:", error);
    }
  };

  const getStatusInfo = () => {
    if (!user) return { text: "Necunoscut", class: "pending" };

    if (user.role === "admin") {
      return { text: "Administrator", class: "admin" };
    }

    if (user.validate) {
      return { text: "Cont aprobat", class: "approved" };
    }

    return { text: "În așteptare", class: "pending" };
  };

  if (loading) {
    return (
      <div className="profile">
        <div className="container">
          <div className="profile__loading">
            <div className="profile__loading-spinner"></div>
            <p>Se încarcă profilul...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile">
        <div className="container">
          <div className="profile__header">
            <h1>Profil</h1>
            <p>Nu ești autentificat</p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="profile">
      <div className="container">
        <div className="profile__header">
          <h1>Profilul Meu</h1>
          <p>Gestionează informațiile contului tău</p>
        </div>

        <div className="profile__content">
          <div className="profile__sidebar">
            <div className="profile__avatar-card">
              <img
                src={user.google?.photoURL || "/default-avatar.png"}
                alt={user.numeComplet || "Avatar"}
                className="profile__avatar-card-avatar"
              />
              <h3 className="profile__avatar-card-name">
                {user.numeComplet || "Nume necunoscut"}
              </h3>
              <p className="profile__avatar-card-email">
                {user.google?.email || user.email || "Email necunoscut"}
              </p>
              <div
                className={`profile__avatar-card-status profile__avatar-card-status--${statusInfo.class}`}
              >
                {statusInfo.class === "admin" && "👑"}
                {statusInfo.class === "approved" && "✅"}
                {statusInfo.class === "pending" && "⏳"}
                {statusInfo.text}
              </div>
            </div>

            <div className="profile__stats-card">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4" />
                  <rect x="9" y="11" width="6" height="11" />
                  <path d="M12 2v9" />
                </svg>
                Informații Cont
              </h3>
              <div className="profile__stats-card-list">
                <div className="profile__stats-card-item">
                  <span className="label">Status</span>
                  <span className="value">{statusInfo.text}</span>
                </div>
                <div className="profile__stats-card-item">
                  <span className="label">Rol</span>
                  <span className="value">
                    {user.role === "admin" ? "Administrator" : "Utilizator"}
                  </span>
                </div>
                <div className="profile__stats-card-item">
                  <span className="label">Cameră</span>
                  <span className="value">
                    {user.camera || "Nespecificată"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile__form-card">
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Editează Profilul
            </h2>

            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleFormSubmit}
              enableReinitialize={true}
            >
              {({ isSubmitting, setFieldValue, resetForm }) => (
                <Form className="profile__form">
                  <div className="profile__form-group profile__form-group--readonly">
                    <label>Email</label>
                    <input
                      type="email"
                      value={user.google?.email || user.email || ""}
                      disabled
                      placeholder="Email-ul nu poate fi modificat"
                    />
                  </div>

                  <div className="profile__form-group">
                    <label>Nume Complet *</label>
                    <Field
                      name="numeComplet"
                      type="text"
                      placeholder="Introdu numele complet"
                    />
                    <ErrorMessage name="numeComplet" component="div" className="profile__form-error" />
                  </div>

                  <div className="profile__form-group" style={{ position: "relative" }}>
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
                    <ErrorMessage name="camera" component="div" className="profile__form-error" />
                    {showSuggestions && filteredRooms.length > 0 && (
                      <ul className="profile__form-suggestions">
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

                  <div className="profile__form-group">
                    <label>Telefon *</label>
                    <Field
                      name="telefon"
                      type="tel"
                      placeholder="Numărul de telefon (10 cifre)"
                    />
                    <ErrorMessage name="telefon" component="div" className="profile__form-error" />
                  </div>

                  <div className="profile__form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        resetForm();
                        setInputValue(user?.camera || "");
                      }}
                      disabled={isSubmitting}
                    >
                      Resetează
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Se salvează..." : "Salvează Modificările"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
