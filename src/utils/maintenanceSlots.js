import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Bucharest");

export const generateMaintenanceTimeSlots = ({
  startHour = 8,
  endHour = 23,
  slotDurationMinutes = 30,
  baseDate = dayjs(),
} = {}) => {
  const slots = [];
  const startTime = dayjs(baseDate).tz().startOf("day").hour(startHour).minute(0);
  const endTime = dayjs(baseDate).tz().startOf("day").hour(endHour).minute(0);

  let current = startTime;
  while (current.isBefore(endTime)) {
    slots.push(current.format("HH:mm"));
    current = current.add(slotDurationMinutes, "minute");
  }

  return slots;
};
