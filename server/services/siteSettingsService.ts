import { connectMongoose } from "../db/mongoose";
import { SiteSettings } from "../models/SiteSettings";
import { cleanString } from "../utils/menuDataHelpers";
import { httpError } from "../utils/httpError";

const settingsKey = "watsons";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
] as const;

const defaultTheme = {
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
};

const defaultHours = days.map((day) => ({
  day,
  open: day === "Sunday" ? "19:00" : "17:00",
  close: "02:00",
  isClosed: false
}));

export type PublicSiteSettings = {
  theme: typeof defaultTheme;
  hours: typeof defaultHours;
};

export async function getSiteSettings() {
  await connectMongoose();

  const settings = await SiteSettings.findOne({ key: settingsKey }).lean();

  return serializeSettings(settings);
}

export async function updateSiteSettings(input: unknown, updatedBy: string) {
  await connectMongoose();

  const current = await getSiteSettings();
  const patch = input as Partial<PublicSiteSettings>;
  const nextSettings = {
    theme: patch.theme ? normalizeTheme(patch.theme, current.theme) : current.theme,
    hours: Array.isArray(patch.hours) ? normalizeHours(patch.hours) : current.hours
  };

  const settings = await SiteSettings.findOneAndUpdate(
    { key: settingsKey },
    {
      $set: {
        key: settingsKey,
        ...nextSettings,
        updatedBy
      }
    },
    { upsert: true, returnDocument: "after" }
  ).lean();

  return serializeSettings(settings);
}

function serializeSettings(settings: unknown): PublicSiteSettings {
  const value = settings as Partial<PublicSiteSettings> | null;

  return {
    theme: normalizeTheme(value?.theme, defaultTheme),
    hours: normalizeHours(value?.hours)
  };
}

function normalizeTheme(
  value: Partial<typeof defaultTheme> | undefined,
  fallback: typeof defaultTheme
) {
  return {
    dark: normalizeHex(value?.dark, fallback.dark),
    card: normalizeHex(value?.card, fallback.card),
    cream: normalizeHex(value?.cream, fallback.cream),
    green: normalizeHex(value?.green, fallback.green),
    gold: normalizeHex(value?.gold, fallback.gold),
    goldHover: normalizeHex(value?.goldHover, fallback.goldHover),
    copper: normalizeHex(value?.copper, fallback.copper),
    mist: normalizeHex(value?.mist, fallback.mist),
    fontSans: normalizeFont(value?.fontSans, fallback.fontSans),
    fontSerif: normalizeFont(value?.fontSerif, fallback.fontSerif)
  };
}

function normalizeHours(value: unknown) {
  const incomingHours = Array.isArray(value) ? value : [];

  return days.map((day) => {
    const matchingHour = incomingHours.find((entry) => {
      const candidate = entry as { day?: unknown };

      return cleanString(candidate.day).toLowerCase() === day.toLowerCase();
    }) as
      | {
          open?: unknown;
          close?: unknown;
          isClosed?: unknown;
        }
      | undefined;

    const defaultHour = defaultHours.find((hour) => hour.day === day)!;

    return {
      day,
      open: normalizeTime(matchingHour?.open, defaultHour.open),
      close: normalizeTime(matchingHour?.close, defaultHour.close),
      isClosed: Boolean(matchingHour?.isClosed)
    };
  });
}

function normalizeHex(value: unknown, fallback: string) {
  const hex = cleanString(value).toUpperCase();

  if (!hex) {
    return fallback;
  }

  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    throw httpError(400, "Theme colors must use 6-digit hex values.");
  }

  return hex;
}

function normalizeTime(value: unknown, fallback: string) {
  const time = cleanString(value);

  if (!time) {
    return fallback;
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw httpError(400, "Hours must use HH:MM 24-hour time.");
  }

  return time;
}

function normalizeFont(value: unknown, fallback: string) {
  const font = cleanString(value);

  if (!font) {
    return fallback;
  }

  if (!/^[a-zA-Z0-9 ,.'-]{1,60}$/.test(font)) {
    throw httpError(400, "Font names include unsupported characters.");
  }

  return font;
}
