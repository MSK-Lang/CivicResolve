import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-civic-950 text-slate-300 border-t border-civic-900 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-200 text-sm">
          <ShieldCheck className="w-5 h-5 text-civic-400" aria-hidden="true" />
          <span className="font-semibold text-white font-serif">CivicResolve</span>
          <span className="text-slate-400">(PromptWars GDG PSG iTech x H2S Hackathon)</span>
        </div>
        <p className="text-xs text-slate-400 text-center md:text-right font-mono">
          Production foundation configured for Google Cloud Run, Firebase Firestore and Google Gemini.
        </p>
      </div>
    </footer>
  );
}
