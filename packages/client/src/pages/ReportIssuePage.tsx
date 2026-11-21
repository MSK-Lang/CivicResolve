import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../lib/api';
import type { CreateIssueInput, CivicIssueCategory } from '@civicresolve/shared';
import { AlertCircle, Send, CheckCircle2, ArrowLeft } from 'lucide-react';

const CATEGORIES: { value: CivicIssueCategory; label: string }[] = [
  { value: 'pothole', label: 'Pothole or Road Damage' },
  { value: 'sanitation', label: 'Waste Collection & Sanitation' },
  { value: 'street_lighting', label: 'Broken Street Lighting' },
  { value: 'water_supply', label: 'Water Leakage or Contamination' },
  { value: 'public_safety', label: 'Public Safety Hazard' },
  { value: 'traffic_signals', label: 'Faulty Traffic Signal' },
  { value: 'parks_recreation', label: 'Park Maintenance' },
  { value: 'other', label: 'Other Civic Concern' }
];

export function ReportIssuePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateIssueInput>({
    title: '',
    description: '',
    category: 'pothole',
    location: {
      address: '',
      neighborhood: ''
    },
    reporterName: '',
    reporterEmail: '',
    imageUrl: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick check
    if (formData.title.trim().length < 5) {
      setErrorMessage('Please provide a descriptive title (at least 5 characters).');
      return;
    }
    if (formData.description.trim().length < 15) {
      setErrorMessage('Please provide full details in the description (at least 15 characters).');
      return;
    }
    if (!formData.location.address.trim()) {
      setErrorMessage('A street address or landmark is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createIssue(formData);
      setSuccessId(created.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit civic issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successId) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-emerald-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Report Successfully Logged</h1>
          <p className="mt-2 text-slate-600">
            Your civic issue has been recorded and triaged by our automated dispatch system.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/issues/${successId}`)}
              className="px-5 py-2.5 bg-civic-700 text-white rounded-lg font-semibold hover:bg-civic-800 transition-colors focus-visible:ring-2 focus-visible:ring-civic-600 min-h-[44px]"
            >
              View Triage Result
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccessId(null);
                setFormData({
                  title: '',
                  description: '',
                  category: 'pothole',
                  location: { address: '', neighborhood: '' },
                  reporterName: '',
                  reporterEmail: '',
                  imageUrl: ''
                });
              }}
              className="px-5 py-2.5 bg-slate-100 text-slate-800 rounded-lg font-semibold hover:bg-slate-200 transition-colors border border-slate-300 min-h-[44px]"
            >
              File Another Report
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 p-1 min-h-[44px] focus-visible:ring-2 focus-visible:ring-civic-600 rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Dashboard</span>
      </button>

      <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Submit a Civic Report</h1>
        <p className="text-sm text-slate-600 mb-6">
          Provide accurate details about the issue. Our Gemini AI triage will classify urgency and assign the responsible municipal authority.
        </p>

        {errorMessage && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-start gap-3" role="alert">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Submission Incomplete</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Issue Title */}
          <div>
            <label htmlFor="issue-title" className="block text-sm font-semibold text-slate-900 mb-1">
              Issue Summary Title <span className="text-red-600">*</span>
            </label>
            <input
              id="issue-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Hazardous deep pothole on North Main Street"
              className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-civic-600 focus:ring-1 focus:ring-civic-600"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label htmlFor="issue-category" className="block text-sm font-semibold text-slate-900 mb-1">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              id="issue-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as CivicIssueCategory })}
              className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:border-civic-600 focus:ring-1 focus:ring-civic-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address and Neighborhood */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue-address" className="block text-sm font-semibold text-slate-900 mb-1">
                Street Address or Landmark <span className="text-red-600">*</span>
              </label>
              <input
                id="issue-address"
                type="text"
                required
                value={formData.location.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: { ...formData.location, address: e.target.value }
                  })
                }
                placeholder="e.g. Corner of 5th Ave and Elm St"
                className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-civic-600 focus:ring-1 focus:ring-civic-600"
              />
            </div>

            <div>
              <label htmlFor="issue-neighborhood" className="block text-sm font-semibold text-slate-900 mb-1">
                Neighborhood / Ward (optional)
              </label>
              <input
                id="issue-neighborhood"
                type="text"
                value={formData.location.neighborhood || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: { ...formData.location, neighborhood: e.target.value }
                  })
                }
                placeholder="e.g. Ward 4 / Downtown"
                className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-civic-600 focus:ring-1 focus:ring-civic-600"
              />
            </div>
          </div>

          {/* Full Description */}
          <div>
            <label htmlFor="issue-description" className="block text-sm font-semibold text-slate-900 mb-1">
              Detailed Description <span className="text-red-600">*</span>
            </label>
            <textarea
              id="issue-description"
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the condition, size of damage, safety risks, or how long it has been present..."
              className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-civic-600 focus:ring-1 focus:ring-civic-600"
            />
          </div>

          {/* Reporter Info (Optional) */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Reporter Contact (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reporter-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Name
                </label>
                <input
                  id="reporter-name"
                  type="text"
                  value={formData.reporterName || ''}
                  onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                  placeholder="Citizen name"
                  className="w-full rounded-md border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label htmlFor="reporter-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  id="reporter-email"
                  type="email"
                  value={formData.reporterEmail || ''}
                  onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full rounded-md border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-civic-700 text-white font-semibold hover:bg-civic-800 transition-colors focus-visible:ring-2 focus-visible:ring-civic-600 min-h-[44px] min-w-[160px]"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Evaluating & Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
