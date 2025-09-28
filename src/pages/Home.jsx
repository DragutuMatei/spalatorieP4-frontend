//  import React, { use, useEffect, useState } from "react";
// import DatePicker from "react-multi-date-picker";
// import { STATUS } from "../utils/status";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// import "dayjs/locale/ro";
// import { useAuth } from "../utils/AuthContext";
// import relativeTime from "dayjs/plugin/relativeTime";
// import { toast } from "react-toastify";
// import { toast_error, toast_success, toast_warn } from "../utils/Toasts";
// import AXIOS from "../utils/Axios_config";
// import { useSocket } from "../utils/SocketContext";

// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.locale("ro");

// function Home() {
//   const [value, setValue] = useState(dayjs().toDate());
//   const [hours, setHours] = useState([]);
//   const { user, signInWithGoogle, loading, refreshUser } = useAuth();
//   const [programari, setProgramari] = useState([]);

//   const buildHours = () => {
//     const startHour = dayjs().startOf("day").hour(8);

//     const endHour = dayjs().startOf("day").hour(22);

//     let hoursArray = [];
//     setHours([]);

//     let i = 0;
//     let current_hour = startHour.hour();
//     let max_hour = endHour.hour();
//     while (current_hour < max_hour) {
//       let start_interval_time = startHour.add(i * 30, "minute").format("HH:mm");
//       let final_interval_time = startHour
//         .add(i * 30 + 30, "minute")
//         .format("HH:mm");
//       const time = `${start_interval_time} - ${final_interval_time}`;
//       current_hour += 1 / 2;
//       i++;
//       hoursArray.push({
//         time,
//         start_interval_time,
//         final_interval_time,
//         status: {
//           M1: {
//             status: STATUS["M1"].DISPONIBIL.status,
//             by: STATUS["M1"].DISPONIBIL.by,
//           },
//           M2: {
//             status: STATUS["M2"].DISPONIBIL.status,
//             by: STATUS["M2"].DISPONIBIL.by,
//           },
//           Uscator: {
//             status: STATUS["Uscator"].DISPONIBIL.status,
//             by: STATUS["Uscator"].DISPONIBIL.by,
//           },
//         },
//       });
//     }
//     // console.log("Hours array:", hoursArray);
//     setHours(hoursArray);
//   };

//   useEffect(() => {
//     buildHours();
//   }, []);

//   const socket = useSocket();

//   const [usersProgramari, setUsersProgramari] = useState([]);

//   const getProgramari = async (e = "") => {
//     console.log("ASdsss");

//     try {
//       const rasp = await AXIOS.get(`/api/programare`);
//       if (rasp.data.success) {
//         setUsersProgramari(rasp.data.programari);
//         rasp.data.programari.map((pr) => {
//           //       console.log(pr);
//           if (pr.active?.status) {
//             changeStatusByStartFinal(
//               pr.date,
//               e,
//               pr.start_interval_time,
//               pr.final_interval_time,
//               pr.machine,
//               pr.user.camera,
//               STATUS[pr.machine].OCUPAT.status
//             );
//           }
//         });
//         // setUsersProgramari(rasp.data.programari);
//       } else {
//         toast_error(rasp.data.message || "Eroare la incarcarea programarilor."); // Mesaj implicit
//         setUsersProgramari([]); // Asigură-te că starea este resetată
//       }
//     } catch (error) {
//       console.error("Eroare la incarcarea programarilor:", error);
//       toast_error(error.message || "Eroare la incarcarea programarilor."); // Mesaj implicit
//       setUsersProgramari([]); // Asigură-te că starea este resetată
//     }
//   };

//   useEffect(() => {
//     getProgramari();
//     socket.on("programare", async (data) => {
//       switch (data.action) {
//         case "create":
//           console.log(data.programare);
//           await getProgramari();
//           break;
//         case "update":
//           console.log(data.programare);
//           await getProgramari();
//           break;
//         case "delete":
//           console.log(data.programare);
//           await getProgramari();
//           break;
//       }
//     });

//     return () => {
//       socket.off("programare");
//     };
//   }, [socket]);

//   const [selectedMachine, setSelectedMachine] = useState("");
//   const updateProgramare = (infos, machine, hour_index) => {
//     setSelectedMachine(machine);
//     if (programari.length === 0) {
//       setProgramari([{ ...infos }]);
//     } else {
//       if (
//         programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.start_interval_time &&
//             p.final_interval_time === infos.final_interval_time
//         ) !== -1
//       ) {
//         const index = programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.start_interval_time &&
//             p.final_interval_time === infos.final_interval_time
//         );
//         console.log("Index to remove:", index);
//         if (index !== -1) {
//           setProgramari((old) => {
//             if (old.length >= 2) {
//               console.log("dadddd", old.length);
//               let index_first_programari = hours.findIndex(
//                 (h) =>
//                   h.start_interval_time === programari[0].start_interval_time
//               );
//               let i = index_first_programari + index;
//               console.log(i, index_first_programari, index);
//               while (i < old.length + index_first_programari) {
//                 console.log(old.length);
//                 changeStatus(i, machine, STATUS[machine].DISPONIBIL.status);
//                 i++;
//               }
//               const newProgramari = [...old];
//               newProgramari.splice(index);
//               if (newProgramari.length === 0) {
//                 setSelectedMachine("");
//               }
//               return newProgramari;
//             } else {
//               console.log("sssssss", old.length);
//               const newProgramari = [...old];
//               newProgramari.splice(index, 1);
//               if (newProgramari.length === 0) setSelectedMachine("");
//               return newProgramari;
//             }
//           });#1e40af
//           changeStatus(hour_index, machine, STATUS[machine].DISPONIBIL.status);
//         } else {
//           toast_error("plm!");
//         }
//         return;
//       } else {
//         const index = programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.final_interval_time ||
//             p.final_interval_time === infos.start_interval_time
//         );
//         console.log("Index to add:", index);
//         if (index !== -1) {
//           setProgramari((old) => {
//             if (
//               old[old.length - 1].start_interval_time <
//               infos.start_interval_time
//             ) {
//               return [...old, { ...infos }];
//             } else {
//               return [{ ...infos }, ...old];
//             }
//           });
//         } else {
//           toast_error("Trebuie să fie ore consecutive!");
//           return;
//         }
//       }
//     }

//     changeStatus(hour_index, machine, STATUS[machine].REZERVAT.status);
//     toast_success("Program adăugat!");
//   };

//   const changeStatus = (index, mac, status) => {
//     setHours((old) => {
//       const newHours = [...old];
//       newHours[index].status[mac].status = status;
//       return newHours;
//     });
//   };

//   const changeStatusByStartFinal = (
//     date,
//     e,
//     start,
//     final,
//     machine,
//     by,
//     status
//   ) => {
//     const ff = e == "" ? value : e;
//     console.log("date: ", dayjs(date).format("DD/MM/YYYY").toString());
//     console.log("value: ", dayjs(ff).format("DD/MM/YYYY").toString());
//     console.log(
//       "comp: ",
//       dayjs(date).format("DD/MM/YYYY").toString() ===
//         dayjs(ff).format("DD/MM/YYYY").toString()
//     );
//     if (
//       dayjs(date).format("DD/MM/YYYY").toString() ===
//       dayjs(ff).format("DD/MM/YYYY").toString()
//     ) {
//       setHours((old) => {
//         const newHours = [...old];
//         const st = newHours.findIndex((h) => h.start_interval_time == start);
//         const fn = newHours.findIndex((h) => h.final_interval_time == final);

//         for (let i = st; i <= fn; i++) {
//           newHours[i].status[machine].status = status;
//           newHours[i].status[machine].by = `cam. ${by}`;
//           // console.log(newHours[i]);
//         }
//         //console.log(newHours);
//         return newHours;
//       });
//     } else {
//       // setHours((old) => {
//       //   const newHours = [...old];
//       //   for (let i = 0; i < newHours.length; i++) {
//       //     newHours[i].status[machine].status = STATUS[machine].DISPONIBIL.status;
//       //     newHours[i].status[machine].by = "";
//       //   }
//       //   return newHours;
//       // })
//     }
//   };

//   const [masini, setMasini] = useState([
//     { id: "m1", name: "M1" },
//     { id: "m2", name: "M2" },
//     { id: "uscator", name: "Uscator" },
//   ]);

//   const createProgramare = () => {
//     if (programari.length === 0) {
//       return null;
//     } else if (programari.length === 1) {
//       return {
//         start_h: programari[0].start_interval_time,
//         final_h: programari[0].final_interval_time,
//         date: dayjs(value).format("DD/MM/YYYY").toString(),
//       };
//     }
//     return {
//       start_h: programari[0].start_interval_time,
//       final_h: programari[programari.length - 1].final_interval_time,
//       date: dayjs(value).format("DD/MM/YYYY"),
//     };
//   };

//   const { start_h, final_h, date } = createProgramare() || {};
//   const selectDate = async (e) => {
//     console.log("Selected date:", e.toDate().toString());
//     if (selectedMachine === "") {
//       setValue(e.toDate());
//       buildHours();
//       await getProgramari(e.toDate());
//     } else {
//       toast_warn("Schimbă data doar dacă nu ai selectat mașina!");
//       return;
//     }
//   };
//   const submit = async () => {
//     const programareToSend = {
//       createdAt: dayjs().valueOf(),
//       active: {
//         status: true,
//         message: "Programare nouă",
//       },
//       date: dayjs(value).tz("Europe/Bucharest"),
//       start_interval_time: start_h,
//       final_interval_time: final_h,
//       machine: selectedMachine,
//       user: {
//         numeComplet: user ? user.numeComplet : "",
//         camera: user ? user.camera : "",
//         uid: user ? user.uid : "",
//         email: user ? user.google?.email : "",
//       },
//     };
//     try {
//       const rasp = await AXIOS.post("/api/programare", {
//         programareData: programareToSend,
//       });
//       if (rasp.data.success) {
//         toast_success(rasp.data.message);
//         setProgramari([]);
//         setSelectedMachine("");
//         buildHours();
//         getProgramari();
//       } else {
//         toast_error(rasp.data.message);
//       }
//     } catch (error) {
//       toast_error("Eroare la salvarea programării!");
//       return;
//     }
//   };

//   const renunta = () => {
//     setHours((old) => {
//       const newHours = [...old];
//       console.log(newHours);

//       for (let i = 0; i < newHours.length; i++) {
//         console.log(i, newHours[i].status[selectedMachine].status);
//         console.log(STATUS[selectedMachine].REZERVAT.status);
//         if (
//           newHours[i].status[selectedMachine].status ==
//           STATUS[selectedMachine].REZERVAT.status
//         ) {
//           newHours[i].status[selectedMachine].status =
//             STATUS[selectedMachine].DISPONIBIL.status;
//         }
//       }
//       // newHours.forEach((hour) => {
//       //   if (hour.status == STATUS[selectedMachine].REZERVAT.status)
//       //     hour.status = STATUS[selectedMachine].DISPONIBIL.status;
//       // });

//       return newHours;
//     });
//     setProgramari([]);
//     setSelectedMachine("");
//   };

//   return (
//     <>
//       {user && (
//         <>
//           <h1>{user.numeComplet}</h1>
//           <img src={user.google.photoURL} width={100} alt="" />
//         </>
//       )}
//       <br />
//       {programari && programari.length > 0 && createProgramare() != null && (
//         <>
//           <h2>
//             Programarea ta de la {selectedMachine} incepe la: <b>{start_h}</b>{" "}
//             si se termina la <b>{final_h}</b> pe data de <b>{date}</b>
//           </h2>
//           <button onClick={submit}>finalize</button>
//           <button onClick={renunta}>renunta</button>
//         </>
//       )}
//       <DatePicker
//         value={value}
//         onChange={selectDate}
//         format="DD/MM/YYYY"
//         disabled={selectedMachine !== ""}
//         multiple={false}
//         minDate={dayjs().subtract(1, "week").toDate()}
//         maxDate={dayjs().add(3, "weeks").toDate()}
//       />
//       <h1>{dayjs(value).tz("Europe/Bucharest").format("dddd, D MMMM YYYY")}</h1>
//       <table>
//         <thead>
//           <tr>
//             <th>Ore</th>
//             <th>M1</th>
//             <th>M2</th>
//             <th>Uscator</th>
//           </tr>
//         </thead>
//         <tbody>
//           {hours.map((hour, index) => (
//             <tr key={hour.start_interval_time}>
//               <td>{hour.time}</td>
//               {masini &&
//                 masini.map((m) => (
//                   <td>
//                     <button
//                       disabled={
//                         (selectedMachine !== "" && selectedMachine != m.name) ||
//                         hour.status[m.name].status === "OCUPAT"
//                       }
//                       onClick={() => {
//                         if (dayjs(value).isBefore(dayjs().startOf("day"))) {
//                           toast_error("Nu poti face o programare in trecut!");
//                           return;
//                         } else if (hour.status[m.name].status != "OCUPAT") {
//                           updateProgramare(hour, m.name, index);
//                         }
//                       }}
//                     >
//                       {selectedMachine === "" || selectedMachine == m.name
//                         ? hour.status[m.name].by != ""
//                           ? `${hour.status[m.name].status} (${
//                               hour.status[m.name].by
//                             })`
//                           : `${hour.status[m.name].status}`
//                         : "Nu poate fi selectat!"}
//                     </button>
//                   </td>
//                 ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </>
//   );
// }

