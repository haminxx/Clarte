import type { Metadata } from "next";
import Landing from "@/components/v2/Landing";

export const metadata: Metadata = {
  title: "Clarte · Think out loud. Find the technology that already exists.",
  description:
    "Clarte is a voice brainstorm partner backed by a 3D map of papers and patents. It asks why, connects your problem to technology from other fields, argues back,     and cites every source.",
  openGraph: {
    title: "Clarte · Think out loud. Find the technology that already exists.",
    description: "A voice brainstorm partner backed by a 3D map of papers and patents. Every claim links to its source.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  return <Landing />;
}
