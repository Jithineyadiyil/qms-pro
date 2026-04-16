<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * AcknowledgeRequestForm
 *
 * Validates the QDM Manager's acknowledgement payload,
 * including the mandatory ETA in business days.
 */
class AcknowledgeRequestForm extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'estimated_completion_days' => 'required|integer|min:1|max:90',
            'notes'                     => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'estimated_completion_days.required' => 'Estimated completion time (in business days) is required.',
            'estimated_completion_days.min'      => 'Estimated completion must be at least 1 business day.',
            'estimated_completion_days.max'      => 'Estimated completion cannot exceed 90 business days.',
        ];
    }
}
