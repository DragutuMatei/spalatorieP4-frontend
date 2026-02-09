import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DatePicker from "react-multi-date-picker";
import dayjs from "dayjs";
import AXIOS from "../utils/Axios_config";
import { toast_error, toast_success } from "../utils/Toasts";
import { useSocket } from "../utils/SocketContext";
import { useAuth } from "../utils/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "../assets/styles/pages/Admin.scss";
const BUCURESTI_TZ = "Europe/Bucharest";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);

const COLORS = {
  M1: "#0088FE",     // Blue
  M2: "#00C49F",     // Green
  Uscator: "#FFBB28" // Yellow/Orange
};

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

const extractCreatedAt = (entry) => {
  if (!entry) {
    return 0;
  }

  const rawValue =
    entry.created_at ?? entry.createdAt ?? entry.created ?? entry.createdAT ?? null;

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

const sortByCreatedAtDesc = (list = []) =>
  [...list].sort((a, b) => extractCreatedAt(b) - extractCreatedAt(a));

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
  const [debouncedUserSearchTerm, setDebouncedUserSearchTerm] = useState("");
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [debouncedBookingSearchTerm, setDebouncedBookingSearchTerm] = useState("");
  const [reasons, setReasons] = useState({});
  const [showActiveBookings, setShowActiveBookings] = useState(false);
  const [showGroupedBookings, setShowGroupedBookings] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [maintenanceDate, setMaintenanceDate] = useState(dayjs().toDate());
  const [maintenanceMachine, setMaintenanceMachine] = useState("");
  const [maintenanceSlots, setMaintenanceSlots] = useState([]);
  const [savingSetting, setSavingSetting] = useState(null);
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
  const [maintenanceDeleting, setMaintenanceDeleting] = useState({});
  const [cleanupLoading, setCleanupLoading] = useState({
    official: false,
    local: false,
  });
  const [userActionLoading, setUserActionLoading] = useState({});
  const [bookingActionLoading, setBookingActionLoading] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    settings: true,
    cleanup: true,
    stats: true,
  });

  // Bulk Selection State
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [bulkActionReason, setBulkActionReason] = useState("");

  // Deselect on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedBookings(new Set());
        setLastSelectedId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Statistics Logic ---

  // Calculate Date Range
  const statsPeriod = useMemo(() => {
    if (!bookings.length) return "";

    let minDate = null;
    let maxDate = null;

    bookings.forEach(booking => {
      // EXCLUDE CANCELLED STRATEGY:
      // Count everything UNLESS it is explicitly cancelled.
      const isCancelled =
        booking.active?.cancelledBy ||
        booking.active?.message?.toLowerCase().includes("anul");

      if (isCancelled) return;

      const dateStr = formatDate(booking.date, null);
      if (!dateStr) return;

      const d = dayjs(dateStr, "DD/MM/YYYY");
      if (d.isValid()) {
        if (!minDate || d.isBefore(minDate)) minDate = d;
        if (!maxDate || d.isAfter(maxDate)) maxDate = d;
      }
    });

    if (!minDate || !maxDate) return "";
    return `${minDate.format("DD/MM/YYYY")} - ${maxDate.format("DD/MM/YYYY")}`;
  }, [bookings]);

  const dailyStats = useMemo(() => {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // We want to display Mon -> Sun.
    const stats = [
      { name: "Lun", dayIndex: 1, M1: 0, M2: 0, Uscator: 0, total: 0 },
      { name: "Mar", dayIndex: 2, M1: 0, M2: 0, Uscator: 0, total: 0 },
      { name: "Mie", dayIndex: 3, M1: 0, M2: 0, Uscator: 0, total: 0 },
      { name: "Joi", dayIndex: 4, M1: 0, M2: 0, Uscator: 0, total: 0 },
      { name: "Vin", dayIndex: 5, M1: 0, M2: 0, Uscator: 0, total: 0 },
      { name: "Sam", dayIndex: 6, M1: 0, M2: 0, Uscator: 0, total: 0 },
      { name: "Dum", dayIndex: 0, M1: 0, M2: 0, Uscator: 0, total: 0 },
    ];

    bookings.forEach((booking) => {
      // 1. Must have minimal valid time info
      if (!booking.start_interval_time || !booking.final_interval_time) return;

      // EXCLUDE CANCELLED STRATEGY:
      const isCancelled =
        booking.active?.cancelledBy ||
        booking.active?.message?.toLowerCase().includes("anul");

      if (isCancelled) return;

      // Use SAFE DATE FORMATTING to match Table
      const dateStr = formatDate(booking.date, null);
      if (!dateStr) return;

      const dateObj = dayjs(dateStr, "DD/MM/YYYY");
      if (!dateObj.isValid()) return;

      const dayIndex = dateObj.day(); // 0-6
      const statObj = stats.find(s => s.dayIndex === dayIndex);

      if (statObj) {
        statObj.total += 1;
        if (booking.machine === "Masina 1" || booking.machine === "M1") statObj.M1 += 1;
        else if (booking.machine === "Masina 2" || booking.machine === "M2") statObj.M2 += 1;
        else if (booking.machine === "Uscator" || booking.machine === "Uscător") statObj.Uscator += 1;
      }
    });

    return stats;
  }, [bookings]);

  const topUsers = useMemo(() => {
    const userStats = {};
    const now = dayjs(); // Get current time

    bookings.forEach((booking) => {
      const uid = booking.user?.uid;
      const name = booking.user?.numeComplet || "Necunoscut";

      if (!uid) return;

      // --- Filter Logic ---

      // (Removed future filter to align with Table/Daily stats)

      // EXCLUDE CANCELLED STRATEGY:
      const isCancelled =
        booking.active?.cancelledBy ||
        booking.active?.message?.toLowerCase().includes("anul");

      if (isCancelled) return;
      // --------------------

      if (!userStats[uid]) {
        userStats[uid] = { name, M1: 0, M2: 0, Uscator: 0, totalMinutes: 0 };
      }

      // Calculate duration
      let duration = 0;
      if (booking.duration && typeof booking.duration === 'number') {
        duration = booking.duration;
      } else {
        // calculateDuration returns "N/A" on failure, so we check type
        const calcArgs = calculateDuration(booking.start_interval_time, booking.final_interval_time);
        if (typeof calcArgs === 'number') {
          duration = calcArgs;
        }
      }

      userStats[uid].totalMinutes += duration;

      if (booking.machine === "Masina 1" || booking.machine === "M1") userStats[uid].M1 += duration;
      else if (booking.machine === "Masina 2" || booking.machine === "M2") userStats[uid].M2 += duration;
      else if (booking.machine === "Uscator" || booking.machine === "Uscător") userStats[uid].Uscator += duration;
    });

    return Object.values(userStats)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 10);
  }, [bookings]);

  // Filter bookings
  const currentDate = dayjs().startOf("day");

  // 1. Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // 1. Active Filter
      if (showActiveBookings) {
        if (!booking.date) return false;
        // Logic for "Active" filter in UI:
        // Usually means future or current.
        // If we want to show strictly "currently running or future", we check date >= today
        try {
          let bookingDate;
          if (typeof booking.date === "string" && booking.date.includes("T")) {
            bookingDate = dayjs(booking.date);
          } else {
            bookingDate = dayjs(booking.date, "DD/MM/YYYY");
          }
          // Check if active status is true AND date is not past
          // OR if we just rely on the 'active' toggle showing future stuff
          // FIX: explicitly exclude cancelled bookings when "Active Only" is ON
          const isCancelled = booking.active?.cancelledBy || booking.active?.status === false;
          if (isCancelled) return false;

          if (!bookingDate.isValid() || !bookingDate.isSameOrAfter(currentDate)) {
            return false;
          }
        } catch (error) {
          return false;
        }
      }

      // 2. Search Filter
      if (!debouncedBookingSearchTerm) return true;
      const term = debouncedBookingSearchTerm.toLowerCase();

      const nume = booking.user?.numeComplet?.toLowerCase() || "";
      const camera = booking.user?.camera?.toLowerCase() || "";
      const machine = booking.machine?.toLowerCase() || "";
      const date = formatDate(booking.date).toLowerCase();
      const start = booking.start_interval_time?.toLowerCase() || "";
      const end = booking.final_interval_time?.toLowerCase() || "";

      return (
        nume.includes(term) ||
        camera.includes(term) ||
        machine.includes(term) ||
        date.includes(term) ||
        start.includes(term) ||
        end.includes(term)
      );
    });
  }, [bookings, showActiveBookings, debouncedBookingSearchTerm, currentDate]);

  // 2. Sort bookings
  const displayedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      if (sortConfig.key === "date") {
        // Parse dates for comparison
        const getDate = (item) => {
          if (!item.date) return 0;
          if (typeof item.date === "object") {
            if (item.date._seconds) return item.date._seconds * 1000;
            if (item.date.seconds) return item.date.seconds * 1000;
            if (item.date.toDate) return item.date.toDate().getTime();
          }
          if (typeof item.date === "string" && item.date.includes("T")) {
            return dayjs(item.date).valueOf();
          }
          return dayjs(item.date, "DD/MM/YYYY").valueOf();
        };

        const dateA = getDate(a);
        const dateB = getDate(b);

        if (dateA < dateB) return sortConfig.direction === "asc" ? -1 : 1;
        if (dateA > dateB) return sortConfig.direction === "asc" ? 1 : -1;

        // Secondary sort by time if dates are equal
        const timeA = a.start_interval_time || "";
        const timeB = b.start_interval_time || "";
        if (timeA < timeB) return sortConfig.direction === "asc" ? -1 : 1;
        if (timeA > timeB) return sortConfig.direction === "asc" ? 1 : -1;

        return 0;
      }
      return 0;
    });
  }, [filteredBookings, sortConfig]);

  // 3. Group bookings if enabled
  const groupedBookings = useMemo(() => {
    if (!showGroupedBookings) return displayedBookings;

    // Sort heavily to ensure consecutive slots are adjacent: Date -> Machine -> StartTime
    const sortedForGrouping = [...displayedBookings].sort((a, b) => {
      // 1. Date
      const dateA = typeof a.date === "string" && a.date.includes("T") ? dayjs(a.date).format("YYYY-MM-DD") : dayjs(a.date, "DD/MM/YYYY").format("YYYY-MM-DD");
      const dateB = typeof b.date === "string" && b.date.includes("T") ? dayjs(b.date).format("YYYY-MM-DD") : dayjs(b.date, "DD/MM/YYYY").format("YYYY-MM-DD");
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      // 2. Machine
      if (a.machine !== b.machine) return a.machine.localeCompare(b.machine);

      // 3. User
      const userA = a.user?.uid || "";
      const userB = b.user?.uid || "";
      if (userA !== userB) return userA.localeCompare(userB);

      // 4. Start Time
      return (a.start_interval_time || "").localeCompare(b.start_interval_time || "");
    });

    const groups = [];
    if (sortedForGrouping.length === 0) return groups;

    let currentGroup = {
      ...sortedForGrouping[0],
      originalIds: [sortedForGrouping[0].uid],
      duration: sortedForGrouping[0].duration || 30 // assume 30 if missing
    };

    for (let i = 1; i < sortedForGrouping.length; i++) {
      const next = sortedForGrouping[i];
      const prev = currentGroup;

      const formatD = (d) => typeof d === "string" && d.includes("T") ? dayjs(d).format("YYYY-MM-DD") : dayjs(d, "DD/MM/YYYY").format("YYYY-MM-DD");

      const isSameDate = formatD(next.date) === formatD(prev.date);
      const isSameMachine = next.machine === prev.machine;
      const isSameUser = (next.user?.uid || "") === (prev.user?.uid || "");
      const isConsecutive = prev.final_interval_time === next.start_interval_time;

      if (isSameDate && isSameMachine && isSameUser && isConsecutive) {
        // Merge
        currentGroup.final_interval_time = next.final_interval_time;
        const nextDuration = next.duration || 30;
        currentGroup.duration += nextDuration;
        currentGroup.originalIds.push(next.uid);
      } else {
        // Push and reset
        groups.push(currentGroup);
        currentGroup = {
          ...next,
          originalIds: [next.uid],
          duration: next.duration || 30
        };
      }
    }
    groups.push(currentGroup);

    // Finally, re-apply the requested sort order to the grouped results
    if (sortConfig.key === "date") {
      return groups.sort((a, b) => {
        const getDate = (item) => {
          if (!item.date) return 0;
          if (typeof item.date === "object") {
            if (item.date._seconds) return item.date._seconds * 1000;
            if (item.date.seconds) return item.date.seconds * 1000;
            if (item.date.toDate) return item.date.toDate().getTime();
          }
          if (typeof item.date === "string" && item.date.includes("T")) {
            return dayjs(item.date).valueOf();
          }
          return dayjs(item.date, "DD/MM/YYYY").valueOf();
        };
        const dateA = getDate(a);
        const dateB = getDate(b);

        if (dateA < dateB) return sortConfig.direction === "asc" ? -1 : 1;
        if (dateA > dateB) return sortConfig.direction === "asc" ? 1 : -1;

        // Secondary sort by time
        const timeA = a.start_interval_time || "";
        const timeB = b.start_interval_time || "";
        if (timeA < timeB) return sortConfig.direction === "asc" ? -1 : 1;
        if (timeA > timeB) return sortConfig.direction === "asc" ? 1 : -1;

        return 0;
      });
    }

    return groups;

  }, [displayedBookings, showGroupedBookings, sortConfig]);


  const filteredUsers = useMemo(() => {
    return users.filter((adminUser) => {
      if (!debouncedUserSearchTerm) return true;
      const searchLower = debouncedUserSearchTerm.toLowerCase();
      const nume =
        typeof adminUser.numeComplet === "string"
          ? adminUser.numeComplet.toLowerCase()
          : "";
      const email =
        typeof (adminUser.google?.email || adminUser.email) === "string"
          ? (adminUser.google?.email || adminUser.email).toLowerCase()
          : "";
      const camera =
        typeof adminUser.camera === "string"
          ? adminUser.camera.toLowerCase()
          : "";

      return (
        nume.includes(searchLower) ||
        email.includes(searchLower) ||
        camera.includes(searchLower)
      );
    });
  }, [users, debouncedUserSearchTerm]);

  // --- Debounce Logic ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBookingSearchTerm(bookingSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [bookingSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearchTerm(userSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchTerm]);
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
      console.error(error);
      if (error?.response?.status !== 404) {
        toast_error("Nu s-au putut încărca setările!");
      }
    }
  };

  const handleManualCleanup = async (scope) => {
    setCleanupLoading((prev) => ({ ...prev, [scope]: true }));
    try {
      const response = await AXIOS.post("/api/programari/cleanup", { scope });
      if (response.data.success) {
        toast_success(
          `Curățare ${scope === "local" ? "locală" : "oficială"} completă: ${response.data.deletedProgramari
          } programări și ${response.data.deletedNotifications
          } notificări șterse.`
        );
        await getBookings();
      } else {
        toast_error(response.data.message || "Curățarea a eșuat.");
      }
    } catch (error) {
      console.error("Manual cleanup error:", error);
      toast_error(
        error?.response?.data?.message || "Curățarea manuală a eșuat."
      );
    } finally {
      setCleanupLoading((prev) => ({ ...prev, [scope]: false }));
    }
  };

  const getUsers = async () => {
    try {
      const rasp = await AXIOS.get("/api/users");
      if (rasp.data.success) {
        setUsers(rasp.data.users);
      }
    } catch (error) {
      console.error(error);
      if (error?.response?.status !== 404) {
        toast_error("Nu s-au putut încărca utilizatorii!");
      }
      setUsers([]);
    }
  };

  const getBookings = async () => {
    try {
      // Changed: Request includeInactive=true to get history for statistics and search
      const rasp = await AXIOS.get("/api/programare?includeInactive=true");
      if (rasp.data.success) {
        setBookings(sortByCreatedAtDesc(rasp.data.programari || []));
      }
    } catch (error) {
      console.error("Bookings error:", error);
      if (error?.response?.status !== 404) {
        toast_error("Nu s-au putut încărca programările!");
      }
      setBookings([]);
    }
  };

  const getMaintenanceIntervals = async () => {
    try {
      const rasp = await AXIOS.get("/api/maintenance");
      if (rasp.data.success) {
        setMaintenanceIntervals(rasp.data.maintenanceIntervals || []);
      }
    } catch (error) {
      console.error("Maintenance intervals error:", error);
      if (error?.response?.status !== 404) {
        toast_error("Nu s-au putut încărca intervalele de mentenanță!");
      }
      setMaintenanceIntervals([]);
    }
  };

  const saveSettings = async (key, value) => {
    if (savingSetting === key) {
      return;
    }

    const previousValue = settings[key];

    setSavingSetting(key);
    setSettings((prev) => ({
      ...prev,
      [key]: key === "blockPastSlots" ? Boolean(value) : value,
    }));

    try {
      const rasp = await AXIOS.post("/api/settings", { key, value });
      if (rasp.data.success) {
        setSettings((prev) => ({
          ...prev,
          ...rasp.data.settings,
          blockPastSlots: Boolean(rasp.data.settings.blockPastSlots),
        }));
        // Nu actualizez local - las socket-ul să facă update-ul pentru live data
        toast_success(
          key === "blockPastSlots"
            ? `Rezervările în trecut au fost ${value ? "blocate" : "deblocate"
            }!`
            : `Programările pentru ${key === "m1Enabled"
              ? "M1"
              : key === "m2Enabled"
                ? "M2"
                : "Uscător"
            } au fost ${value ? "activate" : "dezactivate"}!`
        );
      }
    } catch (error) {
      console.error("Settings error:", error);
      toast_error("Eroare la salvarea setărilor!");
      setSettings((prev) => ({
        ...prev,
        [key]: key === "blockPastSlots" ? Boolean(previousValue) : previousValue,
      }));
    } finally {
      setSavingSetting(null);
    }
  };

  const toggleApproval = async (userId, currentApproval) => {
    const actionKey = `${userId}-approval`;
    setUserActionLoading((prev) => ({ ...prev, [actionKey]: true }));
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
      console.error(error);
      toast_error("Eroare la actualizarea aprobării!");
    } finally {
      setUserActionLoading((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  const toggleAdmin = async (userId, currentRole) => {
    const actionKey = `${userId}-role`;
    setUserActionLoading((prev) => ({ ...prev, [actionKey]: true }));
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
      console.error(error);
      toast_error("Eroare la actualizarea rolului!");
    } finally {
      setUserActionLoading((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  // Helper to find all contiguous bookings for a given target booking
  const findContiguousBlockIds = (targetBooking, allBookings) => {
    if (!targetBooking) return [];

    const formatD = (d) => typeof d === "string" && d.includes("T") ? dayjs(d).format("YYYY-MM-DD") : dayjs(d, "DD/MM/YYYY").format("YYYY-MM-DD");
    const targetDate = formatD(targetBooking.date);
    const targetMachine = targetBooking.machine;
    const targetUser = targetBooking.user?.uid;

    // Filter potential candidates (same date, machine, user)
    // AND NOT cancelled
    const candidates = allBookings.filter(b => {
      if (b.active?.cancelledBy || b.active?.message?.toLowerCase().includes("anul")) return false;

      const bDate = formatD(b.date);
      const bMachine = b.machine;
      const bUser = b.user?.uid;

      return bDate === targetDate && bMachine === targetMachine && bUser === targetUser;
    });

    // Sort by time
    candidates.sort((a, b) => (a.start_interval_time || "").localeCompare(b.start_interval_time || ""));

    // Find the contiguous group containing the target
    // We iterate and build groups, then pick the one containing target.uid

    let currentGroup = [];
    const allGroups = [];

    if (candidates.length > 0) {
      currentGroup = [candidates[0]];
      for (let i = 1; i < candidates.length; i++) {
        const prev = currentGroup[currentGroup.length - 1];
        const curr = candidates[i];

        if (prev.final_interval_time === curr.start_interval_time) {
          currentGroup.push(curr);
        } else {
          allGroups.push(currentGroup);
          currentGroup = [curr];
        }
      }
      allGroups.push(currentGroup);
    }

    // Find which group has our target
    const foundGroup = allGroups.find(g => g.some(b => b.uid === targetBooking.uid));

    return foundGroup ? foundGroup.map(b => b.uid) : [targetBooking.uid];
  };

  // Renamed from deleteBooking to focus on "Cancellation" (soft delete)
  const cancelBooking = async (bookingIdOrIds) => {
    // Determine if we are deleting a single ID or a group of IDs
    const idsToAction = Array.isArray(bookingIdOrIds) ? bookingIdOrIds : [bookingIdOrIds];

    const primaryId = idsToAction[0];
    const currentReason = reasons[primaryId];

    if (!currentReason || currentReason.trim() === "") {
      toast_error("Te rugăm să introduci un motiv pentru anulare!");
      return;
    }

    setBookingActionLoading((prev) => ({ ...prev, [primaryId]: 'cancel' }));

    try {
      // Execute sequentially
      for (const uid of idsToAction) {
        await AXIOS.post("/api/programare/cancel-with-reason", {
          bookingId: uid,
          reason: currentReason.trim(),
        });
      }

      // Update local state: MARK as cancelled, do NOT remove
      setBookings((prev) =>
        prev.map((b) => {
          if (idsToAction.includes(b.uid)) {
            return {
              ...b,
              active: {
                ...(b.active || {}),
                status: false,
                cancelledBy: "admin",
                message: currentReason.trim()
              }
            };
          }
          return b;
        })
      );

      setReasons((prev) => {
        const next = { ...prev };
        delete next[primaryId];
        return next;
      });
      toast_success(idsToAction.length > 1 ? "Programări anulate!" : "Programare anulată!");

    } catch (error) {
      console.error(error);
      toast_error("Eroare la anularea programării!");
    } finally {
      setBookingActionLoading((prev) => {
        const next = { ...prev };
        delete next[primaryId];
        return next;
      });
    }
  };

  // New function for hard delete
  const permanentlyDeleteBooking = async (bookingIdOrIds) => {
    // Determine if we are deleting a single ID or a group of IDs
    // For smart delete: we want to delete the whole block
    const idsToDelete = Array.isArray(bookingIdOrIds) ? bookingIdOrIds : [bookingIdOrIds];

    // UPDATED: No confirmation dialog as per user request

    const primaryId = idsToDelete[0];
    setBookingActionLoading((prev) => ({ ...prev, [primaryId]: 'delete' }));

    try {
      for (const uid of idsToDelete) {
        await AXIOS.delete(`/api/programare/${uid}`);
      }

      // Remove from local state
      setBookings((prev) =>
        prev.filter((b) => !idsToDelete.includes(b.uid))
      );

      toast_success("Programări șterse definitiv!");

    } catch (error) {
      console.error("Delete error:", error);
      toast_error("Eroare la ștergerea programării!");
    } finally {
      setBookingActionLoading((prev) => {
        const next = { ...prev };
        delete next[primaryId];
        return next;
      });
    }
  };




  // --- Bulk Actions Logic ---

  const toggleSelection = (id, shiftKey) => {
    const newSelected = new Set(selectedBookings);

    if (shiftKey && lastSelectedId) {
      // Range selection
      const currentIndex = groupedBookings.findIndex(b => b.uid === id);
      const lastIndex = groupedBookings.findIndex(b => b.uid === lastSelectedId);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);

        const range = groupedBookings.slice(start, end + 1);
        const shouldSelect = !newSelected.has(id); // Determine intent based on clicked item

        range.forEach(b => {
          if (shouldSelect) newSelected.add(b.uid);
          else newSelected.delete(b.uid);
        });
      }
    } else {
      // Single toggle
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }

    setLastSelectedId(id);
    setSelectedBookings(newSelected);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(groupedBookings.map(b => b.uid));
      setSelectedBookings(allIds);
    } else {
      setSelectedBookings(new Set());
    }
  };

  const handleBulkCancel = async () => {
    if (selectedBookings.size === 0) return;
    if (!bulkActionReason.trim()) {
      toast_error("Te rugăm să introduci un motiv comun pentru anulare!");
      return;
    }

    await cancelBooking(Array.from(selectedBookings));
    setSelectedBookings(new Set());
    setBulkActionReason("");
  };

  const handleBulkDelete = async () => {
    if (selectedBookings.size === 0) return;

    await permanentlyDeleteBooking(Array.from(selectedBookings));
    setSelectedBookings(new Set());
  };

  const handleMaintenanceSubmit = async () => {
    if (!maintenanceMachine || maintenanceSlots.length <= 1) {
      toast_error("Selectează mașina și cel puțin 2 sloturi pentru mentenanță!");
      return;
    }

    setMaintenanceSubmitting(true);
    try {
      const dateToSend = dayjs(maintenanceDate).format("DD/MM/YYYY");

      const rasp = await AXIOS.post("/api/maintenance", {
        machine: maintenanceMachine,
        date: dateToSend,
        startTime: maintenanceSlots[0],
        endTime: maintenanceSlots[maintenanceSlots.length - 1],
        slots: maintenanceSlots,
      });

      if (rasp.data.success) {
        toast_success("Interval de mentenanță adăugat și rezervările anulate!");
        setMaintenanceMachine("");
        setMaintenanceSlots([]);
        getMaintenanceIntervals();
        getBookings();
      }
    } catch (error) {
      console.error("Maintenance error:", error);
      toast_error("Eroare la adăugarea mentenanței!");
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  const deleteMaintenance = async (maintenanceId) => {
    setMaintenanceDeleting((prev) => ({ ...prev, [maintenanceId]: true }));
    try {
      const rasp = await AXIOS.delete(`/api/maintenance/${maintenanceId}`);
      if (rasp.data.success) {
        setMaintenanceIntervals(
          maintenanceIntervals.filter((m) => m.uid !== maintenanceId)
        );
        toast_success("Interval de mentenanță șters!");
      }
    } catch (error) {
      console.error(error);
      toast_error("Eroare la ștergerea mentenanței!");
    } finally {
      setMaintenanceDeleting((prev) => {
        const next = { ...prev };
        delete next[maintenanceId];
        return next;
      });
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
      const handleSettingsUpdate = (data) => {
        if (
          data.action === "update" &&
          data.settings &&
          data.settings.settings
        ) {
          // Actualizez toate setările pentru live update
          setSettings((prev) => ({
            ...prev,
            ...data.settings.settings,
            blockPastSlots: Boolean(data.settings.settings.blockPastSlots),
          }));
        }
      };

      const handleUserUpdate = (data) => {
        setUsers((prev) => {
          if (data.action === "delete") {
            return prev.filter((u) => u.uid !== data.userId);
          }

          const exists = prev.some((u) => u.uid === data.userId);
          if (exists) {
            return prev.map((u) => (u.uid === data.userId ? data.user : u));
          }

          return [data.user, ...prev];
        });
      };

      socket.on("settings", handleSettingsUpdate);
      socket.on("userUpdate", handleUserUpdate);

      const handleProgramareUpdate = (data) => {
        if (data.action === "create") {
          setBookings((prev) =>
            sortByCreatedAtDesc([data.programare, ...prev])
          );
        } else if (data.action === "update") {
          setBookings((prev) =>
            sortByCreatedAtDesc(
              prev.map((b) =>
                b.uid === data.programare.uid ? data.programare : b
              )
            )
          );
        } else if (data.action === "delete") {
          setBookings((prev) =>
            sortByCreatedAtDesc(
              prev.filter((b) => b.uid !== data.programareId)
            )
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

  // Helper function for sorting request
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="admin">
      <div className="container">
        <div className="admin__header">
          <h1>
            <svg
              className="admin-icon"
              width={30}
              height={30}
              viewBoxwBox="0 0 24 24"
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
              className={`toggle-icon ${expandedSections.settings ? "toggle-icon--expanded" : ""
                }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${!expandedSections.settings
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
                  className={`toggle ${settings.m1Enabled ? "toggle--active" : ""
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
                  className={`toggle ${settings.m2Enabled ? "toggle--active" : ""
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
                  className={`toggle ${settings.dryerEnabled ? "toggle--active" : ""
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
                  className={`toggle ${settings.blockPastSlots ? "toggle--active" : ""
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

        {/* Statistici */}
        <div className="admin__section admin__section--full-width">
          <div
            className="admin__section-header"
            onClick={() =>
              setExpandedSections((prev) => ({
                ...prev,
                stats: !prev.stats,
              }))
            }
          >
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Statistici
              {statsPeriod && <span style={{ fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '10px', opacity: 0.8 }}>({statsPeriod})</span>}
            </h2>
            <svg
              className={`toggle-icon ${expandedSections.stats ? "toggle-icon--expanded" : ""
                }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${!expandedSections.stats
              ? "admin__section-content--collapsed"
              : ""
              }`}
          >
            <div className="admin__stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>

              {/* Chart 1: Daily Usage */}
              <div className="admin__chart-card" style={{ background: '#fff', border: '1px solid #eee', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#555' }}>Rezervări pe Zile (Nr. Rezervări)</h3>
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="M1" stackId="a" fill={COLORS.M1} name="Masina 1" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="M2" stackId="a" fill={COLORS.M2} name="Masina 2" />
                      <Bar dataKey="Uscator" stackId="a" fill={COLORS.Uscator} name="Uscător" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Top Users */}
              <div className="admin__chart-card" style={{ background: '#fff', border: '1px solid #eee', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#555' }}>Top 10 Utilizatori (Minute Totale)</h3>
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={topUsers}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 13 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="M1" stackId="a" fill={COLORS.M1} name="M1 (min)" />
                      <Bar dataKey="M2" stackId="a" fill={COLORS.M2} name="M2 (min)" />
                      <Bar dataKey="Uscator" stackId="a" fill={COLORS.Uscator} name="Uscător (min)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
        <br />
        <br />

        {/* Curățare date */}
        <div className="admin__section admin__section--full-width">
          <div
            className="admin__section-header"
            onClick={() =>
              setExpandedSections((prev) => ({
                ...prev,
                cleanup: !prev.cleanup,
              }))
            }
          >
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M5 6l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
                <path d="M10 11v6M14 11v6M9 6l1-3h4l1 3" />
              </svg>
              Curățare manuală date
            </h2>
            <svg
              className={`toggle-icon ${expandedSections.cleanup ? "toggle-icon--expanded" : ""
                }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${!expandedSections.cleanup
              ? "admin__section-content--collapsed"
              : ""
              }`}
          >
            <p>
              Șterge rezervările și notificările mai vechi de 7 zile.
            </p>
            <div className="admin__cleanup-actions">
              <button
                className="btn btn-danger"
                onClick={() => handleManualCleanup("official")}
                disabled={cleanupLoading.official}
              >
                {cleanupLoading.official ? (
                  <>
                    <LoadingSpinner size="sm" inline /> Se curăță...
                  </>
                ) : (
                  "Curățare date vechi (> 7 zile)"
                )}
              </button>
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
              className={`toggle-icon ${expandedSections.maintenance ? "toggle-icon--expanded" : ""
                }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${!expandedSections.maintenance
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
                    className={`time-slot ${maintenanceSlots.includes(slot)
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
                disabled={
                  !maintenanceMachine ||
                  maintenanceSlots.length === 0 ||
                  maintenanceSubmitting
                }
              >
                {maintenanceSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" inline />
                    Se salvează...
                  </>
                ) : (
                  "Adaugă Mentenanță"
                )}
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
              className={`toggle-icon ${expandedSections.users ? "toggle-icon--expanded" : ""
                }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${!expandedSections.users ? "admin__section-content--collapsed" : ""
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
                                className={`btn ${user.validate ? "btn-danger" : "btn-success"
                                  }`}
                                onClick={() => {
                                  if (userActionLoading[`${user.uid}-approval`])
                                    return;
                                  toggleApproval(user.uid, user.validate);
                                }}
                                disabled={
                                  !!userActionLoading[`${user.uid}-approval`]
                                }
                              >
                                {userActionLoading[`${user.uid}-approval`] ? (
                                  <>
                                    <LoadingSpinner size="sm" inline />
                                    Se actualizează...
                                  </>
                                ) : user.validate ? (
                                  "Dezactivează"
                                ) : (
                                  "Activează"
                                )}
                              </button>
                              <button
                                className="btn btn-primary"
                                onClick={() => {
                                  if (userActionLoading[`${user.uid}-role`])
                                    return;
                                  toggleAdmin(user.uid, user.role);
                                }}
                                disabled={
                                  !!userActionLoading[`${user.uid}-role`]
                                }
                              >
                                {userActionLoading[`${user.uid}-role`] ? (
                                  <>
                                    <LoadingSpinner size="sm" inline />
                                    Se actualizează...
                                  </>
                                ) : user.role === "admin" ? (
                                  "Remove Admin"
                                ) : (
                                  "Make Admin"
                                )}
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
              className={`toggle-icon ${expandedSections.bookings ? "toggle-icon--expanded" : ""
                }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div
            className={`admin__section-content ${!expandedSections.bookings
              ? "admin__section-content--collapsed"
              : ""
              }`}
          >
            <div className="admin__filters">
              <input
                type="text"
                placeholder="Caută (nume, cameră, mașină, dată...)"
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
              <div className="filter-switch" style={{ marginLeft: "1rem" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={showGroupedBookings}
                    onChange={() => setShowGroupedBookings(!showGroupedBookings)}
                  />
                  Intervale consecutive
                </label>
              </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedBookings.size > 0 && (
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '5px',
                border: '1px solid #ffeeba',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontWeight: 'bold' }}>{selectedBookings.size} selectate</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedBookings(new Set());
                    setLastSelectedId(null);
                  }}
                  style={{ padding: '0px 8px', fontSize: '0.8rem', marginRight: '5px', lineHeight: '20px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Anulează selecția (Esc)"
                >
                  ✕
                </button>
                <input
                  type="text"
                  placeholder="Motiv comun (pt. anulare)..."
                  value={bulkActionReason}
                  onChange={(e) => setBulkActionReason(e.target.value)}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ced4da', flex: 1, minWidth: '200px' }}
                />
                <button
                  className="btn btn-warning"
                  onClick={handleBulkCancel}
                  style={{ padding: '5px 15px' }}
                >
                  Anulează Selectate
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleBulkDelete}
                  style={{ padding: '5px 15px' }}
                >
                  Șterge Selectate
                </button>
              </div>
            )}

            <div className="admin__table">
              {displayedBookings.length > 0 ? (
                <div className="admin__table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={groupedBookings.length > 0 && selectedBookings.size === groupedBookings.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th
                          onClick={() => requestSort("date")}
                          style={{ cursor: "pointer", userSelect: "none" }}
                        >
                          Data {sortConfig.key === "date" && (
                            <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                          )}
                        </th>
                        <th>Mașină</th>
                        <th>Oră Început</th>
                        <th>Oră Sfârșit</th>
                        <th>Durata</th>
                        <th>Nume</th>
                        <th>Cameră</th>
                        <th>Motiv anulare</th>
                        <th style={{ minWidth: "200px" }}>Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedBookings
                        .map((booking) => {
                          const isCancelled = booking.active?.cancelledBy || booking.active?.status === false;
                          return (
                            <tr key={booking.uid} style={{ opacity: isCancelled ? 0.6 : 1, backgroundColor: isCancelled ? '#fff0f0' : 'inherit' }}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedBookings.has(booking.uid)}
                                  onChange={(e) => {
                                    // Prevent row click propagation if we add row click handler later
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    // Handle shift click
                                    toggleSelection(booking.uid, e.shiftKey);
                                  }}
                                />
                              </td>
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
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button
                                    className="btn btn-warning"
                                    onClick={() => {
                                      const blockIds = findContiguousBlockIds(booking, displayedBookings);
                                      cancelBooking(booking.originalIds || blockIds);
                                    }}
                                    disabled={!!bookingActionLoading[booking.uid] || (booking.active?.cancelledBy || booking.active?.status === false)}
                                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                  >
                                    {bookingActionLoading[booking.uid] === 'cancel' ? (
                                      <LoadingSpinner size="sm" inline />
                                    ) : (booking.active?.cancelledBy || booking.active?.status === false) ? (
                                      "Anulat"
                                    ) : (
                                      "Anulează"
                                    )}
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                      // Smart delete: detect active block 
                                      // Use originalIds if grouped, otherwise find smart block
                                      const blockIds = booking.originalIds || findContiguousBlockIds(booking, displayedBookings);
                                      permanentlyDeleteBooking(blockIds);
                                    }}
                                    disabled={!!bookingActionLoading[booking.uid]}
                                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                  >
                                    {bookingActionLoading[booking.uid] === 'delete' ? (
                                      <LoadingSpinner size="sm" inline />
                                    ) : (
                                      "Șterge"
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
