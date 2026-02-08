import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import DatePicker from "react-multi-date-picker";
import { STATUS } from "../utils/status";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/ro";
import { useAuth } from "../utils/AuthContext";
import { toast_error, toast_success, toast_warn } from "../utils/Toasts";
import AXIOS from "../utils/Axios_config";
import { useSocket } from "../utils/SocketContext";
import "./Home.scss";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.locale("ro");

const BUCURESTI_TZ = "Europe/Bucharest";
const DRYER_MACHINE = "Uscator";
const DRYER_MAX_HOURS = 9;
const DRYER_SELECTION_DEBOUNCE_MS = 300;

const getMaintenanceUid = (interval = {}) =>
  interval.uid || interval.id || interval.maintenanceId || interval.docId || null;

const toBucharestDayjs = (value) => {
  if (value === undefined || value === null) {
    return dayjs(NaN);
  }

  if (typeof value === "number" || value instanceof Date) {
    return dayjs(value).tz(BUCURESTI_TZ);
  }

  if (dayjs.isDayjs(value)) {
    return value.tz(BUCURESTI_TZ);
  }

  if (typeof value === "string") {
    if (value.includes("T")) {
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed.tz(BUCURESTI_TZ) : dayjs(NaN);
    }

    if (value.includes(" ")) {
      const parsed = dayjs.tz(value, "DD/MM/YYYY HH:mm", BUCURESTI_TZ);
      return parsed.isValid() ? parsed : dayjs(NaN);
    }

    if (value.includes("/")) {
      const parsed = dayjs.tz(value, "DD/MM/YYYY", BUCURESTI_TZ);
      return parsed.isValid() ? parsed : dayjs(NaN);
    }
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.tz(BUCURESTI_TZ) : dayjs(NaN);
};

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
  const [dryerDurationHours, setDryerDurationHours] = useState("");
  const [dryerDurationMinutes, setDryerDurationMinutes] = useState("");
  const [dryerSubmitting, setDryerSubmitting] = useState(false);
  const [dryerStatusTick, setDryerStatusTick] = useState(Date.now());
  const dryerValidationRef = useRef(null);
  const [dryerDurationError, setDryerDurationError] = useState(null);
  const dryerSelectionEmitRef = useRef(null);
  const [liveDryerSelection, setLiveDryerSelection] = useState(null);
  const [isUserApproved, setIsUserApproved] = useState(Boolean(userApproved));

  useEffect(() => {
    setIsUserApproved(Boolean(userApproved));
  }, [userApproved]);

  const washingMachines = useMemo(
    () => [
      { id: "m1", name: "M1" },
      { id: "m2", name: "M2" },
    ],
    []
  );

  const timeZone = BUCURESTI_TZ;
  const now = dayjs().tz(timeZone);
  const selectedDate = dayjs(value).tz(timeZone);
  const isSelectedDateToday = selectedDate.isSame(now, "day");
  const isDryerSelected = selectedMachine === DRYER_MACHINE;
  const isWashingMachineSelected = washingMachines.some(
    (machine) => machine.name === selectedMachine
  );
  const dryerEnabled = realStates[DRYER_MACHINE];
  const todayBucharest = dayjs().tz(BUCURESTI_TZ).startOf("day");

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

      if (user && isUserApproved)
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
        const validProgramari = (rasp.data.programari || []).filter(
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
      } else if (rasp.data.status === 404) {
        setUsersProgramari([]);
        return;
      } else {
        setUsersProgramari([]);
        toast_error(rasp.data.message || "Eroare la incarcarea programarilor.");
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        setUsersProgramari([]);
        return;
      }
      console.error("Eroare la incarcarea programarilor:", error);
      toast_error(error.message || "Eroare la incarcarea programarilor.");
    }
  };

  const getTempReservations = async () => {
    try {
      const response = await AXIOS.get("/api/temp-reservations");
      if (response.data.success) {
        setTempReservations(response.data.tempReservations || {});
      } else {
        setTempReservations({});
        toast_error(
          response.data.message ||
            "Eroare la incarcarea rezervarilor temporare."
        );
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        setTempReservations({});
        return;
      }
      console.error("Error loading temp reservations:", error);
    }
  };

  const getSettings = async () => {
    try {
      const rasp = await AXIOS.get("/api/settings");
      if (rasp.data.success) {
        setRealStates({
          M1: rasp.data.settings.m1Enabled,
          M2: rasp.data.settings.m2Enabled,
          Uscator: rasp.data.settings.dryerEnabled,
        });
        setBlockPastSlotsEnabled(Boolean(rasp.data.settings.blockPastSlots));
      } else if (rasp.data.status === 404) {
        setRealStates({
          M1: false,
          M2: false,
          Uscator: false,
        });
        setBlockPastSlotsEnabled(false);
        return;
      } else {
        setRealStates({
          M1: false,
          M2: false,
          Uscator: false,
        });
        setBlockPastSlotsEnabled(false);
        toast_error(rasp.data.message || "Eroare la incarcarea setarilor.");
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        setRealStates({
          M1: false,
          M2: false,
          Uscator: false,
        });
        setBlockPastSlotsEnabled(false);
        return;
      }
      console.error("Error fetching settings:", error);
    }
  };

  const getMaintenanceIntervals = async () => {
    try {
      const rasp = await AXIOS.get("/api/maintenance");
      if (rasp.data.success) {
        setMaintenanceIntervals(rasp.data.maintenanceIntervals);
      } else {
        setMaintenanceIntervals([]);
        toast_error(
          rasp.data.message ||
            "Eroare la incarcarea intervalilor de mentenanță."
        );
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        setMaintenanceIntervals([]);
        return;
      }
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
      // Solicită sincronizarea rezervărililor temporare
      socket.emit("requestTempReservationsSync");
    });
    socket.on("settings", (data) => {
      const payload =
        data?.settings?.settings ?? data?.settings ?? data ?? null;

      if (!payload) {
        console.warn("Settings payload missing, refetching...");
        getSettings();
        return;
      }

      const {
        m1Enabled,
        m2Enabled,
        dryerEnabled,
        blockPastSlots,
      } = payload;

      if (
        typeof m1Enabled === "undefined" &&
        typeof m2Enabled === "undefined" &&
        typeof dryerEnabled === "undefined"
      ) {
        console.warn("Settings payload incomplete, refetching...");
        getSettings();
        return;
      }

      setRealStates({
        M1: Boolean(m1Enabled),
        M2: Boolean(m2Enabled),
        Uscator: Boolean(dryerEnabled),
      });
      setBlockPastSlotsEnabled(Boolean(blockPastSlots));
    });

    // Listener pentru maintenance intervals
    socket.on("maintenance", (data) => {
      switch (data.action) {
        case "create":
          if (data.maintenanceInterval) {
            const normalized = {
              ...data.maintenanceInterval,
              uid: getMaintenanceUid(data.maintenanceInterval),
            };

            setMaintenanceIntervals((prev) => {
              const next = prev.filter(
                (interval) =>
                  getMaintenanceUid(interval) !== getMaintenanceUid(normalized)
              );
              return [...next, normalized];
            });
          }
          break;
        case "delete":
          if (data.maintenanceId) {
            setMaintenanceIntervals((prev) =>
              prev.filter(
                (interval) => getMaintenanceUid(interval) !== data.maintenanceId
              )
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
      if (data.userId === user?.uid && data.action === "approval_changed") {
        if (data.user.validate) {
          toast_success(
            "🎉 Contul tău a fost aprobat! Acum poți face programări."
          );
        } else {
          toast_warn(
            "⚠️ Contul tău a fost dezaprobat. Nu mai poți face programări."
          );
        }
        setIsUserApproved(Boolean(data.user.validate));
      }
    });
    socket.on("programare", (data) => {
      switch (data.action) {
        case "create":
          if (data.programare) {
            const nextProgramare = data.programare.success
              ? data.programare.programare
              : data.programare;
            if (nextProgramare) {
              setUsersProgramari((prev) => {
                const exists = prev.some((p) => p.uid === nextProgramare.uid);
                if (exists) {
                  return prev.map((p) =>
                    p.uid === nextProgramare.uid ? nextProgramare : p
                  );
                }
                return [...prev, nextProgramare];
              });
            }
          }
          break;

        case "update":
          if (data.programare) {
            setUsersProgramari((prev) => {
              const exists = prev.some((p) => p.uid === data.programare.uid);
              if (!exists) {
                return [...prev, data.programare];
              }
              if (
                data.programare.active &&
                data.programare.active.status === false
              ) {
                return prev.filter((p) => p.uid !== data.programare.uid);
              }
              return prev.map((p) =>
                p.uid === data.programare.uid ? data.programare : p
              );
            });
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
  useEffect(() => {
    return () => {
      socket.off("settings");
    };
  }, []);
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
    if (!isUserApproved) {
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

  const resolveDryerStart = useCallback(() => {
    const selectedDate = dayjs(value).tz(BUCURESTI_TZ);
    if (!selectedDate.isValid()) {
      return null;
    }

    const nowBucharest = dayjs().tz(BUCURESTI_TZ);
    return selectedDate
      .hour(nowBucharest.hour())
      .minute(nowBucharest.minute())
      .second(0)
      .millisecond(0);
  }, [value]);

  const dryerDurationTotalMinutes = useMemo(() => {
    const parsedHours = Number(dryerDurationHours);
    const hours = Number.isFinite(parsedHours) ? parsedHours : 0;

    const minutesParsed =
      dryerDurationMinutes === ""
        ? NaN
        : Number.parseInt(dryerDurationMinutes, 10);
    const minutes = Number.isFinite(minutesParsed) ? minutesParsed : 0;
    return hours * 60 + minutes;
  }, [dryerDurationHours, dryerDurationMinutes]);
  const upcomingDryerMaintenance = useMemo(() => {
    if (!maintenanceIntervals?.length) {
      return [];
    }

    return maintenanceIntervals
      .filter((interval) => interval.machine === DRYER_MACHINE)
      .map((interval) => {
        const startTime = interval.startTime || interval.start_interval_time;
        const endTime = interval.endTime || interval.final_interval_time;
        return {
          ...interval,
          intervalStart: startTime
            ? toBucharestDayjs(`${interval.date} ${startTime}`)
            : dayjs(NaN),
          intervalEnd: endTime
            ? toBucharestDayjs(`${interval.date} ${endTime}`)
            : dayjs(NaN),
        };
      })
      .filter(
        (interval) => interval.intervalStart.isValid() && interval.intervalEnd.isValid()
      )
      .sort((a, b) => a.intervalStart.valueOf() - b.intervalStart.valueOf());
  }, [maintenanceIntervals]);

  const validateDryerDuration = useCallback(
    (hoursValue, minutesValue) => {
      const parsedHours = Number(hoursValue);
      const hrs = Number.isFinite(parsedHours) ? parsedHours : 0;

      const parsedMinutes = Number(minutesValue);
      const mins = Number.isFinite(parsedMinutes) ? parsedMinutes : 0;

      if (hrs === 0 && mins === 0) {
        setDryerDurationError("Durata trebuie să fie mai mare de 0 minute.");
        return false;
      }

      if (hrs > DRYER_MAX_HOURS || hrs < 0) {
        setDryerDurationError(
          `Durata maximă este de ${DRYER_MAX_HOURS} ore.`
        );
        return false;
      }

      if (mins < 0 || mins >= 60) {
        setDryerDurationError("Minutele trebuie să fie între 0 și 59.");
        return false;
      }

      const totalMinutes = hrs * 60 + mins;
      const start = resolveDryerStart();

      if (start) {
        const end = start.add(totalMinutes, "minute");
        const maintenanceOverlap = upcomingDryerMaintenance.find(
          (interval) =>
            interval.date === start.format("DD/MM/YYYY") &&
            interval.intervalStart.isBefore(end) &&
            interval.intervalEnd.isAfter(start)
        );

        if (maintenanceOverlap) {
          const startLabel = maintenanceOverlap.intervalStart.format("HH:mm");
          const endLabel = maintenanceOverlap.intervalEnd.format("HH:mm");
          setDryerDurationError(
            `Durata se suprapune cu mentenanța programată ${startLabel}-${endLabel}.`
          );
          return false;
        }

        const endOfDay = start.endOf("day");
        if (end.isAfter(endOfDay)) {
          setDryerDurationError(
            "Durata aleasă depășește ziua curentă. Selectează o durată care se încheie înainte de 23:59."
          );
          return false;
        }
      }

      setDryerDurationError(null);
      return true;
    },
    [resolveDryerStart, upcomingDryerMaintenance]
  );

  const debounceDryerValidation = useCallback(
    (nextHours, nextMinutes) => {
      if (dryerValidationRef.current) {
        clearTimeout(dryerValidationRef.current);
      }
      dryerValidationRef.current = setTimeout(() => {
        validateDryerDuration(nextHours, nextMinutes);
        dryerValidationRef.current = null;
      }, DRYER_SELECTION_DEBOUNCE_MS);
    },
    [validateDryerDuration]
  );

 
  const handleDryerHoursChange = useCallback(
    (event) => {
      const rawValue = event.target.value;

      if (rawValue === "") {
        setDryerDurationHours("");
        debounceDryerValidation(0, Number(dryerDurationMinutes) || 0);
        setDryerStatusTick(Date.now());
        return;
      }

      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) {
        return;
      }

      const clampedValue = Math.max(0, Math.min(DRYER_MAX_HOURS, numericValue));
      if (clampedValue !== numericValue) {
        toast_warn(`Orele trebuie să fie între 0 și ${DRYER_MAX_HOURS}.`);
      }

      setDryerDurationHours(clampedValue.toString());
      const currentMinutes =
        dryerDurationMinutes === ""
          ? 0
          : Number.isNaN(Number(dryerDurationMinutes))
          ? 0
          : Number(dryerDurationMinutes);
      debounceDryerValidation(clampedValue, currentMinutes);
      setDryerStatusTick(Date.now());
    },
    [debounceDryerValidation, dryerDurationMinutes]
  );

  const handleDryerMinutesChange = useCallback(
    (event) => {
      const rawValue = event.target.value;

      if (rawValue === "") {
        setDryerDurationMinutes("");
        const currentHours = Number.isNaN(Number(dryerDurationHours))
          ? 0
          : Number(dryerDurationHours);
        debounceDryerValidation(currentHours, 0);
        setDryerStatusTick(Date.now());
        return;
      }

      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) {
        return;
      }

      const clampedValue = Math.max(0, Math.min(59, numericValue));
      if (clampedValue !== numericValue) {
        toast_warn("Minutele trebuie să fie între 0 și 59.");
      }

      const formattedValue = clampedValue.toString().padStart(2, "0");
      setDryerDurationMinutes(formattedValue);
      const currentHours = Number.isNaN(Number(dryerDurationHours))
        ? 0
        : Number(dryerDurationHours);
      debounceDryerValidation(currentHours, clampedValue);
      setDryerStatusTick(Date.now());
    },
    [debounceDryerValidation, dryerDurationHours]
  );

  const dryerDraftTiming = useMemo(() => {
    if (!isDryerSelected || dryerDurationTotalMinutes <= 0) {
      return { start: null, end: null };
    }

    const start = resolveDryerStart();
    if (!start) {
      return { start: null, end: null };
    }

    const end = start.add(dryerDurationTotalMinutes, "minute");
    const endOfDay = start.endOf("day");
    const earliestMaintenanceOverlap = upcomingDryerMaintenance.find(
      (interval) =>
        interval.date === start.format("DD/MM/YYYY") &&
        interval.intervalStart.isBefore(end) &&
        interval.intervalEnd.isAfter(start)
    );

    if (earliestMaintenanceOverlap) {
      return { start, end: earliestMaintenanceOverlap.intervalStart }; // strictly before maintenance
    }

    if (end.isAfter(endOfDay)) {
      return { start, end: endOfDay };
    }

    return { start, end };
  }, [
    isDryerSelected,
    dryerDurationTotalMinutes,
    dryerStatusTick,
    resolveDryerStart,
    upcomingDryerMaintenance,
  ]);

  useEffect(() => {
    validateDryerDuration(
      Number(dryerDurationHours),
      Number(dryerDurationMinutes)
    );
  }, [validateDryerDuration]);

  useEffect(() => {
    return () => {
      if (dryerValidationRef.current) {
        clearTimeout(dryerValidationRef.current);
      }
      if (dryerSelectionEmitRef.current) {
        clearTimeout(dryerSelectionEmitRef.current);
      }
    };
  }, []);

  const emitDryerSelection = useCallback(
    (payload) => {
      if (!socket || !user?.uid) return;
      socket.emit("dryerSelection", {
        userId: user.uid,
        selection: {
          ...payload,
          userName: user?.numeComplet || "Utilizator",
          camera: user?.camera || "?",
          updatedAt: Date.now(),
        },
      });
    },
    [socket, user]
  );

  const emitCancelDryerSelection = useCallback(() => {
    if (!socket || !user?.uid) return;
    socket.emit("cancelDryerSelection", { userId: user.uid });
  }, [socket, user]);

  useEffect(() => {
    if (!socket) return;

    const handleDryerSelection = (data) => {
      if (!data?.userId) return;
      if (data.userId === user?.uid) {
        return;
      }
      setLiveDryerSelection({ userId: data.userId, ...data.selection });
    };

    const handleSyncDryerSelection = (data) => {
      const selections = data?.dryerSelections || {};
      const entries = Object.entries(selections).filter(
        ([userId]) => userId !== user?.uid
      );
      if (entries.length === 0) {
        setLiveDryerSelection(null);
        return;
      }
      const [firstUserId, selection] = entries[0];
      setLiveDryerSelection({ userId: firstUserId, ...selection });
    };

    const handleCancelDryerSelection = (data) => {
      if (data?.userId && data.userId !== user?.uid) {
        setLiveDryerSelection((current) => {
          if (current?.userId === data.userId) {
            return null;
          }
          return current;
        });
      }
    };

    socket.on("dryerSelection", handleDryerSelection);
    socket.on("syncDryerSelection", handleSyncDryerSelection);
    socket.on("cancelDryerSelection", handleCancelDryerSelection);

    if (user?.uid) {
      socket.emit("requestDryerSelectionSync");
    }

    return () => {
      socket.off("dryerSelection", handleDryerSelection);
      socket.off("syncDryerSelection", handleSyncDryerSelection);
      socket.off("cancelDryerSelection", handleCancelDryerSelection);
    };
  }, [socket, user]);

  const isAnotherUserEditingDryer = useMemo(() => {
    if (!liveDryerSelection) return false;
    return liveDryerSelection.userId !== user?.uid;
  }, [liveDryerSelection, user]);

  useEffect(() => {
    if (!isDryerSelected) {
      emitCancelDryerSelection();
      return;
    }
    if (!user?.uid || dryerDurationError) {
      return;
    }

    if (!dryerDraftTiming.start || !dryerDraftTiming.end) {
      return;
    }

    if (dryerSelectionEmitRef.current) {
      clearTimeout(dryerSelectionEmitRef.current);
    }

    dryerSelectionEmitRef.current = setTimeout(() => {
      const start = dryerDraftTiming.start?.valueOf() || null;
      const end = dryerDraftTiming.end?.valueOf() || null;
      emitDryerSelection({
        durationMinutes: dryerDurationTotalMinutes,
        startTimestamp: start,
        endTimestamp: end,
      });
      dryerSelectionEmitRef.current = null;
    }, DRYER_SELECTION_DEBOUNCE_MS);
  }, [
    isDryerSelected,
    dryerDurationTotalMinutes,
    dryerDraftTiming,
    emitDryerSelection,
    emitCancelDryerSelection,
    user,
    dryerDurationError,
  ]);

  const dryerActiveBooking = useMemo(() => {
    const allActiveDryerBookings = usersProgramari
      .filter((booking) => booking.machine === DRYER_MACHINE)
      .filter((booking) => booking.active?.status === true)
      .map((booking) => {
        const start = toBucharestDayjs(
          `${booking.date} ${booking.start_interval_time}`
        );
        const end = toBucharestDayjs(
          `${booking.date} ${booking.final_interval_time}`
        );

        return {
          ...booking,
          startsAt: start,
          endsAt: end,
        };
      })
      .filter((booking) => booking.startsAt.isValid() && booking.endsAt.isValid());

    if (allActiveDryerBookings.length === 0) {
      return null;
    }

    const nowBucharest = dayjs().tz(BUCURESTI_TZ);

    const next = allActiveDryerBookings.find((booking) =>
      booking.endsAt.isAfter(nowBucharest)
    );

    return next || allActiveDryerBookings[0];
  }, [usersProgramari, dryerStatusTick]);

  const dryerRemainingMinutes = useMemo(() => {
    if (!dryerActiveBooking || !dryerActiveBooking.endsAt) {
      return null;
    }

    const nowBucharest = dayjs().tz(BUCURESTI_TZ);
    const diff = dryerActiveBooking.endsAt.diff(nowBucharest, "minute");
    return Math.max(0, diff);
  }, [dryerActiveBooking, dryerStatusTick]);

  const dryerOccupantName =
    dryerActiveBooking?.user?.numeComplet || "Utilizator necunoscut";
  const dryerOccupantRoom = dryerActiveBooking?.user?.camera
    ? ` (cam. ${dryerActiveBooking.user.camera})`
    : "";
  const dryerEndsAtLabel = dryerActiveBooking?.endsAt?.format("HH:mm");

  const dryerMaintenanceActive = useMemo(() => {
    const nowBucharest = dayjs().tz(BUCURESTI_TZ);

    return maintenanceIntervals.some((interval) => {
      if (interval.machine !== DRYER_MACHINE) {
        return false;
      }

      const intervalDate = toBucharestDayjs(interval.date);
      if (!intervalDate.isValid() || !nowBucharest.isSame(intervalDate, "day")) {
        return false;
      }

      const startTime = interval.startTime || interval.start_interval_time;
      const endTime = interval.endTime || interval.final_interval_time;

      const startDayjs = startTime
        ? toBucharestDayjs(`${interval.date} ${startTime}`)
        : dayjs(NaN);
      const endDayjs = endTime
        ? toBucharestDayjs(`${interval.date} ${endTime}`)
        : dayjs(NaN);

      if (!startDayjs.isValid() || !endDayjs.isValid()) {
        return false;
      }

      return nowBucharest.isBetween(startDayjs, endDayjs, null, "[]");
    });
  }, [maintenanceIntervals, dryerStatusTick]);

  const dryerSelectable = useMemo(() => {
    if (!dryerEnabled) {
      return false;
    }
    if (dryerMaintenanceActive) {
      return false;
    }
    if (dryerActiveBooking) {
      return false;
    }
    if (isAnotherUserEditingDryer) {
      return false;
    }
    return true;
  }, [
    dryerEnabled,
    dryerMaintenanceActive,
    dryerActiveBooking,
    isAnotherUserEditingDryer,
  ]);

  const dryerTileStatus = useMemo(() => {if (dryerActiveBooking) {
      const until = dryerEndsAtLabel ? ` până la ${dryerEndsAtLabel}` : "";
      return `Ocupat de ${dryerOccupantName}${dryerOccupantRoom}${until}`;
    }
    if (isAnotherUserEditingDryer && liveDryerSelection) {
      return `Selectat de ${liveDryerSelection.userName || "Utilizator"} (cam. ${
        liveDryerSelection.camera || "?"
      })`;
    }
    if (!dryerEnabled) {
      return "Uscător indisponibil";
    }
    if (dryerMaintenanceActive) {
      return "Mentenanță în curs";
    }

    const selectedDay = dayjs(value).tz(BUCURESTI_TZ).format("DD/MM/YYYY");
    const maintenanceToday = upcomingDryerMaintenance.filter(
      (interval) => interval.date === selectedDay
    );

    if (maintenanceToday.length) {
      const nextInterval = maintenanceToday[0];
      const startLabel = nextInterval.intervalStart.format("HH:mm");
      const endLabel = nextInterval.intervalEnd.format("HH:mm");
      return `Mentenanță programată ${startLabel}-${endLabel}`;
    }

    
    return "Disponibil";
  }, [
    dryerEnabled,
    dryerMaintenanceActive,
    dryerActiveBooking,
    dryerEndsAtLabel,
    dryerOccupantName,
    dryerOccupantRoom,
    isAnotherUserEditingDryer,
    liveDryerSelection,
    upcomingDryerMaintenance,
    value,
  ]);

  const canSubmitDryer =
    !dryerSubmitting &&
    !dryerActiveBooking &&
    !dryerMaintenanceActive &&
    dryerDurationTotalMinutes > 0 &&
    !dryerDurationError &&
    !isAnotherUserEditingDryer &&
    Boolean(dryerDraftTiming.start);
  const dryerActionLabel = dryerMaintenanceActive
    ? "Uscător indisponibil"
    : dryerActiveBooking
    ? "Uscător ocupat"
    : dryerDurationTotalMinutes <= 0
    ? "Alege durata"
    : "Rezervă uscătorul";

  useEffect(() => {
    const shouldTick =
      selectedMachine === DRYER_MACHINE || Boolean(dryerActiveBooking);
    if (!shouldTick) {
      return undefined;
    }

    const intervalMs = dryerActiveBooking ? 5_000 : 15_000;
    const timer = setInterval(() => {
      setDryerStatusTick(Date.now());
      getProgramari();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [selectedMachine, dryerActiveBooking]);

  useEffect(() => {
    if (isDryerSelected) {
      setValue(todayBucharest.toDate());
      setProgramari([]);
      cancelTempReservation();
    }
  }, [isDryerSelected]);

  const handleMachineSelect = (machineName) => {
    const isDryer = machineName === DRYER_MACHINE;

    if (isDryer) {
      if (!dryerSelectable) {
        toast_warn("Uscătorul nu este disponibil momentan.");
        return;
      }
      window.scrollTo(0, 0);

      setValue(todayBucharest.toDate());
      setSelectedMachine(DRYER_MACHINE);
      setProgramari([]);
      cancelTempReservation();
      return;
    }

    const washerEnabled = Boolean(realStates[machineName]);
    if (!washerEnabled) {
      toast_warn("Această mașină nu este disponibilă momentan.");
      return;
    }

    if (selectedMachine === DRYER_MACHINE) {
      cancelTempReservation();
      setProgramari([]);
    }

    setSelectedMachine(machineName);
  };

  const handleCancelDryerSelection = () => {
    if (selectedMachine !== DRYER_MACHINE) {
      return;
    }

    setSelectedMachine("");
    cancelTempReservation();
    setDryerDurationHours(1);
    setDryerDurationMinutes("");
    emitCancelDryerSelection();
  };

  const createProgramare = () => {
    if (!isWashingMachineSelected || programari.length === 0) {
      return null;
    }
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
    const pickedDate = dayjs(e?.toDate?.() || e).tz(BUCURESTI_TZ);

    if (selectedMachine === DRYER_MACHINE) {
      if (!pickedDate.isSame(todayBucharest, "day")) {
        toast_warn("Rezervările pentru uscător se pot face doar pentru ziua de azi.");
        setValue(todayBucharest.toDate());
        return;
      }
    }

    if (selectedMachine === "") {
      setValue(pickedDate.toDate());
    } else {
      toast_warn("Schimbă data doar dacă nu ai selectat mașina!");
    }
  };

  const submitWashingMachineBooking = async () => {
    if (!isUserApproved) {
      toast_error(
        "Contul tău nu este încă aprobat! Nu poți face programări până când un administrator nu îți aprobă contul."
      );
      return;
    }

    if (!isWashingMachineSelected) {
      toast_warn("Selectează M1 sau M2 pentru a folosi această acțiune.");
      return;
    }

    if (!start_h || !final_h) {
      toast_error("Selectează un interval valid pentru mașină.");
      return;
    }

    const programareToSend = {
      createdAt: dayjs().valueOf(),
      active: { status: true, message: "Programare nouă" },
      date: dayjs(value).tz(BUCURESTI_TZ),
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
        cancelTempReservation();
        emitCancelDryerSelection();
      } else {
        toast_error(rasp.data.message || "Eroare la salvarea programării!");
      }
    } catch (error) {
      toast_error("Eroare la salvarea programării!");
    }
  };

  const submitDryerBooking = async () => {
    if (!isUserApproved) {
      toast_error(
        "Contul tău nu este încă aprobat! Nu poți face programări până când un administrator nu îți aprobă contul."
      );
      return;
    }

    if (!isDryerSelected) {
      toast_warn("Selectează uscătorul pentru a face o rezervare.");
      return;
    }

    if (!realStates[DRYER_MACHINE]) {
      toast_error("Uscătorul este indisponibil momentan.");
      return;
    }

    if (dryerMaintenanceActive) {
      toast_error("Uscătorul este în mentenanță în prezent.");
      return;
    }

    if (dryerDurationTotalMinutes <= 0) {
      toast_error("Durata trebuie să fie mai mare decât 0 minute.");
      return;
    }

    const dryerStart = resolveDryerStart();
    if (!dryerStart) {
      toast_error("Selectează o dată validă pentru rezervarea uscătorului.");
      return;
    }
    const bookingDate = dayjs(value).tz(BUCURESTI_TZ);
    if (!bookingDate.isValid()) {
      toast_error("Selectează o dată validă pentru rezervare.");
      return;
    }
    if (!bookingDate.startOf("day").isSame(todayBucharest, "day")) {
      toast_error("Uscătorul se poate rezerva doar pentru ziua curentă.");
      setValue(todayBucharest.toDate());
      return;
    }
    const dryerEnd = dryerStart.add(dryerDurationTotalMinutes, "minute");

    if (dryerActiveBooking && dryerActiveBooking.startsAt) {
      toast_error("Există deja o rezervare activă pentru uscător.");
      return;
    }

    const payload = {
      createdAt: dayjs().valueOf(),
      date: bookingDate.format("DD/MM/YYYY"),
      start_interval_time: dryerStart.format("HH:mm"),
      final_interval_time: dryerEnd.format("HH:mm"),
      machine: DRYER_MACHINE,
      durationMinutes: dryerDurationTotalMinutes,
      startTimestamp: dryerStart.valueOf(),
      endTimestamp: dryerEnd.valueOf(),
      user: {
        numeComplet: user ? user.numeComplet : "",
        camera: user ? user.camera : "",
        uid: user ? user.uid : "",
        email: user ? user.google?.email : "",
        telefon: user ? user.telefon : "",
      },
    };

    setDryerSubmitting(true);
    try {
      const rasp = await AXIOS.post("/api/programare", {
        programareData: payload,
      });

      if (rasp.data.success) {
        toast_success("Rezervarea uscătorului a fost creată cu succes!");
        setSelectedMachine("");
        setDryerDurationHours(1);
        setDryerDurationMinutes("");
        setDryerStatusTick(Date.now());
        emitCancelDryerSelection();
      } else {
        toast_error(rasp.data.message || "Eroare la rezervarea uscătorului.");
      }
    } catch (error) {
      console.error("Dryer booking error", error);
      toast_error("Eroare la rezervarea uscătorului.");
    } finally {
      setDryerSubmitting(false);
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
    emitCancelDryerSelection();
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
      {!isUserApproved && (
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
              <h3>Cont neaprobat</h3>
              <p>
                Contul tău nu este încă aprobat. Poți vizualiza programările, dar
                nu poți face rezervări până la aprobare.
              </p>
            </div>
          </div>
        </div>
      )}

      {isWashingMachineSelected &&
        programari &&
        programari.length > 0 &&
        createProgramare() != null && (
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
          <button
            className="btn btn-success"
            onClick={submitWashingMachineBooking}
          >
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

      {isDryerSelected && (
        <div className="home__floating-actions home__floating-actions--dryer">
          <button
            className="btn btn-secondary"
            onClick={handleCancelDryerSelection}
          >
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
          <button
            className="btn btn-success"
            onClick={submitDryerBooking}
            disabled={!canSubmitDryer}
          >
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
            {dryerActionLabel}
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
        {isWashingMachineSelected &&
          programari &&
          programari.length > 0 &&
          createProgramare() != null && (
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

        {isDryerSelected && (
          <div className="home__booking-summary">
            <h2>Rezervarea uscătorului</h2>
            <div className="home__booking-summary__details">
              <div className="home__booking-summary__detail">
                <strong>Uscător</strong>
                <span>Echipament selectat</span>
              </div>
              <div className="home__booking-summary__detail home__booking-summary__detail--inputs">
                <label
                  htmlFor="dryer-duration-hours"
                  className="home__booking-summary__label"
                >
                  Durata
                </label>
                <div className="home__booking-summary__control">
                  <input
                    id="dryer-duration-hours"
                    type="number"
                    min="0"
                    max={DRYER_MAX_HOURS}
                    value={dryerDurationHours}
                    onChange={handleDryerHoursChange}
                  />
                  <span>h</span>
                  <input
                    id="dryer-duration-minutes"
                    type="number"
                    min="0"
                    max="59"
                    placeholder="--"
                    value={dryerDurationMinutes}
                    onChange={handleDryerMinutesChange}
                  />
                  <span>m</span>
                </div>
              </div>
              <div className="home__booking-summary__detail">
                <strong>
                  {dryerDraftTiming.start
                    ? dryerDraftTiming.start.format("DD/MM/YYYY HH:mm")
                    : "--"}
                </strong>
                <span>Start automat</span>
              </div>
              <div className="home__booking-summary__detail">
                <strong>
                  {dryerDraftTiming.end
                    ? dryerDraftTiming.end.format("DD/MM/YYYY HH:mm")
                    : "--"}
                </strong>
                <span>Final estimat</span>
              </div>
              <div className="home__booking-summary__detail">
                <strong>
                  {dryerActiveBooking
                    ? dryerEndsAtLabel
                    : dryerMaintenanceActive
                    ? "Mentenanță"
                    : isAnotherUserEditingDryer
                    ? `${liveDryerSelection?.userName || "Utilizator"} (cam. ${
                        liveDryerSelection?.camera || "?"
                      })`
                    : "Disponibil"}
                </strong>
                <span>
                  {dryerActiveBooking
                    ? `Ocupat până la ${dryerEndsAtLabel}`
                    : dryerMaintenanceActive
                    ? "Uscător în mentenanță"
                    : isAnotherUserEditingDryer
                    ? "Alt utilizator selectează"
                    : "Stare actuală"}
                </span>
              </div>
              {dryerActiveBooking && (
                <div className="home__booking-summary__detail">
                  <strong>
                    {dryerOccupantName}
                    {dryerOccupantRoom}
                  </strong>
                  <span>Utilizator curent</span>
                </div>
              )}
            </div>
            {dryerDurationError && (
              <p className="home__booking-summary__error">{dryerDurationError}</p>
            )}
            {isAnotherUserEditingDryer &&
              !dryerActiveBooking &&
              !dryerMaintenanceActive && (
                <p className="home__booking-summary__warning">
                  Alt utilizator selectează în acest moment. Așteaptă să finalizeze.
                </p>
              )}
            <p className="mt-2" style={{ fontSize: "0.875rem" }}>
              Uscătorul se eliberează automat după trecerea duratei selectate.
            </p>
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
                  minDate={
                    isDryerSelected
                      ? todayBucharest.toDate()
                      : dayjs().subtract(1, "week").toDate()
                  }
                  maxDate={
                    isDryerSelected
                      ? todayBucharest.endOf("day").toDate()
                      : dayjs().add(3, "weeks").toDate()
                  }
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
                {[...washingMachines, { id: "uscator", name: DRYER_MACHINE }].map(
                  (m) => {
                    const isDryer = m.name === DRYER_MACHINE;
                    const machineEnabled = isDryer
                      ? dryerSelectable
                      : Boolean(realStates[m.name]);
                    const machineStatus = isDryer
                      ? dryerTileStatus
                      : machineEnabled
                      ? "Disponibil"
                      : "Indisponibil";
                    const isDisabled = !machineEnabled;

                    return (
                      <div
                        key={m.id}
                        className={`home__machine-selector__option ${
                          selectedMachine === m.name
                            ? "home__machine-selector__option--selected"
                            : ""
                        } ${
                          isDisabled
                            ? "home__machine-selector__option--disabled"
                            : ""
                        }`}
                        onClick={() => {
                          if (!isDisabled) {
                            handleMachineSelect(m.name);
                          }
                        }}
                      >
                        <div className="home__machine-selector__title">
                          <span>{m.name}</span>
                        </div>
                        <div className="home__machine-selector__status">
                          {machineStatus}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>

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
                    {washingMachines.map((m) => (
                      <th key={`header-${m.id}`}>{m.name}</th>
                    ))}
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
                      {washingMachines.map((m) => {
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
                            `${selectedDate.format("YYYY-MM-DD")} ${
                              hour.final_interval_time
                            }`,
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