// export default Home;

// import React, { useEffect, useState } from "react";
// import DatePicker from "react-multi-date-picker";
// import { STATUS } from "../utils/status";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// import "dayjs/locale/ro";
// import { useAuth } from "../utils/AuthContext";
// import { toast } from "react-toastify";
// import { toast_error, toast_success, toast_warn } from "../utils/Toasts";
// import AXIOS from "../utils/Axios_config";
// import { useSocket } from "../utils/SocketContext";

// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.locale("ro");

// function Home() {
//   const [value, setValue] = useState(dayjs().toDate());
//   const [hours, setHours] = useState([]);
//   const { user } = useAuth();
//   const [programari, setProgramari] = useState([]);
//   const socket = useSocket();
//   const [usersProgramari, setUsersProgramari] = useState([]);
//   const [selectedMachine, setSelectedMachine] = useState("");

//   const buildHours = () => {
//     const startHour = dayjs().startOf("day").hour(8);
//     const endHour = dayjs().startOf("day").hour(22);

//     let hoursArray = [];
//     let i = 0;
//     let current_hour = startHour.hour();
//     let max_hour = endHour.hour();
//     while (current_hour < max_hour) {
//       let start_interval_time = startHour.add(i * 30, "minute").format("HH:mm");
//       let final_interval_time = startHour
//         .add(i * 30 + 30, "minute")
//         .format("HH:mm");
//       const time = `${start_interval_time} - ${final_interval_time}`;
//       current_hour += 1 / 2;
//       i++;
//       hoursArray.push({
//         time,
//         start_interval_time,
//         final_interval_time,
//         status: {
//           M1: { ...STATUS["M1"].DISPONIBIL },
//           M2: { ...STATUS["M2"].DISPONIBIL },
//           Uscator: { ...STATUS["Uscator"].DISPONIBIL },
//         },
//       });
//     }
//     setHours(hoursArray);
//   };

//   useEffect(() => {
//     buildHours();
//   }, []);

//   const getProgramari = async (e = "") => {
//     try {
//       const rasp = await AXIOS.get(`/api/programare`);
//       if (rasp.data.success) {
//         setUsersProgramari(rasp.data.programari);
//         rasp.data.programari.forEach((pr) => {
//           if (pr.active?.status) {
//             changeStatusByStartFinal(
//               pr.date,
//               e,
//               pr.start_interval_time,
//               pr.final_interval_time,
//               pr.machine,
//               pr.user.camera,
//               STATUS[pr.machine].OCUPAT.status
//             );
//           }
//         });
//       } else {
//         toast_error(rasp.data.message || "Eroare la incarcarea programarilor.");
//         setUsersProgramari([]);
//       }
//     } catch (error) {
//       console.error("Eroare la incarcarea programarilor:", error);
//       toast_error(error.message || "Eroare la incarcarea programarilor.");
//       setUsersProgramari([]);
//     }
//   };
//   useEffect(() => {
//     if (usersProgramari.length === 0) {
//       buildHours();
//       return;
//     }

//     console.log("Asdasldnaslaskn dlknas l");
//     buildHours();
//     setTimeout(() => {
//       usersProgramari.forEach((pr) => {
//         if (pr.active?.status) {
//           changeStatusByStartFinal(
//             pr.date,
//             "",
//             pr.start_interval_time,
//             pr.final_interval_time,
//             pr.machine,
//             pr.user.camera,
//             STATUS[pr.machine].OCUPAT.status
//           );
//         }
//       });
//     }, 0);
//   }, [usersProgramari, value]);

//   useEffect(() => {
//     getProgramari(); // doar la prima încărcare

//     socket.on("programare", (data) => {
//       switch (data.action) {
//         case "create":
//           console.log("CREATE", data);
//           if (data.programare) {
//             // console.log(usersProgramari);
//             setUsersProgramari((prev) => {
//               return [...prev, data.programare];
//             });

//             buildHours();
//             setTimeout(() => {
//               setUsersProgramari((prev) => {
//                 prev.forEach((pr) => {
//                   if (pr.active?.status) {
//                     changeStatusByStartFinal(
//                       pr.date,
//                       "",
//                       pr.start_interval_time,
//                       pr.final_interval_time,
//                       pr.machine,
//                       pr.user.camera,
//                       STATUS[pr.machine].OCUPAT.status
//                     );
//                   }
//                 });
//                 return prev;
//               });
//             }, 0);
//             // if (data.programare.active?.status) {
//             //   changeStatusByStartFinal(
//             //     data.programare.date,
//             //     "",
//             //     data.programare.start_interval_time,
//             //     data.programare.final_interval_time,
//             //     data.programare.machine,
//             //     data.programare.user.camera,
//             //     STATUS[data.programare.machine].OCUPAT.status
//             //   );
//             // }
//           }
//           break;

//         case "update":
//           console.log("UPDATE", data);
//           if (data.programare) {
//             setUsersProgramari((prev) =>
//               prev.map((p) =>
//                 p.uid === data.programare.uid ? data.programare : p
//               )
//             );
//             buildHours();
//             setTimeout(() => {
//               if (data.programare.active?.status) {
//                 changeStatusByStartFinal(
//                   data.programare.date,
//                   "",
//                   data.programare.start_interval_time,
//                   data.programare.final_interval_time,
//                   data.programare.machine,
//                   data.programare.user.camera,
//                   STATUS[data.programare.machine].OCUPAT.status
//                 );
//               }
//             }, 0);
//           }
//           break;

//         case "delete":
//           console.log("DELETE: ", data);
//           if (data.programareId) {
//             setUsersProgramari((prev) =>
//               prev.filter((p) => p.uid !== data.programareId)
//             );
//             buildHours();
//             setTimeout(() => {
//               setUsersProgramari((prev) => {
//                 prev.forEach((pr) => {
//                   if (pr.active?.status) {
//                     changeStatusByStartFinal(
//                       pr.date,
//                       "",
//                       pr.start_interval_time,
//                       pr.final_interval_time,
//                       pr.machine,
//                       pr.user.camera,
//                       STATUS[pr.machine].OCUPAT.status
//                     );
//                   }
//                 });
//                 return prev;
//               });
//             }, 0);
//           }
//           break;
//       }
//     });

//     return () => {
//       socket.off("programare");
//     };
//   }, [socket]);

//   const updateProgramare = (infos, machine, hour_index) => {
//     setSelectedMachine(machine);
//     if (programari.length === 0) {
//       setProgramari([{ ...infos }]);
//     } else {
//       if (
//         programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.start_interval_time &&
//             p.final_interval_time === infos.final_interval_time
//         ) !== -1
//       ) {
//         const index = programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.start_interval_time &&
//             p.final_interval_time === infos.final_interval_time
//         );
//         if (index !== -1) {
//           setProgramari((old) => {
//             if (old.length >= 2) {
//               let index_first_programari = hours.findIndex(
//                 (h) =>
//                   h.start_interval_time === programari[0].start_interval_time
//               );
//               let i = index_first_programari + index;
//               while (i < old.length + index_first_programari) {
//                 changeStatus(i, machine, STATUS[machine].DISPONIBIL.status);
//                 i++;
//               }
//               const newProgramari = [...old];
//               newProgramari.splice(index);
//               if (newProgramari.length === 0) {
//                 setSelectedMachine("");
//               }
//               return newProgramari;
//             } else {
//               const newProgramari = [...old];
//               newProgramari.splice(index, 1);
//               if (newProgramari.length === 0) setSelectedMachine("");
//               return newProgramari;
//             }
//           });
//           changeStatus(hour_index, machine, STATUS[machine].DISPONIBIL.status);
//         }
//         return;
//       } else {
//         const index = programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.final_interval_time ||
//             p.final_interval_time === infos.start_interval_time
//         );
//         if (index !== -1) {
//           setProgramari((old) => {
//             if (
//               old[old.length - 1].start_interval_time <
//               infos.start_interval_time
//             ) {
//               return [...old, { ...infos }];
//             } else {
//               return [{ ...infos }, ...old];
//             }
//           });
//         } else {
//           toast_error("Trebuie să fie ore consecutive!");
//           return;
//         }
//       }
//     }
//     changeStatus(hour_index, machine, STATUS[machine].REZERVAT.status);
//     toast_success("Program adăugat!");
//   };

//   const changeStatus = (index, mac, status) => {
//     setHours((old) => {
//       const newHours = [...old];
//       newHours[index].status[mac].status = status;
//       return newHours;
//     });
//   };

//   const changeStatusByStartFinal = (
//     date,
//     e,
//     start,
//     final,
//     machine,
//     by,
//     status
//   ) => {
//     const ff = e === "" ? value : e;
//     if (
//       dayjs(date).format("DD/MM/YYYY").toString() ===
//       dayjs(ff).format("DD/MM/YYYY").toString()
//     ) {
//       setHours((old) => {
//         const newHours = [...old];
//         const st = newHours.findIndex((h) => h.start_interval_time == start);
//         const fn = newHours.findIndex((h) => h.final_interval_time == final);
//         for (let i = st; i <= fn; i++) {
//           newHours[i].status[machine].status = status;
//           newHours[i].status[machine].by = `cam. ${by}`;
//         }
//         return newHours;
//       });
//     }
//   };

//   const [masini] = useState([
//     { id: "m1", name: "M1" },
//     { id: "m2", name: "M2" },
//     { id: "uscator", name: "Uscator" },
//   ]);

//   const createProgramare = () => {
//     if (programari.length === 0) return null;
//     if (programari.length === 1) {
//       return {
//         start_h: programari[0].start_interval_time,
//         final_h: programari[0].final_interval_time,
//         date: dayjs(value).format("DD/MM/YYYY").toString(),
//       };
//     }
//     return {
//       start_h: programari[0].start_interval_time,
//       final_h: programari[programari.length - 1].final_interval_time,
//       date: dayjs(value).format("DD/MM/YYYY"),
//     };
//   };

//   const { start_h, final_h, date } = createProgramare() || {};

//   const selectDate = async (e) => {
//     if (selectedMachine === "") {
//       setValue(e.toDate());
//       buildHours();
//       await getProgramari(e.toDate());
//     } else {
//       toast_warn("Schimbă data doar dacă nu ai selectat mașina!");
//     }
//   };

//   const submit = async () => {
//     const programareToSend = {
//       createdAt: dayjs().valueOf(),
//       active: { status: true, message: "Programare nouă" },
//       date: dayjs(value).tz("Europe/Bucharest"),
//       start_interval_time: start_h,
//       final_interval_time: final_h,
//       machine: selectedMachine,
//       user: {
//         numeComplet: user ? user.numeComplet : "",
//         camera: user ? user.camera : "",
//         uid: user ? user.uid : "",
//         email: user ? user.google?.email : "",
//       },
//     };
//     try {
//       const rasp = await AXIOS.post("/api/programare", {
//         programareData: programareToSend,
//       });
//       if (rasp.data.success) {
//         toast_success(rasp.data.message);
//         setProgramari([]);
//         setSelectedMachine("");
//         buildHours();
//         getProgramari();
//       } else {
//         toast_error(rasp.data.message);
//       }
//     } catch (error) {
//       toast_error("Eroare la salvarea programării!");
//     }
//   };

//   const renunta = () => {
//     setHours((old) => {
//       const newHours = [...old];
//       for (let i = 0; i < newHours.length; i++) {
//         if (
//           newHours[i].status[selectedMachine].status ==
//           STATUS[selectedMachine].REZERVAT.status
//         ) {
//           newHours[i].status[selectedMachine].status =
//             STATUS[selectedMachine].DISPONIBIL.status;
//         }
//       }
//       return newHours;
//     });
//     setProgramari([]);
//     setSelectedMachine("");
//   };

