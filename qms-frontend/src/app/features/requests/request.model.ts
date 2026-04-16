// ============================================================
// src/app/features/requests/request.model.ts — QDM v2 FINAL
// ============================================================

export type Priority         = 'low' | 'medium' | 'high' | 'critical';
export type RequestRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RequestStatus    =
  | 'draft' | 'submitted' | 'in_review' | 'in_progress'
  | 'pending_approval' | 'approved' | 'rejected' | 'closed'
  | 'acknowledged' | 'under_review' | 'pending_clarification'
  | 'completed' | 'cancelled';

export type QdmRequestType =
  | 'policy_update' | 'new_policy' | 'procedure_update' | 'new_procedure'
  | 'sla_update' | 'new_sla' | 'form_update' | 'new_form'
  | 'unregulated_work' | 'document_review' | 'quality_review'
  | 'issue_analysis' | 'kpi_measurement' | 'manual_update'
  | 'new_manual' | 'new_project' | 'new_development'
  | 'quality_note' | 'external_audit_prep' | 'other';

export interface QdmFieldSchema {
  label:        string;
  type:         'text' | 'textarea' | 'select' | 'date' | 'number' | 'boolean';
  required:     boolean;
  options?:     string[];
  placeholder?: string;
}

export type QdmDynamicSchema = Record<string, QdmFieldSchema>;

export interface QdmTypeDefinition {
  type:         QdmRequestType;
  label:        string;
  category:     string;
  categoryName: string;   // maps to RequestCategory.name
  schema:       QdmDynamicSchema;
}

// ── Risk levels ───────────────────────────────────────────────────────────────

export const REQUEST_RISK_LEVELS: Array<{ value: RequestRiskLevel; label: string }> = [
  { value: 'low',      label: 'Low'      },
  { value: 'medium',   label: 'Medium'   },
  { value: 'high',     label: 'High'     },
  { value: 'critical', label: 'Critical' },
];

// ── Request category interface (matches DB + API response) ────────────────────

export interface RequestCategory {
  id:           number;
  name:         string;
  description?: string;   // optional — present in API response, omitted in tight type
  sla_hours:    number;
}

export interface Department {
  id:    number;
  name:  string;
  code?: string;
}

// ── Local category reference — mirrors the 10 DB rows (IDs 1-10) ─────────────

export const REQUEST_CATEGORIES: RequestCategory[] = [
  { id: 1,  name: 'Policy & Procedure',  sla_hours: 72  },
  { id: 2,  name: 'Document Control',    sla_hours: 48  },
  { id: 3,  name: 'Quality & Compliance',sla_hours: 48  },
  { id: 4,  name: 'Regulatory & SLA',    sla_hours: 24  },
  { id: 5,  name: 'IT & Cyber Security', sla_hours: 24  },
  { id: 6,  name: 'HR & Training',       sla_hours: 96  },
  { id: 7,  name: 'Operations',          sla_hours: 72  },
  { id: 8,  name: 'Analysis & KPI',      sla_hours: 48  },
  { id: 9,  name: 'Projects',            sla_hours: 120 },
  { id: 10, name: 'General',             sla_hours: 72  },
];

// ── QDM sub-type registry ────────────────────────────────────────────────────

