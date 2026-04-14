import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}

  // Users
  users(p: any = {}): Observable<any>               { return this.api.get('/admin/users', p); }
  createUser(d: any): Observable<any>               { return this.api.post('/admin/users', d); }
  updateUser(id: number, d: any): Observable<any>   { return this.api.put(`/admin/users/${id}`, d); }
  toggleUser(id: number): Observable<any>           { return this.api.post(`/admin/users/${id}/toggle`, {}); }
  resetPassword(id: number, pw: string): Observable<any> { return this.api.post(`/admin/users/${id}/reset-password`, {password:pw}); }

  // Departments
  departments(): Observable<any>                    { return this.api.get('/admin/departments'); }
  createDept(d: any): Observable<any>               { return this.api.post('/admin/departments', d); }
  updateDept(id: number, d: any): Observable<any>   { return this.api.put(`/admin/departments/${id}`, d); }
  deleteDept(id: number): Observable<any>           { return this.api.delete(`/admin/departments/${id}`); }

  // Roles
  roles(): Observable<any>                          { return this.api.get('/admin/roles'); }
  createRole(d: any): Observable<any>               { return this.api.post('/admin/roles', d); }
  updateRole(id: number, d: any): Observable<any>   { return this.api.put(`/admin/roles/${id}`, d); }
  deleteRole(id: number): Observable<any>           { return this.api.delete(`/admin/roles/${id}`); }

  // Categories
  categories(type: string): Observable<any>         { return this.api.get(`/admin/categories/${type}`); }
  createCategory(type: string, d: any): Observable<any>             { return this.api.post(`/admin/categories/${type}`, d); }
  updateCategory(type: string, id: number, d: any): Observable<any> { return this.api.put(`/admin/categories/${type}/${id}`, d); }
  deleteCategory(type: string, id: number): Observable<any>         { return this.api.delete(`/admin/categories/${type}/${id}`); }

  // Email Templates
  emailTemplates(p: any = {}): Observable<any>      { return this.api.get('/admin/email-templates', p); }
  createTemplate(d: any): Observable<any>           { return this.api.post('/admin/email-templates', d); }
  updateTemplate(id: number, d: any): Observable<any> { return this.api.put(`/admin/email-templates/${id}`, d); }
  deleteTemplate(id: number): Observable<any>       { return this.api.delete(`/admin/email-templates/${id}`); }

  // System Settings
  settings(): Observable<any>                       { return this.api.get('/admin/settings'); }
  saveSettings(s: any): Observable<any>             { return this.api.post('/admin/settings', {settings: s}); }

  // Activity Log
  activityLog(p: any = {}): Observable<any>         { return this.api.get('/admin/activity-log', p); }
}
