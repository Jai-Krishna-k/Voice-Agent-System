"use client";

interface FormattedDateProps {
  date: string;
  format?: "short" | "full";
}

export default function FormattedDate({ date, format = "short" }: FormattedDateProps) {
  const options: Intl.DateTimeFormatOptions =
    format === "short"
      ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
      : {};

  return <>{new Date(date).toLocaleString("en-IN", format === "full" ? undefined : options)}</>;
}