//   return (
//     <>
//       {user && (
//         <>
//           <h1>{user.numeComplet}</h1>
//           <img src={user.google.photoURL} width={100} alt="" />
//         </>
//       )}
//       <br />
//       {programari && programari.length > 0 && createProgramare() != null && (
//         <>
//           <h2>
//             Programarea ta de la {selectedMachine} incepe la: <b>{start_h}</b>{" "}
//             si se termina la <b>{final_h}</b> pe data de <b>{date}</b>
//           </h2>
//           <button onClick={submit}>finalize</button>
//           <button onClick={renunta}>renunta</button>
//         </>
//       )}
//       <DatePicker
//         value={value}
//         onChange={selectDate}
//         format="DD/MM/YYYY"
//         disabled={selectedMachine !== ""}
//         multiple={false}
//         minDate={dayjs().subtract(1, "week").toDate()}
//         maxDate={dayjs().add(3, "weeks").toDate()}
//       />
//       <h1>{dayjs(value).tz("Europe/Bucharest").format("dddd, D MMMM YYYY")}</h1>
//       <table>
//         <thead>
//           <tr>
//             <th>Ore</th>
//             <th>M1</th>
//             <th>M2</th>
//             <th>Uscator</th>
//           </tr>
//         </thead>
//         <tbody>
//           {hours.map((hour, index) => (
//             <tr key={hour.start_interval_time}>
//               <td>{hour.time}</td>
//               {masini.map((m) => (
//                 <td key={m.id}>
//                   <button
//                     disabled={
//                       (selectedMachine !== "" && selectedMachine !== m.name) ||
//                       hour.status[m.name].status === "OCUPAT"
//                     }
//                     onClick={() => {
//                       if (dayjs(value).isBefore(dayjs().startOf("day"))) {
//                         toast_error("Nu poti face o programare in trecut!");
//                         return;
//                       } else if (hour.status[m.name].status !== "OCUPAT") {
//                         updateProgramare(hour, m.name, index);
//                       }
//                     }}
//                   >
//                     {selectedMachine === "" || selectedMachine === m.name
//                       ? hour.status[m.name].by !== ""
//                         ? `${hour.status[m.name].status} (${
//                             hour.status[m.name].by
//                           })`
//                         : `${hour.status[m.name].status}`
//                       : "Nu poate fi selectat!"}
//                   </button>
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </>
//   );
// }

// export default Home;

// import React, { useEffect, useState } from "react";
// import DatePicker from "react-multi-date-picker";
// import { STATUS } from "../utils/status";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// import "dayjs/locale/ro";
// import { useAuth } from "../utils/AuthContext";
// import { toast } from "react-toastify";
// import { toast_error, toast_success, toast_warn } from "../utils/Toasts";
// import AXIOS from "../utils/Axios_config";
// import { useSocket } from "../utils/SocketContext";

// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.locale("ro");

// function Home() {
//   const [value, setValue] = useState(dayjs().toDate());
//   const [hours, setHours] = useState([]);
//   const { user } = useAuth();
//   const [programari, setProgramari] = useState([]);
//   const socket = useSocket();
//   const [usersProgramari, setUsersProgramari] = useState([]);
//   const [selectedMachine, setSelectedMachine] = useState("");

//   const buildHours = () => {
//     const startHour = dayjs().startOf("day").hour(8);
//     const endHour = dayjs().startOf("day").hour(22);

//     let hoursArray = [];
//     let i = 0;
//     let current_hour = startHour.hour();
//     let max_hour = endHour.hour();
//     while (current_hour < max_hour) {
//       let start_interval_time = startHour.add(i * 30, "minute").format("HH:mm");
//       let final_interval_time = startHour
//         .add(i * 30 + 30, "minute")
//         .format("HH:mm");
//       const time = `${start_interval_time} - ${final_interval_time}`;
//       current_hour += 1 / 2;
//       i++;
//       hoursArray.push({
//         time,
//         start_interval_time,
//         final_interval_time,
//         status: {
//           M1: { ...STATUS["M1"].DISPONIBIL },
//           M2: { ...STATUS["M2"].DISPONIBIL },
//           Uscator: { ...STATUS["Uscator"].DISPONIBIL },
//         },
//       });
//     }
//     setHours(hoursArray);
//   };

//   const applyProgramariToHours = () => {
//     console.log("Applying programari:", usersProgramari.length);
//     usersProgramari.forEach((pr) => {
//       console.log("Processing programare:", pr);

//       // Verificăm dacă pr este un response object în loc de programare
//       if (pr.success && pr.programare) {
//         console.log("Skipping API response object, not a valid programare");
//         return; // skip this iteration
//       }

//       // Verificăm că avem toate proprietățile necesare
//       if (
//         !pr.active ||
//         !pr.date ||
//         !pr.start_interval_time ||
//         !pr.final_interval_time ||
//         !pr.machine ||
//         !pr.user
//       ) {
//         console.log("Skipping invalid programare object:", pr);
//         return; // skip this iteration
//       }

//       if (pr.active?.status) {
//         changeStatusByStartFinal(
//           pr.date,
//           value,
//           pr.start_interval_time,
//           pr.final_interval_time,
//           pr.machine,
//           pr.user.camera,
//           STATUS[pr.machine].OCUPAT.status
//         );
//       }
//     });
//   };

//   useEffect(() => {
//     buildHours();
//   }, []);

//   // Effect separat pentru aplicarea programărilor când se schimbă
//   useEffect(() => {
//     if (usersProgramari.length > 0) {
//       console.log("UsersProgramari changed, reapplying...");
//       buildHours(); // rebuild base hours
//       // Aplicăm programările după un tick
//       setTimeout(() => {
//         applyProgramariToHours();
//       }, 0);
//     }
//   }, [usersProgramari]);

//   // Effect pentru când se schimbă data
//   useEffect(() => {
//     if (usersProgramari.length > 0) {
//       buildHours();
//       setTimeout(() => {
//         applyProgramariToHours();
//       }, 0);
//     }
//   }, [value]);

//   const getProgramari = async (e = "") => {
//     try {
//       const rasp = await AXIOS.get(`/api/programare`);
//       if (rasp.data.success) {
//         console.log("Loaded programari:", rasp.data.programari.length);
//         // Filtrăm doar programările valide
//         const validProgramari = rasp.data.programari.filter(
//           (pr) =>
//             pr.active &&
//             pr.date &&
//             pr.start_interval_time &&
//             pr.final_interval_time &&
//             pr.machine &&
//             pr.user
//         );
//         console.log(
//           "Valid programari after filtering:",
//           validProgramari.length
//         );
//         setUsersProgramari(validProgramari);
//       } else {
//         toast_error(rasp.data.message || "Eroare la incarcarea programarilor.");
//         setUsersProgramari([]);
//       }
//     } catch (error) {
//       console.error("Eroare la incarcarea programarilor:", error);
//       toast_error(error.message || "Eroare la incarcarea programarilor.");
//       setUsersProgramari([]);
//     }
//   };

//   useEffect(() => {
//     getProgramari();

//     socket.on("programare", (data) => {
//       console.log("Socket event received:", data);

//       switch (data.action) {
//         case "create":
//           console.log("CREATE", data);
//           if (data.programare) {
//             console.log("Adding new programare to state", data.programare);
//             // Verificăm dacă data.programare este un response object
//             let programareToAdd = data.programare;
//             if (data.programare.success && data.programare.programare) {
//               console.log(
//                 "Data contains API response, extracting nested programare"
//               );
//               programareToAdd = data.programare.programare;
//             }

//             setUsersProgramari((prev) => {
//               const newArray = [...prev, programareToAdd];
//               console.log("New programari array length:", newArray.length);
//               return newArray;
//             });
//           }
//           break;

//         case "update":
//           console.log("UPDATE", data);
//           if (data.programare) {
//             setUsersProgramari((prev) =>
//               prev.map((p) =>
//                 p.uid === data.programare.uid ? data.programare : p
//               )
//             );
//           }
//           break;

//         case "delete":
//           console.log("DELETE: ", data);
//           if (data.programareId) {
//             setUsersProgramari((prev) =>
//               prev.filter((p) => p.uid !== data.programareId)
//             );
//           }
//           break;
//       }
//     });

//     return () => {
//       socket.off("programare");
//     };
//   }, [socket]);

//   const updateProgramare = (infos, machine, hour_index) => {
//     setSelectedMachine(machine);
//     if (programari.length === 0) {
//       setProgramari([{ ...infos }]);
//     } else {
//       if (
//         programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.start_interval_time &&
//             p.final_interval_time === infos.final_interval_time
//         ) !== -1
//       ) {
//         const index = programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.start_interval_time &&
//             p.final_interval_time === infos.final_interval_time
//         );
//         if (index !== -1) {
//           setProgramari((old) => {
//             if (old.length >= 2) {
//               let index_first_programari = hours.findIndex(
//                 (h) =>
//                   h.start_interval_time === programari[0].start_interval_time
//               );
//               let i = index_first_programari + index;
//               while (i < old.length + index_first_programari) {
//                 changeStatus(i, machine, STATUS[machine].DISPONIBIL.status);
//                 i++;
//               }
//               const newProgramari = [...old];
//               newProgramari.splice(index);
//               if (newProgramari.length === 0) {
//                 setSelectedMachine("");
//               }
//               return newProgramari;
//             } else {
//               const newProgramari = [...old];
//               newProgramari.splice(index, 1);
//               if (newProgramari.length === 0) setSelectedMachine("");
//               return newProgramari;
//             }
//           });
//           changeStatus(hour_index, machine, STATUS[machine].DISPONIBIL.status);
//         }
//         return;
//       } else {
//         const index = programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.final_interval_time ||
//             p.final_interval_time === infos.start_interval_time
//         );
//         if (index !== -1) {
//           setProgramari((old) => {
//             if (
//               old[old.length - 1].start_interval_time <
//               infos.start_interval_time
//             ) {
//               return [...old, { ...infos }];
//             } else {
//               return [{ ...infos }, ...old];
//             }
//           });
//         } else {
//           toast_error("Trebuie să fie ore consecutive!");
//           return;
//         }
//       }
//     }
//     changeStatus(hour_index, machine, STATUS[machine].REZERVAT.status);
//     toast_success("Program adăugat!");
//   };

//   const changeStatus = (index, mac, status) => {
//     setHours((old) => {
//       const newHours = [...old];
//       if (newHours[index]) {
//         newHours[index].status[mac].status = status;
//       }
//       return newHours;
//     });
//   };

//   const changeStatusByStartFinal = (
//     date,
//     selectedDate,
//     start,
//     final,
//     machine,
//     by,
//     status
//   ) => {
//     const dateToCheck = selectedDate || value;
//     console.log("changeStatusByStartFinal called:", {
//       programareDate: dayjs(date).format("DD/MM/YYYY"),
//       selectedDate: dayjs(dateToCheck).format("DD/MM/YYYY"),
//       start,
//       final,
//       machine,
//       status,
//     });

//     if (
//       dayjs(date).format("DD/MM/YYYY").toString() ===
//       dayjs(dateToCheck).format("DD/MM/YYYY").toString()
//     ) {
//       console.log("Date matches, updating hours");
//       setHours((old) => {
//         const newHours = [...old];
//         const st = newHours.findIndex((h) => h.start_interval_time === start);
//         const fn = newHours.findIndex((h) => h.final_interval_time === final);
//         console.log("Found indices:", { st, fn });

//         if (st !== -1 && fn !== -1) {
//           for (let i = st; i <= fn; i++) {
//             if (newHours[i]) {
//               console.log(`Updating hour ${i} for machine ${machine}`);
//               newHours[i].status[machine].status = status;
//               newHours[i].status[machine].by = `cam. ${by}`;
//             }
//           }
//         }
//         return newHours;
//       });
//     }
//   };

//   const [masini] = useState([
//     { id: "m1", name: "M1" },
//     { id: "m2", name: "M2" },
//     { id: "uscator", name: "Uscator" },
//   ]);

//   const createProgramare = () => {
//     if (programari.length === 0) return null;
//     if (programari.length === 1) {
//       return {
//         start_h: programari[0].start_interval_time,
//         final_h: programari[0].final_interval_time,
//         date: dayjs(value).format("DD/MM/YYYY").toString(),
//       };
//     }
//     return {
//       start_h: programari[0].start_interval_time,
//       final_h: programari[programari.length - 1].final_interval_time,
//       date: dayjs(value).format("DD/MM/YYYY"),
//     };
//   };

