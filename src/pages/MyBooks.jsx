// import React, { useEffect, useState } from "react";
// import { useAuth } from "../utils/AuthContext";
// import AXIOS from "../utils/Axios_config";
// import { toast_error, toast_success } from "../utils/Toasts";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// import "dayjs/locale/ro";
// import customParseFormat from "dayjs/plugin/customParseFormat";
// import { useSocket } from "../utils/SocketContext";
// import "../assets/styles/pages/MyBooks.scss";

// dayjs.extend(customParseFormat);
// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.locale("ro");

// function MyBooks() {
//   const socket = useSocket();
//   const [programari, setProgramari] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const { user } = useAuth();

//   const getProgramari = async () => {
//     if (!loading && user) {
//       try {
//         const rasp = await AXIOS.get(`/api/programare/${user.uid}`);
//         if (rasp.data.success) {
//           setProgramari(rasp.data.programari);
//         } else {
//           toast_error(
//             rasp.data.message || "Eroare la incarcarea programarilor."
//           ); // Mesaj implicit
//           setProgramari([]); // Asigură-te că starea este resetată
//         }
//       } catch (error) {
//         console.error("Eroare la incarcarea programarilor:", error);
//         toast_error(error.message || "Eroare la incarcarea programarilor."); // Mesaj implicit
//         setProgramari([]); // Asigură-te că starea este resetată
//       }
//     }
//   };

//   useEffect(() => {
//     getProgramari();

//     socket.on("programare", (data) => {
//       console.log("Received programare event:", data);
//       // Handle the programare event based on the action type
//       switch (data.action) {
//         case "create":
//           // Update the programari state with the new programare
//           if (data.programare.userUid === user.uid) {
//             getProgramari();
//           }
//           break;
//         case "update":
//           // Update the programari state with the updated programare
//           if (data.programare.userUid === user.uid) {
//             getProgramari();
//           }
//           break;
//         case "delete":
//           // Remove the programare from the programari state
//           setProgramari((prevProgramari) =>
//             prevProgramari.filter(
//               (programare) => programare.uid !== data.programareId
//             )
//           );
//           break;
//         default:
//           console.warn("Unknown action type:", data.action);
//       }
//     });

//     return () => {
//       socket.off("programare");
//     };
//   }, [user, loading, socket]);

//   const addToGoogleCalendar = (pro, start, final) => {
//     const ziua = dayjs(Date(pro.date)).startOf("day");
//     const start_time = ziua.add(start, "minutes").subtract(3, "hours");
//     const final_time = ziua.add(final, "minutes").subtract(3, "hours");

//     const event = {
//       title: `Rezervare ${pro.machine}`,
//       description: `Rezervare ${pro.machine} pentru ${
//         pro.user.numeComplet
//       } - Durata: ${final - start} minute`,
//       start: start_time.format("YYYYMMDDTHHmmss"),
//       end: final_time.format("YYYYMMDDTHHmmss"),
//       location: "Spălătorie Cămin",
//     };
//     const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
//       event.title
//     )}&dates=${event.start}Z/${event.end}Z&details=${encodeURIComponent(
//       event.description
//     )}&location=${encodeURIComponent(event.location)}&ctz=Europe/Bucharest`;
//     window.open(url, "_blank");
//   };

//   const downloadIcsFile = (pro, start, final) => {
//     const ziua = dayjs(pro.date).startOf("day");
//     const startTime = ziua.add(start, "minutes").subtract(3, "hours");
//     const endTime = ziua.add(final, "minutes").subtract(3, "hours");

//     const icsContent = `
// BEGIN:VCALENDAR
// VERSION:2.0
// BEGIN:VEVENT
// SUMMARY:Rezervare ${pro.machine}
// DESCRIPTION:Rezervare ${pro.machine} pentru ${pro.user.numeComplet} - Durata ${
//       final - start
//     } minute
// DTSTART:${startTime.format("YYYYMMDDTHHmmss")}Z
// DTEND:${endTime.format("YYYYMMDDTHHmmss")}Z
// LOCATION:Spălătorie Cămin
// STATUS:CONFIRMED
// END:VEVENT
// END:VCALENDAR
//   `.trim();

