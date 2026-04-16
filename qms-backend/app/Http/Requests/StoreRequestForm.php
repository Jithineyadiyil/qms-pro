<?php
declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreRequestForm — QDM v2
 *
 * Validates the QDM dynamic request form payload.
 *
 * Key rules:
 *  - risk_level accepts 'critical' (was missing from original)
 *  - All dynamic_fields.* rules are prefixed with 'sometimes' so that:
 *      • Draft saves (dynamic_fields: {}) pass without errors
 *      • Full submits with the field present are validated normally
 */
class StoreRequestForm extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ── Core fields ───────────────────────────────────────────────
            'title'            => 'required|string|max:255',
            'description'      => 'required|string',
            'category_id'      => 'nullable|exists:request_categories,id',
            'department_id'    => 'nullable|exists:departments,id',
            'priority'         => 'required|in:low,medium,high,critical',
            'risk_level'       => 'required|in:low,medium,high,critical',   // ← added 'critical'
            'type'             => 'required|in:internal,external,client,vendor,regulatory',
            'due_date'         => 'nullable|date|after_or_equal:today',

            // ── QDM sub-type ──────────────────────────────────────────────
            'request_sub_type' => [
                'nullable',
                'string',
                'in:policy_update,new_policy,procedure_update,new_procedure,'
                  . 'sla_update,new_sla,form_update,new_form,unregulated_work,'
                  . 'document_review,quality_review,issue_analysis,kpi_measurement,'
                  . 'manual_update,new_manual,new_project,new_development,'
                  . 'quality_note,external_audit_prep,other',
            ],

            // ── Dynamic fields container ───────────────────────────────────
            'dynamic_fields'   => 'nullable|array',

            // ── Policy ────────────────────────────────────────────────────
            // 'sometimes' means: only validate IF the key is present in the request.
            // This allows draft saves with dynamic_fields:{} to pass validation.
            'dynamic_fields.policy_name'         => 'sometimes|required_if:request_sub_type,policy_update,new_policy|nullable|string|max:255',
            'dynamic_fields.policy_purpose'      => 'sometimes|nullable|string',
            'dynamic_fields.supporting_circulars'=> 'sometimes|nullable|string',
            'dynamic_fields.departments_involved'=> 'sometimes|nullable|string',

            // ── Procedure ─────────────────────────────────────────────────
            'dynamic_fields.procedure_name'      => 'sometimes|required_if:request_sub_type,procedure_update,new_procedure|nullable|string|max:255',
            'dynamic_fields.process_covered'     => 'sometimes|nullable|string',
            'dynamic_fields.creation_reason'     => 'sometimes|nullable|string',

            // ── SLA ───────────────────────────────────────────────────────
            'dynamic_fields.service_name'        => 'sometimes|required_if:request_sub_type,sla_update,new_sla|nullable|string|max:255',
            'dynamic_fields.service_provider'    => 'sometimes|nullable|string|max:255',
            'dynamic_fields.service_metrics'     => 'sometimes|nullable|string',
            'dynamic_fields.escalation_method'   => 'sometimes|nullable|string',
            'dynamic_fields.mutual_agreement'    => 'sometimes|nullable|boolean',

            // ── Unregulated Work ──────────────────────────────────────────
            'dynamic_fields.process_name'        => 'sometimes|required_if:request_sub_type,unregulated_work|nullable|string|max:255',
            'dynamic_fields.not_documented_reason'=> 'sometimes|nullable|string',

            // ── Issue Analysis ────────────────────────────────────────────
            'dynamic_fields.issue_description'   => 'sometimes|required_if:request_sub_type,issue_analysis|nullable|string',
            'dynamic_fields.issue_start_date'    => 'sometimes|nullable|date',
            'dynamic_fields.is_recurring'        => 'sometimes|nullable|boolean',
            'dynamic_fields.impacted_depts'      => 'sometimes|nullable|string',

            // ── KPI ───────────────────────────────────────────────────────
            'dynamic_fields.kpi_objective'       => 'sometimes|nullable|in:individual,team,department',
            'dynamic_fields.key_tasks'           => 'sometimes|nullable|string',

            // ── Project ───────────────────────────────────────────────────
            'dynamic_fields.project_name'        => 'sometimes|required_if:request_sub_type,new_project,new_development|nullable|string|max:255',
            'dynamic_fields.issue_addressed'     => 'sometimes|nullable|string',
            'dynamic_fields.proposed_start'      => 'sometimes|nullable|date',
            'dynamic_fields.success_measures'    => 'sometimes|nullable|string',

            // ── Audit Prep ────────────────────────────────────────────────
            'dynamic_fields.auditing_entity'     => 'sometimes|required_if:request_sub_type,external_audit_prep|nullable|string|max:255',
            'dynamic_fields.audit_scope'         => 'sometimes|nullable|string',
            'dynamic_fields.audit_date'          => 'sometimes|nullable|date',

            // ── Quality Note ──────────────────────────────────────────────
            'dynamic_fields.observation'         => 'sometimes|required_if:request_sub_type,quality_note|nullable|string',
            'dynamic_fields.potential_impact'    => 'sometimes|nullable|in:low,medium,high',
            'dynamic_fields.note_type'           => 'sometimes|nullable|in:recommendation,observation',

            // ── Other ─────────────────────────────────────────────────────
            'dynamic_fields.other_description'   => 'sometimes|required_if:request_sub_type,other|nullable|string',

            // ── Attachments ───────────────────────────────────────────────
            'attachments'   => 'nullable|array',
            'attachments.*' => 'string',
        ];
    }

    public function messages(): array
    {
        return [
            'risk_level.in'        => 'Risk level must be low, medium, high, or critical.',
            'request_sub_type.in'  => 'Invalid request sub-type selected.',
            'dynamic_fields.policy_name.required_if'    => 'Policy name is required for policy requests.',
            'dynamic_fields.procedure_name.required_if' => 'Procedure name is required for procedure requests.',
            'dynamic_fields.service_name.required_if'   => 'Service name is required for SLA requests.',
            'dynamic_fields.process_name.required_if'   => 'Process name is required for unregulated work requests.',
            'dynamic_fields.issue_description.required_if' => 'Issue description is required for issue analysis requests.',
            'dynamic_fields.project_name.required_if'   => 'Project name is required for project requests.',
            'dynamic_fields.auditing_entity.required_if'=> 'Auditing entity is required for audit prep requests.',
            'dynamic_fields.observation.required_if'    => 'Observation is required for quality note requests.',
            'dynamic_fields.other_description.required_if' => 'Description is required for other requests.',
        ];
    }
}
