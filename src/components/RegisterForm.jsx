import React, { useState, useMemo } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

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
console.log(rooms)

const RegisterForm = ({
  action,
  initialValues = { numeComplet: "", camera: "", telefon: "", agreeToTerms: false },
}) => {
  const [inputValue, setInputValue] = useState(initialValues.camera || "");
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
    agreeToTerms: Yup.boolean()
      .oneOf([true], "Trebuie să fii de acord cu folosirea datelor personale")
      .required("Acordul este obligatoriu"),
  });

  return (
    <Formik
      initialValues={{ ...initialValues }}
      validationSchema={validationSchema}
      onSubmit={async (values) => {
        await action(values);
      }}
    >
      {({ handleSubmit, setFieldValue }) => (
        <Form onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label htmlFor="numeComplet">Nume complet</label>
            <Field name="numeComplet" type="text" />
            <ErrorMessage
              name="numeComplet"
              component="div"
              className="error"
            />
          </div>

          <div style={{ position: "relative" }}>
            <label htmlFor="camera">Camera</label>
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
              autoComplete="off"
            />
            <ErrorMessage name="camera" component="div" className="error" />
            {showSuggestions && filteredRooms.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: "150px",
                  overflowY: "auto",
                  background: "white",
                  border: "1px solid #ccc",
                  zIndex: 10,
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {filteredRooms.map((room) => (
                  <li
                    key={room}
                    style={{ padding: "5px 10px", cursor: "pointer" }}
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

          <div>
            <label htmlFor="telefon">Telefon</label>
            <Field name="telefon" type="text" />
            <ErrorMessage name="telefon" component="div" className="error" />
          </div>

          <div className="checkbox-container">
            <label className="checkbox-label">
              <Field name="agreeToTerms" type="checkbox" />
              <span className="checkbox-text">
                Sunt de acord să mi se folosească adresa de email și numărul de telefon pentru notificări legate de rezervări
              </span>
            </label>
            <ErrorMessage name="agreeToTerms" component="div" className="error" />
          </div>

          <button type="submit">Trimite</button>
        </Form>
      )}
    </Formik>
  );
};

export default RegisterForm;
