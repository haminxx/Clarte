import type { Metadata } from "next";
import SessionScreen from "@/components/session/SessionScreen";

export const metadata: Metadata = {
  title: "Session · Clarte Coach",
  description: "Talk with Clarte Coach over a 3D map of papers and patents. Text mode works without a voice key.",
};

export default function SessionPage() {
  return <SessionScreen />;
}
