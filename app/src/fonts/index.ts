import localFont from "next/font/local";

// Families are exposed as --ff-* variables; tokens.css builds --font-body/mono on top.

export const bodyFont = localFont({
  src: [
    { path: "./GeneralSans-Variable.woff2", weight: "200 700", style: "normal" },
    { path: "./GeneralSans-VariableItalic.woff2", weight: "200 700", style: "italic" },
  ],
  variable: "--ff-body",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const monoFont = localFont({
  src: [
    { path: "./JetBrainsMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./JetBrainsMono-Medium.woff2", weight: "500", style: "normal" },
    { path: "./JetBrainsMono-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--ff-mono",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const fontVariables = `${bodyFont.variable} ${monoFont.variable}`;
