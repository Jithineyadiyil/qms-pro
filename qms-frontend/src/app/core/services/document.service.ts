import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private api: ApiService) {}
  list(filters: any = {}): Observable<any>  { return this.api.get('/documents', filters); }
  get(id: number): Observable<any>          { return this.api.get(`/documents/${id}`); }
  update(id: number, data: any): Observable<any> { return this.api.put(`/documents/${id}`, data); }
  delete(id: number): Observable<any>       { return this.api.delete(`/documents/${id}`); }
  submitForReview(id: number): Observable<any>   { return this.api.post(`/documents/${id}/submit-review`, {}); }
  approve(id: number, data: any): Observable<any>{ return this.api.post(`/documents/${id}/approve`, data); }
  reject(id: number, reason: string): Observable<any> { return this.api.post(`/documents/${id}/reject`, { reason }); }
  markObsolete(id: number): Observable<any> { return this.api.post(`/documents/${id}/obsolete`, {}); }
  getVersions(id: number): Observable<any>  { return this.api.get(`/documents/${id}/versions`); }
  getAccessLog(id: number): Observable<any> { return this.api.get(`/documents/${id}/access-log`); }
  download(id: number): Observable<any>     { return this.api.get(`/documents/${id}/download`); }
  distribute(id: number, departmentIds: number[]): Observable<any> { return this.api.post(`/documents/${id}/distribute`, { department_ids: departmentIds }); }
  categories(): Observable<any>             { return this.api.get('/documents/categories'); }
  stats(): Observable<any>                  { return this.api.get('/documents/stats'); }
  users(): Observable<any>                  { return this.api.get('/documents/users'); }
  departments(): Observable<any>            { return this.api.get('/documents/departments'); }
  create(formData: FormData): Observable<any>            { return this.api.postForm('/documents', formData); }
  newVersion(id: number, formData: FormData): Observable<any> { return this.api.postForm(`/documents/${id}/new-version`, formData); }
  preview(id: number): Observable<any>{ return this.api.get(`/documents/${id}/preview`,{},'blob'); }
  
}
