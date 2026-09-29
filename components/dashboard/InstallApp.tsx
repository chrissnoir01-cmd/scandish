"use client";

import { useEffect, useState } from "react";
import { Download, MonitorSmartphone, Power, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The browser may offer installation before React has mounted; keep the offer from page load.
let savedPrompt: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    savedPrompt = e as InstallPromptEvent;
  });
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * "Download the app" for the business dashboard: installs ScanDish Business on the computer, tablet
 * or phone, and explains how to start it automatically when the computer turns on.
 */
export default function InstallApp() {
  const [installed, setInstalled] = useState(true);
  const [canPrompt, setCanPrompt] = useState(false);
  const [help, setHelp] = useState<"install" | "startup" | null>(null);

  useEffect(() => {
    // Offline screen for the installed app; stores nothing.
    navigator.serviceWorker?.register("/dashboard-sw.js", { scope: "/dashboard" }).catch(() => {});

    // eslint-disable-next-line react-hooks/set-state-in-effect -- display mode is only known in the browser
    setInstalled(isStandalone());
    setCanPrompt(savedPrompt !== null);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      savedPrompt = e as InstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      savedPrompt = null;
      setCanPrompt(false);
      setHelp("startup");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!savedPrompt) return setHelp("install");
    await savedPrompt.prompt();
    const choice = await savedPrompt.userChoice.catch(() => null);
    savedPrompt = null;
    setCanPrompt(false);
    if (choice?.outcome === "accepted") setHelp("startup");
  };

  return (
    <>
      {installed ? (
        <button
          type="button"
          onClick={() => setHelp("startup")}
          title="Start ScanDish when the computer turns on"
          className="hidden items-center gap-2 rounded-2xl border border-[#f4d4ca] px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-[#fff8f5] md:flex"
        >
          <Power size={16} /> Auto-start
        </button>
      ) : (
        <button
          type="button"
          onClick={install}
          className="flex items-center gap-2 rounded-2xl border border-[#f08c6c] px-3 py-2.5 text-sm font-bold text-[#d9694a] hover:bg-[#fff8f5] sm:px-4"
          title="Install the ScanDish app on this device"
        >
          <Download size={18} /> <span className="hidden sm:inline">Download the app</span>
        </button>
      )}

      {help && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={() => setHelp(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                {help === "install" ? <MonitorSmartphone className="h-5 w-5 text-[#f08c6c]" /> : <Power className="h-5 w-5 text-[#f08c6c]" />}
                {help === "install" ? "Install the ScanDish app" : "Start ScanDish with the computer"}
              </h2>
              <button type="button" onClick={() => setHelp(null)} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {help === "install" ? (
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-600">
                <p>The app opens your dashboard in its own window, with its own icon — sign in once and it stays signed in.</p>
                <Step title="Computer (Google Chrome or Microsoft Edge)">
                  Click the install icon at the right end of the address bar, or open the browser menu (⋮ or ⋯) → <b>Install ScanDish</b> (in
                  Chrome it may be under <b>Cast, save and share</b>; in Edge under <b>Apps</b>).
                </Step>
                <Step title="Android phone or tablet (Chrome)">
                  Menu ⋮ → <b>Install app</b> or <b>Add to Home screen</b>.
                </Step>
                <Step title="iPhone or iPad (Safari)">
                  Tap the Share button → <b>Add to Home Screen</b>.
                </Step>
                {!canPrompt && <p className="text-xs text-gray-400">If you don&apos;t see the option, reload this page once and try again.</p>}
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-600">
                <p>Useful for the counter computer that prints orders: the dashboard opens by itself every morning.</p>
                <Step title="Microsoft Edge">
                  Type <Code>edge://apps</Code> in the address bar → on ScanDish click ⋯ → turn on <b>Auto-start on device login</b>.
                </Step>
                <Step title="Google Chrome">
                  Type <Code>chrome://apps</Code> in the address bar → right-click ScanDish → tick <b>Start app when you sign in</b>.
                </Step>
                <Step title="Any browser on Windows">
                  Press <b>Windows + R</b>, type <Code>shell:startup</Code> and press Enter. Copy the <b>ScanDish</b> shortcut from the desktop
                  (or Start menu) into the folder that opens.
                </Step>
                <p className="rounded-2xl bg-[#fff8f5] p-4 text-xs text-gray-600">
                  <b>Printing without the print window:</b> right-click that ScanDish shortcut → Properties, and add{" "}
                  <Code>--kiosk-printing</Code> at the end of <i>Target</i>. See Track order → Printer help.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4">
      <p className="mb-1 font-bold text-gray-900">{title}</p>
      <p>{children}</p>
    </div>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-gray-800">{children}</code>
);
