import { createServerFn } from "@tanstack/react-start";
import { ConnectorType, GmailTools } from "@/lib/app-data";
import {
  classifyCallToolError,
  type CallToolErrorState,
} from "@/lib/app-data/errors";
import type { CallToolResult } from "@/lib/app-data/types";
import { hintFromMail } from "@/lib/mail-hints";
import { isPublicFamilyHost } from "@/lib/google-calendar";

export type MailProposal = {
  title: string;
  start: string;
  detail: string;
};

export type MailScanResult =
  | { status: "ok"; proposals: MailProposal[] }
  | { status: "pending" | "login" | "not_connected" | "error"; error: CallToolErrorState; loginUrl?: string };

type MailRow = { title: string; text: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function rowsFrom(data: unknown): MailRow[] {
  const found: MailRow[] = [];
  const visit = (value: unknown) => {
    if (!value || found.length > 20) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = asRecord(value);
    if (!record) return;
    const title = [record.subject, record.title].find((item) => typeof item === "string") as string | undefined;
    const text = [record.snippet, record.body, record.text, record.plain].find((item) => typeof item === "string") as
      | string
      | undefined;
    if (title && text) found.push({ title, text });
    for (const key of ["messages", "items", "threads", "emails", "data"]) visit(record[key]);
  };
  visit(data);
  return found;
}

export const scanInbox = createServerFn({ method: "POST" }).handler(async (): Promise<MailScanResult> => {
  const { getRequest } = await import("@tanstack/react-start/server");
  let host: string | null = null;
  try {
    const request = getRequest();
    host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  } catch {
    host = null;
  }
  if (isPublicFamilyHost(host)) {
    return {
      status: "not_connected",
      error: {
        kind: "not_connected",
        message: "Email scan connects inside Grok, not on the family link. Use Drop a check or import a calendar file.",
      },
    };
  }
  const { callTool } = await import("@/lib/app-data/client.server");
  const options = { connectorType: ConnectorType.Gmail };
  const search = await callTool(
    GmailTools.search,
    {
      query: "newer_than:21d (school OR appointment OR booking OR dentist OR club OR match OR parents OR reservation OR reminder)",
      max_results: 12,
    },
    options,
  );
  if (!search.ok) {
    const error =
      classifyCallToolError(search as CallToolResult) ??
      ({ kind: "error", message: search.errorMessage ?? "Email is unavailable." } satisfies CallToolErrorState);
    const status =
      error.kind === "pending" ? "pending" : error.kind === "login" ? "login" : error.kind === "not_connected" ? "not_connected" : "error";
    return { status, error, loginUrl: (search as CallToolResult).loginUrl };
  }
  const now = new Date();
  const proposals = rowsFrom(search.data)
    .map((row) => hintFromMail(row.title, row.text, now))
    .filter((hint): hint is MailProposal => hint !== null)
    .slice(0, 8);
  return { status: "ok", proposals };
});
