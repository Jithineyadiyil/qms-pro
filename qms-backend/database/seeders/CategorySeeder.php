<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder {
    public function run(): void {
        // Request Categories
        DB::table('request_categories')->insertOrIgnore([
            ['name'=>'IT Support',      'description'=>'Information technology support requests',  'sla_hours'=>24],
            ['name'=>'HR Request',      'description'=>'Human resources related requests',         'sla_hours'=>48],
            ['name'=>'Procurement',     'description'=>'Purchase and procurement requests',         'sla_hours'=>72],
            ['name'=>'Quality Review',  'description'=>'Quality assessment requests',               'sla_hours'=>48],
            ['name'=>'Compliance',      'description'=>'Regulatory and compliance requests',        'sla_hours'=>24],
            ['name'=>'Training',        'description'=>'Training and development requests',         'sla_hours'=>96],
            ['name'=>'Facilities',      'description'=>'Facilities and infrastructure requests',    'sla_hours'=>48],
        ]);

        // NC Categories
        DB::table('nc_categories')->insertOrIgnore([
            ['name'=>'Process Non-Conformance',  'description'=>'Deviations from defined processes',              'severity_default'=>'minor'],
            ['name'=>'Product/Service Quality',  'description'=>'Quality failures in products or services',       'severity_default'=>'major'],
            ['name'=>'Documentation',            'description'=>'Documentation errors or gaps',                   'severity_default'=>'minor'],
            ['name'=>'Regulatory Compliance',    'description'=>'Regulatory requirement breaches',                'severity_default'=>'critical'],
            ['name'=>'Customer Requirement',     'description'=>'Failure to meet customer requirements',          'severity_default'=>'major'],
            ['name'=>'Supplier / Vendor Issue',  'description'=>'Non-conformances originating from vendors',      'severity_default'=>'major'],
        ]);

        // Risk Categories
        DB::table('risk_categories')->insertOrIgnore([
            ['name'=>'Strategic Risk',         'description'=>'Risks to strategic objectives'],
            ['name'=>'Operational Risk',       'description'=>'Risks in day-to-day operations'],
            ['name'=>'Financial Risk',         'description'=>'Financial exposure and losses'],
            ['name'=>'Compliance & Legal Risk','description'=>'Regulatory and legal exposure'],
            ['name'=>'Technology & Cyber Risk','description'=>'IT and cybersecurity threats'],
            ['name'=>'Reputational Risk',      'description'=>'Brand and reputation damage'],
            ['name'=>'Environmental Risk',     'description'=>'Environmental and sustainability risks'],
        ]);

        // Document Categories
        DB::table('document_categories')->insertOrIgnore([
            ['name'=>'Policies',          'code'=>'POL', 'parent_id'=>null],
            ['name'=>'Procedures',        'code'=>'PRO', 'parent_id'=>null],
            ['name'=>'Work Instructions', 'code'=>'WI',  'parent_id'=>null],
            ['name'=>'Forms & Templates', 'code'=>'FT',  'parent_id'=>null],
            ['name'=>'Manuals',           'code'=>'MAN', 'parent_id'=>null],
            ['name'=>'Reports',           'code'=>'RPT', 'parent_id'=>null],
            ['name'=>'Contracts',         'code'=>'CON', 'parent_id'=>null],
        ]);

        // Complaint Categories
        DB::table('complaint_categories')->insertOrIgnore([
            ['name'=>'Service Quality',      'description'=>'Complaints about service quality',         'sla_hours'=>48],
            ['name'=>'Billing & Payment',    'description'=>'Financial and billing disputes',           'sla_hours'=>24],
            ['name'=>'Staff Conduct',        'description'=>'Complaints about employee behavior',       'sla_hours'=>72],
            ['name'=>'Process & Procedure',  'description'=>'Process-related complaints',               'sla_hours'=>48],
            ['name'=>'System & Technology',  'description'=>'Technology failures affecting service',    'sla_hours'=>24],
            ['name'=>'Communication',        'description'=>'Communication breakdowns',                 'sla_hours'=>48],
            ['name'=>'Regulatory',           'description'=>'Regulatory-related complaints',            'sla_hours'=>24],
        ]);

        // Vendor Categories
        DB::table('vendor_categories')->insertOrIgnore([
            ['name'=>'Technology & Software',   'description'=>'IT and software vendors'],
            ['name'=>'Professional Services',   'description'=>'Consulting and professional services'],
            ['name'=>'Facility Management',     'description'=>'Building and facility services'],
            ['name'=>'Logistics & Transport',   'description'=>'Shipping and logistics providers'],
            ['name'=>'Marketing & Communications','description'=>'Marketing agencies and media'],
            ['name'=>'Financial Services',      'description'=>'Banking and financial service providers'],
        ]);
    }
}