//   const { start_h, final_h, date } = createProgramare() || {};

//   const selectDate = async (e) => {
//     if (selectedMachine === "") {
//       setValue(e.toDate());
//     } else {
//       toast_warn("Schimbă data doar dacă nu ai selectat mașina!");
//     }
//   };

//   const submit = async () => {
//     const programareToSend = {
//       createdAt: dayjs().valueOf(),
//       active: { status: true, message: "Programare nouă" },
//       date: dayjs(value).tz("Europe/Bucharest"),
//       start_interval_time: start_h,
//       final_interval_time: final_h,
//       machine: selectedMachine,
//       user: {
//         numeComplet: user ? user.numeComplet : "",
//         camera: user ? user.camera : "",
//         uid: user ? user.uid : "",
//         email: user ? user.google?.email : "",
//       },
//     };
//     try {
//       const rasp = await AXIOS.post("/api/programare", {
//         programareData: programareToSend,
//       });
//       if (rasp.data.success) {
//         toast_success(rasp.data.message);
//         setProgramari([]);
//         setSelectedMachine("");
//       } else {
//         toast_error(rasp.data.message);
//       }
//     } catch (error) {
//       toast_error("Eroare la salvarea programării!");
//     }
//   };

//   const renunta = () => {
//     setHours((old) => {
//       const newHours = [...old];
//       for (let i = 0; i < newHours.length; i++) {
//         if (
//           newHours[i].status[selectedMachine].status ===
//           STATUS[selectedMachine].REZERVAT.status
//         ) {
//           newHours[i].status[selectedMachine].status =
//             STATUS[selectedMachine].DISPONIBIL.status;
//         }
//       }
//       return newHours;
//     });
//     setProgramari([]);
//     setSelectedMachine("");
//   };

//   return (
//     <>
//       {user && (
//         <>
//           <h1>{user.numeComplet}</h1>
//           <img src={user.google.photoURL} width={100} alt="" />
//         </>
//       )}
//       <br />
//       {programari && programari.length > 0 && createProgramare() != null && (
//         <>
//           <h2>
//             Programarea ta de la {selectedMachine} incepe la: <b>{start_h}</b>{" "}
//             si se termina la <b>{final_h}</b> pe data de <b>{date}</b>
//           </h2>
//           <button onClick={submit}>finalize</button>
//           <button onClick={renunta}>renunta</button>
//         </>
//       )}
//       <DatePicker
//         value={value}
//         onChange={selectDate}
//         format="DD/MM/YYYY"
//         disabled={selectedMachine !== ""}
//         multiple={false}
//         minDate={dayjs().subtract(1, "week").toDate()}
//         maxDate={dayjs().add(3, "weeks").toDate()}
//       />
//       <h1>{dayjs(value).tz("Europe/Bucharest").format("dddd, D MMMM YYYY")}</h1>
//       <table>
//         <thead>
//           <tr>
//             <th>Ore</th>
//             <th>M1</th>
//             <th>M2</th>
//             <th>Uscator</th>
//           </tr>
//         </thead>
//         <tbody>
//           {hours.map((hour, index) => (
//             <tr key={hour.start_interval_time}>
//               <td>{hour.time}</td>
//               {masini.map((m) => (
//                 <td key={m.id}>
//                   <button
//                     disabled={
//                       (selectedMachine !== "" && selectedMachine !== m.name) ||
//                       hour.status[m.name].status === "OCUPAT"
//                     }
//                     onClick={() => {
//                       if (dayjs(value).isBefore(dayjs().startOf("day"))) {
//                         toast_error("Nu poti face o programare in trecut!");
//                         return;
//                       } else if (hour.status[m.name].status !== "OCUPAT") {
//                         updateProgramare(hour, m.name, index);
//                       }
//                     }}
//                   >
//                     {selectedMachine === "" || selectedMachine === m.name
//                       ? hour.status[m.name].by !== ""
//                         ? `${hour.status[m.name].status} (${
//                             hour.status[m.name].by
//                           })`
//                         : `${hour.status[m.name].status}`
//                       : "Nu poate fi selectat!"}
//                   </button>
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </>
//   );
// }

// export default Home;

// import React, { useEffect, useState } from "react";
// import DatePicker from "react-multi-date-picker";
// import { STATUS } from "../utils/status";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// import "dayjs/locale/ro";
// import { useAuth } from "../utils/AuthContext";
// import { toast } from "react-toastify";
// import { toast_error, toast_success, toast_warn } from "../utils/Toasts";
// import AXIOS from "../utils/Axios_config";
// import { useSocket } from "../utils/SocketContext";

// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.locale("ro");

// function Home() {
//   const [value, setValue] = useState(dayjs().toDate());
//   const [hours, setHours] = useState([]);
//   const { user } = useAuth();
//   const [programari, setProgramari] = useState([]);
//   const socket = useSocket();
//   const [usersProgramari, setUsersProgramari] = useState([]);
//   const [selectedMachine, setSelectedMachine] = useState("");
//   const [tempReservations, setTempReservations] = useState({}); // Pentru rezervările temporare ale altor useri

//   const buildHours = () => {
//     const startHour = dayjs().startOf("day").hour(8);
//     const endHour = dayjs().startOf("day").hour(22);

//     let hoursArray = [];
//     let i = 0;
//     let current_hour = startHour.hour();
//     let max_hour = endHour.hour();
//     while (current_hour < max_hour) {
//       let start_interval_time = startHour.add(i * 30, "minute").format("HH:mm");
//       let final_interval_time = startHour
//         .add(i * 30 + 30, "minute")
//         .format("HH:mm");
//       const time = `${start_interval_time} - ${final_interval_time}`;
//       current_hour += 1 / 2;
//       i++;
//       hoursArray.push({
//         time,
//         start_interval_time,
//         final_interval_time,
//         status: {
//           M1: { ...STATUS["M1"].DISPONIBIL },
//           M2: { ...STATUS["M2"].DISPONIBIL },
//           Uscator: { ...STATUS["Uscator"].DISPONIBIL },
//         },
//       });
//     }
//     setHours(hoursArray);
//   };

//   const applyProgramariToHours = () => {
//     console.log('Applying programari:', usersProgramari.length);
//     usersProgramari.forEach((pr) => {
//       console.log('Processing programare:', pr);

//       // Verificăm dacă pr este un response object în loc de programare
//       if (pr.success && pr.programare) {
//         console.log('Skipping API response object, not a valid programare');
//         return; // skip this iteration
//       }

//       // Verificăm că avem toate proprietățile necesare
//       if (!pr.active || !pr.date || !pr.start_interval_time || !pr.final_interval_time || !pr.machine || !pr.user) {
//         console.log('Skipping invalid programare object:', pr);
//         return; // skip this iteration
//       }

//       if (pr.active?.status) {
//         changeStatusByStartFinal(
//           pr.date,
//           value,
//           pr.start_interval_time,
//           pr.final_interval_time,
//           pr.machine,
//           pr.user.camera,
//           STATUS[pr.machine].OCUPAT.status
//         );
//       }
//     });
//   };

//   useEffect(() => {
//     buildHours();
//   }, []);

//   // Effect separat pentru aplicarea programărilor când se schimbă
//   useEffect(() => {
//     if (usersProgramari.length > 0) {
//       console.log('UsersProgramari changed, reapplying...');
//       buildHours(); // rebuild base hours
//       // Aplicăm programările după un tick
//       setTimeout(() => {
//         applyProgramariToHours();
//       }, 0);
//     }
//   }, [usersProgramari]);

//   // Effect pentru când se schimbă data
//   useEffect(() => {
//     if (usersProgramari.length > 0) {
//       buildHours();
//       setTimeout(() => {
//         applyProgramariToHours();
//       }, 0);
//     }
//   }, [value]);

//   const getProgramari = async (e = "") => {
//     try {
//       const rasp = await AXIOS.get(`/api/programare`);
//       if (rasp.data.success) {
//         console.log('Loaded programari:', rasp.data.programari.length);
//         // Filtrăm doar programările valide
//         const validProgramari = rasp.data.programari.filter(pr =>
//           pr.active && pr.date && pr.start_interval_time && pr.final_interval_time && pr.machine && pr.user
//         );
//         console.log('Valid programari after filtering:', validProgramari.length);
//         setUsersProgramari(validProgramari);
//       } else {
//         toast_error(rasp.data.message || "Eroare la incarcarea programarilor.");
//         setUsersProgramari([]);
//       }
//     } catch (error) {
//       console.error("Eroare la incarcarea programarilor:", error);
//       toast_error(error.message || "Eroare la incarcarea programarilor.");
//       setUsersProgramari([]);
//     }
//   };

//   useEffect(() => {
//     getProgramari();

//     // Listener pentru rezervările temporare
//     socket.on("tempReservation", (data) => {
//       console.log("Temp reservation received:", data);
//       if (data.reservation) {
//         setTempReservations(prev => {
//           const newReservations = {
//             ...prev,
//             [data.userId]: data.reservation
//           };

//           // Verificăm dacă utilizatorul curent are programări care se suprapun
//           // checkForConflictsWithExistingSelection(data.reservation);

//           return newReservations;
//         });
//       }
//     });

//     // Listener pentru anularea rezervărilor temporare
//     socket.on("cancelTempReservation", (data) => {
//       console.log("Cancel temp reservation:", data);
//       if (data.userId) {
//         setTempReservations(prev => {
//           const newReservations = { ...prev };
//           delete newReservations[data.userId];
//           return newReservations;
//         });
//       }
//     });

//     socket.on("programare", (data) => {
//       console.log('Socket event received:', data);

//       switch (data.action) {
//         case "create":
//           console.log("CREATE", data);
//           if (data.programare) {
//             console.log("Adding new programare to state", data.programare);
//             // Verificăm dacă data.programare este un response object
//             let programareToAdd = data.programare;
//             if (data.programare.success && data.programare.programare) {
//               console.log("Data contains API response, extracting nested programare");
//               programareToAdd = data.programare.programare;
//             }

//             setUsersProgramari((prev) => {
//               const newArray = [...prev, programareToAdd];
//               console.log('New programari array length:', newArray.length);
//               return newArray;
//             });
//           }
//           break;

//         case "update":
//           console.log("UPDATE", data);
//           if (data.programare) {
//             setUsersProgramari((prev) =>
//               prev.map((p) =>
//                 p.uid === data.programare.uid ? data.programare : p
//               )
//             );
//           }
//           break;

//         case "delete":
//           console.log("DELETE: ", data);
//           if (data.programareId) {
//             setUsersProgramari((prev) =>
//               prev.filter((p) => p.uid !== data.programareId)
//             );
//           }
//           break;
//       }
//     });

//     return () => {
//       socket.off("programare");
//       socket.off("tempReservation");
//       socket.off("cancelTempReservation");
//     };
//   }, [socket]);

//   // Funcție pentru a verifica dacă un slot este rezervat temporar de alți useri
//   const isSlotTempReservedByOthers = (hourIndex, machine) => {
//     if (!user?.uid) return false;

//     return Object.entries(tempReservations).some(([userId, reservation]) => {
//       if (userId === user.uid || !reservation || reservation.machine !== machine) {
//         return false;
//       }

//       const reservationDate = reservation.date;
//       const currentDate = dayjs(value).format("DD/MM/YYYY");

//       if (reservationDate !== currentDate) return false;

//       return reservation.intervals.some(interval => {
//         const startIndex = hours.findIndex(h => h.start_interval_time === interval.start_interval_time);
//         const endIndex = hours.findIndex(h => h.final_interval_time === interval.final_interval_time);
//         return hourIndex >= startIndex && hourIndex <= endIndex;
//       });
//     });
//   };

//   // Funcție pentru a verifica dacă o programare este în conflict cu rezervări temporare
//   const isConflictingWithTempReservations = (machine, startTime, endTime) => {
//     if (!user?.uid) return false;

//     return Object.entries(tempReservations).some(([userId, reservation]) => {
//       if (userId === user.uid || !reservation || reservation.machine !== machine) {
//         return false;
//       }

//       const reservationDate = reservation.date;
//       const currentDate = dayjs(value).format("DD/MM/YYYY");

//       if (reservationDate !== currentDate) return false;

//       // Verificăm dacă intervalele se suprapun
//       return reservation.intervals.some(interval => {
//         return checkTimeOverlap(startTime, endTime, interval.start_interval_time, interval.final_interval_time);
//       });
//     });
//   };

