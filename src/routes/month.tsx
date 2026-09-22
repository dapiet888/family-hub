import { createFileRoute } from "@tanstack/react-router";
import { HubApp } from "@/components/hub-app";

export const Route = createFileRoute("/month")({ component: Month });

function Month() {
  return <HubApp view="month" />;
}
