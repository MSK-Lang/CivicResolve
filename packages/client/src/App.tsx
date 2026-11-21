import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackIssuePage } from './pages/TrackIssuePage';
import { HealthCheckPage } from './pages/HealthCheckPage';

const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage }))
);

export default function App() {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  // Subsequent route navigation feedback (150ms lightweight progress bar)
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);

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
          <Route
            path="/admin"
            element={
              <Suspense fallback={<div className="p-12 text-center text-xs text-ink-muted">Loading administrative register...</div>}>
                <AdminDashboardPage />
              </Suspense>
            }
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