//   // Funcție pentru verificarea suprapunerii temporale
//   const checkTimeOverlap = (start1, end1, start2, end2) => {
//     const timeToMinutes = (timeStr) => {
//       const [hours, minutes] = timeStr.split(':').map(Number);
//       return hours * 60 + minutes;
//     };

//     const start1Minutes = timeToMinutes(start1);
//     const end1Minutes = timeToMinutes(end1);
//     const start2Minutes = timeToMinutes(start2);
//     const end2Minutes = timeToMinutes(end2);

//     return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
//   };

//   // Funcție pentru a emite rezervarea temporară
//   const emitTempReservation = () => {
//     if (programari.length > 0 && selectedMachine && user?.uid) {
//       const reservation = {
//         userId: user.uid,
//         userName: user.numeComplet,
//         camera: user.camera,
//         machine: selectedMachine,
//         date: dayjs(value).format("DD/MM/YYYY"),
//         intervals: programari.map(p => ({
//           start_interval_time: p.start_interval_time,
//           final_interval_time: p.final_interval_time
//         }))
//       };

//       console.log('Emitting temp reservation:', reservation);
//       socket.emit("tempReservation", { userId: user.uid, reservation });
//     }
//   };

//   // Funcție pentru a anula rezervarea temporară
//   const cancelTempReservation = () => {
//     if (user?.uid) {
//       console.log('Canceling temp reservation for user:', user.uid);
//       socket.emit("cancelTempReservation", { userId: user.uid });
//     }
//   };

//   // Effect pentru emiterea rezervărilor temporare
//   useEffect(() => {
//     if (programari.length > 0 && selectedMachine) {
//       emitTempReservation();
//     } else if (programari.length === 0 && selectedMachine === "") {
//       cancelTempReservation();
//     }
//   }, [programari, selectedMachine]);

//   // Cleanup la unmount
//   useEffect(() => {
//     return () => {
//       cancelTempReservation();
//     };
//   }, []);
//   const updateProgramare = (infos, machine, hour_index) => {
//     // Verificăm dacă intervalul este rezervat temporar de altcineva
//     if (isSlotTempReservedByOthers(hour_index, machine)) {
//       toast_error("Acest interval este selectat de altcineva în acest moment!");
//       return;
//     }

//     // Verificăm dacă intervalul propus ar fi în conflict cu rezervări temporare
//     if (isConflictingWithTempReservations(machine, infos.start_interval_time, infos.final_interval_time)) {
//       toast_error("Acest interval se suprapune cu o selecție a altui utilizator!");
//       return;
//     }

//     setSelectedMachine(machine);
//     if (programari.length === 0) {
//       setProgramari([{ ...infos }]);
//     } else {
//       const existingIndex = programari.findIndex(
//         (p) =>
//           p.start_interval_time === infos.start_interval_time &&
//           p.final_interval_time === infos.final_interval_time
//       );

//       if (existingIndex !== -1) {
//         // Șterge programarea existentă
//         setProgramari((old) => {
//           if (old.length >= 2) {
//             let index_first_programari = hours.findIndex(
//               (h) => h.start_interval_time === programari[0].start_interval_time
//             );
//             let i = index_first_programari + existingIndex;
//             while (i < old.length + index_first_programari) {
//               changeStatus(i, machine, STATUS[machine].DISPONIBIL.status);
//               i++;
//             }
//             const newProgramari = [...old];
//             newProgramari.splice(existingIndex);
//             if (newProgramari.length === 0) {
//               setSelectedMachine("");
//             }
//             return newProgramari;
//           } else {
//             const newProgramari = old.filter((_, index) => index !== existingIndex);
//             if (newProgramari.length === 0) setSelectedMachine("");
//             return newProgramari;
//           }
//         });
//         changeStatus(hour_index, machine, STATUS[machine].DISPONIBIL.status);
//         return;
//       } else {
//         // Verifică dacă sunt ore consecutive
//         const consecutiveIndex = programari.findIndex(
//           (p) =>
//             p.start_interval_time === infos.final_interval_time ||
//             p.final_interval_time === infos.start_interval_time
//         );

//         if (consecutiveIndex !== -1) {
//           // Verificăm dacă noul interval extins ar fi în conflict
//           const newStartTime = programari[0].start_interval_time < infos.start_interval_time
//             ? programari[0].start_interval_time
//             : infos.start_interval_time;
//           const newEndTime = programari[programari.length - 1].final_interval_time > infos.final_interval_time
//             ? programari[programari.length - 1].final_interval_time
//             : infos.final_interval_time;

//           if (isConflictingWithTempReservations(machine, newStartTime, newEndTime)) {
//             toast_error("Extensia intervalului se suprapune cu o selecție a altui utilizator!");
//             return;
//           }

//           setProgramari((old) => {
//             if (old[old.length - 1].start_interval_time < infos.start_interval_time) {
//               return [...old, { ...infos }];
//             } else {
//               return [{ ...infos }, ...old];
//             }
//           });
//         } else {
//           toast_error("Trebuie să fie ore consecutive!");
//           return;
//         }
//       }
//     }
//     changeStatus(hour_index, machine, STATUS[machine].REZERVAT.status);
//     toast_success("Program adăugat!");
//   };

//   const changeStatus = (index, mac, status) => {
//     setHours((old) => {
//       const newHours = [...old];
//       if (newHours[index]) {
//         newHours[index].status[mac].status = status;
//       }
//       return newHours;
//     });
//   };

//   const changeStatusByStartFinal = (
//     date,
//     selectedDate,
//     start,
//     final,
//     machine,
//     by,
//     status
//   ) => {
//     const dateToCheck = selectedDate || value;
//     console.log('changeStatusByStartFinal called:', {
//       programareDate: dayjs(date).format("DD/MM/YYYY"),
//       selectedDate: dayjs(dateToCheck).format("DD/MM/YYYY"),
//       start,
//       final,
//       machine,
//       status
//     });

//     if (
//       dayjs(date).format("DD/MM/YYYY").toString() ===
//       dayjs(dateToCheck).format("DD/MM/YYYY").toString()
//     ) {
//       console.log('Date matches, updating hours');
//       setHours((old) => {
//         const newHours = [...old];
//         const st = newHours.findIndex((h) => h.start_interval_time === start);
//         const fn = newHours.findIndex((h) => h.final_interval_time === final);
//         console.log('Found indices:', { st, fn });

//         if (st !== -1 && fn !== -1) {
//           for (let i = st; i <= fn; i++) {
//             if (newHours[i]) {
//               console.log(`Updating hour ${i} for machine ${machine}`);
//               newHours[i].status[machine].status = status;
//               newHours[i].status[machine].by = `cam. ${by}`;
//             }
//           }
//         }
//         return newHours;
//       });
//     }
//   };

//   const [masini] = useState([
//     { id: "m1", name: "M1" },
//     { id: "m2", name: "M2" },
//     { id: "uscator", name: "Uscator" },
//   ]);

//   const createProgramare = () => {
//     if (programari.length === 0) return null;
//     if (programari.length === 1) {
//       return {
//         start_h: programari[0].start_interval_time,
//         final_h: programari[0].final_interval_time,
//         date: dayjs(value).format("DD/MM/YYYY").toString(),
//       };
//     }
//     return {
//       start_h: programari[0].start_interval_time,
//       final_h: programari[programari.length - 1].final_interval_time,
//       date: dayjs(value).format("DD/MM/YYYY"),
//     };
//   };

//   const { start_h, final_h, date } = createProgramare() || {};

//   const selectDate = async (e) => {
//     if (selectedMachine === "") {
//       setValue(e.toDate());
//     } else {
//       toast_warn("Schimbă data doar dacă nu ai selectat mașina!");
//     }
//   };

//   const submit = async () => {
//     const programareToSend = {
//       createdAt: dayjs().valueOf(),
//       active: { status: true, message: "Programare nouă" },
//       date: dayjs(value).tz("Europe/Bucharest"),
//       start_interval_time: start_h,
//       final_interval_time: final_h,
//       machine: selectedMachine,
//       user: {
//         numeComplet: user ? user.numeComplet : "",
//         camera: user ? user.camera : "",
//         uid: user ? user.uid : "",
//         email: user ? user.google?.email : "",
//       },
//     };
//     try {
//       const rasp = await AXIOS.post("/api/programare", {
//         programareData: programareToSend,
//       });
//       if (rasp.data.success) {
//         toast_success(rasp.data.message);
//         setProgramari([]);
//         setSelectedMachine("");
//       } else {
//         toast_error(rasp.data.message);
//       }
//     } catch (error) {
//       toast_error("Eroare la salvarea programării!");
//     }
//   };

//   const renunta = () => {
//     setHours((old) => {
//       const newHours = [...old];
//       for (let i = 0; i < newHours.length; i++) {
//         if (
//           newHours[i].status[selectedMachine].status ===
//           STATUS[selectedMachine].REZERVAT.status
//         ) {
//           newHours[i].status[selectedMachine].status =
//             STATUS[selectedMachine].DISPONIBIL.status;
//         }
//       }
//       return newHours;
//     });
//     setProgramari([]);
//     setSelectedMachine("");
//     cancelTempReservation();
//   };

//   return (
//     <>
//       {user && (
//         <>
//           <h1>{user.numeComplet}</h1>
//           <img src={user.google.photoURL} width={100} alt="" />
//         </>
//       )}
//       <br />
//       {programari && programari.length > 0 && createProgramare() != null && (
//         <>
//           <h2>
//             Programarea ta de la {selectedMachine} incepe la: <b>{start_h}</b>{" "}
//             si se termina la <b>{final_h}</b> pe data de <b>{date}</b>
//           </h2>
//           <button onClick={submit}>finalize</button>
//           <button onClick={renunta}>renunta</button>
//         </>
//       )}
//       <DatePicker
//         value={value}
//         onChange={selectDate}
//         format="DD/MM/YYYY"
//         disabled={selectedMachine !== ""}
//         multiple={false}
//         minDate={dayjs().subtract(1, "week").toDate()}
//         maxDate={dayjs().add(3, "weeks").toDate()}
//       />
//       <h1>{dayjs(value).tz("Europe/Bucharest").format("dddd, D MMMM YYYY")}</h1>

//       {/* Afișăm rezervările temporare ale altor useri */}
//       {Object.keys(tempReservations).length > 0 && (
//         <div style={{
//           backgroundColor: '#fff3cd',
//           border: '1px solid #ffeaa7',
//           padding: '10px',
//           borderRadius: '5px',
//           margin: '10px 0'
//         }}>
//           <h3>⚠️ Rezervări temporare active:</h3>
//           <div>Debug - Total rezervări: {Object.keys(tempReservations).length}</div>
//           <div>Debug - User ID curent: {user?.uid}</div>
//           <div>Debug - Data selectată: {dayjs(value).format("DD/MM/YYYY")}</div>
//           {Object.entries(tempReservations).map(([userId, reservation]) => {
//             console.log('Processing reservation for user:', userId, reservation);

//             if (!reservation || userId === user?.uid) {
//               console.log('Skipping reservation - no data or same user');
//               return null;
//             }

//             const isCurrentDate = reservation.date === dayjs(value).format("DD/MM/YYYY");
//             console.log('Date check:', reservation.date, 'vs', dayjs(value).format("DD/MM/YYYY"), '=', isCurrentDate);

//             if (!isCurrentDate) {
//               console.log('Skipping reservation - different date');
//               return null;
//             }

//             return (
//               <div key={userId} style={{ marginBottom: '5px' }}>
//                 <strong>{reservation.userName}</strong> (cam. {reservation.camera})
//                 selectează <strong>{reservation.machine}</strong> pentru: {' '}
//                 {reservation.intervals.map((interval, idx) => (
//                   <span key={idx}>
//                     {interval.start_interval_time} - {interval.final_interval_time}
//                     {idx < reservation.intervals.length - 1 ? ', ' : ''}
//                   </span>
//                 ))}
//               </div>
//             );
//           })}
//         </div>
//       )}

