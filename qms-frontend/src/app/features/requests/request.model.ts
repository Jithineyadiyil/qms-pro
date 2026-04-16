// ============================================================
// src/app/features/requests/request.model.ts — QDM v2
// Self-contained — no cross-module imports needed.
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
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'boolean';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export type QdmDynamicSchema = Record<string, QdmFieldSchema>;

export interface QdmTypeDefinition {
  type:     QdmRequestType;
  label:    string;
  category: string;
  schema:   QdmDynamicSchema;
}

export const REQUEST_RISK_LEVELS: Array<{ value: RequestRiskLevel; label: string }> = [
  { value: 'low',      label: 'Low'      },
  { value: 'medium',   label: 'Medium'   },
  { value: 'high',     label: 'High'     },
  { value: 'critical', label: 'Critical' },
];

export const QDM_TYPE_REGISTRY: QdmTypeDefinition[] = [
  { type: 'new_policy',       label: 'New Policy',          category: 'Policy',
    schema: { policy_name: { label: 'Policy Name', type: 'text', required: true }, policy_purpose: { label: 'Purpose', type: 'textarea', required: true }, departments_involved: { label: 'Departments Involved', type: 'text', required: false } } },
  { type: 'policy_update',    label: 'Policy Update',        category: 'Policy',
    schema: { policy_name: { label: 'Policy Name', type: 'text', required: true }, change_summary: { label: 'Change Summary', type: 'textarea', required: true } } },
  { type: 'new_procedure',    label: 'New Procedure',        category: 'Procedure',
    schema: { procedure_name: { label: 'Procedure Name', type: 'text', required: true }, scope: { label: 'Scope', type: 'textarea', required: true } } },
  { type: 'procedure_update', label: 'Procedure Update',     category: 'Procedure',
    schema: { procedure_name: { label: 'Procedure Name', type: 'text', required: true }, reason: { label: 'Reason', type: 'textarea', required: true } } },
  { type: 'new_sla',          label: 'New SLA',              category: 'SLA',
    schema: { sla_name: { label: 'SLA Name', type: 'text', required: true }, target_hours: { label: 'Target Hours', type: 'number', required: true } } },
  { type: 'sla_update',       label: 'SLA Update',           category: 'SLA',
    schema: { sla_name: { label: 'SLA Name', type: 'text', required: true }, change_reason: { label: 'Reason for Change', type: 'textarea', required: true } } },
  { type: 'new_form',         label: 'New Form',             category: 'Forms',
    schema: { form_name: { label: 'Form Name', type: 'text', required: true }, purpose: { label: 'Purpose', type: 'textarea', required: true } } },
  { type: 'form_update',      label: 'Form Update',          category: 'Forms',
    schema: { form_name: { label: 'Form Name', type: 'text', required: true }, change_summary: { label: 'Change Summary', type: 'textarea', required: true } } },
  { type: 'new_manual',       label: 'New Manual',           category: 'Manuals',
    schema: { manual_name: { label: 'Manual Name', type: 'text', required: true }, scope: { label: 'Scope', type: 'textarea', required: true } } },
  { type: 'manual_update',    label: 'Manual Update',        category: 'Manuals',
    schema: { manual_name: { label: 'Manual Name', type: 'text', required: true }, change_summary: { label: 'Change Summary', type: 'textarea', required: true } } },
  { type: 'unregulated_work', label: 'Unregulated Work',     category: 'Operations',
    schema: { process_name: { label: 'Process Name', type: 'text', required: true }, not_documented_reason: { label: 'Why Not Documented?', type: 'textarea', required: true } } },
  { type: 'document_review',  label: 'Document Review',      category: 'Quality',
    schema: { document_ref: { label: 'Document Reference', type: 'text', required: true }, review_scope: { label: 'Review Scope', type: 'textarea', required: false } } },
  { type: 'quality_review',   label: 'Quality Review',       category: 'Quality',
    schema: { process_area: { label: 'Process Area', type: 'text', required: true }, review_objective: { label: 'Objective', type: 'textarea', required: true } } },
  { type: 'issue_analysis',   label: 'Issue Analysis',       category: 'Quality',
    schema: { issue_description: { label: 'Issue Description', type: 'textarea', required: true }, affected_process: { label: 'Affected Process', type: 'text', required: false } } },
  { type: 'kpi_measurement',  label: 'KPI Measurement',      category: 'Quality',
    schema: { kpi_name: { label: 'KPI Name', type: 'text', required: true }, measurement_period: { label: 'Measurement Period', type: 'text', required: true } } },
  { type: 'new_project',      label: 'New Project',          category: 'Development',
    schema: { project_name: { label: 'Project Name', type: 'text', required: true }, objectives: { label: 'Objectives', type: 'textarea', required: true } } },
  { type: 'new_development',  label: 'New Development',      category: 'Development',
    schema: { development_name: { label: 'Development Name', type: 'text', required: true }, rationale: { label: 'Rationale', type: 'textarea', required: true } } },
  { type: 'quality_note',     label: 'Quality Note',         category: 'General',
    schema: { observation: { label: 'Observation', type: 'textarea', required: true } } },
  { type: 'external_audit_prep', label: 'External Audit Prep', category: 'Audit',
    schema: { audit_body: { label: 'Audit Body', type: 'text', required: true }, audit_scope: { label: 'Audit Scope', type: 'textarea', required: false } } },
  { type: 'other',            label: 'Other',                category: 'General',
    schema: { details: { label: 'Details', type: 'textarea', required: true } } },
];

export interface RequestModel {
  id: number;
  reference_no: string;
  title: string;
  description: string;
  type: 'internal' | 'external' | 'client' | 'vendor' | 'regulatory';
  request_sub_type?: QdmRequestType;
  priority: Priority;
  risk_level?: RequestRiskLevel;
  status: RequestStatus;
  dynamic_fields?: Record<string, unknown>;
  category_id?: number;
  category?: { id: number; name: string; sla_hours?: number };
  requester_id?: number;
  assignee_id?: number;
  department_id?: number;
  due_date?: string;
  closed_at?: string;
  resolution?: string;
  estimated_completion_days?: number;
  eta_set_at?: string;
  acknowledged_at?: string;
  completed_at?: string;
  cycle_time_hours?: number;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface RequestCategory {
  id: number;
  name: string;
  sla_hours?: number;
}

export interface Department {
  id: number;
  name: string;
  code?: string;
}

export interface RequestComment {
  id: number;
  request_id: number;
  user_id: number;
  comment: string;
  is_internal: boolean;
  created_at: string;
}
