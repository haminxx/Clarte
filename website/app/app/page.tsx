import type { Metadata } from "next";
import AppScreen from "@/components/session/AppScreen";

export const metadata: Metadata = {
  title: "Clarte — session",
  description: "Talk through a problem with Clarte. The graph, transcript, and sources stay on this screen.",
};

export default function AppPage() {
  return <AppScreen />;
}