//       <table>
//         <thead>
//           <tr>
//             <th>Ore</th>
//             <th>M1</th>
//             <th>M2</th>
//             <th>Uscator</th>
//           </tr>
//         </thead>
//         <tbody>
//           {hours.map((hour, index) => (
//             <tr key={hour.start_interval_time}>
//               <td>{hour.time}</td>
//               {masini.map((m) => (
//                 <td key={m.id}>
//                   <button
//                     disabled={
//                       (selectedMachine !== "" && selectedMachine !== m.name) ||
//                       hour.status[m.name].status === "OCUPAT" ||
//                       isSlotTempReservedByOthers(index, m.name)
//                     }
//                     onClick={() => {
//                       if (dayjs(value).isBefore(dayjs().startOf("day"))) {
//                         toast_error("Nu poti face o programare in trecut!");
//                         return;
//                       } else if (hour.status[m.name].status !== "OCUPAT") {
//                         updateProgramare(hour, m.name, index);
//                       }
//                     }}
//                     style={{
//                       backgroundColor: isSlotTempReservedByOthers(index, m.name)
//                         ? '#ffcccb'
//                         : '',
//                       border: isSlotTempReservedByOthers(index, m.name)
//                         ? '2px solid #ff6b6b'
//                         : '',
//                       position: 'relative',
//                       opacity: isSlotTempReservedByOthers(index, m.name) ? 0.7 : 1,
//                       cursor: isSlotTempReservedByOthers(index, m.name) ? 'not-allowed' : 'pointer'
//                     }}
//                   >
//                     {isSlotTempReservedByOthers(index, m.name)
//                       ? "Rezervat temporar"
//                       : selectedMachine === "" || selectedMachine === m.name
//                         ? hour.status[m.name].by !== ""
//                           ? `${hour.status[m.name].status} (${hour.status[m.name].by})`
//                           : `${hour.status[m.name].status}`
//                         : "Nu poate fi selectat!"
//                     }

//                     {isSlotTempReservedByOthers(index, m.name) && (
//                       <span
//                         style={{
//                           position: 'absolute',
//                           top: '-5px',
//                           right: '-5px',
//                           backgroundColor: '#ff6b6b',
//                           color: 'white',
//                           borderRadius: '50%',
//                           width: '20px',
//                           height: '20px',
//                           fontSize: '12px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           fontWeight: 'bold'
//                         }}
//                         title="Rezervat temporar de altcineva"
//                       >
//                         ✕
//                       </span>
//                     )}
//                   </button>
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </>
//   );
// }

// export default Home;

import React, { useEffect, useState, useCallback } from "react";
import DatePicker from "react-multi-date-picker";
import { STATUS } from "../utils/status";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/ro";
import { useAuth } from "../utils/AuthContext";
import { toast } from "react-toastify";
import { toast_error, toast_success, toast_warn } from "../utils/Toasts";
import AXIOS from "../utils/Axios_config";
import { useSocket } from "../utils/SocketContext";
import "./Home.scss";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ro");

