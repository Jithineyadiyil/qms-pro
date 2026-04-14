
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department?: Department;
  employee_id?: string;
  phone?: string;
  avatar?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  slug?: string;
  display_name?: string;
  permissions?: string[];
  users_count?: number;
}

export interface Department {
  id: number;
  name: string;
  code: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'minor' | 'major' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RequestModel {
  id: number;
  reference_no: string;
  title: string;
  description: string;
  category?: RequestCategory;
  requester: User;
  assignee?: User;
  department?: Department;
  priority: Priority;
  status: 'draft' | 'submitted' | 'in_review' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'closed';
  type: 'internal' | 'external' | 'client' | 'vendor' | 'regulatory';
  due_date?: string;
  closed_at?: string;
  resolution?: string;
  attachments?: string[];
  comments?: RequestComment[];
  approvals?: RequestApproval[];
  created_at: string;
  updated_at: string;
}

export interface RequestCategory {
  id: number;
  name: string;
  sla_hours: number;
}

export interface RequestComment {
  id: number;
  request_id: number;
  user: User;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface RequestApproval {
  id: number;
  request_id: number;
  approver: User;
  sequence: number;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  decided_at?: string;
}

export interface Nonconformance {
  id: number;
  reference_no: string;
  title: string;
  description: string;
  category?: { id: number; name: string; };
  detected_by: User;
  assigned_to?: User;
  department?: Department;
  severity: Severity;
  status: 'open' | 'under_investigation' | 'pending_capa' | 'capa_in_progress' | 'effectiveness_check' | 'closed' | 'cancelled';
  source: 'internal_audit' | 'external_audit' | 'client_complaint' | 'process_review' | 'supplier_issue' | 'regulatory' | 'other';
  detection_date: string;
  target_closure_date?: string;
  actual_closure_date?: string;
  immediate_action?: string;
  root_cause?: string;
  attachments?: string[];
  created_at: string;
}

export interface Capa {
  id: number;
  reference_no: string;
  nc_id?: number;
  nc?: Nonconformance;
  title: string;
  description: string;
  type: 'corrective' | 'preventive';
  owner: User;
  department?: Department;
  status: 'draft' | 'open' | 'in_progress' | 'effectiveness_review' | 'closed' | 'cancelled';
  priority: Priority;
  target_date: string;
  actual_completion_date?: string;
  root_cause_analysis?: string;
  action_plan?: string;
  effectiveness_criteria?: string;
  effectiveness_result?: string;
  effectiveness_verified_by?: User;
  tasks?: CapaTask[];
  attachments?: string[];
  created_at: string;
}

export interface CapaTask {
  id: number;
  capa_id: number;
  task_description: string;
  responsible: User;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_notes?: string;
  completed_at?: string;
}

export interface Risk {
  id: number;
  reference_no: string;
  title: string;
  description: string;
  category?: { id: number; name: string; };
  owner: User;
  department?: Department;
  type: string;
  status: 'identified' | 'assessed' | 'treatment_in_progress' | 'monitored' | 'closed' | 'accepted';
  likelihood: number;
  impact: number;
  risk_score: number;
  risk_level: RiskLevel;
  residual_likelihood?: number;
  residual_impact?: number;
  treatment_strategy?: 'avoid' | 'mitigate' | 'transfer' | 'accept';
  treatment_plan?: string;
  controls?: RiskControl[];
  reviews?: RiskReview[];
  next_review_date?: string;
  created_at: string;
}

export interface RiskControl {
  id: number;
  risk_id: number;
  control_description: string;
  control_type: 'preventive' | 'detective' | 'corrective';
  owner: User;
  effectiveness: 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';
  last_tested_date?: string;
  next_test_date?: string;
}

export interface RiskReview {
  id: number;
  risk_id: number;
  reviewed_by: User;
  review_date: string;
  comments?: string;
  created_at: string;
}

export interface Document {
  id: number;
  document_no: string;
  title: string;
  description?: string;
  category?: { id: number; name: string; code: string; };
  owner: User;
  reviewer?: User;
  approver?: User;
  department?: Department;
  type: 'policy' | 'procedure' | 'work_instruction' | 'form' | 'template' | 'manual' | 'specification' | 'report' | 'other';
  status: 'draft' | 'under_review' | 'pending_approval' | 'approved' | 'obsolete' | 'superseded';
  version: string;
  effective_date?: string;
  review_date?: string;
  expiry_date?: string;
  file_path?: string;
  is_controlled: boolean;
  tags?: string[];
  versions?: DocumentVersion[];
  created_at: string;
}

export interface DocumentVersion {
  id: number;
  version: string;
  change_summary?: string;
  changed_by: User;
  approved_at?: string;
  created_at: string;
}

export interface Audit {
  id: number;
  reference_no: string;
  program?: { id: number; name: string; };
  title: string;
  description?: string;
  type: 'internal' | 'external' | 'surveillance' | 'certification' | 'supplier' | 'process' | 'system' | 'compliance';
  scope?: string;
  criteria?: string;
  lead_auditor: User;
  team?: AuditTeamMember[];
  department?: Department;
  status: 'planned' | 'notified' | 'in_progress' | 'draft_report' | 'report_issued' | 'closed' | 'cancelled';
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  report_date?: string;
  overall_result?: 'satisfactory' | 'minor_findings' | 'major_findings' | 'critical_findings';
  executive_summary?: string;
  checklist?: AuditChecklistItem[];
  findings?: AuditFinding[];
  created_at: string;
}

export interface AuditTeamMember {
  user: User;
  role: 'lead_auditor' | 'auditor' | 'observer' | 'technical_expert';
}

export interface AuditChecklistItem {
  id: number;
  section?: string;
  question: string;
  requirement_ref?: string;
  response?: 'yes' | 'no' | 'partial' | 'na' | 'not_checked';
  evidence?: string;
  finding_type?: string;
  notes?: string;
}

export interface AuditFinding {
  id: number;
  reference_no: string;
  finding_type: 'minor_nc' | 'major_nc' | 'observation' | 'opportunity' | 'positive';
  description: string;
  requirement_ref?: string;
  evidence?: string;
  department?: Department;
  assignee?: User;
  status: 'open' | 'capa_raised' | 'closed';
  capa?: Capa;
}

export interface Client {
  id: number;
  name: string;
  code?: string;
  type: 'client' | 'insurer' | 'regulator' | 'partner' | 'prospect';
  industry?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  country?: string;
  account_manager?: User;
  status: 'active' | 'inactive' | 'prospect';
}

export interface Visit {
  id: number;
  reference_no: string;
  client: Client;
  type: 'client_visit' | 'insurer_audit' | 'regulatory_inspection' | 'partnership_review' | 'sales_meeting' | 'technical_review';
  purpose: string;
  visit_date: string;
  visit_time?: string;
  duration_hours?: number;
  location?: string;
  is_virtual: boolean;
  meeting_link?: string;
  host: User;
  status: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  agenda?: string;
  minutes?: string;
  action_items?: { description: string; responsible: string; due_date: string; status: string; }[];
  outcome?: string;
  rating?: number;
  rating_comments?: string;
  participants?: VisitParticipant[];
  findings?: VisitFinding[];
  created_at: string;
}

export interface VisitParticipant {
  id: number;
  user?: User;
  external_name?: string;
  external_email?: string;
  external_role?: string;
  is_internal: boolean;
  attended?: boolean;
}

export interface VisitFinding {
  id: number;
  finding_type: 'positive' | 'concern' | 'requirement' | 'action_item' | 'observation';
  description: string;
  priority: Priority;
  responsible?: User;
  due_date?: string;
  status: 'open' | 'in_progress' | 'closed';
}

export interface SlaDefinition {
  id: number;
  name: string;
  description?: string;
  client?: Client;
  department?: Department;
  category?: string;
  response_time_hours?: number;
  resolution_time_hours?: number;
  availability_percent?: number;
  effective_from?: string;
  effective_to?: string;
  status: 'draft' | 'active' | 'expired' | 'suspended';
  metrics?: SlaMetric[];
  measurements?: SlaMeasurement[];
}

export interface SlaMetric {
  id: number;
  metric_name: string;
  target_value: number;
  unit?: string;
  measurement_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  threshold_warning?: number;
  threshold_critical?: number;
}

export interface SlaMeasurement {
  id: number;
  metric: SlaMetric;
  period_start: string;
  period_end: string;
  actual_value: number;
  target_value: number;
  status: 'met' | 'warning' | 'breached';
  notes?: string;
}

export interface Objective {
  id: number;
  title: string;
  description?: string;
  owner: User;
  department?: Department;
  type: 'company' | 'department' | 'team' | 'individual';
  status: 'draft' | 'active' | 'at_risk' | 'completed' | 'cancelled';
  period_start: string;
  period_end: string;
  progress_percent: number;
  parent?: Objective;
  key_results?: KeyResult[];
  created_at: string;
}

export interface KeyResult {
  id: number;
  objective_id: number;
  title: string;
  description?: string;
  owner: User;
  metric_type: 'percentage' | 'number' | 'boolean' | 'currency';
  start_value: number;
  target_value: number;
  current_value: number;
  progress_percent: number;
  status: 'on_track' | 'at_risk' | 'off_track' | 'completed';
  unit?: string;
  check_ins?: KrCheckIn[];
}

export interface KrCheckIn {
  id: number;
  value: number;
  notes?: string;
  confidence_level?: number;
  checked_by: User;
  created_at: string;
}

export interface Vendor {
  id: number;
  name: string;
  code?: string;
  category?: { id: number; name: string; };
  type: 'supplier' | 'service_provider' | 'contractor' | 'partner' | 'consultant';
  registration_no?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  country?: string;
  website?: string;
  account_manager?: User;
  status: 'prospect' | 'active' | 'approved' | 'suspended' | 'blacklisted' | 'inactive';
  risk_level: RiskLevel;
  qualification_status: 'not_qualified' | 'pending' | 'qualified' | 'expired';
  qualification_date?: string;
  qualification_expiry?: string;
  overall_rating?: number;
  evaluations?: VendorEvaluation[];
  contracts?: VendorContract[];
  created_at: string;
}

export interface VendorEvaluation {
  id: number;
  evaluated_by: User;
  evaluation_date: string;
  period?: string;
  quality_score?: number;
  delivery_score?: number;
  price_score?: number;
  service_score?: number;
  compliance_score?: number;
  overall_score?: number;
  comments?: string;
  recommendations?: string;
  status: 'draft' | 'submitted' | 'approved';
}

export interface VendorContract {
  id: number;
  contract_no: string;
  title: string;
  type: string;
  value?: number;
  currency: string;
  start_date: string;
  end_date?: string;
  auto_renewal: boolean;
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'suspended';
  owner: User;
}

export interface Partnership {
  id: number;
  name: string;
  partner_type: 'strategic' | 'technology' | 'channel' | 'referral' | 'joint_venture' | 'other';
  vendor?: Vendor;
  client?: Client;
  description?: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'negotiating' | 'terminated';
  owner: User;
  value_proposition?: string;
}

export interface Complaint {
  id: number;
  reference_no: string;
  title: string;
  description: string;
  category?: { id: number; name: string; sla_hours: number; };
  complainant_type: 'client' | 'vendor' | 'employee' | 'public' | 'regulator' | 'other';
  complainant_name?: string;
  complainant_email?: string;
  complainant_phone?: string;
  client?: Client;
  assignee?: User;
  department?: Department;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'received' | 'acknowledged' | 'under_investigation' | 'pending_resolution' | 'resolved' | 'closed' | 'escalated' | 'withdrawn';
  source: string;
  received_date: string;
  acknowledged_date?: string;
  target_resolution_date?: string;
  actual_resolution_date?: string;
  root_cause?: string;
  resolution?: string;
  customer_satisfaction?: number;
  is_regulatory: boolean;
  escalation_level: number;
  escalated_to?: User;
  capa_required: boolean;
  capa?: Capa;
  updates?: ComplaintUpdate[];
  created_at: string;
}

export interface ComplaintUpdate {
  id: number;
  user: User;
  update_type: 'status_change' | 'comment' | 'escalation' | 'resolution' | 'closure';
  previous_status?: string;
  new_status?: string;
  comment?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  read_at?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface DashboardStats {
  requests: { total: number; open: number; overdue: number; };
  nc: { total: number; open: number; critical: number; };
  capa: { total: number; open: number; overdue: number; };
  risks: { total: number; critical: number; high: number; };
  documents: { total: number; pending_review: number; expiring_soon: number; };
  audits: { total: number; planned: number; in_progress: number; };
  complaints: { total: number; open: number; overdue: number; };
  vendors: { total: number; active: number; expiring_qualification: number; };
}