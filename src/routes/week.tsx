import { createFileRoute } from "@tanstack/react-router";
import { HubApp } from "@/components/hub-app";

export const Route = createFileRoute("/week")({ component: Week });

function Week() {
  return <HubApp view="week" />;
}
