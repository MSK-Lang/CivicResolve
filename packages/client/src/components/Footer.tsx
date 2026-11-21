import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <ShieldCheck className="w-5 h-5 text-civic-500" aria-hidden="true" />
          <span className="font-semibold text-white">CivicResolve</span>
          <span>(PromptWars GDG PSG iTech x H2S Hackathon)</span>
        </div>
        <p className="text-xs text-slate-400 text-center md:text-right">
          Production foundation configured for Google Cloud Run, Firebase Firestore and Google Gemini.
        </p>
      </div>
    </footer>
  );
}
