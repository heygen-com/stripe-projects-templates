import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeyGen Studio",
  description: "Prompt to an AI avatar video with motion graphics and captions, powered by the HeyGen API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
