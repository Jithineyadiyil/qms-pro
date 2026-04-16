import { Injectable, signal, computed } from '@angular/core';

export type Lang = 'en' | 'ar';

const AR: Record<string, string> = {
  'QMS Pro': 'نظام إدارة الجودة',
  'Diamond': 'دايموند',
  'Insurance Broker': 'وسيط التأمين',
  'Overview': 'نظرة عامة',
  'Quality': 'الجودة',
  'Risk & Governance': 'المخاطر والحوكمة',
  'Performance': 'الأداء',
  'Procurement': 'المشتريات',
  'Sales & Marketing': 'المبيعات والتسويق',
  'Admin': 'الإدارة',
  'Dashboard': 'لوحة التحكم',
  'Request Management': 'إدارة الطلبات',
  'Non-Conformances': 'حالات عدم المطابقة',
  'CAPA': 'الإجراءات التصحيحية',
  'Complaints': 'الشكاوى',
  'Customer Satisfaction': 'رضا العملاء',
  'Risk Management': 'إدارة المخاطر',
  'Risk Matrix': 'مصفوفة المخاطر',
  'Audit Management': 'إدارة المراجعات',
  'Document Control': 'ضبط الوثائق',
  'Visit Planning': 'تخطيط الزيارات',
  'Clients & Insurers': 'العملاء وشركات التأمين',
  'SLA Management': 'إدارة اتفاقيات الخدمة',
  'OKR Management': 'إدارة الأهداف والنتائج',
  'KPI Dashboard': 'لوحة مؤشرات الأداء',
  'Reports & Analytics': 'التقارير والتحليلات',
  'Record Reports': 'تقارير السجلات',
  'Vendor Management': 'إدارة الموردين',
  'Contract Management': 'إدارة العقود',
  'Administration': 'الإدارة',
  'Sign Out': 'تسجيل الخروج',
  'Notifications': 'الإشعارات',
  'New Record': 'سجل جديد',
  'Search records, NCs, risks...': 'ابحث في السجلات...',
  'New Request': 'طلب جديد',
  'New Survey': 'استبيان جديد',
  'New Complaint': 'شكوى جديدة',
  'New NC': 'عدم مطابقة جديد',
  'New CAPA': 'إجراء تصحيحي جديد',
  'New Risk': 'مخاطرة جديدة',
  'New Audit': 'مراجعة جديدة',
  'Upload Document': 'رفع وثيقة',
  'New Visit': 'زيارة جديدة',
  'New Vendor': 'مورد جديد',
  'Save as Draft': 'حفظ كمسودة',
  'Create & Activate': 'إنشاء وتفعيل',
  'Submit Request': 'إرسال الطلب',
  'Submit': 'إرسال',
  'Submit Response': 'إرسال الرد',
  'Submit Another Response': 'إرسال رد آخر',
  'Add Comment': 'إضافة تعليق',
  'Add Question': 'إضافة سؤال',
  'Post': 'نشر',
  'Cancel': 'إلغاء',
  'Close': 'إغلاق',
  'Save': 'حفظ',
  'Delete': 'حذف',
  'Edit': 'تعديل',
  'Assign': 'تعيين',
  'Approve': 'الموافقة',
  'Reject': 'الرفض',
  'Activate': 'تفعيل',
  'Pause': 'إيقاف مؤقت',
  'Resume': 'استئناف',
  'Export CSV': 'تصدير CSV',
  'Export': 'تصدير',
  'Confirm': 'تأكيد',
  'Back': 'رجوع',
  'Next': 'التالي',
  'Previous': 'السابق',
  'Apply': 'تطبيق',
  'Reset': 'إعادة تعيين',
  'All Statuses': 'جميع الحالات',
  'All Priorities': 'جميع الأولويات',
  'All Types': 'جميع الأنواع',
  'All Severities': 'جميع درجات الخطورة',
  'All Departments': 'جميع الأقسام',
  'All Categories': 'جميع الفئات',
  'REFERENCE': 'المرجع',
  'TITLE': 'العنوان',
  'CATEGORY': 'الفئة',
  'TYPE': 'النوع',
  'PRIORITY': 'الأولوية',
  'STATUS': 'الحالة',
  'RAISED BY': 'أنشأه',
  'ASSIGNED': 'مُسنَد إلى',
  'DUE DATE': 'تاريخ الاستحقاق',
  'DEPARTMENT': 'القسم',
  'DATE': 'التاريخ',
  'ACTIONS': 'الإجراءات',
  'SEVERITY': 'الخطورة',
  'SOURCE': 'المصدر',
  'Draft': 'مسودة',
  'Submitted': 'مُقدَّم',
  'Under Review': 'قيد المراجعة',
  'In Progress': 'قيد التنفيذ',
  'Pending Approval': 'بانتظار الموافقة',
  'Approved': 'موافق عليه',
  'Rejected': 'مرفوض',
  'Closed': 'مغلق',
  'Open': 'مفتوح',
  'Active': 'نشط',
  'Paused': 'موقوف مؤقتاً',
  'Overdue': 'متأخر',
  'Completed': 'مكتمل',
  'Cancelled': 'ملغى',
  'Pending': 'معلق',
  'Low': 'منخفض',
  'Medium': 'متوسط',
  'High': 'مرتفع',
  'Critical': 'حرج',
  'Urgent': 'عاجل',
  'Title': 'العنوان',
  'Description': 'الوصف',
  'Category': 'الفئة',
  'Priority': 'الأولوية',
  'Type': 'النوع',
  'Due Date': 'تاريخ الاستحقاق',
  'Department': 'القسم',
  'Name': 'الاسم',
  'Email': 'البريد الإلكتروني',
  'Phone': 'الهاتف',
  'Date': 'التاريخ',
  'Notes': 'الملاحظات',
  'Comments': 'التعليقات',
  'Attachments': 'المرفقات',
  'Reference': 'المرجع',
  'Resolution': 'القرار',
  'Status': 'الحالة',
  'Severity': 'الخطورة',
  'Source': 'المصدر',
  'Created By': 'أنشأه',
  'Created At': 'تاريخ الإنشاء',
  'Assigned To': 'مُسنَد إلى',
  'Raised By': 'أنشأه',
  'Details': 'التفاصيل',
  'Analytics': 'التحليلات',
  'Approvals': 'الموافقات',
  'Questions': 'الأسئلة',
  'Internal only': 'داخلي فقط',
  'Your Information': 'معلوماتك',
  'Request Details': 'تفاصيل الطلب',
  'Request Information': 'معلومات الطلب',
  'Survey Details': 'تفاصيل الاستبيان',
  'Survey Type': 'نوع الاستبيان',
  'Target Audience': 'الجمهور المستهدف',
  'Send Date': 'تاريخ الإرسال',
  'Close Date': 'تاريخ الإغلاق',
  'Anonymous Responses': 'ردود مجهولة',
  'Thank You Message': 'رسالة الشكر',
  'Thank You!': 'شكراً لك!',
  'Total Surveys': 'إجمالي الاستبيانات',
  'Total Responses': 'إجمالي الردود',
  'Avg CSAT Score': 'متوسط درجة الرضا',
  'Avg NPS': 'متوسط صافي المروجين',
  // Search placeholders
  'Search requests…': 'ابحث في الطلبات...',
  'Search surveys…': 'ابحث في الاستبيانات...',
  'Search complaints…': 'ابحث في الشكاوى...',
  'Search vendors…': 'ابحث في الموردين...',
  'Search audits…': 'ابحث في المراجعات...',
  'Search documents…': 'ابحث في الوثائق...',
  'Search NCs…': 'ابحث في عدم المطابقة...',
  'Search risks…': 'ابحث في المخاطر...',
  // New button labels (icon prefix variants)
  // Table tabs
  'All': 'الكل',
  'Tab All': 'الكل',
  'Internal': 'داخلي',
  'External': 'خارجي',
  'Client': 'عميل',
  'Vendor': 'مورد',
  'Regulatory': 'تنظيمي',

  'Unassigned': 'غير مُسنَد',
  'No requests found.': 'لا توجد طلبات.',
  'No surveys found.': 'لا توجد استبيانات.',
  'No comments yet.': 'لا توجد تعليقات بعد.',
  'No approval records yet.': 'لا توجد سجلات موافقة بعد.',
  'No responses yet.': 'لا توجد ردود بعد.',
  'No data found': 'لا توجد بيانات',
  'CAPA Management': 'إدارة الإجراءات التصحيحية',
  'Complaints Management': 'إدارة الشكاوى',
  'Corrective': 'تصحيحي',
  'Preventive': 'وقائي',
  'Minor': 'بسيط',
  'Major': 'كبير',
  'Sign In': 'تسجيل الدخول',
  'Welcome back': 'مرحباً بعودتك',
  'Password': 'كلمة المرور',
  'Remember me': 'تذكرني',
  'Signing in...': 'جارٍ تسجيل الدخول...',
  'Loading...': 'جارٍ التحميل...',
  'Saving...': 'جارٍ الحفظ...',
  'Yes': 'نعم',
  'No': 'لا',
  'Total': 'الإجمالي',
  'Page': 'الصفحة',
  'of': 'من',
  'Change': 'تغيير',
  'Remove': 'إزالة',
  'Add': 'إضافة',
  'Update': 'تحديث',
  'Search': 'بحث',
  'Filter': 'تصفية',
  'Sort': 'ترتيب',
  'None': 'لا شيء',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _lang = signal<Lang>((localStorage.getItem('qms_lang') as Lang) || 'en');

  readonly lang    = this._lang.asReadonly();
  readonly isArabic = computed(() => this._lang() === 'ar');
  readonly dir      = computed(() => this._lang() === 'ar' ? 'rtl' : 'ltr');
  readonly fontFamily = computed(() =>
    this._lang() === 'ar'
      ? "'Cairo', 'Noto Sans Arabic', 'Inter', sans-serif"
      : "'Inter', sans-serif"
  );

  constructor() { this.apply(); }

  toggle() { this.set(this._lang() === 'en' ? 'ar' : 'en'); }

  set(lang: Lang) {
    this._lang.set(lang);
    localStorage.setItem('qms_lang', lang);
    this.apply();
  }

  private apply() {
    const html = document.documentElement;
    const lang = this._lang();
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.style.fontFamily = this.fontFamily();
  }

  t(key: string): string {
    if (this._lang() === 'en') return key;
    return AR[key] ?? key;
  }

  // Translate page title
  pageTitle(path: string): string {
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard', '/requests': 'Request Management',
      '/nc-capa': 'Non-Conformances', '/nc-capa/capas': 'CAPA Management',
      '/risk': 'Risk Management', '/risk/matrix': 'Risk Matrix', '/documents': 'Document Control',
      '/audits': 'Audit Management', '/visits': 'Visit Planning',
      '/clients': 'Clients & Insurers', '/sla': 'SLA Management',
      '/okr': 'OKR Management', '/kpi': 'KPI Dashboard',
      '/reports': 'Reports & Analytics', '/vendors': 'Vendor Management',
      '/partnerships': 'Contract Management', '/complaints': 'Complaints Management',
      '/surveys': 'Customer Satisfaction', '/settings': 'Administration',
    };
    const key = Object.keys(map).find(k => path.startsWith(k));
    const title = key ? map[key] : 'QMS Pro';
    return this.t(title);
  }
}
