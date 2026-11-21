import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { HealthCheckPage } from './pages/HealthCheckPage';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-paper-bg text-ink-primary font-sans selection:bg-civic-100 selection:text-civic-950">
      <Navbar />
      <div className="flex-1">
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
