import React, { useEffect, useState } from "react";
import { useAuth } from "../utils/AuthContext";
import AXIOS from "../utils/Axios_config";
import { toast_error, toast_success } from "../utils/Toasts";
import { useSocket } from "../utils/SocketContext";
import DatePicker from "react-multi-date-picker";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import "../assets/styles/pages/Admin.scss";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

// Helper function to calculate duration between two time strings
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "N/A";

  try {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    const duration = endTotalMinutes - startTotalMinutes;
    return duration > 0 ? duration : "N/A";
  } catch (error) {
    console.warn("Error calculating duration:", error);
    return "N/A";
  }
};

// Helper function to format dates safely
const formatDate = (dateValue, fallback = "N/A") => {
  if (!dateValue) return fallback;

  try {
    // Check if it's an ISO string
    if (typeof dateValue === "string" && dateValue.includes("T")) {
      return dayjs(dateValue).format("DD/MM/YYYY");
    }

    // Check if it's already in DD/MM/YYYY format
    if (typeof dateValue === "string" && dateValue.includes("/")) {
      return dateValue;
    }

    // Try to parse as date
    const parsed = dayjs(dateValue);
    if (parsed.isValid()) {
      return parsed.format("DD/MM/YYYY");
    }

    return fallback;
  } catch (error) {
    console.warn("Error formatting date:", error);
    return fallback;
  }
};

// Helper function to safely render Firebase timestamps and other values
const safeRender = (value, fallback = "N/A") => {
  if (value === null || value === undefined) return fallback;

  // Check if it's a Firebase timestamp (Firestore format)
  if (value && typeof value === "object" && value._seconds !== undefined) {
    return dayjs.unix(value._seconds).format("DD/MM/YYYY HH:mm");
  }

  // Check if it's a Firebase timestamp (alternative format)
  if (value && typeof value === "object" && value.seconds !== undefined) {
    return dayjs.unix(value.seconds).format("DD/MM/YYYY HH:mm");
  }

  // Check if it's a Date object
  if (value instanceof Date) {
    return dayjs(value).format("DD/MM/YYYY HH:mm");
  }

  // Check if it's already a string or number
  if (typeof value === "string" || typeof value === "number") return value;

  // Check if it's a boolean
  if (typeof value === "boolean") return value.toString();

  // For other objects, try to stringify or return fallback
  if (typeof value === "object") {
    console.warn("Attempting to render object:", value);
    return fallback;
  }

  return fallback;
};

