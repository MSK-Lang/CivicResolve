import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { HealthCheckPage } from './pages/HealthCheckPage';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink-primary font-sans selection:bg-accent/15 selection:text-ink-primary">
      <Navbar />
      <div key={location.pathname} className="flex-1 animate-fade-in">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/report" element={<ReportIssuePage />} />
          <Route path="/issues/:id" element={<IssueDetailPage />} />
          <Route path="/health" element={<HealthCheckPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