export const QDM_TYPE_REGISTRY: QdmTypeDefinition[] = [
  { type: 'new_policy',    label: 'New Policy',    category: 'Policy', categoryName: 'Policy & Procedure',
    schema: { policy_name: { label: 'Policy Name', type: 'text', required: true }, policy_purpose: { label: 'Purpose', type: 'textarea', required: true }, departments_involved: { label: 'Departments Involved', type: 'text', required: false } } },
  { type: 'policy_update', label: 'Policy Update', category: 'Policy', categoryName: 'Policy & Procedure',
    schema: { policy_name: { label: 'Policy Name', type: 'text', required: true }, change_summary: { label: 'Change Summary', type: 'textarea', required: true } } },
  { type: 'new_procedure', label: 'New Procedure', category: 'Procedure', categoryName: 'Policy & Procedure',
    schema: { procedure_name: { label: 'Procedure Name', type: 'text', required: true }, scope: { label: 'Scope', type: 'textarea', required: true }, process_owner: { label: 'Process Owner', type: 'text', required: false } } },
  { type: 'procedure_update', label: 'Procedure Update', category: 'Procedure', categoryName: 'Policy & Procedure',
    schema: { procedure_name: { label: 'Procedure Name', type: 'text', required: true }, reason: { label: 'Reason', type: 'textarea', required: true } } },
  { type: 'new_form',    label: 'New Form',    category: 'Forms', categoryName: 'Document Control',
    schema: { form_name: { label: 'Form Name', type: 'text', required: true }, purpose: { label: 'Purpose', type: 'textarea', required: true } } },
  { type: 'form_update', label: 'Form Update', category: 'Forms', categoryName: 'Document Control',
    schema: { form_name: { label: 'Form Name', type: 'text', required: true }, change_summary: { label: 'Change Summary', type: 'textarea', required: true } } },
  { type: 'new_manual',    label: 'New Manual',    category: 'Manuals', categoryName: 'Document Control',
    schema: { manual_name: { label: 'Manual Name', type: 'text', required: true }, scope: { label: 'Scope', type: 'textarea', required: true } } },
  { type: 'manual_update', label: 'Manual Update', category: 'Manuals', categoryName: 'Document Control',
    schema: { manual_name: { label: 'Manual Name', type: 'text', required: true }, change_summary: { label: 'Change Summary', type: 'textarea', required: true } } },
  { type: 'document_review', label: 'Document Review', category: 'Documents', categoryName: 'Document Control',
    schema: { document_ref: { label: 'Document Reference', type: 'text', required: true }, review_scope: { label: 'Review Scope', type: 'textarea', required: false } } },
  { type: 'quality_review', label: 'Quality Review', category: 'Quality', categoryName: 'Quality & Compliance',
    schema: { process_area: { label: 'Process Area', type: 'text', required: true }, review_objective: { label: 'Objective', type: 'textarea', required: true } } },
  { type: 'quality_note', label: 'Quality Note', category: 'Quality', categoryName: 'Quality & Compliance',
    schema: { observation: { label: 'Observation', type: 'textarea', required: true } } },
  { type: 'external_audit_prep', label: 'External Audit Prep', category: 'Audit', categoryName: 'Quality & Compliance',
    schema: { audit_body: { label: 'Audit Body', type: 'text', required: true }, audit_scope: { label: 'Audit Scope', type: 'textarea', required: false } } },
  { type: 'new_sla',    label: 'New SLA',    category: 'SLA', categoryName: 'Regulatory & SLA',
    schema: { sla_name: { label: 'SLA Name', type: 'text', required: true }, target_hours: { label: 'Target (hours)', type: 'number', required: true } } },
  { type: 'sla_update', label: 'SLA Update', category: 'SLA', categoryName: 'Regulatory & SLA',
    schema: { sla_name: { label: 'SLA Name', type: 'text', required: true }, change_reason: { label: 'Reason', type: 'textarea', required: true } } },
  { type: 'unregulated_work', label: 'Unregulated Work', category: 'Operations', categoryName: 'Operations',
    schema: { process_name: { label: 'Process Name', type: 'text', required: true }, not_documented_reason: { label: 'Why Not Documented?', type: 'textarea', required: true } } },
  { type: 'issue_analysis', label: 'Issue Analysis', category: 'Analysis', categoryName: 'Analysis & KPI',
    schema: { issue_description: { label: 'Issue Description', type: 'textarea', required: true }, affected_process: { label: 'Affected Process', type: 'text', required: false } } },
  { type: 'kpi_measurement', label: 'KPI Measurement', category: 'KPI', categoryName: 'Analysis & KPI',
    schema: { kpi_name: { label: 'KPI Name', type: 'text', required: true }, measurement_period: { label: 'Measurement Period', type: 'text', required: true } } },
  { type: 'new_project',    label: 'New Project',    category: 'Projects', categoryName: 'Projects',
    schema: { project_name: { label: 'Project Name', type: 'text', required: true }, objectives: { label: 'Objectives', type: 'textarea', required: true } } },
  { type: 'new_development', label: 'New Development', category: 'Projects', categoryName: 'Projects',
    schema: { development_name: { label: 'Development Name', type: 'text', required: true }, rationale: { label: 'Rationale', type: 'textarea', required: true } } },
  { type: 'other', label: 'Other', category: 'General', categoryName: 'General',
    schema: { details: { label: 'Details', type: 'textarea', required: true } } },
];

// ── Helper: sub-type → category ───────────────────────────────────────────────

export function getCategoryForSubType(subType: QdmRequestType): RequestCategory | null {
  const def = QDM_TYPE_REGISTRY.find(t => t.type === subType);
  if (!def) return null;
  return REQUEST_CATEGORIES.find(c => c.name === def.categoryName) ?? null;
}

// ── Main model ────────────────────────────────────────────────────────────────

export interface RequestModel {
  id:                  number;
  reference_no:        string;
  title:               string;
  description:         string;
  type:                'internal' | 'external' | 'client' | 'vendor' | 'regulatory';
  request_sub_type?:   QdmRequestType;
  priority:            Priority;
  risk_level?:         RequestRiskLevel;
  status:              RequestStatus;
  dynamic_fields?:     Record<string, unknown>;
  attachments?:        string[];
  category_id?:        number;
  category?:           RequestCategory;
  requester_id?:       number;
  assignee_id?:        number;
  department_id?:      number;
  due_date?:           string;
  closed_at?:          string;
  resolution?:         string;
  estimated_completion_days?: number;
  eta_set_at?:         string;
  acknowledged_at?:    string;
  completed_at?:       string;
  cycle_time_hours?:   number;
  created_at:          string;
  updated_at:          string;
}

export interface RequestComment {
  id:          number;
  request_id:  number;
  user_id:     number;
  comment:     string;
  is_internal: boolean;
  created_at:  string;
}
