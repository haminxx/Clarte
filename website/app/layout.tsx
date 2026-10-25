import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarte — technology library and voice brainstorming coach",
  description:
    "Every paper, patent and NASA technology as a node in one knowledge graph. Talk it through with a voice coach that runs 5 Whys, Why-How-What, and a cited debate.",
};

export const viewport: Viewport = {
  themeColor: "#05060f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
