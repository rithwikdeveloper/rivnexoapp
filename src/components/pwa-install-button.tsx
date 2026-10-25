import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setShowPopup(true);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowPopup(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  const install = async () => {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowPopup(false);
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={install} aria-label="Install Rivnexo" title="Install Rivnexo">
        <Download />
      </Button>
      {showPopup && (
        <div className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-2xl ring-1 ring-border sm:inset-x-auto sm:right-6 sm:left-auto">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Download className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Install Rivnexo</p>
              <p className="mt-1 text-sm text-muted-foreground">Add Rivnexo to your home screen for faster access.</p>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={install}>Install</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPopup(false)}>Not now</Button>
              </div>
            </div>
            <button type="button" onClick={() => setShowPopup(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close install prompt">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
