// Function to format date as "Daily Recap — DD MMM YYYY"
export function formatDailyRecapDate(date: Date = new Date()) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();

  return `Daily Recap — ${day} ${month} ${year}`;
}

// Function to format date and time range as "Daily Recap — DD MMM YYYY, HH:MM–HH:MM"
export function formatDailyRecapDateTimeRange(date: Date, from: { hours: number; minutes: number }, to: { hours: number; minutes: number }) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const fromStr = `${pad(from.hours)}:${pad(from.minutes)}`;
  const toStr = `${pad(to.hours)}:${pad(to.minutes)}`;
  return `Daily Recap — ${day} ${month} ${year}, ${fromStr}–${toStr}`;
}