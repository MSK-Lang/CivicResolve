import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createIssue } from '../lib/api';
import type {
  CreateIssueInput,
  CivicIssueCategory,
  LocationContextZone,
  CivicIssue,
} from '@civicresolve/shared';
import {
  Button,
  Input,
  Textarea,
  Select,
  FormField,
  PriorityIndicator,
} from '../components/ui';
import {
  ArrowLeft,
  Camera,
  MapPin,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  X,
  Clock,
  Building2,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES: { value: CivicIssueCategory; label: string }[] = [
  { value: 'pothole', label: 'Pothole or Road Damage' },
  { value: 'sanitation', label: 'Waste Collection & Sanitation' },
  { value: 'street_lighting', label: 'Broken Street Lighting' },
  { value: 'water_supply', label: 'Water Leakage or Contamination' },
  { value: 'public_safety', label: 'Public Safety Hazard' },
  { value: 'traffic_signals', label: 'Faulty Traffic Signal' },
  { value: 'parks_recreation', label: 'Park Maintenance' },
  { value: 'other', label: 'Other Civic Concern' },
];

const LOCATION_ZONES: { value: LocationContextZone; label: string }[] = [
  { value: 'unknown', label: 'Standard / Unknown' },
  { value: 'school_hospital_zone', label: 'School or Hospital Zone' },
  { value: 'major_transit_corridor', label: 'Major Transit Corridor' },
  { value: 'commercial_high_density', label: 'High-Density Commercial' },
  { value: 'standard_residential', label: 'Residential Neighborhood' },
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ReportIssuePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form input state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CivicIssueCategory>('pothole');
  const [description, setDescription] = useState('');

  // Location state
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [contextZone, setContextZone] = useState<LocationContextZone>('unknown');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [geoState, setGeoState] = useState<'idle' | 'acquiring' | 'acquired' | 'error'>('idle');
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<'image/jpeg' | 'image/png' | 'image/webp' | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Optional reporter state
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [createdReport, setCreatedReport] = useState<CivicIssue | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Geolocation trigger
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('error');
      setGeoErrorMsg('Geolocation is not supported by your browser. Please enter address manually.');
      return;
    }

    setGeoState('acquiring');
    setGeoErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setGeoState('acquired');
        if (!address.trim()) {
          setAddress(`GPS: ${lat}, ${lng}`);
        }
      },
      error => {
        setGeoState('error');
        if (error.code === error.PERMISSION_DENIED) {
          setGeoErrorMsg('Location access was denied. Enter address manually.');
        } else {
          setGeoErrorMsg('Unable to retrieve GPS coordinates. Enter address manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClearLocation = () => {
    setLatitude(undefined);
    setLongitude(undefined);
    setGeoState('idle');
    setGeoErrorMsg(null);
  };

  // Image handling
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setImageError('Unsupported image format. Upload JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setImageError(`File exceeds 5 MB limit (${sizeMb} MB).`);
      return;
    }

    setImageFile(file);
    setImageMimeType(file.type as 'image/jpeg' | 'image/png' | 'image/webp');

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.onerror = () => {
      setImageError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Client validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters.';
    } else if (title.trim().length > 120) {
      errors.title = 'Title cannot exceed 120 characters.';
    }

    if (description.trim().length < 15) {
      errors.description = 'Description must be at least 15 characters.';
    } else if (description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.';
    }

    if (!address.trim()) {
      errors.address = 'Street address or landmark is required.';
    }

    if (reporterName.trim() && reporterName.trim().length < 2) {
      errors.reporterName = 'Name must be at least 2 characters if provided.';
    }

    if (reporterEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reporterEmail.trim())) {
        errors.reporterEmail = 'Please provide a valid email address.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateIssueInput = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: {
          address: address.trim(),
          neighborhood: neighborhood.trim() || undefined,
          contextZone: contextZone !== 'unknown' ? contextZone : undefined,
          latitude: typeof latitude === 'number' ? latitude : undefined,
          longitude: typeof longitude === 'number' ? longitude : undefined,
        },
        reporterName: reporterName.trim() || undefined,
        reporterEmail: reporterEmail.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
      };

      if (imageBase64 && imageMimeType && imageFile) {
        payload.image = {
          dataBase64: imageBase64,
          mimeType: imageMimeType,
          fileSizeBytes: imageFile.size,
          capturedAt: new Date().toISOString(),
        };
      }

      const created = await createIssue(payload);
      setCreatedReport(created);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : 'An error occurred while submitting your report.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (!createdReport) return;
    navigator.clipboard.writeText(createdReport.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Confirmation view
  if (createdReport) {
    const priorityLevel = createdReport.priorityScore?.priorityLevel || createdReport.urgency;
    const departmentName =
      createdReport.triageEvaluation?.assignedDepartment ||
      createdReport.aiTriage?.assignedDepartment ||
      'Municipal Operations Dispatch';
    const slaHours = createdReport.priorityScore?.slaHours;

    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 animate-fade-in">
        <div className="bg-surface rounded border border-border p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">
              Submission Registered
            </span>
            <h1 className="text-2xl sm:text-3xl font-normal text-ink-primary font-serif tracking-tight">
              Report received and cataloged.
            </h1>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Your complaint has been assigned a tracking reference and evaluated for municipal dispatch.
            </p>
          </div>

          {/* Reference ID banner */}
          <div className="bg-surface-subtle p-3.5 rounded border border-border flex items-center justify-between gap-3 text-xs">
            <div className="truncate">
              <span className="text-ink-muted block text-[11px]">Tracking Reference</span>
              <span className="font-mono font-bold text-ink-primary select-all truncate block mt-0.5">
                {createdReport.id}
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyId}
              className="shrink-0"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>

          {/* Immediate details */}
          <div className="grid grid-cols-2 gap-3 text-xs border-y border-border py-4">
            <div>
              <span className="text-ink-muted block text-[11px]">Assigned Department</span>
              <span className="font-medium text-ink-primary flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-ink-secondary" />
                <span className="truncate">{departmentName}</span>
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px]">Priority & SLA</span>
              <div className="flex items-center gap-2 mt-0.5">
                <PriorityIndicator priority={priorityLevel} score={createdReport.priorityScore?.totalScore} />
                {slaHours && <span className="font-mono text-ink-muted">{slaHours}h SLA</span>}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-2 text-xs">
            <span className="font-medium text-ink-primary uppercase tracking-wider text-[11px]">Resolution Pathway</span>
            <ol className="space-y-2 text-ink-secondary">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span>Issue received, validated, and recorded in public register.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
                <span>Municipal engineering team reviews site priority and schedules crew.</span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              type="button"
              variant="action"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => navigate(`/track/${createdReport.id}`)}
            >
              Track Report Progress
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => {
                setCreatedReport(null);
                setTitle('');
                setDescription('');
                setCategory('pothole');
                setAddress('');
                setNeighborhood('');
                setContextZone('unknown');
                setLatitude(undefined);
                setLongitude(undefined);
                setGeoState('idle');
                handleRemoveImage();
                setReporterName('');
                setReporterEmail('');
                setReporterPhone('');
                setFieldErrors({});
                setGeneralError(null);
              }}
            >
              Submit Another Issue
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Unified single form view
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Return link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary mb-6 min-h-[44px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Return to Dashboard</span>
      </Link>

      {/* Editorial Header */}
      <div className="space-y-2 mb-8">
        <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">
          Public Service Intake
        </span>
        <h1 className="text-3xl font-normal text-ink-primary font-serif tracking-tight">
          File an issue report
        </h1>
        <p className="text-xs text-ink-secondary leading-relaxed">
          Provide issue details, approximate location, and optional photo evidence for municipal routing.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className="bg-[#FBEBEB] border border-[#F3C7C7] text-[#8A2222] rounded p-3 text-xs mb-6 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Single Cohesive Form Surface */}
      <form onSubmit={handleSubmit} noValidate className="bg-surface rounded border border-border p-6 sm:p-8 space-y-6">
        {/* Field Group 1: Core Issue Details */}
        <div className="space-y-4">
          <FormField
            id="issue-title"
            label="Title"
            required
            hint="Concise summary (5 to 120 characters)."
            error={fieldErrors.title}
          >
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Deep pothole damaging two-wheelers on Avinashi Road"
              maxLength={120}
              required
            />
          </FormField>

          <FormField
            id="issue-category"
            label="Category"
            required
            error={fieldErrors.category}
          >
            <Select
              value={category}
              onChange={e => setCategory(e.target.value as CivicIssueCategory)}
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            id="issue-description"
            label="Description"
            required
            hint="Describe location, severity, and any hazards (15 to 2000 characters)."
            error={fieldErrors.description}
          >
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide specific details about the issue..."
              maxLength={2000}
              required
            />
          </FormField>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Field Group 2: Photo Evidence (Compact) */}
        <div className="space-y-3">
          <label htmlFor="issue-photo" className="block text-sm font-semibold text-ink-primary">
            Photographic Evidence <span className="text-xs text-ink-muted font-normal">(Optional)</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            id="issue-photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleImageChange}
          />

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              className="border border-dashed border-border rounded p-4 text-center hover:border-ink-secondary transition-colors cursor-pointer bg-surface-subtle/40 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <div className="flex items-center justify-center gap-2 text-xs text-ink-secondary">
                <Camera className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                <span>Attach photo (JPEG, PNG, WebP up to 5 MB)</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-2.5 rounded border border-border bg-surface-subtle text-xs">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="w-14 h-14 object-cover rounded border border-border"
              />
              <div className="flex-1 min-w-0">
                <span className="block truncate font-medium text-ink-primary">{imageFile?.name}</span>
                <span className="text-ink-muted text-[11px]">
                  {(imageFile ? imageFile.size / 1024 : 0).toFixed(0)} KB
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                aria-label="Remove photo"
              >
                <X className="w-4 h-4 text-ink-secondary" />
              </Button>
            </div>
          )}

          {imageError && (
            <p role="alert" className="text-xs text-[#8A2222]">{imageError}</p>
          )}
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Field Group 3: Location */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-ink-primary">Incident Location</label>
            {geoState !== 'acquired' ? (
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={geoState === 'acquiring'}
                className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 min-h-[44px]"
              >
                <MapPin className="w-3 h-3" />
                <span>{geoState === 'acquiring' ? 'Locating...' : 'Use current location'}</span>
              </button>
            ) : (
              <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                <span>GPS captured</span>
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="text-accent underline ml-1"
                >
                  Clear
                </button>
              </span>
            )}
          </div>

          {geoErrorMsg && (
            <p className="text-xs text-ink-muted">{geoErrorMsg}</p>
          )}

          <FormField
            id="issue-address"
            label="Street Address or Landmark"
            required
            error={fieldErrors.address}
          >
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 12 Avinashi Road, near PSG Tech"
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              id="issue-neighborhood"
              label="Neighborhood or Ward"
              error={fieldErrors.neighborhood}
            >
              <Input
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
                placeholder="e.g. Peelamedu, Ward 12"
              />
            </FormField>

            <FormField
              id="issue-context-zone"
              label="Location Context"
              error={fieldErrors.contextZone}
            >
              <Select
                value={contextZone}
                onChange={e => setContextZone(e.target.value as LocationContextZone)}
              >
                {LOCATION_ZONES.map(zone => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Field Group 4: Citizen Contact (Visually Secondary) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>Contact Information (Optional & Private)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              id="reporter-name"
              label="Your Name"
              error={fieldErrors.reporterName}
            >
              <Input
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                placeholder="e.g. Priya Sharma"
              />
            </FormField>

            <FormField
              id="reporter-email"
              label="Email Address"
              error={fieldErrors.reporterEmail}
            >
              <Input
                type="email"
                value={reporterEmail}
                onChange={e => setReporterEmail(e.target.value)}
                placeholder="e.g. priya.sharma@example.com"
              />
            </FormField>

            <FormField
              id="reporter-phone"
              label="Mobile Number"
              error={fieldErrors.reporterPhone}
            >
              <Input
                type="tel"
                value={reporterPhone}
                onChange={e => setReporterPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </FormField>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-ink-muted">
            Reports are cataloged publicly; personal contact details remain private.
          </p>
          <Button
            type="submit"
            variant="action"
            size="lg"
            isLoading={isSubmitting}
            className="w-full sm:w-auto min-w-[170px]"
          >
            {isSubmitting ? 'Submitting report...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </main>
  );
}