//     const blob = new Blob([icsContent], { type: "text/calendar" });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `rezervare-${pro.machine}-${dayjs(pro.date).format(
//       "YYYYMMDD"
//     )}.ics`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
//   };

//   const sterge = async (programareId) => {
//     try {
//       const rasp = await AXIOS.delete(`/api/programare/${programareId}`);
//       if (rasp.data.success) {
//         toast_success("Programare stearsa cu succes!");
//       } else {
//         toast_error("Eroarea nu a fost stearsa");
//       }
//     } catch (error) {
//       toast_error(error);
//     }
//   };

//   return (
//     <div>
//       <table>
//         <thead>
//           <tr>
//             <th>Data</th>
//             <th>Masina</th>
//             <th>ora inceput</th>
//             <th>ora final</th>
//             <th>durata</th>
//             <th>actiuni</th>
//           </tr>
//         </thead>
//         <tbody>
//           {programari &&
//             programari.map((pro) => {
//               const ziua = dayjs(pro.date);

//               const ora_start = pro.start_interval_time.split(":");
//               const start_in_min = parseInt(ora_start[0]) * 60 + parseInt(ora_start[1]);
//               const ora_final = pro.final_interval_time.split(":");
//               const final_in_min = parseInt(ora_final[0]) * 60 + parseInt(ora_final[1]);
//               const durata = final_in_min - start_in_min;

