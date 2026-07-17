export type SiteTheme = {
  dark: string;
  card: string;
  cream: string;
  green: string;
  gold: string;
  goldHover: string;
  copper: string;
  mist: string;
  fontSans: string;
  fontSerif: string;
};

export type SiteHours = {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
};

export type SiteSettings = {
  theme: SiteTheme;
  hours: SiteHours[];
};

export const defaultSiteSettings: SiteSettings = {
  theme: {
    dark: "#0B0C0B",
    card: "#151715",
    cream: "#F4EFE6",
    green: "#143A2F",
    gold: "#C89B42",
    goldHover: "#DFAD49",
    copper: "#A55F3F",
    mist: "#9FB7AD",
    fontSans: "DM Sans",
    fontSerif: "DM Serif Display"
  },
  hours: [
    { day: "Monday", open: "17:00", close: "02:00", isClosed: false },
    { day: "Tuesday", open: "17:00", close: "02:00", isClosed: false },
    { day: "Wednesday", open: "17:00", close: "02:00", isClosed: false },
    { day: "Thursday", open: "17:00", close: "02:00", isClosed: false },
    { day: "Friday", open: "17:00", close: "02:00", isClosed: false },
    { day: "Saturday", open: "17:00", close: "02:00", isClosed: false },
    { day: "Sunday", open: "19:00", close: "02:00", isClosed: false }
  ]
};

export function applySiteTheme(theme: SiteTheme) {
  const root = document.documentElement;

  loadGoogleFont(theme.fontSans);
  loadGoogleFont(theme.fontSerif);
  setColorVariable(root, "--watsons-dark", theme.dark);
  setColorVariable(root, "--watsons-card", theme.card);
  setColorVariable(root, "--watsons-cream", theme.cream);
  setColorVariable(root, "--watsons-green", theme.green);
  setColorVariable(root, "--watsons-gold", theme.gold);
  setColorVariable(root, "--watsons-gold-hover", theme.goldHover);
  setColorVariable(root, "--watsons-copper", theme.copper);
  setColorVariable(root, "--watsons-mist", theme.mist);
  root.style.setProperty("--watsons-font-sans", quoteFont(theme.fontSans));
  root.style.setProperty("--watsons-font-serif", quoteFont(theme.fontSerif));
}

export function formatHourRange(hour: SiteHours) {
  if (hour.isClosed) {
    return "Closed";
  }

  return `${formatTime(hour.open)} - ${formatTime(hour.close)}`;
}

export function formatTime(value: string) {
  const [hourValue, minuteValue] = value.split(":").map(Number);

  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) {
    return value;
  }

  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;

  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

function setColorVariable(root: HTMLElement, variable: string, hex: string) {
  const rgb = hexToRgb(hex);

  if (rgb) {
    root.style.setProperty(variable, rgb);
  }
}

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!match) {
    return null;
  }

  return `${parseInt(match[1], 16)} ${parseInt(match[2], 16)} ${parseInt(match[3], 16)}`;
}

function quoteFont(font: string) {
  return `"${font.replace(/"/g, "")}"`;
}

function loadGoogleFont(font: string) {
  const family = font.trim();

  if (!family || systemFonts.has(family.toLowerCase())) {
    return;
  }

  const id = `google-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  if (document.getElementById(id)) {
    return;
  }

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}&display=swap`;
  document.head.appendChild(link);
}

const systemFonts = new Set([
  "arial",
  "helvetica",
  "georgia",
  "times new roman",
  "serif",
  "sans-serif",
  "system-ui"
]);
