import { createFileRoute } from "@tanstack/react-router";
import { HubApp } from "@/components/hub-app";

export const Route = createFileRoute("/lists")({ component: Lists });

function Lists() {
  return <HubApp view="lists" />;
}