function Home({ userApproved = false }) {
  const [value, setValue] = useState(dayjs().toDate());
  const [hours, setHours] = useState([]);
  const { user } = useAuth();
  const [programari, setProgramari] = useState([]);
  const socket = useSocket();
  const [usersProgramari, setUsersProgramari] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [tempReservations, setTempReservations] = useState({});
  const [realStates, setRealStates] = useState({
    M1: false,
    M2: false,
    Uscator: false,
  });
  const [maintenanceIntervals, setMaintenanceIntervals] = useState([]);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [blockPastSlotsEnabled, setBlockPastSlotsEnabled] = useState(false);

  const timeZone = "Europe/Bucharest";
  const now = dayjs().tz(timeZone);
  const selectedDate = dayjs(value).tz(timeZone);
  const isSelectedDateToday = selectedDate.isSame(now, "day");

  const buildHours = useCallback(() => {
    const startHour = dayjs().startOf("day").hour(8);
    const endHour = dayjs().startOf("day").hour(22);

    let hoursArray = [];
    let i = 0;
    let current_hour = startHour.hour();
    let max_hour = endHour.hour();
    while (current_hour < max_hour) {
      let start_interval_time = startHour.add(i * 30, "minute").format("HH:mm");
      let final_interval_time = startHour
        .add(i * 30 + 30, "minute")
        .format("HH:mm");
      const time = `${start_interval_time} - ${final_interval_time}`;
      current_hour += 1 / 2;
      i++;
      hoursArray.push({
        time,
        start_interval_time,
        final_interval_time,
        status: {
          M1: realStates["M1"]
            ? { ...STATUS["M1"].DISPONIBIL }
            : { ...STATUS["M1"].MENTENANTA },
          M2: realStates["M2"]
            ? { ...STATUS["M2"].DISPONIBIL }
            : { ...STATUS["M2"].MENTENANTA },
          Uscator: realStates["Uscator"]
            ? { ...STATUS["Uscator"].DISPONIBIL }
            : { ...STATUS["Uscator"].MENTENANTA },
        },
      });
    }
    console.log(realStates);
    // Aplică programările și rezervările temporare pe noile ore
    usersProgramari.forEach((pr) => {
      if (
        !pr.active ||
        !pr.date ||
        !pr.start_interval_time ||
        !pr.final_interval_time ||
        !pr.machine ||
        !pr.user
      ) {
        return;
      }

      if (pr.active?.status) {
        const dateToCheck = value;
        if (
          dayjs(pr.date).format("DD/MM/YYYY").toString() ===
          dayjs(dateToCheck).format("DD/MM/YYYY").toString()
        ) {
          const st = hoursArray.findIndex(
            (h) => h.start_interval_time === pr.start_interval_time
          );
          const fn = hoursArray.findIndex(
            (h) => h.final_interval_time === pr.final_interval_time
          );

          if (st !== -1 && fn !== -1) {
            for (let i = st; i <= fn; i++) {
              if (hoursArray[i]) {
                hoursArray[i].status[pr.machine].status =
                  STATUS[pr.machine].OCUPAT.status;
                hoursArray[i].status[pr.machine].by = `cam. ${pr.user.camera}`;
              }
            }
          }
        }
      }
    });

    // Aplică intervalele de mentenanță
    hoursArray = applyMaintenanceToHours(hoursArray);

    // Aplică rezervările temporare
    hoursArray = applyTempReservationsToHours(hoursArray);

    // Aplică programările locale ale utilizatorului curent (starea REZERVAT)
    hoursArray = applyLocalReservations(hoursArray);

    setHours(hoursArray);
  }, [
    value,
    usersProgramari,
    tempReservations,
    realStates,
    maintenanceIntervals,
    programari,
    selectedMachine,
    user,
  ]);

  useEffect(() => {
    buildHours();
  }, [buildHours]);

  const applyMaintenanceToHours = (hoursToUpdate) => {
    const currentDate = dayjs(value).format("DD/MM/YYYY");

    maintenanceIntervals.forEach((interval) => {
      if (interval.date === currentDate) {
        // Găsim sloturile de timp pentru intervalul de mentenanță
        const startTime = interval.startTime;
        const endTime = interval.endTime;

        // Convertim timpurile în format HH:mm pentru comparare
        const startTimeFormatted =
          typeof startTime === "object" && startTime.seconds
            ? new Date(startTime.seconds * 1000).toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : startTime;

        const endTimeFormatted =
          typeof endTime === "object" && endTime.seconds
            ? new Date(endTime.seconds * 1000).toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : endTime;

        // Găsim indicii pentru start și end
        const startIndex = hoursToUpdate.findIndex(
          (h) => h.start_interval_time === startTimeFormatted
        );
        const endIndex = hoursToUpdate.findIndex(
          (h) => h.final_interval_time === endTimeFormatted
        );

        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            if (hoursToUpdate[i]) {
              hoursToUpdate[i].status[interval.machine].status =
                STATUS[interval.machine].MENTENANTA.status;
              hoursToUpdate[i].status[interval.machine].by = "Mentenanță";
            }
          }
        }
      }
    });

    return hoursToUpdate;
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const findBookingForSlot = useCallback(
    (slotStart, slotEnd, machineName) => {
      const slotStartMinutes = parseTimeToMinutes(slotStart);
      const slotEndMinutes = parseTimeToMinutes(slotEnd);
      const currentDateStr = dayjs(value).format("DD/MM/YYYY");

      return (
        usersProgramari.find((booking) => {
          if (!booking || booking.machine !== machineName) return false;
          const bookingDateStr = dayjs(booking.date).format("DD/MM/YYYY");
          if (bookingDateStr !== currentDateStr) return false;

          const bookingStart = parseTimeToMinutes(booking.start_interval_time);
          const bookingEnd = parseTimeToMinutes(booking.final_interval_time);
          return (
            slotStartMinutes >= bookingStart && slotEndMinutes <= bookingEnd
          );
        }) || null
      );
    },
    [usersProgramari, value]
  );

  const handleOccupiedSlotClick = useCallback(
    (hourInfo, machineName) => {
      const booking = findBookingForSlot(
        hourInfo.start_interval_time,
        hourInfo.final_interval_time,
        machineName
      );

      if (!booking) {
        toast_warn("Nu am găsit detalii pentru această rezervare.");
        return;
      }

      setSelectedBookingDetails({
        machine: machineName,
        interval: `${booking.start_interval_time} - ${booking.final_interval_time}`,
        nume: booking.user?.numeComplet || "N/A",
        camera: booking.user?.camera || "N/A",
        telefon: booking.user?.telefon || "N/A",
      });
    },
    [findBookingForSlot]
  );

  const closeBookingModal = () => setSelectedBookingDetails(null);

  const getProgramari = async () => {
    try {
      const rasp = await AXIOS.get(`/api/programare`);
      if (rasp.data.success) {
        const validProgramari = rasp.data.programari.filter(
          (pr) =>
            pr.active &&
            pr.active.status === true &&
            pr.date &&
            pr.start_interval_time &&
            pr.final_interval_time &&
            pr.machine &&
            pr.user
        );
        setUsersProgramari(validProgramari);
      } else {
        toast_error(rasp.data.message || "Eroare la incarcarea programarilor.");
        setUsersProgramari([]);
      }
    } catch (error) {
      console.error("Eroare la incarcarea programarilor:", error);
      toast_error(error.message || "Eroare la incarcarea programarilor.");
      setUsersProgramari([]);
    }
  };

  // Funcție pentru a obține toate rezervările temporare active de la server
  const getTempReservations = async () => {
    try {
      const response = await AXIOS.get("/api/temp-reservations");
      if (response.data.success) {
        setTempReservations(response.data.tempReservations || {});
      }
    } catch (error) {
      console.error("Error loading temp reservations:", error);
    }
  };

  const getSettings = async () => {
    const rasp = await AXIOS.get("/api/settings");
    if (rasp.data.success) {
      console.log("llll, ", rasp.data);
      setRealStates({
        M1: rasp.data.settings.m1Enabled,
        M2: rasp.data.settings.m2Enabled,
        Uscator: rasp.data.settings.dryerEnabled,
      });
      setBlockPastSlotsEnabled(Boolean(rasp.data.settings.blockPastSlots));
    }
  };

  const getMaintenanceIntervals = async () => {
    try {
      const rasp = await AXIOS.get("/api/maintenance");
      if (rasp.data.success) {
        setMaintenanceIntervals(rasp.data.maintenanceIntervals);
      }
    } catch (error) {
      console.error("Error fetching maintenance intervals:", error);
    }
  };
  useEffect(() => {
    getSettings();
    getProgramari();
    getMaintenanceIntervals();
    // Obține rezervările temporare existente când se încarcă componenta
    getTempReservations();

    // Listener pentru rezervările temporare
    socket.on("tempReservation", (data) => {
      if (data.reservation) {
        setTempReservations((prev) => ({
          ...prev,
          [data.userId]: data.reservation,
        }));
      }
    });

    // Listener pentru anularea rezervărilor temporare
    socket.on("cancelTempReservation", (data) => {
      if (data.userId) {
        setTempReservations((prev) => {
          const newReservations = { ...prev };
          delete newReservations[data.userId];
          return newReservations;
        });
      }
    });

    // Listener pentru sincronizarea rezervărilor temporare
    socket.on("syncTempReservations", (data) => {
      setTempReservations((prev) => {
        const syncedReservations = data.tempReservations || {};

        // Păstrează rezervarea curentă a utilizatorului dacă există
        if (user?.uid && prev[user.uid]) {
          syncedReservations[user.uid] = prev[user.uid];
        }

        return syncedReservations;
      });
    });

    // Listener pentru când un utilizator se conectează
    socket.on("userConnected", (data) => {
      console.log("User connected, requesting sync");
      // Solicită sincronizarea rezervărilor temporare
      socket.emit("requestTempReservationsSync");
    });
    socket.on("settings", (data) => {
      console.log("Home received settings:", data);
      if (data.settings.success) {
        console.log("Updating realStates with:", data.settings.settings);
        setRealStates({
          M1: data.settings.settings.m1Enabled,
          M2: data.settings.settings.m2Enabled,
          Uscator: data.settings.settings.dryerEnabled,
        });
        setBlockPastSlotsEnabled(
          Boolean(data.settings.settings.blockPastSlots)
        );
      }
    });

    // Listener pentru maintenance intervals
    socket.on("maintenance", (data) => {
      switch (data.action) {
        case "create":
          if (data.maintenanceInterval) {
            setMaintenanceIntervals((prev) => [
              ...prev,
              data.maintenanceInterval,
            ]);
          }
          break;
        case "delete":
          if (data.maintenanceId) {
            setMaintenanceIntervals((prev) =>
              prev.filter((interval) => interval.uid !== data.maintenanceId)
            );
          }
          break;
        case "update":
          getMaintenanceIntervals(); // Refresh all intervals
          break;
      }
    });

    // Listener pentru actualizări de utilizator (aprobare/dezaprobare)
    socket.on("userUpdate", (data) => {
      if (data.userId === user?.uid) {
        // Actualizează statusul local al utilizatorului
        if (data.user.validate !== user.validate) {
          if (data.user.validate) {
            toast_success(
              "🎉 Contul tău a fost aprobat! Acum poți face programări."
            );
          } else {
            toast_warn(
              "⚠️ Contul tău a fost dezaprobat. Nu mai poți face programări."
            );
          }
          // Forțează re-render cu noul status
          window.location.reload();
        }
      }
    });
    socket.on("programare", (data) => {
      switch (data.action) {
        case "create":
          if (
            data.programare &&
            data.programare.active &&
            data.programare.active.status === true
          ) {
            let programareToAdd = data.programare;
            if (data.programare.success && data.programare.programare) {
              programareToAdd = data.programare.programare;
            }

            setUsersProgramari((prev) => [...prev, programareToAdd]);
          }
          break;

        case "update":
          if (data.programare) {
            // If the programare was cancelled (active.status = false), remove it from Home view
            if (
              data.programare.active &&
              data.programare.active.status === false
            ) {
              setUsersProgramari((prev) =>
                prev.filter((p) => p.uid !== data.programare.uid)
              );
            } else if (
              data.programare.active &&
              data.programare.active.status === true
            ) {
              // If it's still active, update it
              setUsersProgramari((prev) =>
                prev.map((p) =>
                  p.uid === data.programare.uid ? data.programare : p
                )
              );
            }
          }
          break;

        case "delete":
          if (data.programareId) {
            setUsersProgramari((prev) =>
              prev.filter((p) => p.uid !== data.programareId)
            );
          }
          break;
      }
    });

    // Notifică serverul că utilizatorul s-a conectat
    if (user?.uid) {
      socket.emit("userConnected", { userId: user.uid });
    }

    return () => {
      socket.off("programare");
      socket.off("tempReservation");
      socket.off("cancelTempReservation");
      socket.off("syncTempReservations");
      socket.off("userConnected");
      socket.off("settings");
      socket.off("maintenance");
      socket.off("userUpdate");
    };
  }, [socket, user]);

  // Funcție pentru a verifica dacă un slot este rezervat temporar de alți useri
  const isSlotTempReservedByOthers = (hourIndex, machine) => {
    if (!user?.uid) return false;

    const currentDate = dayjs(value).format("DD/MM/YYYY");

    return Object.entries(tempReservations).some(([userId, reservation]) => {
      if (
        userId === user.uid ||
        !reservation ||
        reservation.machine !== machine
      ) {
        return false;
      }

      if (reservation.date !== currentDate) return false;

      return reservation.intervals.some((interval) => {
        const startIndex = hours.findIndex(
          (h) => h.start_interval_time === interval.start_interval_time
        );
        const endIndex = hours.findIndex(
          (h) => h.final_interval_time === interval.final_interval_time
        );
        return hourIndex >= startIndex && hourIndex <= endIndex;
      });
    });
  };

  // Funcție pentru a verifica dacă o programare este în conflict cu rezervări temporare
  const isConflictingWithTempReservations = (machine, startTime, endTime) => {
    if (!user?.uid) return false;

    const currentDate = dayjs(value).format("DD/MM/YYYY");

    return Object.entries(tempReservations).some(([userId, reservation]) => {
      if (
        userId === user.uid ||
        !reservation ||
        reservation.machine !== machine
      ) {
        return false;
      }

      if (reservation.date !== currentDate) return false;

      return reservation.intervals.some((interval) => {
        return checkTimeOverlap(
          startTime,
          endTime,
          interval.start_interval_time,
          interval.final_interval_time
        );
      });
    });
  };

  // Funcție pentru verificarea suprapunerii temporale
  const checkTimeOverlap = (start1, end1, start2, end2) => {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const start1Minutes = timeToMinutes(start1);
    const end1Minutes = timeToMinutes(end1);
    const start2Minutes = timeToMinutes(start2);
    const end2Minutes = timeToMinutes(end2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  };

  // Funcție pentru a emite rezervarea temporară
  const emitTempReservation = () => {
    if (programari.length > 0 && selectedMachine && user?.uid) {
      const reservation = {
        userId: user.uid,
        userName: user.numeComplet,
        camera: user.camera,
        machine: selectedMachine,
        date: dayjs(value).format("DD/MM/YYYY"),
        intervals: programari.map((p) => ({
          start_interval_time: p.start_interval_time,
          final_interval_time: p.final_interval_time,
        })),
        timestamp: Date.now(),
      };

      socket.emit("tempReservation", { userId: user.uid, reservation });
    }
  };

  // Funcție pentru a anula rezervarea temporară
  const cancelTempReservation = () => {
    if (user?.uid) {
      socket.emit("cancelTempReservation", { userId: user.uid });
    }
  };

  // Effect pentru emiterea rezervărilor temporare
  useEffect(() => {
    if (programari.length > 0 && selectedMachine) {
      emitTempReservation();
    } else if (programari.length === 0 && selectedMachine === "") {
      cancelTempReservation();
    }
  }, [programari, selectedMachine]);

  // Cleanup la unmount
  useEffect(() => {
    return () => {
      cancelTempReservation();
    };
  }, []);
  const applyTempReservationsToHours = (hoursToUpdate) => {
    const currentDate = dayjs(value).format("DD/MM/YYYY");

    Object.entries(tempReservations).forEach(([userId, reservation]) => {
      if (
        userId === user?.uid ||
        !reservation ||
        reservation.date !== currentDate
      ) {
        return;
      }

      reservation.intervals.forEach((interval) => {
        const startIndex = hoursToUpdate.findIndex(
          (h) => h.start_interval_time === interval.start_interval_time
        );
        const endIndex = hoursToUpdate.findIndex(
          (h) => h.final_interval_time === interval.final_interval_time
        );

        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            if (hoursToUpdate[i]) {
              hoursToUpdate[i].status[reservation.machine].status =
                "TEMP_RESERVED";
            }
          }
        }
      });
    });

    return hoursToUpdate;
  };

  const applyLocalReservations = (hoursToUpdate) => {
    // Aplică programările locale ale utilizatorului curent (starea REZERVAT)
    if (programari.length > 0 && selectedMachine) {
      programari.forEach((prog) => {
        const startIndex = hoursToUpdate.findIndex(
          (h) => h.start_interval_time === prog.start_interval_time
        );
        const endIndex = hoursToUpdate.findIndex(
          (h) => h.final_interval_time === prog.final_interval_time
        );

        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            if (hoursToUpdate[i] && hoursToUpdate[i].status[selectedMachine]) {
              hoursToUpdate[i].status[selectedMachine].status =
                STATUS[selectedMachine].REZERVAT.status;
            }
          }
        }
      });
    }

    return hoursToUpdate;
  };

  const updateProgramare = (infos, machine, hour_index) => {
    // Verificăm dacă utilizatorul este aprobat pentru a face programări
    if (!userApproved) {
      toast_error(
        "Contul tău nu este încă aprobat! Nu poți face programări până când un administrator nu îți aprobă contul."
      );
      return;
    }

    // Verificăm dacă intervalul este rezervat temporar de altcineva
    if (isSlotTempReservedByOthers(hour_index, machine)) {
      toast_error("Acest interval este selectat de altcineva în acest moment!");
      return;
    }

    // Verificăm dacă intervalul propus ar fi în conflict cu rezervări temporare
    if (
      isConflictingWithTempReservations(
        machine,
        infos.start_interval_time,
        infos.final_interval_time
      )
    ) {
      toast_error(
        "Acest interval se suprapune cu o selecție a altui utilizator!"
      );
      return;
    }

    setSelectedMachine(machine);
    if (programari.length === 0) {
      setProgramari([{ ...infos }]);
    } else {
      const existingIndex = programari.findIndex(
        (p) =>
          p.start_interval_time === infos.start_interval_time &&
          p.final_interval_time === infos.final_interval_time
      );

      if (existingIndex !== -1) {
        setProgramari((old) => {
          if (old.length >= 2) {
            let index_first_programari = hours.findIndex(
              (h) => h.start_interval_time === programari[0].start_interval_time
            );
            let i = index_first_programari + existingIndex;
            while (i < old.length + index_first_programari) {
              changeStatus(i, machine, STATUS[machine].DISPONIBIL.status);
              i++;
            }
            const newProgramari = [...old];
            newProgramari.splice(existingIndex);
            if (newProgramari.length === 0) {
              setSelectedMachine("");
            }
            return newProgramari;
          } else {
            const newProgramari = old.filter(
              (_, index) => index !== existingIndex
            );
            if (newProgramari.length === 0) setSelectedMachine("");
            return newProgramari;
          }
        });
        changeStatus(hour_index, machine, STATUS[machine].DISPONIBIL.status);
        return;
      } else {
        const consecutiveIndex = programari.findIndex(
          (p) =>
            p.start_interval_time === infos.final_interval_time ||
            p.final_interval_time === infos.start_interval_time
        );

        if (consecutiveIndex !== -1) {
          const newStartTime =
            programari[0].start_interval_time < infos.start_interval_time
              ? programari[0].start_interval_time
              : infos.start_interval_time;
          const newEndTime =
            programari[programari.length - 1].final_interval_time >
            infos.final_interval_time
              ? programari[programari.length - 1].final_interval_time
              : infos.final_interval_time;

          if (
            isConflictingWithTempReservations(machine, newStartTime, newEndTime)
          ) {
            toast_error(
              "Extensia intervalului se suprapune cu o selecție a altui utilizator!"
            );
            return;
          }

          setProgramari((old) => {
            if (
              old[old.length - 1].start_interval_time <
              infos.start_interval_time
            ) {
              return [...old, { ...infos }];
            } else {
              return [{ ...infos }, ...old];
            }
          });
        } else {
          toast_error("Trebuie să fie ore consecutive!");
          return;
        }
      }
    }
    changeStatus(hour_index, machine, STATUS[machine].REZERVAT.status);
    // toast_success("Program adăugat!");
  };

  const changeStatus = (index, mac, status) => {
    setHours((old) => {
      const newHours = [...old];
      if (newHours[index]) {
        newHours[index].status[mac].status = status;
      }
      return newHours;
    });
  };

  const changeStatusByStartFinal = (
    date,
    selectedDate,
    start,
    final,
    machine,
    by,
    status
  ) => {
    const dateToCheck = selectedDate || value;

    if (
      dayjs(date).format("DD/MM/YYYY").toString() ===
      dayjs(dateToCheck).format("DD/MM/YYYY").toString()
    ) {
      setHours((old) => {
        const newHours = [...old];
        const st = newHours.findIndex((h) => h.start_interval_time === start);
        const fn = newHours.findIndex((h) => h.final_interval_time === final);

        if (st !== -1 && fn !== -1) {
          for (let i = st; i <= fn; i++) {
            if (newHours[i]) {
              newHours[i].status[machine].status = status;
              newHours[i].status[machine].by = `cam. ${by}`;
            }
          }
        }
        return newHours;
      });
    }
  };

  const [masini] = useState([
    { id: "m1", name: "M1" },
    { id: "m2", name: "M2" },
    { id: "uscator", name: "Uscator" },
  ]);

  const createProgramare = () => {
    if (programari.length === 0) return null;
    if (programari.length === 1) {
      return {
        start_h: programari[0].start_interval_time,
        final_h: programari[0].final_interval_time,
        date: dayjs(value).format("DD/MM/YYYY").toString(),
      };
    }
    return {
      start_h: programari[0].start_interval_time,
      final_h: programari[programari.length - 1].final_interval_time,
      date: dayjs(value).format("DD/MM/YYYY"),
    };
  };

  const { start_h, final_h, date } = createProgramare() || {};

  const selectDate = async (e) => {
    if (selectedMachine === "") {
      setValue(e.toDate());
    } else {
      toast_warn("Schimbă data doar dacă nu ai selectat mașina!");
    }
  };

  const submit = async () => {
    // Verificăm dacă utilizatorul este aprobat pentru a face programări
    if (!userApproved) {
      toast_error(
        "Contul tău nu este încă aprobat! Nu poți face programări până când un administrator nu îți aprobă contul."
      );
      return;
    }

    const programareToSend = {
      createdAt: dayjs().valueOf(),
      active: { status: true, message: "Programare nouă" },
      date: dayjs(value).tz("Europe/Bucharest"),
      start_interval_time: start_h,
      final_interval_time: final_h,
      machine: selectedMachine,
      user: {
        numeComplet: user ? user.numeComplet : "",
        camera: user ? user.camera : "",
        uid: user ? user.uid : "",
        email: user ? user.google?.email : "",
        telefon: user ? user.telefon : "",
      },
    };
    try {
      const rasp = await AXIOS.post("/api/programare", {
        programareData: programareToSend,
      });
      if (rasp.data.success) {
        toast_success(rasp.data.message);
        setProgramari([]);
        setSelectedMachine("");
        // Anulează rezervarea temporară după ce s-a salvat cu succes
        cancelTempReservation();
      } else {
        toast_error(rasp.data.message);
      }
    } catch (error) {
      toast_error("Eroare la salvarea programării!");
    }
  };

  const renunta = () => {
    setHours((old) => {
      const newHours = [...old];
      for (let i = 0; i < newHours.length; i++) {
        if (
          selectedMachine &&
          newHours[i]?.status[selectedMachine]?.status ===
            STATUS[selectedMachine].REZERVAT.status
        ) {
          newHours[i].status[selectedMachine].status =
            STATUS[selectedMachine].DISPONIBIL.status;
          newHours[i].status[selectedMachine].by = "";
        }
      }
      return newHours;
    });
    setProgramari([]);
    setSelectedMachine("");
    cancelTempReservation();
  };

  // Funcție pentru a obține numele utilizatorului care a rezervat temporar un slot
  const getTempReservationUserName = (hourIndex, machine) => {
    const currentDate = dayjs(value).format("DD/MM/YYYY");
    for (const [userId, reservation] of Object.entries(tempReservations)) {
      if (
        userId === user?.uid ||
        !reservation ||
        reservation.machine !== machine ||
        reservation.date !== currentDate
      ) {
        continue;
      }

      const isInInterval = reservation.intervals.some((interval) => {
        const startIndex = hours.findIndex(
          (h) => h.start_interval_time === interval.start_interval_time
        );
        const endIndex = hours.findIndex(
          (h) => h.final_interval_time === interval.final_interval_time
        );
        return hourIndex >= startIndex && hourIndex <= endIndex;
      });

      if (isInInterval) {
        return `${reservation.userName} (cam. ${reservation.camera})`;
      }
    }
    return null;
  };

  return (
    <div className="home">
      {/* Banner pentru utilizatori neaprobați */}
      {!userApproved && (
        <div className="container">
          <div className="alert alert--warning">
            <div className="alert__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="alert__content">
              <h3>Cont în așteptarea aprobării</h3>
              <p>
                Contul tău nu este încă aprobat de un administrator. Poți naviga
                prin aplicație, dar nu poți face programări până când contul nu
                este aprobat.
              </p>
            </div>
          </div>
        </div>
      )}

      {programari && programari.length > 0 && createProgramare() != null && (
        <div className="home__floating-actions">
          <button className="btn btn-secondary" onClick={renunta}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Renunță
          </button>
          <button className="btn btn-success" onClick={submit}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
            Finalizează programarea
          </button>
        </div>
      )}

      <div className="container">
        {/* Header */}
        <div className="home__header">
          <h1>Programează-ți spălarea</h1>
          <p>Selectează data, mașina și intervalul orar dorit</p>
        </div>

        {/* Booking Summary */}
        {programari && programari.length > 0 && createProgramare() != null && (
          <div className="home__booking-summary">
            <h2>Programarea ta</h2>
            <div className="home__booking-summary__details">
              <div className="home__booking-summary__detail">
                <strong>{selectedMachine}</strong>
                <span>Mașina selectată</span>
              </div>
              <div className="home__booking-summary__detail">
                <strong>{date}</strong>
                <span>Data programării</span>
              </div>
              <div className="home__booking-summary__detail">
                <strong>
                  {start_h} - {final_h}
                </strong>
                <span>Intervalul orar</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="home__controls">
          {/* Date Picker */}
          <div className="home__date-picker">
            <div className="card">
              <h3>Selectează data</h3>
              <DatePicker
                value={value}
                onChange={selectDate}
                format="DD/MM/YYYY"
                disabled={programari && programari.length > 0}
                multiple={false}
                minDate={dayjs().subtract(1, "week").toDate()}
                maxDate={dayjs().add(3, "weeks").toDate()}
              />
              <p
                className="mt-3 text-center"
                style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
              >
                {dayjs(value)
                  .tz("Europe/Bucharest")
                  .format("dddd, D MMMM YYYY")}
              </p>
            </div>
          </div>

          {/* Machine Selector */}
          <div className="home__machine-selector">
            <div className="card">
              <h3>Selectează mașina</h3>
              <div className="home__machine-selector__grid">
                {masini.map((m) => (
                  <div
                    key={m.id}
                    className={`home__machine-selector__option ${
                      selectedMachine === m.name
                        ? "home__machine-selector__option--selected"
                        : ""
                    } ${
                      !realStates[m.name]
                        ? "home__machine-selector__option--disabled"
                        : ""
                    }`}
                    onClick={() => {
                      if (!realStates[m.name]) {
                        return;
                      }

                      const isAlreadySelected = selectedMachine === m.name;

                      if (programari && programari.length > 0) {
                        renunta();
                        if (isAlreadySelected) {
                          setSelectedMachine("");
                          return;
                        }
                      }

                      setSelectedMachine(isAlreadySelected ? "" : m.name);
                    }}
                  >
                    <div className="home__machine-selector__option__name">
                      {m.name}
                    </div>
                    <div className="home__machine-selector__option__status">
                      {realStates[m.name] ? (
                        <span className="badge badge--success">
                          Disponibilă
                        </span>
                      ) : (
                        <span className="badge badge--error">
                          Indisponibilă
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Temp Reservations Alert */}
        {(() => {
          const currentDate = dayjs(value).format("DD/MM/YYYY");
          const currentDateReservations = Object.entries(
            tempReservations
          ).filter(
            ([userId, reservation]) =>
              userId !== user?.uid &&
              reservation &&
              reservation.date === currentDate
          );

          if (currentDateReservations.length === 0) {
            return null;
          }

          return (
            <div className="alert alert--info">
              <div className="alert__icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className="alert__content">
                <h3>Rezervări temporare active pentru {currentDate}</h3>
                <div style={{ marginTop: "0.5rem" }}>
                  {currentDateReservations.map(([userId, reservation]) => (
                    <div
                      key={userId}
                      style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}
                    >
                      <strong>{reservation.userName}</strong> (cam.{" "}
                      {reservation.camera}) selectează{" "}
                      <strong>{reservation.machine}</strong> pentru:{" "}
                      {reservation.intervals.map((interval, idx) => (
                        <span key={idx}>
                          {interval.start_interval_time} -{" "}
                          {interval.final_interval_time}
                          {idx < reservation.intervals.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Schedule */}
        <div className="home__schedule">
          <div className="card">
            <div className="card__header">
              <h3>
                Program pentru {dayjs(value).format("DD/MM/YYYY")}
                <span
                  className={`badge ${
                    selectedMachine ? "badge--info" : "badge--warning"
                  }`}
                >
                  {selectedMachine || "Toate maşinile"}
                </span>
              </h3>
            </div>

            <div className="table__scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Interval orar</th>
                    <th>M1</th>
                    <th>M2</th>
                    <th>Uscător</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((hour, index) => (
                    <tr key={hour.start_interval_time}>
                      <td
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {hour.time}
                      </td>
                      {masini.map((m) => {
                        const isTempReserved = isSlotTempReservedByOthers(
                          index,
                          m.name
                        );
                        const tempReserverName = isTempReserved
                          ? getTempReservationUserName(index, m.name)
                          : null;
                        const status = hour.status[m.name].status;

                        let rowClass = "";
                        let cellContent = status;

                        // Dacă o mașină este selectată și aceasta nu este mașina curentă
                        const isOtherMachineSelected =
                          selectedMachine !== "" && selectedMachine !== m.name;

                        const slotEndDateTime = dayjs
                          .tz(
                            `${selectedDate.format("YYYY-MM-DD")} ${hour.final_interval_time}`,
                            "YYYY-MM-DD HH:mm",
                            timeZone
                          )
                          .subtract(1, "minute");
                        const isPastSlot =
                          blockPastSlotsEnabled &&
                          isSelectedDateToday &&
                          slotEndDateTime.isBefore(now);

                        if (isTempReserved) {
                          rowClass = "table__row--warning";
                          cellContent = (
                            <div style={{ fontSize: "0.75rem" }}>
                              <div style={{ fontWeight: "600" }}>
                                ÎN CURS DE REZERVARE
                              </div>
                              <div style={{ opacity: 0.8 }}>
                                {tempReserverName}
                              </div>
                            </div>
                          );
                        } else if (isPastSlot) {
                          rowClass = "table__row--cancelled";
                          cellContent = blockPastSlotsEnabled
                            ? "Trecut"
                            : cellContent;
                        } else if (isOtherMachineSelected) {
                          rowClass = "table__row--cancelled";
                          cellContent = "Indisponibil";
                        } else if (status === "DISPONIBIL") {
                          rowClass = "table__row--success";
                          cellContent = "Disponibil";
                        } else if (status === "OCUPAT") {
                          rowClass = "table__row--error";
                          cellContent = hour.status[m.name].by
                            ? `Ocupat (${hour.status[m.name].by})`
                            : "Ocupat";
                        } else if (status === "MENTENANTA") {
                          rowClass = "table__row--warning";
                          cellContent = "Mentenanță";
                        } else if (status === "REZERVAT") {
                          rowClass = "table__row--info";
                          cellContent = "Rezervat";
                        } else if (!realStates[m.name]) {
                          rowClass = "table__row--cancelled";
                          cellContent = "Indisponibil";
                        }

                        const canClick =
                          (selectedMachine === "" ||
                            selectedMachine === m.name) &&
                          status !== "OCUPAT" &&
                          status !== "MENTENANTA" &&
                          realStates[m.name] === true &&
                          !isTempReserved &&
                          !isPastSlot;

                        return (
                          <td
                            key={m.id}
                            className={rowClass}
                            onClick={() => {
                              if (status === "OCUPAT") {
                                handleOccupiedSlotClick(hour, m.name);
                                return;
                              }
                              if (
                                dayjs(value).isBefore(dayjs().startOf("day"))
                              ) {
                                toast_error(
                                  "Nu poți face o programare în trecut!"
                                );
                                return;
                              } else if (canClick) {
                                updateProgramare(hour, m.name, index);
                              }
                            }}
                            style={{
                              cursor: canClick ? "pointer" : "not-allowed",
                              textAlign: "center",
                              fontSize: "0.875rem",
                              fontWeight: "600",
                            }}
                            title={
                              isTempReserved
                                ? `ÎN CURS DE REZERVARE de: ${tempReserverName}`
                                : hour.status[m.name].by || status
                            }
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedBookingDetails && (
          <div className="home__booking-modal" role="dialog" aria-modal="true">
            <div
              className="home__booking-modal__backdrop"
              onClick={closeBookingModal}
            ></div>
            <div className="home__booking-modal__content">
              <button
                type="button"
                className="home__booking-modal__close"
                onClick={closeBookingModal}
                aria-label="Închide"
              >
                ×
              </button>
              <h3>Detalii rezervare</h3>
              <div className="home__booking-modal__details">
                <p>
                  <span>Mașină:</span> {selectedBookingDetails.machine}
                </p>
                <p>
                  <span>Interval:</span> {selectedBookingDetails.interval}
                </p>
                <p>
                  <span>Nume:</span> {selectedBookingDetails.nume}
                </p>
                <p>
                  <span>Cameră:</span> {selectedBookingDetails.camera}
                </p>
                <p>
                  <span>Telefon:</span>{" "}
                  {selectedBookingDetails.telefon || "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
