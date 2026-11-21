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
  Card,
  PageContainer,
  PriorityIndicator,
} from '../components/ui';
import {
  ArrowLeft,
  Camera,
  MapPin,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  X,
  Clock,
  Building2,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES: { value: CivicIssueCategory; label: string; description: string }[] = [
  {
    value: 'pothole',
    label: 'Pothole or Road Damage',
    description: 'Cratered pavement, asphalt erosion, sinkholes, or curb damage',
  },
  {
    value: 'sanitation',
    label: 'Waste Collection and Sanitation',
    description: 'Overflowing dumpsters, illegal trash dumping, or debris accumulation',
  },
  {
    value: 'street_lighting',
    label: 'Broken Street Lighting',
    description: 'Dark corridors, flickering streetlamps, or exposed light pole wiring',
  },
  {
    value: 'water_supply',
    label: 'Water Leakage or Contamination',
    description: 'Burst municipal mains, discolored drinking water, or sewer overflow',
  },
  {
    value: 'public_safety',
    label: 'Public Safety Hazard',
    description: 'Fallen trees, dangerous scaffolding, or unbarricaded road trenches',
  },
  {
    value: 'traffic_signals',
    label: 'Faulty Traffic Signal',
    description: 'Malfunctioning intersection lights, damaged pedestrian crossings',
  },
  {
    value: 'parks_recreation',
    label: 'Park Maintenance',
    description: 'Damaged playground fixtures, unkept public green, or vandalized benches',
  },
  {
    value: 'other',
    label: 'Other Civic Concern',
    description: 'General municipal infrastructure complaints not covered above',
  },
];

const LOCATION_ZONES: { value: LocationContextZone; label: string }[] = [
  { value: 'unknown', label: 'General / Unknown' },
  { value: 'school_hospital_zone', label: 'School or Hospital Zone (High Priority)' },
  { value: 'major_transit_corridor', label: 'Major Transit Corridor or Highway' },
  { value: 'commercial_high_density', label: 'High-Density Commercial / Market' },
  { value: 'standard_residential', label: 'Standard Residential Neighborhood' },
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB strict boundary
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
      setGeoErrorMsg('Geolocation is not supported by your browser. Please enter the address manually.');
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

        // If address is empty, provide a descriptive GPS placeholder
        if (!address.trim()) {
          setAddress(`GPS: ${lat}, ${lng}`);
        }
      },
      error => {
        setGeoState('error');
        if (error.code === error.PERMISSION_DENIED) {
          setGeoErrorMsg('Location access was denied. Please enter the address manually.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoErrorMsg('Location information is currently unavailable. Please enter the address manually.');
        } else {
          setGeoErrorMsg('Location request timed out. Please enter the address manually.');
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

  // Image selection handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setImageError('Unsupported image format. Please upload JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setImageError(`File exceeds maximum size limit of 5 MB (selected file is ${sizeMb} MB).`);
      return;
    }

    setImageFile(file);
    setImageMimeType(file.type as 'image/jpeg' | 'image/png' | 'image/webp');

    // Read as Data URL for preview and base64 transmission
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.onerror = () => {
      setImageError('Failed to read image file. Please try again.');
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

  // Validate form fields client-side
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters.';
    } else if (title.trim().length > 120) {
      errors.title = 'Title cannot exceed 120 characters.';
    }

    if (description.trim().length < 15) {
      errors.description = 'Description must be at least 15 characters (provide specific details).';
    } else if (description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.';
    }

    if (!address.trim()) {
      errors.address = 'Street address or landmark is required for municipal dispatch.';
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

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      // Scroll to top of form or first error
      window.scrollTo({ top: 120, behavior: 'smooth' });
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

      // Attach image metadata and base64 payload if present
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
        err instanceof Error ? err.message : 'An unexpected network error occurred while submitting your report.'
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

  // ==========================================================================
  // Confirmation / Tracking State
  // ==========================================================================
  if (createdReport) {
    const priorityLevel = createdReport.priorityScore?.priorityLevel || createdReport.urgency;
    const departmentName =
      createdReport.triageEvaluation?.assignedDepartment ||
      createdReport.aiTriage?.assignedDepartment ||
      'Municipal Operations Dispatch';
    const slaHours = createdReport.priorityScore?.slaHours;

    return (
      <PageContainer size="reading">
        <Card className="text-center p-6 sm:p-10 border-civic-700/30">
          {/* Institutional Confirmation Icon */}
          <div className="w-16 h-16 rounded-full bg-civic-50 text-civic-800 border-2 border-civic-200 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-9 h-9" aria-hidden="true" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-civic-800 font-mono">
            Official Municipal Submission
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary font-serif tracking-tight mt-1 mb-2">
            Report Successfully Logged
          </h1>
          <p className="text-sm text-ink-secondary max-w-md mx-auto leading-relaxed mb-6">
            Your civic complaint has been registered in the municipal dispatch registry and triaged for operational resolution.
          </p>

          {/* Report ID Banner with Copy Action */}
          <div className="bg-paper-subtle border border-border-strong rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1">
              Tracking Reference Identifier
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm sm:text-base font-bold text-ink-primary select-all break-all">
                {createdReport.id}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyId}
                className="shrink-0"
                aria-label="Copy tracking reference ID to clipboard"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-civic-800" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Instant Triage Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-md mx-auto text-left text-xs">
            <div className="bg-paper-card border border-border-subtle rounded-md p-3">
              <span className="text-ink-muted block mb-1">Assigned Department</span>
              <div className="flex items-center gap-1.5 font-semibold text-ink-primary text-sm">
                <Building2 className="w-4 h-4 text-civic-800 shrink-0" aria-hidden="true" />
                <span className="truncate">{departmentName}</span>
              </div>
            </div>

            <div className="bg-paper-card border border-border-subtle rounded-md p-3">
              <span className="text-ink-muted block mb-1">Assigned Priority</span>
              <div className="flex items-center gap-2">
                <PriorityIndicator priority={priorityLevel} score={createdReport.priorityScore?.totalScore} />
                {slaHours && (
                  <span className="text-[11px] font-mono text-ink-muted">
                    SLA: {slaHours}h
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Next Steps Editorial Timeline */}
          <div className="border-t border-border-subtle pt-6 mb-8 text-left max-w-md mx-auto">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4">
              Resolution Pipeline Next Steps
            </h2>
            <ol className="space-y-3.5 text-xs">
              <li className="flex items-start gap-3 text-ink-primary">
                <CheckCircle2 className="w-4 h-4 text-civic-800 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold block text-sm">1. Report Ingestion and Triage (Completed)</span>
                  <span className="text-ink-secondary">
                    Classification verified against city infrastructure registry and priority calculated.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3 text-ink-primary">
                <Clock className="w-4 h-4 text-terracotta-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold block text-sm">2. Department Verification (Current)</span>
                  <span className="text-ink-secondary">
                    Municipal dispatch verifies site context and schedules technical inspection.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3 text-ink-muted">
                <span className="w-4 h-4 rounded-full border border-border-strong flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <span className="font-semibold block text-sm text-ink-secondary">3. Field Crew Dispatch</span>
                  <span>Maintenance crew assigned work order and dispatched to site.</span>
                </div>
              </li>
              <li className="flex items-start gap-3 text-ink-muted">
                <span className="w-4 h-4 rounded-full border border-border-strong flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <span className="font-semibold block text-sm text-ink-secondary">4. Repair and Resolution</span>
                  <span>Photographic evidence of resolution verified by supervisory inspection.</span>
                </div>
              </li>
            </ol>
          </div>

          {/* Primary Action Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="button"
              variant="action"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate(`/issues/${createdReport.id}`)}
            >
              Track Report Progress
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
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
              Submit Another Report
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // ==========================================================================
  // Report Submission Form
  // ==========================================================================
  return (
    <PageContainer size="reading">
      {/* Return link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink-primary mb-6 p-1 min-h-[44px] focus-visible:outline-2 focus-visible:outline-civic-800 rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Return to Dashboard</span>
      </Link>

      {/* Page Title & Institutional Heading */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-civic-50 text-civic-900 border border-civic-200 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-civic-800" aria-hidden="true" />
          <span>Official Public Intake</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary font-serif tracking-tight">
          File a Municipal Issue Report
        </h1>
        <p className="mt-1.5 text-sm text-ink-secondary leading-relaxed">
          Submit infrastructure faults, road hazards, or sanitation problems. Every report is evaluated through deterministic municipal triage algorithms.
        </p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-paper-card border border-border-subtle rounded-lg p-3.5 mb-6 flex items-start gap-3 shadow-tactile text-xs text-ink-secondary">
        <Lock className="w-4 h-4 text-civic-800 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-semibold text-ink-primary">Public Record with Protected Identity: </span>
          <span>
            Issue descriptions, photos, and approximate locations are published to the public civic ledger. Personal contact details remain encrypted and accessible only to municipal dispatchers.
          </span>
        </div>
      </div>

      {/* General Submission Error Alert */}
      {generalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <span className="font-semibold text-red-950 block">Submission Incomplete</span>
            <span className="text-red-900 leading-relaxed">{generalError}</span>
          </div>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Issue Classification */}
        <Card className="space-y-4">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="text-base font-semibold text-ink-primary tracking-tight">
              1. Issue Details
            </h2>
            <p className="text-xs text-ink-secondary mt-0.5">
              Describe the problem clearly to assist automated municipal triage.
            </p>
          </div>

          <FormField
            id="issue-title"
            label="Brief Summary Title"
            required
            hint="A concise title describing the civic problem (5 to 120 characters)."
            error={fieldErrors.title}
          >
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Deep pothole damaging vehicles on Main Street"
              maxLength={120}
              required
            />
          </FormField>

          <FormField
            id="issue-category"
            label="Civic Category"
            required
            hint="Select the municipal sector that best matches this problem."
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
            label="Detailed Description"
            required
            hint="Describe dimensions, traffic hazards, duration of issue, or immediate safety concerns (15 to 2000 characters)."
            error={fieldErrors.description}
          >
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide exact details: When was it first observed? Does it block pedestrian or vehicular traffic? Are there visible water leaks or exposed wires?"
              maxLength={2000}
              required
            />
          </FormField>
        </Card>

        {/* Section 2: Evidence & Photo Verification */}
        <Card className="space-y-4">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="text-base font-semibold text-ink-primary tracking-tight">
              2. Photographic Evidence (Optional)
            </h2>
            <p className="text-xs text-ink-secondary mt-0.5">
              Visual evidence allows multimodal AI verification and accelerates repair dispatch.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            id="issue-photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleImageChange}
            aria-label="Upload issue photo"
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
              className="border-2 border-dashed border-border-strong rounded-lg p-6 text-center hover:border-civic-800 transition-colors focus-visible:outline-2 focus-visible:outline-civic-800 cursor-pointer bg-paper-subtle/50"
            >
              <div className="w-12 h-12 rounded-full bg-paper-card text-civic-800 border border-border-subtle flex items-center justify-center mx-auto mb-3">
                <Camera className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-ink-primary block">
                Tap to attach photo or drag file here
              </span>
              <span className="text-xs text-ink-secondary block mt-1">
                Supported formats: JPEG, PNG, WebP (Max size: 5 MB)
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border-strong bg-slate-900 aspect-video max-h-64 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Citizen uploaded civic issue preview"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-red-700 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white"
                  aria-label="Remove attached photo"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-ink-secondary px-1">
                <span className="truncate max-w-[240px]">
                  {imageFile?.name} ({(imageFile ? imageFile.size / 1024 : 0).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-civic-800 font-semibold hover:underline min-h-[44px] flex items-center"
                >
                  Change Photo
                </button>
              </div>
            </div>
          )}

          {imageError && (
            <p role="alert" className="text-xs font-medium text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{imageError}</span>
            </p>
          )}
        </Card>

        {/* Section 3: Location */}
        <Card className="space-y-4">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="text-base font-semibold text-ink-primary tracking-tight">
              3. Incident Location
            </h2>
            <p className="text-xs text-ink-secondary mt-0.5">
              Specify the street location or use browser GPS detection.
            </p>
          </div>

          {/* Browser Geolocation Trigger */}
          <div className="bg-paper-subtle border border-border-subtle rounded-md p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-ink-primary block">
                  Device GPS Detection
                </span>
                <span className="text-xs text-ink-secondary">
                  Optional. Captures latitude and longitude for precise map coordinates.
                </span>
              </div>

              {geoState !== 'acquired' ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDetectLocation}
                  isLoading={geoState === 'acquiring'}
                  className="shrink-0"
                >
                  <MapPin className="w-4 h-4 text-civic-800" aria-hidden="true" />
                  <span>{geoState === 'acquiring' ? 'Detecting...' : 'Detect My Location'}</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-civic-50 text-civic-900 border border-civic-300">
                    {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearLocation}
                    aria-label="Clear detected GPS coordinates"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {geoErrorMsg && (
              <p className="mt-2 text-xs text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                {geoErrorMsg}
              </p>
            )}
          </div>

          <FormField
            id="issue-address"
            label="Street Address or Landmark"
            required
            hint="Required. Enter the closest street address, cross-streets, or building landmark."
            error={fieldErrors.address}
          >
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 104 North Main Street, opposite City Central Library"
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="issue-neighborhood"
              label="Neighborhood or Ward"
              hint="Optional municipal district or sub-locality."
              error={fieldErrors.neighborhood}
            >
              <Input
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
                placeholder="e.g. Downtown Ward 4"
              />
            </FormField>

            <FormField
              id="issue-context-zone"
              label="Location Context Zone"
              hint="Used by priority engine for public safety weighting."
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
        </Card>

        {/* Section 4: Reporter Identity (Optional & Private) */}
        <Card className="space-y-4">
          <div className="border-b border-border-subtle pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-primary tracking-tight">
                4. Citizen Contact Information (Optional)
              </h2>
              <span className="text-xs font-mono uppercase text-ink-muted">Private</span>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5">
              Optional contact details used strictly if municipal teams require on-site clarification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="reporter-name"
              label="Your Full Name"
              hint="Optional."
              error={fieldErrors.reporterName}
            >
              <Input
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                placeholder="e.g. Jane Doe"
              />
            </FormField>

            <FormField
              id="reporter-email"
              label="Email Address"
              hint="Optional. Used to receive status updates."
              error={fieldErrors.reporterEmail}
            >
              <Input
                type="email"
                value={reporterEmail}
                onChange={e => setReporterEmail(e.target.value)}
                placeholder="e.g. jane.doe@example.org"
              />
            </FormField>
          </div>

          <FormField
            id="reporter-phone"
            label="Phone Number"
            hint="Optional. Used solely for emergency road or water hazard dispatch."
            error={fieldErrors.reporterPhone}
          >
            <Input
              type="tel"
              value={reporterPhone}
              onChange={e => setReporterPhone(e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </FormField>
        </Card>

        {/* Submission Actions */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="action"
            size="lg"
            isLoading={isSubmitting}
            className="w-full text-base font-semibold shadow-elevated"
          >
            Submit Official Report
          </Button>
          <p className="text-[11px] text-ink-muted text-center mt-2.5">
            By submitting, you certify that this complaint represents a genuine public infrastructure concern.
          </p>
        </div>
      </form>
    </PageContainer>
  );
}