//               return (
//                 <tr key={pro._id}>
//                   <td>{ziua.format("DD/MM/YYYY")}</td>
//                   <td>{pro.machine}</td>
//                   <td>{pro.start_interval_time}</td>
//                   <td>{pro.final_interval_time}</td>
//                   <td>{durata}</td>
//                   <td>
//                     <button
//                       onClick={() =>
//                         addToGoogleCalendar(pro, start_in_min, final_in_min)
//                       }
//                     >
//                       google calendar
//                     </button>
//                   </td>
//                   <td>
//                     <button
//                       onClick={() =>
//                         downloadIcsFile(pro, start_in_min, final_in_min)
//                       }
//                     >
//                       download
//                     </button>
//                   </td>
//                   <td>
//                     <button onClick={() => sterge(pro.uid)}>sterge</button>
//                   </td>
//                 </tr>
//               );
//             })}
//         </tbody>
//       </table>
//     </div>
//   );
// }

  // export default MyBooks;
  
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
        setProgramari(data.programari);
      } else {
        toast_error(data.message || "Eroare la incarcarea programarilor.");
        setProgramari([]);
      }
    } catch (error) {
      console.error("Eroare la incarcarea programarilor:", error);
      toast_error(error.message || "Eroare la incarcarea programarilor.");
      setProgramari([]);
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
    socket.on("programare", ({ action, programare, programareId }) => {
      if (!user) return;
      
      switch (action) {
        case "create":
          if (programare.user?.uid === user.uid) {
            setProgramari((prev) => [...prev, programare]);
          }
          break;
        case "update":
          if (programare.user?.uid === user.uid) {
            setProgramari((prev) =>
              prev.map((p) => (p.uid === programare.uid ? programare : p))
            );
          }
          break;
        case "delete":
          setProgramari((prev) => prev.filter((p) => p.uid !== programareId));
          break;
        default:
          console.warn("Unknown action type:", action);
      }
    });

    return () => {
      socket.off("programare");
    };
  }, [socket, user]);

  const getTimes = (date, start, end) => {
    const ziua = dayjs(date).startOf("day");
    return {
      start: ziua.add(start, "minutes").subtract(3, "hours"),
      end: ziua.add(end, "minutes").subtract(3, "hours"),
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
      start: start_time.format("YYYYMMDDTHHmmss"),
      end: final_time.format("YYYYMMDDTHHmmss"),
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
DTSTART:${startTime.format("YYYYMMDDTHHmmss")}Z
DTEND:${endTime.format("YYYYMMDDTHHmmss")}Z
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
                  const [h1, m1] = pro.start_interval_time.split(":").map(Number);
                  const [h2, m2] = pro.final_interval_time.split(":").map(Number);
                  const start_in_min = h1 * 60 + m1;
                  const final_in_min = h2 * 60 + m2;
                  const durata = final_in_min - start_in_min;
                  const isActive = pro.active && pro.active.status === true;
                  const isCancelled = pro.active && pro.active.status === false;

                  return (
                    <div key={pro.uid} className="mybooks__card">
                      <div className="mybooks__card-header">
                        <h3>Mașina {pro.machine}</h3>
                        <span
                          className={`badge badge--${isActive
                            ? "success"
                            : isCancelled
                            ? "error"
                            : "warning"}`}
                        >
                          {isCancelled ? "Anulată" : isActive ? "Activă" : "Necunoscută"}
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <div>
                              <span className="label">Data</span>
                              <span className="value">{dayjs(pro.date).format("DD/MM/YYYY")}</span>
                            </div>
                          </div>

                          <div className="mybooks__info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12,6 12,12 16,14" />
                            </svg>
                            <div>
                              <span className="label">Interval</span>
                              <span className="value">
                                {pro.start_interval_time} - {pro.final_interval_time}
                              </span>
                            </div>
                          </div>

                          <div className="mybooks__info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                                onClick={() => addToGoogleCalendar(pro, start_in_min, final_in_min)}
                              >
                                Google Calendar
                              </button>
                              <button
                                className="btn btn-success"
                                onClick={() => downloadIcsFile(pro, start_in_min, final_in_min)}
                              >
                                Download
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
              <div className="mybooks__table d-none d-md-block">
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
                        const [h1, m1] = pro.start_interval_time.split(":").map(Number);
                        const [h2, m2] = pro.final_interval_time.split(":").map(Number);
                        const start_in_min = h1 * 60 + m1;
                        const final_in_min = h2 * 60 + m2;
                        const durata = final_in_min - start_in_min;
                        const isActive = pro.active && pro.active.status === true;
                        const isCancelled = pro.active && pro.active.status === false;

                        return (
                          <tr
                            key={pro.uid}
                            className={isCancelled ? "cancelled" : isActive ? "active" : ""}
                          >
                            <td>{dayjs(pro.date).format("DD/MM/YYYY")}</td>
                            <td>{pro.machine}</td>
                            <td>{pro.start_interval_time}</td>
                            <td>{pro.final_interval_time}</td>
                            <td>{durata} minute</td>
                            <td>
                              {isCancelled ? (
                                <div className="mybooks__status mybooks__status--cancelled">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                  </svg>
                                  <span>Anulată</span>
                                </div>
                              ) : isActive ? (
                                <div className="mybooks__status mybooks__status--active">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="9 12 11 14 15 10" />
                                  </svg>
                                  <span>Activă</span>
                                </div>
                              ) : (
                                <div className="mybooks__status mybooks__status--unknown">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M9,9h0" />
                                    <path d="M15,9h0" />
                                    <path d="M8,15s1.5,2,4,2,4-2,4-2" />
                                  </svg>
                                  <span>Necunoscută</span>
                                </div>
                              )}
                            </td>
                            <td>{isCancelled && pro.active?.message ? pro.active.message : "-"}</td>
                            <td>
                              <div className="admin__actions">
                                {isActive && (
                                  <>
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => addToGoogleCalendar(pro, start_in_min, final_in_min)}
                                    >
                                      Google Calendar
                                    </button>
                                    <button
                                      className="btn btn-success"
                                      onClick={() => downloadIcsFile(pro, start_in_min, final_in_min)}
                                    >
                                      Download
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
