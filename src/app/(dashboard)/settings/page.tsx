import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Configuration and preferences</p>

      <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-16 text-center">
        <Settings size={40} className="mx-auto text-zinc-300" />
        <p className="mt-4 text-sm font-medium text-zinc-500">Settings coming soon</p>
        <p className="mt-1 text-xs text-zinc-400">
          This page will house pipeline configuration, notification preferences, and integration settings.
        </p>
      </div>
    </div>
  );
}
