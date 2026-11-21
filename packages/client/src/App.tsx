import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackIssuePage } from './pages/TrackIssuePage';
import { HealthCheckPage } from './pages/HealthCheckPage';

export default function App() {
  const location = useLocation();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initial application load (700ms branded civic workspace loading screen)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // Subsequent route navigation feedback (200ms lightweight progress bar)
  useEffect(() => {
    if (!isInitialLoading) {
      setIsNavigating(true);
      const timer = setTimeout(() => setIsNavigating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  if (isInitialLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-50 bg-[#F6F5F0] flex flex-col items-center justify-center select-none"
      >
        <div className="flex flex-col items-center space-y-3">
          <h1 className="font-serif text-3xl font-normal text-[#242522] tracking-tight">
            CivicResolve
          </h1>
          <div className="flex items-center gap-2.5 text-xs text-[#706F68] pt-1">
            <span
              className="w-3.5 h-3.5 rounded-full border-2 border-[#765448] border-t-transparent animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Preparing your civic workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink-primary font-sans selection:bg-accent/15 selection:text-ink-primary relative">
      {isNavigating && (
        <div
          role="progressbar"
          aria-label="Navigating route"
          className="fixed top-0 left-0 right-0 h-0.5 bg-accent z-[100] animate-progress"
        />
      )}
      <Navbar />
      <div key={location.pathname} className="flex-1 w-full animate-fade-in">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/report" element={<ReportIssuePage />} />
          <Route path="/track" element={<TrackIssuePage />} />
          <Route path="/track/:id" element={<TrackIssuePage />} />
          <Route path="/issues/:id" element={<TrackIssuePage />} />
          <Route path="/health" element={<HealthCheckPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
