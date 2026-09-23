import { useEffect, useState, type ReactNode } from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { useHubStore } from "@/lib/hub-store";
import { isHubTheme, THEME_COLORS } from "@/lib/themes";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Family Hub";

function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { title: APP_NAME },
      { name: "theme-color", content: "#2A4A46" },
      {
        name: "description",
        content: "Everyone's Google calendars and lists, one household screen.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function ThemeSync() {
  const theme = useHubStore((s) => s.theme);
  useEffect(() => {
    const next = isHubTheme(theme) ? theme : "paper";
    document.documentElement.dataset.theme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[next]);
  }, [theme]);
  return null;
}

function RootDocument() {
  return (
    <html lang="en-GB" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=JSON.parse(localStorage.getItem('family-hub-v1')||'{}').state.theme;var ok=['paper','midnight','boardroom','slate','carbon','obsidian','aurora','fjord','spruce','sage','terracotta','ink','cobalt','mono','meridian','night','forest','graphite','coral','velvet'];if(ok.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body className="bg-paper text-ink">
        <ThemeSync />
        <PreviewHostBridge />
        <AuthProvider>
          <QueryProvider>
            <Outlet />
            <Toaster
              position="bottom-center"
              toastOptions={{
                className:
                  "font-sans bg-panel text-ink border border-line shadow-panel",
              }}
            />
          </QueryProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
