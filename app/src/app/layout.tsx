import type { Metadata, Viewport } from "next";
import { THEME_SCRIPT } from "@/components/shell/theme-script";
import { fontVariables } from "@/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pencil Down", template: "%s · Pencil Down" },
  description: "CEED 2027 preparation",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Root: fonts, tokens, theme. No chrome — (app)/layout adds navigation, (exam)/layout stays bare.
 * The inline script applies a stored theme choice before paint; otherwise tokens follow the system.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
