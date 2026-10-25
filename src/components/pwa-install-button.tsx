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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="install-rivnexo-title" className="relative box-border max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl ring-1 ring-border">
            <button type="button" onClick={() => setShowPopup(false)} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close install prompt">
              <X className="size-4" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Download className="size-5" />
              </div>
              <p id="install-rivnexo-title" className="mt-3 font-semibold text-foreground">Install Rivnexo</p>
              <p className="mt-1 text-sm text-muted-foreground">Add Rivnexo to your home screen for faster access.</p>
              <Button className="mt-4 w-full" onClick={install}>Install Rivnexo</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
