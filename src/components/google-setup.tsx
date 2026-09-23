import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isGoogleIcalUrl } from "@/lib/google-feeds";
import { useHubStore } from "@/lib/hub-store";

export function GoogleSetup() {
  const feeds = useHubStore((s) => s.googleFeeds ?? []);
  const addGoogleFeed = useHubStore((s) => s.addGoogleFeed);
  const removeGoogleFeed = useHubStore((s) => s.removeGoogleFeed);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  function addFeed() {
    const next = url.trim();
    if (!isGoogleIcalUrl(next)) {
      toast("Paste the secret iCal address from Google Calendar");
      return;
    }
    addGoogleFeed(next, name);
    setUrl("");
    setName("");
    toast("Google calendar added. It will show on every screen with family sync.");
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-3">
      <p className="font-medium text-ink">Google Calendar</p>
      <p className="font-sans text-sm text-muted">
        Open Google Calendar settings, choose the calendar, then Integrate calendar. Copy Secret address in iCal format and paste it here.
      </p>
      <a
        href="https://calendar.google.com/calendar/u/0/r/settings"
        target="_blank"
        rel="noreferrer"
        className="font-sans text-sm text-ink underline"
      >
        Open Google Calendar settings
      </a>
      <Input
        value={name}
        placeholder="Name, such as School or Work"
        aria-label="Calendar name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />
      <Input
        value={url}
        placeholder="https://calendar.google.com/calendar/ical/..."
        aria-label="Secret iCal address"
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addFeed();
          }
        }}
      />
      <Button type="button" variant="secondary" onClick={addFeed}>
        Add Google calendar
      </Button>
      {feeds.map((feed) => (
        <div key={feed.id} className="flex items-center justify-between gap-2">
          <span className="font-sans text-sm text-ink">{feed.name}</span>
          <Button type="button" variant="ghost" onClick={() => removeGoogleFeed(feed.id)}>
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-3">
      <p className="font-medium text-ink">Install on this phone</p>
      {installed ? (
        <p className="font-sans text-sm text-muted">Family Hub is installed. Open it from the home screen icon.</p>
      ) : prompt ? (
        <Button
          type="button"
          onClick={() => {
            void prompt.prompt();
          }}
        >
          Install Family Hub
        </Button>
      ) : (
        <p className="font-sans text-sm text-muted">
          In Chrome on Android, open the menu and choose Install app or Add to Home screen. The icon is the green house.
        </p>
      )}
    </div>
  );
}
