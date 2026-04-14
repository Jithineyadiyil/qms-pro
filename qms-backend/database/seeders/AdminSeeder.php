<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\{EmailTemplate, SystemSetting};

class AdminSeeder extends Seeder {
    public function run(): void {

        // ── System Settings ──────────────────────────────────────────────
        $settings = [
            // General
            ['key'=>'org_name',        'group'=>'general',       'label'=>'Organization Name',    'value'=>'Diamond Insurance Broker', 'type'=>'text'],
            ['key'=>'org_logo_url',    'group'=>'general',       'label'=>'Logo URL',             'value'=>'', 'type'=>'text', 'description'=>'URL or path to organization logo'],
            ['key'=>'org_country',     'group'=>'general',       'label'=>'Country',              'value'=>'Saudi Arabia', 'type'=>'text'],
            ['key'=>'org_industry',    'group'=>'general',       'label'=>'Industry',             'value'=>'Insurance & Financial Services', 'type'=>'text'],
            ['key'=>'qms_standard',    'group'=>'general',       'label'=>'QMS Standard',         'value'=>'ISO 9001:2015', 'type'=>'text'],
            ['key'=>'fiscal_year_start','group'=>'general',      'label'=>'Fiscal Year Start',    'value'=>'01-01', 'type'=>'text', 'description'=>'MM-DD format'],
            ['key'=>'default_language','group'=>'general',       'label'=>'Default Language',     'value'=>'en', 'type'=>'select', 'options'=>['en','ar']],
            ['key'=>'date_format',     'group'=>'general',       'label'=>'Date Format',          'value'=>'DD MMM YYYY', 'type'=>'select', 'options'=>['DD MMM YYYY','MM/DD/YYYY','YYYY-MM-DD']],
            // Notifications
            ['key'=>'email_notifications', 'group'=>'notifications', 'label'=>'Email Notifications',  'value'=>'1', 'type'=>'boolean'],
            ['key'=>'email_from_name',     'group'=>'notifications', 'label'=>'Email From Name',      'value'=>'QMS Pro System', 'type'=>'text'],
            ['key'=>'email_from_address',  'group'=>'notifications', 'label'=>'Email From Address',   'value'=>'noreply@qms.com', 'type'=>'text'],
            ['key'=>'notify_on_nc_created','group'=>'notifications', 'label'=>'Notify on NC Created', 'value'=>'1', 'type'=>'boolean'],
            ['key'=>'notify_on_capa_overdue','group'=>'notifications','label'=>'Notify on CAPA Overdue','value'=>'1','type'=>'boolean'],
            ['key'=>'notify_on_risk_high', 'group'=>'notifications', 'label'=>'Notify on High Risk',  'value'=>'1', 'type'=>'boolean'],
            ['key'=>'notify_on_audit',     'group'=>'notifications', 'label'=>'Notify on Audit Due',  'value'=>'1', 'type'=>'boolean'],
            ['key'=>'overdue_reminder_days','group'=>'notifications','label'=>'Overdue Reminder (Days)','value'=>'3','type'=>'number'],
            // Security
            ['key'=>'session_timeout_min', 'group'=>'security',  'label'=>'Session Timeout (min)',  'value'=>'60',  'type'=>'number'],
            ['key'=>'max_login_attempts',  'group'=>'security',  'label'=>'Max Login Attempts',     'value'=>'5',   'type'=>'number'],
            ['key'=>'password_min_length', 'group'=>'security',  'label'=>'Min Password Length',    'value'=>'8',   'type'=>'number'],
            ['key'=>'require_2fa',         'group'=>'security',  'label'=>'Require 2FA',            'value'=>'0',   'type'=>'boolean'],
            ['key'=>'audit_log_retention', 'group'=>'security',  'label'=>'Audit Log Retention (days)','value'=>'365','type'=>'number'],
            // Appearance
            ['key'=>'theme',              'group'=>'appearance', 'label'=>'Theme',                 'value'=>'dark',  'type'=>'select','options'=>['dark','light','midnight','ocean','forest','crimson','slate','dracula']],
            ['key'=>'primary_color',      'group'=>'appearance', 'label'=>'Primary Color',         'value'=>'#3b82f6','type'=>'color'],
            ['key'=>'items_per_page',     'group'=>'appearance', 'label'=>'Items Per Page',        'value'=>'15',    'type'=>'select','options'=>['10','15','25','50']],
        ];

        foreach ($settings as $s) {
            SystemSetting::updateOrCreate(['key' => $s['key']], array_merge([
                'options'=>null, 'description'=>null
            ], $s));
        }

        // ── Email Templates ───────────────────────────────────────────────
        $vars_request = [
            ['key'=>'{{ref}}','desc'=>'Request reference number'],
            ['key'=>'{{title}}','desc'=>'Request title'],
            ['key'=>'{{requester}}','desc'=>'Requester name'],
            ['key'=>'{{status}}','desc'=>'Current status'],
            ['key'=>'{{due_date}}','desc'=>'Due date'],
            ['key'=>'{{link}}','desc'=>'Link to the request'],
        ];
        $vars_nc = [
            ['key'=>'{{ref}}','desc'=>'NC reference number'],
            ['key'=>'{{title}}','desc'=>'NC title'],
            ['key'=>'{{severity}}','desc'=>'Severity level'],
            ['key'=>'{{assignee}}','desc'=>'Assigned to'],
            ['key'=>'{{due_date}}','desc'=>'Due date'],
            ['key'=>'{{link}}','desc'=>'Link to the NC'],
        ];
        $vars_capa = [
            ['key'=>'{{ref}}','desc'=>'CAPA reference number'],
            ['key'=>'{{title}}','desc'=>'CAPA title'],
            ['key'=>'{{assignee}}','desc'=>'Assigned to'],
            ['key'=>'{{due_date}}','desc'=>'Due date'],
            ['key'=>'{{status}}','desc'=>'Current status'],
            ['key'=>'{{link}}','desc'=>'Link to the CAPA'],
        ];
        $vars_risk = [
            ['key'=>'{{ref}}','desc'=>'Risk reference number'],
            ['key'=>'{{title}}','desc'=>'Risk title'],
            ['key'=>'{{level}}','desc'=>'Risk level (critical/high/medium/low)'],
            ['key'=>'{{score}}','desc'=>'Risk score'],
            ['key'=>'{{owner}}','desc'=>'Risk owner'],
            ['key'=>'{{review_date}}','desc'=>'Next review date'],
        ];
        $vars_audit = [
            ['key'=>'{{ref}}','desc'=>'Audit reference number'],
            ['key'=>'{{title}}','desc'=>'Audit title'],
            ['key'=>'{{lead_auditor}}','desc'=>'Lead auditor name'],
            ['key'=>'{{start_date}}','desc'=>'Planned start date'],
            ['key'=>'{{department}}','desc'=>'Auditee department'],
        ];
        $vars_complaint = [
            ['key'=>'{{ref}}','desc'=>'Complaint reference number'],
            ['key'=>'{{subject}}','desc'=>'Complaint subject'],
            ['key'=>'{{complainant}}','desc'=>'Complainant name'],
            ['key'=>'{{priority}}','desc'=>'Priority level'],
            ['key'=>'{{due_date}}','desc'=>'Resolution due date'],
        ];
        $vars_visit = [
            ['key'=>'{{ref}}','desc'=>'Visit reference number'],
            ['key'=>'{{client}}','desc'=>'Client name'],
            ['key'=>'{{date}}','desc'=>'Visit date'],
            ['key'=>'{{time}}','desc'=>'Visit time'],
            ['key'=>'{{host}}','desc'=>'Host name'],
            ['key'=>'{{location}}','desc'=>'Visit location'],
        ];

        $templates = [
            // Requests
            ['slug'=>'request_created',   'name'=>'Request Created',         'module'=>'requests',  'trigger_event'=>'created',
             'subject'=>'New Request {{ref}}: {{title}}',
             'body_html'=>"<p>Dear Team,</p><p>A new request has been submitted by <strong>{{requester}}</strong>.</p><ul><li><strong>Reference:</strong> {{ref}}</li><li><strong>Title:</strong> {{title}}</li><li><strong>Due Date:</strong> {{due_date}}</li></ul><p>Please review it at: <a href='{{link}}'>{{link}}</a></p><p>Regards,<br>QMS Pro System</p>",
             'variables'=>$vars_request],
            ['slug'=>'request_approved',  'name'=>'Request Approved',        'module'=>'requests',  'trigger_event'=>'approved',
             'subject'=>'Request {{ref}} has been Approved',
             'body_html'=>"<p>Dear {{requester}},</p><p>Your request <strong>{{ref}} — {{title}}</strong> has been <strong style='color:green'>approved</strong>.</p><p>View details: <a href='{{link}}'>{{link}}</a></p><p>Regards,<br>QMS Pro System</p>",
             'variables'=>$vars_request],
            ['slug'=>'request_rejected',  'name'=>'Request Rejected',        'module'=>'requests',  'trigger_event'=>'rejected',
             'subject'=>'Request {{ref}} was Rejected',
             'body_html'=>"<p>Dear {{requester}},</p><p>Your request <strong>{{ref}} — {{title}}</strong> has been <strong style='color:red'>rejected</strong>.</p><p>View details: <a href='{{link}}'>{{link}}</a></p><p>Regards,<br>QMS Pro System</p>",
             'variables'=>$vars_request],
            ['slug'=>'request_overdue',   'name'=>'Request Overdue',         'module'=>'requests',  'trigger_event'=>'overdue',
             'subject'=>'OVERDUE: Request {{ref}} past due date',
             'body_html'=>"<p>Attention,</p><p>Request <strong>{{ref}} — {{title}}</strong> assigned to <strong>{{requester}}</strong> is now <strong style='color:red'>overdue</strong> (was due {{due_date}}).</p><p><a href='{{link}}'>View Request</a></p>",
             'variables'=>$vars_request],
            // NC
            ['slug'=>'nc_created',        'name'=>'NC Raised',               'module'=>'nc',        'trigger_event'=>'created',
             'subject'=>'New Non-Conformance Raised: {{ref}}',
             'body_html'=>"<p>A new non-conformance has been raised.</p><ul><li><strong>Ref:</strong> {{ref}}</li><li><strong>Title:</strong> {{title}}</li><li><strong>Severity:</strong> {{severity}}</li><li><strong>Assigned To:</strong> {{assignee}}</li><li><strong>Due:</strong> {{due_date}}</li></ul><p><a href='{{link}}'>View NC</a></p>",
             'variables'=>$vars_nc],
            ['slug'=>'nc_overdue',        'name'=>'NC Overdue',              'module'=>'nc',        'trigger_event'=>'overdue',
             'subject'=>'OVERDUE NC: {{ref}} — {{title}}',
             'body_html'=>"<p>Non-conformance <strong>{{ref}}</strong> assigned to <strong>{{assignee}}</strong> is past its due date of {{due_date}}.</p><p>Severity: <strong>{{severity}}</strong></p><p><a href='{{link}}'>View NC</a></p>",
             'variables'=>$vars_nc],
            // CAPA
            ['slug'=>'capa_assigned',     'name'=>'CAPA Assigned',           'module'=>'capa',      'trigger_event'=>'assigned',
             'subject'=>'CAPA Assigned to You: {{ref}}',
             'body_html'=>"<p>Dear {{assignee}},</p><p>A CAPA action has been assigned to you.</p><ul><li><strong>Ref:</strong> {{ref}}</li><li><strong>Title:</strong> {{title}}</li><li><strong>Due Date:</strong> {{due_date}}</li></ul><p><a href='{{link}}'>View CAPA</a></p>",
             'variables'=>$vars_capa],
            ['slug'=>'capa_overdue',      'name'=>'CAPA Overdue',            'module'=>'capa',      'trigger_event'=>'overdue',
             'subject'=>'OVERDUE CAPA: {{ref}} — Action Required',
             'body_html'=>"<p>CAPA <strong>{{ref}} — {{title}}</strong> is overdue.</p><p>Responsible: <strong>{{assignee}}</strong><br>Was due: <strong>{{due_date}}</strong></p><p>Please update immediately: <a href='{{link}}'>{{link}}</a></p>",
             'variables'=>$vars_capa],
            ['slug'=>'capa_closed',       'name'=>'CAPA Closed',             'module'=>'capa',      'trigger_event'=>'closed',
             'subject'=>'CAPA Closed: {{ref}}',
             'body_html'=>"<p>CAPA <strong>{{ref}} — {{title}}</strong> has been <strong style='color:green'>closed</strong> successfully.</p><p>Closed by: {{assignee}}</p><p><a href='{{link}}'>View CAPA</a></p>",
             'variables'=>$vars_capa],
            // Risk
            ['slug'=>'risk_high_identified','name'=>'High/Critical Risk Identified','module'=>'risk','trigger_event'=>'high_risk',
             'subject'=>'High Risk Identified: {{ref}} — {{title}}',
             'body_html'=>"<p>A <strong>{{level}}</strong> risk has been identified.</p><ul><li><strong>Ref:</strong> {{ref}}</li><li><strong>Title:</strong> {{title}}</li><li><strong>Score:</strong> {{score}}</li><li><strong>Owner:</strong> {{owner}}</li><li><strong>Next Review:</strong> {{review_date}}</li></ul>",
             'variables'=>$vars_risk],
            ['slug'=>'risk_review_due',   'name'=>'Risk Review Due',          'module'=>'risk',      'trigger_event'=>'review_due',
             'subject'=>'Risk Review Due: {{ref}} — {{title}}',
             'body_html'=>"<p>Risk <strong>{{ref}} — {{title}}</strong> is due for review on <strong>{{review_date}}</strong>.</p><p>Current level: <strong>{{level}}</strong> (Score: {{score}})</p><p>Owner: {{owner}}</p>",
             'variables'=>$vars_risk],
            // Audit
            ['slug'=>'audit_planned',     'name'=>'Audit Planned',           'module'=>'audit',     'trigger_event'=>'planned',
             'subject'=>'Audit Scheduled: {{ref}} — {{title}}',
             'body_html'=>"<p>An audit has been scheduled.</p><ul><li><strong>Ref:</strong> {{ref}}</li><li><strong>Title:</strong> {{title}}</li><li><strong>Department:</strong> {{department}}</li><li><strong>Lead Auditor:</strong> {{lead_auditor}}</li><li><strong>Start Date:</strong> {{start_date}}</li></ul>",
             'variables'=>$vars_audit],
            ['slug'=>'audit_completed',   'name'=>'Audit Completed',         'module'=>'audit',     'trigger_event'=>'completed',
             'subject'=>'Audit Completed: {{ref}} — {{title}}',
             'body_html'=>"<p>Audit <strong>{{ref}} — {{title}}</strong> has been completed by <strong>{{lead_auditor}}</strong>.</p><p>Department: {{department}}</p><p>Please review the findings in the system.</p>",
             'variables'=>$vars_audit],
            // Complaints
            ['slug'=>'complaint_received','name'=>'Complaint Received',       'module'=>'complaints','trigger_event'=>'created',
             'subject'=>'New Complaint Received: {{ref}}',
             'body_html'=>"<p>A new complaint has been received.</p><ul><li><strong>Ref:</strong> {{ref}}</li><li><strong>Subject:</strong> {{subject}}</li><li><strong>From:</strong> {{complainant}}</li><li><strong>Priority:</strong> {{priority}}</li><li><strong>Due:</strong> {{due_date}}</li></ul>",
             'variables'=>$vars_complaint],
            ['slug'=>'complaint_resolved','name'=>'Complaint Resolved',       'module'=>'complaints','trigger_event'=>'resolved',
             'subject'=>'Complaint Resolved: {{ref}}',
             'body_html'=>"<p>Dear {{complainant}},</p><p>Your complaint <strong>{{ref}} — {{subject}}</strong> has been resolved.</p><p>Thank you for bringing this to our attention.</p><p>Regards,<br>Quality Team</p>",
             'variables'=>$vars_complaint],
            // Visits
            ['slug'=>'visit_confirmed',   'name'=>'Visit Confirmed',          'module'=>'visits',    'trigger_event'=>'confirmed',
             'subject'=>'Visit Confirmed: {{ref}} — {{client}}',
             'body_html'=>"<p>A client visit has been confirmed.</p><ul><li><strong>Client:</strong> {{client}}</li><li><strong>Date:</strong> {{date}}</li><li><strong>Time:</strong> {{time}}</li><li><strong>Location:</strong> {{location}}</li><li><strong>Host:</strong> {{host}}</li></ul>",
             'variables'=>$vars_visit],
            ['slug'=>'visit_reminder',    'name'=>'Visit Reminder',           'module'=>'visits',    'trigger_event'=>'reminder',
             'subject'=>'Visit Reminder Tomorrow: {{client}} — {{date}}',
             'body_html'=>"<p>Reminder: You have a visit scheduled tomorrow.</p><ul><li><strong>Client:</strong> {{client}}</li><li><strong>Date:</strong> {{date}} at {{time}}</li><li><strong>Location:</strong> {{location}}</li><li><strong>Ref:</strong> {{ref}}</li></ul>",
             'variables'=>$vars_visit],
        ];

        foreach ($templates as $t) {
            EmailTemplate::updateOrCreate(['slug' => $t['slug']], $t);
        }

        $this->command->info('✅ Admin settings and email templates seeded');
    }
}