function Admin() {
  const { user, loading } = useAuth();
  const socket = useSocket();
  const [settings, setSettings] = useState({
    uid: "",
    dryerEnabled: true,
    m1Enabled: true,
    m2Enabled: true,
    blockPastSlots: false,
  });
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [maintenanceIntervals, setMaintenanceIntervals] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [reasons, setReasons] = useState({});
  const [showActiveBookings, setShowActiveBookings] = useState(false);
  const [maintenanceDate, setMaintenanceDate] = useState(dayjs().toDate());
  const [maintenanceMachine, setMaintenanceMachine] = useState("");
  const [maintenanceSlots, setMaintenanceSlots] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    settings: true,
    bookings: false,
    maintenance: false,
  });

  // Generate time slots for maintenance
  const generateTimeSlots = () => {
    const slots = [];
    let time = dayjs().startOf("day").hour(8);
    while (time.hour() <= 22) {
      slots.push(time.format("HH:mm"));
      time = time.add(30, "minute");
    }
    slots.pop();
    return slots;
  };

  const getSettings = async () => {
    try {
      const rasp = await AXIOS.get("/api/settings");
      if (rasp.data.success) {
        setSettings((prev) => ({
          ...prev,
          ...rasp.data.settings,
          blockPastSlots: Boolean(rasp.data.settings.blockPastSlots),
        }));
      }
    } catch (error) {
      console.log(error);
      toast_error("Nu s-au putut încărca setările!");
    }
  };

  const getUsers = async () => {
    try {
      const rasp = await AXIOS.get("/api/users");
      if (rasp.data.success) {
        setUsers(rasp.data.users);
      }
    } catch (error) {
      console.log(error);
      toast_error("Nu s-au putut încărca utilizatorii!");
    }
  };

  const getBookings = async () => {
    try {
      const rasp = await AXIOS.get("/api/programare");
      console.log("Bookings response:", rasp.data);
      if (rasp.data.success) {
        setBookings(rasp.data.programari || []);
      }
    } catch (error) {
      console.log("Bookings error:", error);
      toast_error("Nu s-au putut încărca programările!");
    }
  };

  const getMaintenanceIntervals = async () => {
    try {
      const rasp = await AXIOS.get("/api/maintenance");
      console.log("Maintenance intervals response:", rasp.data);
      if (rasp.data.success) {
        setMaintenanceIntervals(rasp.data.maintenanceIntervals || []);
      }
    } catch (error) {
      console.log("Maintenance intervals error:", error);
      toast_error("Nu s-au putut încărca intervalele de mentenanță!");
    }
  };

  const saveSettings = async (key, value) => {
    console.log("Saving setting:", key, value);
    try {
      const rasp = await AXIOS.post("/api/settings", { key, value });
      console.log("Settings response:", rasp.data);
      if (rasp.data.success) {
        // Nu actualizez local - las socket-ul să facă update-ul pentru live data
        toast_success(
          key === "blockPastSlots"
            ? `Rezervările în trecut au fost ${
                value ? "blocate" : "deblocate"
              }!`
            : `Programările pentru ${
                key === "m1Enabled" ? "M1" : key === "m2Enabled" ? "M2" : "Uscător"
              } au fost ${value ? "activate" : "dezactivate"}!`
        );
      }
    } catch (error) {
      console.log("Settings error:", error);
      toast_error("Eroare la salvarea setărilor!");
    }
  };

  const toggleApproval = async (userId, currentApproval) => {
    try {
      const rasp = await AXIOS.post("/api/users/toggle-approval", {
        userId,
        validate: currentApproval,
      });
      if (rasp.data.success) {
        setUsers(users.map((u) => (u.uid === userId ? rasp.data.user : u)));
        toast_success(`Cont ${!currentApproval ? "aprobat" : "dezaprobat"}!`);
      }
    } catch (error) {
      console.log(error);
      toast_error("Eroare la actualizarea aprobării!");
    }
  };

  const toggleAdmin = async (userId, currentRole) => {
    try {
      const newRole = currentRole === "admin" ? "user" : "admin";
      const rasp = await AXIOS.post("/api/users/toggle-role", {
        userId,
        role: newRole,
      });
      if (rasp.data.success) {
        setUsers(users.map((u) => (u.uid === userId ? rasp.data.user : u)));
        toast_success("Rol actualizat!");
      }
    } catch (error) {
      console.log(error);
      toast_error("Eroare la actualizarea rolului!");
    }
  };

  const deleteBooking = async (bookingId) => {
    const currentReason = reasons[bookingId];
    if (!currentReason || currentReason.trim() === "") {
      toast_error("Te rugăm să introduci un motiv pentru ștergere!");
      return;
    }

    try {
      const rasp = await AXIOS.post("/api/programare/cancel-with-reason", {
        bookingId,
        reason: currentReason.trim(),
      });
      if (rasp.data.success) {
        // Remove booking from admin view (it becomes inactive)
        setBookings(bookings.filter((b) => b.uid !== bookingId));
        setReasons({ ...reasons, [bookingId]: "" });
        toast_success("Rezervare anulată și notificare trimisă!");
      }
    } catch (error) {
      console.log(error);
      toast_error("Eroare la anularea rezervării!");
    }
  };

  const handleMaintenanceSubmit = async () => {
    if (!maintenanceMachine || maintenanceSlots.length === 0) {
      toast_error("Selectează mașina și cel puțin un slot pentru mentenanță!");
      return;
    }

    try {
      const dateToSend = dayjs(maintenanceDate).format("DD/MM/YYYY");
      console.log("Sending maintenance data:", {
        machine: maintenanceMachine,
        date: dateToSend,
        startTime: maintenanceSlots[0],
        endTime: maintenanceSlots[maintenanceSlots.length - 1],
        slots: maintenanceSlots,
      });

      const rasp = await AXIOS.post("/api/maintenance", {
        machine: maintenanceMachine,
        date: dateToSend,
        startTime: maintenanceSlots[0],
        endTime: maintenanceSlots[maintenanceSlots.length - 1],
        slots: maintenanceSlots,
      });

      console.log("Maintenance response:", rasp.data);

      if (rasp.data.success) {
        toast_success("Interval de mentenanță adăugat și rezervările anulate!");
        setMaintenanceMachine("");
        setMaintenanceSlots([]);
        getMaintenanceIntervals();
        getBookings();
      }
    } catch (error) {
      console.log("Maintenance error:", error);
      toast_error("Eroare la adăugarea mentenanței!");
    }
  };

  const deleteMaintenance = async (maintenanceId) => {
    try {
      const rasp = await AXIOS.delete(`/api/maintenance/${maintenanceId}`);
      if (rasp.data.success) {
        setMaintenanceIntervals(
          maintenanceIntervals.filter((m) => m.uid !== maintenanceId)
        );
        toast_success("Interval de mentenanță șters!");
      }
    } catch (error) {
      console.log(error);
      toast_error("Eroare la ștergerea mentenanței!");
    }
  };

  const toggleMaintenanceSlot = (slot) => {
    if (maintenanceSlots.includes(slot)) {
      setMaintenanceSlots(maintenanceSlots.filter((s) => s !== slot));
    } else {
      const dateStr = dayjs(maintenanceDate).format("YYYY-MM-DD");
      const newSlots = [...maintenanceSlots, slot].sort(
        (a, b) =>
          dayjs(`${dateStr} ${a}`).toDate().getTime() -
          dayjs(`${dateStr} ${b}`).toDate().getTime()
      );

      // Check if slots are consecutive
      for (let i = 1; i < newSlots.length; i++) {
        if (
          dayjs(`${dateStr} ${newSlots[i]}`).diff(
            dayjs(`${dateStr} ${newSlots[i - 1]}`),
            "minute"
          ) !== 30
        ) {
          toast_error("Sloturile trebuie să fie consecutive!");
          return;
        }
      }
      setMaintenanceSlots(newSlots);
    }
  };

  useEffect(() => {
    if (!loading && user && user.role === "admin") {
      getSettings();
      getUsers();
      getBookings();
      getMaintenanceIntervals();
    }
  }, [loading, user]);

  useEffect(() => {
    if (socket) {
      console.log("Socket connected:", socket.connected);

      const handleSettingsUpdate = (data) => {
        console.log("Admin received settings update:", data);
        if (
          data.action === "update" &&
          data.settings &&
          data.settings.settings
        ) {
          console.log("Updating admin settings with:", data.settings.settings);
          // Actualizez toate setările pentru live update
          setSettings((prev) => ({
            ...prev,
            ...data.settings.settings,
            blockPastSlots: Boolean(
              data.settings.settings.blockPastSlots
            ),
          }));
        }
      };

      const handleUserUpdate = (data) => {
        if (
          data.action === "approval_changed" ||
          data.action === "role_changed"
        ) {
          setUsers((prev) =>
            prev.map((u) => (u.uid === data.userId ? data.user : u))
          );
        } else if (data.action === "delete") {
          setUsers((prev) => prev.filter((u) => u.uid !== data.userId));
        }
      };

      socket.on("settings", handleSettingsUpdate);
      socket.on("userUpdate", handleUserUpdate);

      const handleProgramareUpdate = (data) => {
        if (data.action === "create") {
          setBookings((prev) => [data.programare, ...prev]);
        } else if (data.action === "update") {
          setBookings((prev) =>
            prev.map((b) =>
              b.uid === data.programare.uid ? data.programare : b
            )
          );
        } else if (data.action === "delete") {
          setBookings((prev) =>
            prev.filter((b) => b.uid !== data.programareId)
          );
        }
      };

      const handleMaintenanceUpdate = (data) => {
        if (data.action === "create") {
          setMaintenanceIntervals((prev) => [
            data.maintenanceInterval,
            ...prev,
          ]);
        } else if (data.action === "delete") {
          setMaintenanceIntervals((prev) =>
            prev.filter((m) => m.uid !== data.maintenanceId)
          );
        }
      };

      socket.on("programare", handleProgramareUpdate);
      socket.on("maintenance", handleMaintenanceUpdate);

      return () => {
        socket.off("settings", handleSettingsUpdate);
        socket.off("userUpdate", handleUserUpdate);
        socket.off("programare", handleProgramareUpdate);
        socket.off("maintenance", handleMaintenanceUpdate);
      };
    }
  }, [socket]);

  if (loading) {
    return (
      <div className="admin">
        <div className="container">
          <div className="admin__loading">
            <div className="admin__loading-spinner"></div>
            <p>Se încarcă panoul admin...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="admin">
        <div className="container">
          <div className="admin__header">
            <h1>Acces Interzis</h1>
            <p>Nu ai permisiuni de administrator</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter bookings for active ones
  const currentDate = dayjs().startOf("day");
  const displayedBookings = showActiveBookings
    ? bookings.filter((booking) => {
        if (!booking.date) return false;
        try {
          // Handle both ISO format and DD/MM/YYYY format
          let bookingDate;
          if (typeof booking.date === "string" && booking.date.includes("T")) {
            // ISO format
            bookingDate = dayjs(booking.date);
          } else {
            // DD/MM/YYYY format
            bookingDate = dayjs(booking.date, "DD/MM/YYYY");
          }
          return (
            bookingDate.isValid() && bookingDate.isSameOrAfter(currentDate)
          );
        } catch (error) {
          console.warn("Invalid booking date:", booking.date);
          return false;
        }
      })
    : bookings;

  const filteredUsers = users.filter((user) => {
    const searchLower = userSearchTerm.toLowerCase();
    const nume =
      typeof user.numeComplet === "string"
        ? user.numeComplet.toLowerCase()
        : "";
    const email =
      typeof (user.google?.email || user.email) === "string"
        ? (user.google?.email || user.email).toLowerCase()
        : "";
    const camera =
      typeof user.camera === "string" ? user.camera.toLowerCase() : "";

    return (
      nume.includes(searchLower) ||
      email.includes(searchLower) ||
      camera.includes(searchLower)
    );
  });

  return (
    <div className="admin">
      <div className="container">
        <div className="admin__header">
          <h1>
            <svg
              className="admin-icon"
              width={30}
              height={30}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Panou Admin
          </h1>
          <p>Gestionează utilizatorii, programările și setările sistemului</p>
        </div>

        {/* Setări disponibilitate */}
        <div className="admin__section admin__section--full-width">
          <div
            className="admin__section-header"
            onClick={() =>
              setExpandedSections((prev) => ({
                ...prev,
                settings: !prev.settings,
              }))
            }
          >
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Setări Disponibilitate
            </h2>
            <svg
              className={`toggle-icon ${
                expandedSections.settings ? "toggle-icon--expanded" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${
              !expandedSections.settings
                ? "admin__section-content--collapsed"
                : ""
            }`}
          >
            <div className="admin__settings">
              <div className="admin__settings-item">
                <div className="label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Mașina M1
                  <span className="status">
                    {settings.m1Enabled ? "Activat" : "Dezactivat"}
                  </span>
                </div>
                <div
                  className={`toggle ${
                    settings.m1Enabled ? "toggle--active" : ""
                  }`}
                  onClick={() => saveSettings("m1Enabled", !settings.m1Enabled)}
                />
              </div>

              <div className="admin__settings-item">
                <div className="label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Mașina M2
                  <span className="status">
                    {settings.m2Enabled ? "Activat" : "Dezactivat"}
                  </span>
                </div>
                <div
                  className={`toggle ${
                    settings.m2Enabled ? "toggle--active" : ""
                  }`}
                  onClick={() => saveSettings("m2Enabled", !settings.m2Enabled)}
                />
              </div>

              <div className="admin__settings-item">
                <div className="label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6" />
                  </svg>
                  Uscător
                  <span className="status">
                    {settings.dryerEnabled ? "Activat" : "Dezactivat"}
                  </span>
                </div>
                <div
                  className={`toggle ${
                    settings.dryerEnabled ? "toggle--active" : ""
                  }`}
                  onClick={() =>
                    saveSettings("dryerEnabled", !settings.dryerEnabled)
                  }
                />
              </div>

              <div className="admin__settings-item">
                <div className="label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Blocare ore trecute
                  <span className="status">
                    {settings.blockPastSlots ? "Activată" : "Dezactivată"}
                  </span>
                </div>
                <div
                  className={`toggle ${
                    settings.blockPastSlots ? "toggle--active" : ""
                  }`}
                  onClick={() =>
                    saveSettings("blockPastSlots", !settings.blockPastSlots)
                  }
                />
              </div>
            </div>
          </div>
        </div>
        <br />
        <br />

        {/* Mentenanță */}
        <div className="admin__section admin__section--full-width">
          <div
            className="admin__section-header"
            onClick={() =>
              setExpandedSections((prev) => ({
                ...prev,
                maintenance: !prev.maintenance,
              }))
            }
          >
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              Mentenanță
            </h2>
            <svg
              className={`toggle-icon ${
                expandedSections.maintenance ? "toggle-icon--expanded" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${
              !expandedSections.maintenance
                ? "admin__section-content--collapsed"
                : ""
            }`}
          >
            <div className="admin__maintenance-form">
              <h3>Adaugă interval mentenanță</h3>
              <div className="admin__maintenance-form-row">
                <div className="form-group">
                  <label>Data</label>
                  <DatePicker
                    value={maintenanceDate}
                    onChange={setMaintenanceDate}
                    format="DD/MM/YYYY"
                    minDate={new Date()}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      width: "100%",
                    }}
                    inputClass="date-picker-input"
                  />
                </div>
                <div className="form-group">
                  <label>Mașina</label>
                  <select
                    value={maintenanceMachine}
                    onChange={(e) => setMaintenanceMachine(e.target.value)}
                  >
                    <option value="">Selectează mașina</option>
                    <option value="M1">Mașina M1</option>
                    <option value="M2">Mașina M2</option>
                    <option value="Uscator">Uscător</option>
                  </select>
                </div>
              </div>

              <div className="time-slots-grid">
                {generateTimeSlots().map((slot) => (
                  <div
                    key={slot}
                    className={`time-slot ${
                      maintenanceSlots.includes(slot)
                        ? "time-slot--selected"
                        : ""
                    }`}
                    onClick={() => toggleMaintenanceSlot(slot)}
                  >
                    {slot}
                  </div>
                ))}
              </div>
            </div>
            <div className="idk">
              <button
                className="btn btn-primary"
                onClick={handleMaintenanceSubmit}
                disabled={!maintenanceMachine || maintenanceSlots.length === 0}
              >
                Adaugă Mentenanță
              </button>
            </div>
            <br />
            <br />
            <div className="admin__table">
              <h3>Intervale de mentenanță</h3>
              {maintenanceIntervals.length > 0 ? (
                <div className="admin__table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Mașina</th>
                        <th>Interval</th>
                        <th>Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenanceIntervals.map((interval) => (
                        <tr key={interval.uid}>
                          <td>{safeRender(interval.date)}</td>
                          <td>{safeRender(interval.machine)}</td>
                          <td>
                            {safeRender(interval.startTime)} -{" "}
                            {safeRender(interval.endTime)}
                          </td>
                          <td>
                            <button
                              className="btn btn-danger"
                              onClick={() => deleteMaintenance(interval.uid)}
                            >
                              Șterge
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin__table--empty">
                  Nu există intervale de mentenanță programate
                </div>
              )}
            </div>
          </div>
        </div>
        <br />
        <br />

        {/* Utilizatori */}
        <div className="admin__section admin__section--full-width">
          <div
            className="admin__section-header"
            onClick={() =>
              setExpandedSections((prev) => ({ ...prev, users: !prev.users }))
            }
          >
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Utilizatori ({users.length})
            </h2>
            <svg
              className={`toggle-icon ${
                expandedSections.users ? "toggle-icon--expanded" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${
              !expandedSections.users ? "admin__section-content--collapsed" : ""
            }`}
          >
            <div className="admin__search">
              <svg
                className="search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Caută utilizatori..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>

            <div className="admin__table">
              {filteredUsers.length > 0 ? (
                <div className="admin__table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Nume</th>
                        <th>Email</th>
                        <th>Cameră</th>
                        <th>Telefon</th>
                        <th>Aprobat</th>
                        <th>Rol</th>
                        <th>Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.uid}
                          className={user.validate ? "approved" : "pending"}
                        >
                          <td>{safeRender(user.numeComplet)}</td>
                          <td>
                            {safeRender(user.google?.email || user.email)}
                          </td>
                          <td>{safeRender(user.camera)}</td>
                          <td>{safeRender(user.telefon)}</td>
                          <td>{user.validate ? "Da" : "Nu"}</td>
                          <td>{safeRender(user.role, "user")}</td>
                          <td>
                            <div className="admin__actions">
                              <button
                                className={`btn ${
                                  user.validate ? "btn-danger" : "btn-success"
                                }`}
                                onClick={() =>
                                  toggleApproval(user.uid, user.validate)
                                }
                              >
                                {user.validate ? "Dezactivează" : "Activează"}
                              </button>
                              <button
                                className="btn btn-primary"
                                onClick={() => toggleAdmin(user.uid, user.role)}
                              >
                                {user.role === "admin"
                                  ? "Remove Admin"
                                  : "Make Admin"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin__table--empty">
                  Nu s-au găsit utilizatori
                </div>
              )}
            </div>
          </div>
        </div>
        <br />
        <br />

        {/* Programări */}
        <div className="admin__section admin__section--full-width">
          <div
            className="admin__section-header"
            onClick={() =>
              setExpandedSections((prev) => ({
                ...prev,
                bookings: !prev.bookings,
              }))
            }
          >
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Programări ({bookings.length})
            </h2>
            <svg
              className={`toggle-icon ${
                expandedSections.bookings ? "toggle-icon--expanded" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${
              !expandedSections.bookings
                ? "admin__section-content--collapsed"
                : ""
            }`}
          >
            <div className="admin__filters">
              <input
                type="text"
                placeholder="Caută după nume..."
                value={bookingSearchTerm}
                onChange={(e) => setBookingSearchTerm(e.target.value)}
              />
              <div className="filter-switch">
                <label>
                  <input
                    type="checkbox"
                    checked={showActiveBookings}
                    onChange={() => setShowActiveBookings(!showActiveBookings)}
                  />
                  Arată doar rezervările active
                </label>
              </div>
            </div>

            <div className="admin__table">
              {displayedBookings.length > 0 ? (
                <div className="admin__table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Mașină</th>
                        <th>Oră Început</th>
                        <th>Oră Sfârșit</th>
                        <th>Durata</th>
                        <th>Nume</th>
                        <th>Cameră</th>
                        <th>Motiv anulare</th>
                        <th>Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedBookings
                        .filter((booking) => {
                          if (!bookingSearchTerm) return true;
                          const nume =
                            typeof booking.user?.numeComplet === "string"
                              ? booking.user.numeComplet.toLowerCase()
                              : "";
                          return nume.includes(bookingSearchTerm.toLowerCase());
                        })
                        .map((booking) => (
                          <tr key={booking.uid}>
                            <td>{formatDate(booking.date)}</td>
                            <td>{safeRender(booking.machine)}</td>
                            <td>{safeRender(booking.start_interval_time)}</td>
                            <td>{safeRender(booking.final_interval_time)}</td>
                            <td>
                              {booking.duration
                                ? `${safeRender(booking.duration)} min`
                                : `${calculateDuration(
                                    booking.start_interval_time,
                                    booking.final_interval_time
                                  )} min`}
                            </td>
                            <td>{safeRender(booking.user?.numeComplet)}</td>
                            <td>{safeRender(booking.user?.camera)}</td>
                            <td>
                              <input
                                type="text"
                                value={reasons[booking.uid] || ""}
                                onChange={(e) =>
                                  setReasons({
                                    ...reasons,
                                    [booking.uid]: e.target.value,
                                  })
                                }
                                placeholder="Motiv anulare..."
                              />
                            </td>
                            <td>
                              <button
                                className="btn btn-warning"
                                onClick={() => deleteBooking(booking.uid)}
                              >
                                Anulează
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin__table--empty">
                  Nu s-au găsit programări
                </div>
              )}
            </div>
          </div>
        </div>
        <br />
        <br />
        <br />
        <br />
      </div>
    </div>
  );
}

export default Admin;
