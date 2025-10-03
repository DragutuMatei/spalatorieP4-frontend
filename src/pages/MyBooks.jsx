
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../utils/AuthContext";
import AXIOS from "../utils/Axios_config";
import { toast_error, toast_success } from "../utils/Toasts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/ro";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSocket } from "../utils/SocketContext";
import "../assets/styles/pages/MyBooks.scss";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ro");

const BUCURESTI_TZ = "Europe/Bucharest";

const extractCreatedAt = (booking) => {
  if (!booking) {
    return 0;
  }

  const rawValue =
    booking.created_at ?? booking.createdAt ?? booking.createdAT ?? null;

  if (rawValue === null || rawValue === undefined) {
    return 0;
  }

  if (typeof rawValue === "number") {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const numeric = Number(rawValue);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }

    const parsed = dayjs(rawValue);
    if (parsed.isValid()) {
      return parsed.valueOf();
    }

    return 0;
  }

  if (typeof rawValue === "object") {
    if (rawValue._seconds !== undefined) {
      const nanos = rawValue._nanoseconds ?? 0;
      return rawValue._seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
    if (rawValue.seconds !== undefined) {
      const nanos = rawValue.nanoseconds ?? 0;
      return rawValue.seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
    if (rawValue.toDate instanceof Function) {
      const dateValue = rawValue.toDate();
      return dateValue instanceof Date ? dateValue.getTime() : 0;
    }
  }

  return 0;
};

const sortProgramariByCreatedAt = (list = []) =>
  [...list].sort((a, b) => extractCreatedAt(b) - extractCreatedAt(a));

const KNOWN_DATE_FORMATS = ["DD/MM/YYYY", "DD.MM.YYYY", "YYYY-MM-DD"];

const parseProgramareDate = (value) => {
  if (value === undefined || value === null) {
    return dayjs.invalid();
  }

  if (dayjs.isDayjs(value)) {
    return value.tz ? value.tz(BUCURESTI_TZ) : value;
  }

  if (value instanceof Date || typeof value === "number") {
    const parsed = dayjs(value).tz(BUCURESTI_TZ);
    return parsed.isValid() ? parsed : dayjs.invalid();
  }

  if (typeof value === "object") {
    const seconds = value._seconds ?? value.seconds;
    if (typeof seconds === "number") {
      const nanos = value._nanoseconds ?? value.nanoseconds ?? 0;
      const parsed = dayjs
        .unix(seconds)
        .add(Math.floor(nanos / 1_000_000), "millisecond")
        .tz(BUCURESTI_TZ);
      return parsed.isValid() ? parsed : dayjs.invalid();
    }

    if (typeof value.toDate === "function") {
      const parsed = dayjs(value.toDate()).tz(BUCURESTI_TZ);
      return parsed.isValid() ? parsed : dayjs.invalid();
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return dayjs.invalid();
    }

    if (trimmed.includes("T")) {
      const iso = dayjs(trimmed);
      return iso.isValid() ? iso.tz(BUCURESTI_TZ) : dayjs.invalid();
    }

    for (const format of KNOWN_DATE_FORMATS) {
      const parsed = dayjs.tz(trimmed, format, BUCURESTI_TZ, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }

    const fallback = dayjs(trimmed).tz(BUCURESTI_TZ);
    return fallback.isValid() ? fallback : dayjs.invalid();
  }

  return dayjs.invalid();
};

const toBucharestDayjs = (value) => {
  if (!value) {
    return dayjs.invalid();
  }
  if (dayjs.isDayjs(value)) {
    return value.tz ? value.tz(BUCURESTI_TZ) : value;
  }
  if (typeof value === "string") {
    if (value.includes("T")) {
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed.tz(BUCURESTI_TZ) : dayjs.invalid();
    }
    return parseProgramareDate(value);
  }
  if (value instanceof Date || typeof value === "number") {
    return dayjs(value).tz(BUCURESTI_TZ);
  }
  return dayjs.invalid();
};

function MyBooks() {
  const socket = useSocket();
  const [programari, setProgramari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();

  const getProgramari = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await AXIOS.get(`/api/programare/${user.uid}`);
      if (data.success) {
        setProgramari(sortProgramariByCreatedAt(data.programari));
      } else {
        toast_error(data.message || "Eroare la incarcarea programarilor.");
        setProgramari([]);
      }
    } catch (error) {
      console.error("Eroare la incarcarea programarilor:", error);
      if (error.response?.status === 404) {
        setProgramari([]);
      } else {
        toast_error(error.message || "Eroare la incarcarea programarilor.");
        setProgramari([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    getProgramari();
  }, [getProgramari]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleChange = (event) => {
      setIsMobile(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (isMobile) {
      setViewMode("cards");
    }
  }, [isMobile]);

  useEffect(() => {
    if (!socket || !user) {
      return;
    }

    const handleProgramareEvent = ({ action, programare, programareId }) => {
      const targetUid =
        programare?.user?.uid || programare?.userUid || programare?.user_id;

      switch (action) {
        case "create":
          if (targetUid === user.uid && programare) {
            setProgramari((prev) => {
              const exists = prev.some((p) => p.uid === programare.uid);
              if (exists) {
                return sortProgramariByCreatedAt(
                  prev.map((p) => (p.uid === programare.uid ? programare : p))
                );
              }
              return sortProgramariByCreatedAt([...prev, programare]);
            });
          }
          break;
        case "update":
          if (targetUid === user.uid && programare) {
            setProgramari((prev) => {
              const exists = prev.some((p) => p.uid === programare.uid);
              if (!exists) {
                return sortProgramariByCreatedAt([...prev, programare]);
              }
              if (programare.active && programare.active.status === false) {
                return sortProgramariByCreatedAt(
                  prev.map((p) => (p.uid === programare.uid ? programare : p))
                );
              }
              return sortProgramariByCreatedAt(
                prev.map((p) => (p.uid === programare.uid ? programare : p))
              );
            });
          }
          break;
        case "delete":
          setProgramari((prev) =>
            sortProgramariByCreatedAt(prev.filter((p) => p.uid !== programareId))
          );
          break;
        default:
          console.warn("Unknown action type:", action);
      }
    };

    socket.on("programare", handleProgramareEvent);

    return () => {
      socket.off("programare", handleProgramareEvent);
    };
  }, [socket, user]);

  const getTimes = (date, start, end) => {
    const bookingDay = parseProgramareDate(date);
    const ziua = bookingDay.isValid()
      ? bookingDay.startOf("day")
      : dayjs.tz(date, BUCURESTI_TZ).startOf("day");
    return {
      start: ziua.add(start, "minutes"),
      end: ziua.add(end, "minutes"),
    };
  };

  const addToGoogleCalendar = (pro, start, final) => {
    const { start: start_time, end: final_time } = getTimes(
      pro.date,
      start,
      final
    );
    const event = {
      title: `Rezervare ${pro.machine}`,
      description: `Rezervare ${pro.machine} pentru ${
        pro.user.numeComplet
      } - Durata: ${final - start} minute`,
      start: start_time.tz(BUCURESTI_TZ).utc().format("YYYYMMDDTHHmmss"),
      end: final_time.tz(BUCURESTI_TZ).utc().format("YYYYMMDDTHHmmss"),
      location: "Spălătorie Cămin",
    };
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${event.start}Z/${event.end}Z&details=${encodeURIComponent(
      event.description
    )}&location=${encodeURIComponent(event.location)}&ctz=Europe/Bucharest`;
    window.open(url, "_blank");
  };

  const downloadIcsFile = (pro, start, final) => {
    const { start: startTime, end: endTime } = getTimes(pro.date, start, final);
    const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Rezervare ${pro.machine}
DESCRIPTION:Rezervare ${pro.machine} pentru ${pro.user.numeComplet} - Durata ${
      final - start
    } minute
DTSTART:${startTime.tz(BUCURESTI_TZ).utc().format("YYYYMMDDTHHmmss")}Z
DTEND:${endTime.tz(BUCURESTI_TZ).utc().format("YYYYMMDDTHHmmss")}Z
LOCATION:Spălătorie Cămin
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
    `.trim();

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `rezervare-${pro.machine}-${dayjs(pro.date).format(
      "YYYYMMDD"
    )}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  };

  const sterge = async (programareId) => {
    try {
      const { data } = await AXIOS.delete(`/api/programare/${programareId}`);
      data.success
        ? toast_success("Programare ștearsă cu succes!")
        : toast_error("Eroarea nu a fost ștearsă");
    } catch (error) {
      toast_error(error.message || "Eroare la ștergere.");
    }
  };

  if (loading) {
    return (
      <div className="mybooks">
        <div className="container">
          <div className="mybooks__loading">
            <div className="mybooks__spinner"></div>
            <p>Se încarcă programările...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mybooks">
      <div className="container">
        <div className="mybooks__header">
          <h1>Programările Mele</h1>
          <p>Vizualizează și gestionează programările tale</p>
        </div>

        {programari.length === 0 ? (
          <div className="mybooks__empty">
            <div className="mybooks__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <h3>Nu ai nicio programare</h3>
            <p>Poți face o programare nouă accesând pagina principală.</p>
            <a href="/" className="btn btn-primary">
              Fă o programare
            </a>
          </div>
        ) : (
          <>
            {!isMobile && (
              <div className="mybooks__view-toggle">
                <button
                  className={viewMode === "cards" ? "active" : ""}
                  onClick={() => setViewMode("cards")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Carduri
                </button>
                <button
                  className={viewMode === "table" ? "active" : ""}
                  onClick={() => setViewMode("table")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18" />
                    <path d="M3 12h18" />
                    <path d="M3 18h18" />
                  </svg>
                  Tabel
                </button>
              </div>
            )}

            {isMobile || viewMode === "cards" ? (
              <div className="mybooks__grid">
                {programari.map((pro) => {
                  const [h1, m1] = pro.start_interval_time
                    .split(":")
                    .map(Number);
                  const [h2, m2] = pro.final_interval_time
                    .split(":")
                    .map(Number);
                  const start_in_min = h1 * 60 + m1;
                  const final_in_min = h2 * 60 + m2;
                  const durata = final_in_min - start_in_min;
                  const isActive = pro.active && pro.active.status === true;
                  const isCancelled = pro.active && pro.active.status === false;

                  return (
                    <div key={pro.uid} className="mybooks__card">
                      <div className="mybooks__card-header">
                        <h3>
                          {pro.machine != "Uscator" && "Mașina"} {pro.machine}
                        </h3>
                        <span
                          className={`badge badge--${
                            isActive
                              ? "success"
                              : isCancelled
                              ? "error"
                              : "warning"
                          }`}
                        >
                          {isCancelled
                            ? "Anulată"
                            : isActive
                            ? "Activă"
                            : "Necunoscută"}
                        </span>
                      </div>

                      {isCancelled && pro.active?.message && (
                        <div className="mybooks__status-reason">
                          Motiv anulare: {pro.active.message}
                        </div>
                      )}

                      <div className="mybooks__card-body">
                        <div className="mybooks__info">
                          <div className="mybooks__info-item">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <rect
                                x="3"
                                y="4"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                              />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <div>
                              <span className="label">Data</span>
                              <span className="value">
                                {toBucharestDayjs(pro.date).format("DD/MM/YYYY")}
                              </span>
                            </div>
                          </div>

                          <div className="mybooks__info-item">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12,6 12,12 16,14" />
                            </svg>
                            <div>
                              <span className="label">Interval</span>
                              <span className="value">
                                {pro.start_interval_time} -{" "}
                                {pro.final_interval_time}
                              </span>
                            </div>
                          </div>

                          <div className="mybooks__info-item">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                            <div>
                              <span className="label">Durată</span>
                              <span className="value">{durata} minute</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mybooks__card-footer">
                        <div className="admin__actions">
                          {isActive && (
                            <>
                              <button
                                className="btn btn-primary"
                                onClick={() =>
                                  addToGoogleCalendar(
                                    pro,
                                    start_in_min,
                                    final_in_min
                                  )
                                }
                              >
                                Google Calendar
                              </button>
                              <button
                                className="btn btn-success"
                                onClick={() =>
                                  downloadIcsFile(
                                    pro,
                                    start_in_min,
                                    final_in_min
                                  )
                                }
                              >
                                Download .ics
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-danger"
                            onClick={() => sterge(pro.uid)}
                          >
                            Șterge
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mybooks__table">
                <div className="mybooks__table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Mașina</th>
                        <th>Ora început</th>
                        <th>Ora final</th>
                        <th>Durată</th>
                        <th>Status</th>
                        <th>Motiv anulare</th>
                        <th>Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programari.map((pro) => {
                        const [h1, m1] = pro.start_interval_time
                          .split(":")
                          .map(Number);
                        const [h2, m2] = pro.final_interval_time
                          .split(":")
                          .map(Number);
                        const start_in_min = h1 * 60 + m1;
                        const final_in_min = h2 * 60 + m2;
                        const durata = final_in_min - start_in_min;
                        const isActive =
                          pro.active && pro.active.status === true;
                        const isCancelled =
                          pro.active && pro.active.status === false;

                        return (
                          <tr
                            key={pro.uid}
                            className={
                              isCancelled
                                ? "cancelled"
                                : isActive
                                ? "active"
                                : ""
                            }
                          >
                            <td>
                              {toBucharestDayjs(pro.date).format("DD/MM/YYYY")}
                            </td>
                            <td>{pro.machine}</td>
                            <td>{pro.start_interval_time}</td>
                            <td>{pro.final_interval_time}</td>
                            <td>{durata} minute</td>
                            <td>
                              {isCancelled ? (
                                <div className="mybooks__status mybooks__status--cancelled">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                  </svg>
                                  <span>Anulată</span>
                                </div>
                              ) : isActive ? (
                                <div className="mybooks__status mybooks__status--active">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="9 12 11 14 15 10" />
                                  </svg>
                                  <span>Activă</span>
                                </div>
                              ) : (
                                <div className="mybooks__status mybooks__status--unknown">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M9,9h0" />
                                    <path d="M15,9h0" />
                                    <path d="M8,15s1.5,2,4,2,4-2,4-2" />
                                  </svg>
                                  <span>Necunoscută</span>
                                </div>
                              )}
                            </td>
                            <td>
                              {isCancelled && pro.active?.message
                                ? pro.active.message
                                : "-"}
                            </td>
                            <td>
                              <div className="admin__actions">
                                {isActive && (
                                  <>
                                    <button
                                      className="btn btn-primary"
                                      onClick={() =>
                                        addToGoogleCalendar(
                                          pro,
                                          start_in_min,
                                          final_in_min
                                        )
                                      }
                                    >
                                      Google Calendar
                                    </button>
                                    <button
                                      className="btn btn-success"
                                      onClick={() =>
                                        downloadIcsFile(
                                          pro,
                                          start_in_min,
                                          final_in_min
                                        )
                                      }
                                    >
                                      Download ics
                                    </button>
                                  </>
                                )}
                                <button
                                  className="btn btn-danger"
                                  onClick={() => sterge(pro.uid)}
                                >
                                  Șterge
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MyBooks;
//   if (loading) {
//     return (
//       <div className="mybooks">
//         <div className="container">
//           <div className="mybooks__loading">
//             <div className="mybooks__spinner"></div>
//             <p>Se încarcă programările...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="mybooks">
//       <div className="container">
//         <div className="mybooks__header">
//           <h1>Programările Mele</h1>
//           <p>Vizualizează și gestionează programările tale</p>
//         </div>

//         {programari.length === 0 ? (
//           <div className="mybooks__empty">
//             <div className="mybooks__empty-icon">
//               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                 <path d="M8 2v4" />
//                 <path d="M16 2v4" />
//                 <rect x="3" y="4" width="18" height="18" rx="2" />
//                 <path d="M3 10h18" />
//               </svg>
//             </div>
//             <h3>Nu ai nicio programare</h3>
//             <p>Poți face o programare nouă accesând pagina principală.</p>
//             <a href="/" className="btn btn-primary">
//               Fă o programare
//             </a>
//           </div>
//         ) : (
//           <>
//             {!isMobile && (
//               <div className="mybooks__view-toggle">
//                 <button
//                   className={viewMode === "cards" ? "active" : ""}
//                   onClick={() => setViewMode("cards")}
//                 >
//                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                     <rect x="3" y="3" width="7" height="7" />
//                     <rect x="14" y="3" width="7" height="7" />
//                     <rect x="14" y="14" width="7" height="7" />
//                     <rect x="3" y="14" width="7" height="7" />
//                   </svg>
//                   Carduri
//                 </button>
//                 <button
//                   className={viewMode === "table" ? "active" : ""}
//                   onClick={() => setViewMode("table")}
//                 >
//                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                     <path d="M3 6h18" />
//                     <path d="M3 12h18" />
//                     <path d="M3 18h18" />
//                   </svg>
//                   Tabel
//                 </button>
//               </div>
//             )}

//             {viewMode === "cards" ? (
//               <div className="mybooks__grid">
//                 {programari.map((pro) => {
//                   const [h1, m1] = pro.start_interval_time.split(":").map(Number);
//                   const [h2, m2] = pro.final_interval_time.split(":").map(Number);
//                   const start_in_min = h1 * 60 + m1;
//                   const final_in_min = h2 * 60 + m2;
//                   const durata = final_in_min - start_in_min;
//                   const isActive = pro.active && pro.active.status === true;
//                   const isCancelled = pro.active && pro.active.status === false;

//                   return (
//                     <div key={pro.uid} className="mybooks__card">
//                       <div className="mybooks__card-header">
//                         <h3>Mașina {pro.machine}</h3>
//                         <span
//                           className={`badge badge--${isActive
//                             ? "success"
//                             : isCancelled
//                             ? "error"
//                             : "warning"}`}
//                         >
//                           {isCancelled
//                             ? "Anulată"
//                             : isActive
//                             ? "Activă"
//                             : "Necunoscută"}
//                         </span>
//                       </div>

//                       <div className="mybooks__card-body">
//                         <div className="mybooks__info">
//                           <div className="mybooks__info-item">
//                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                               <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
//                               <line x1="16" y1="2" x2="16" y2="6" />
//                               <line x1="8" y1="2" x2="8" y2="6" />
//                               <line x1="3" y1="10" x2="21" y2="10" />
//                             </svg>
//                             <div>
//                               <span className="label">Data</span>
//                               <span className="value">{dayjs(pro.date).format("DD/MM/YYYY")}</span>
//                             </div>
//                           </div>

//                           <div className="mybooks__info-item">
//                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                               <circle cx="12" cy="12" r="10" />
//                               <polyline points="12,6 12,12 16,14" />
//                             </svg>
//                             <div>
//                               <span className="label">Interval</span>
//                               <span className="value">
//                                 {pro.start_interval_time} - {pro.final_interval_time}
//                               </span>
//                             </div>
//                           </div>

//                           <div className="mybooks__info-item">
//                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                               <circle cx="12" cy="12" r="10" />
//                               <path d="M12 6v6l4 2" />
//                             </svg>
//                             <div>
//                               <span className="label">Durată</span>
//                               <span className="value">{durata} minute</span>
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       <div className="mybooks__card-footer">
//                         <div className="admin__actions">
//                           {isActive && (
//                             <>
//                               <button
//                                 className="btn btn-primary"
//                                 onClick={() => addToGoogleCalendar(pro, start_in_min, final_in_min)}
//                               >
//                                 Google Calendar
//                               </button>
//                               <button
//                                 className="btn btn-success"
//                                 onClick={() => downloadIcsFile(pro, start_in_min, final_in_min)}
//                               >
//                                 Download
//                               </button>
//                             </>
//                           )}
//                           <button
//                             className="btn btn-danger"
//                             onClick={() => sterge(pro.uid)}
//                           >
//                             Șterge
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             ) : (
//               <div className="mybooks__table d-none d-md-block">
//                 <table>
//               <thead>
//                 <tr>
//                   <th>Data</th>
//                   <th>Mașina</th>
//                   <th>Ora început</th>
// {{ ... }}
//                               <circle cx="12" cy="12" r="10" />
//                               <line x1="15" y1="9" x2="9" y2="15" />
//                               <line x1="9" y1="9" x2="15" y2="15" />
//                             </svg>
//                             <span>Anulată</span>
//                         {pro.active.message && (
//                           <div className="mybooks__status-reason d-block d-md-none">
//                             Motiv: {pro.active.message}
//                           </div>
//                             </svg>
//                             <span>Activă</span>
//                           </div>
//                         ) : (
//                           <div className="mybooks__status mybooks__status--unknown">
//                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                               <circle cx="12" cy="12" r="10" />
//                               <path d="M9,9h0" />
//                               <path d="M15,9h0" />
//                               <path d="M8,15s1.5,2,4,2,4-2,4-2" />
//                             <span>Necunoscută</span>
//                           </div>
//                         )}
//                       </td>
//                       <td>
//                         <div className="admin__actions">
//                           {isActive && (
//                             <>
//                               <button
//                                 className="btn btn-primary"
//                                 onClick={() => addToGoogleCalendar(pro, start_in_min, final_in_min)}
//                               >
//                                 Google Calendar
//                               </button>
//                               <button
//                                 className="btn btn-success"
//                                 onClick={() => downloadIcsFile(pro, start_in_min, final_in_min)}
//                               >
//                                 Download
//                               </button>
//                             </>
//                           )}
//                           <button
//                             className="btn btn-danger"
//                             onClick={() => sterge(pro.uid)}
//                           >
//                             Șterge
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default MyBooks;
