import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private api: ApiService) {}
  list(filters: any = {}): Observable<any>    { return this.api.get('/audits', filters); }
  get(id: number): Observable<any>            { return this.api.get(`/audits/${id}`); }
  create(data: any): Observable<any>          { return this.api.post('/audits', data); }
  update(id: number, data: any): Observable<any> { return this.api.put(`/audits/${id}`, data); }
  delete(id: number): Observable<any>         { return this.api.delete(`/audits/${id}`); }
  notify(id: number): Observable<any>         { return this.api.post(`/audits/${id}/notify`, {}); }
  start(id: number): Observable<any>          { return this.api.post(`/audits/${id}/start`, {}); }
  issueReport(id: number, data: any): Observable<any> { return this.api.post(`/audits/${id}/issue-report`, data); }
  close(id: number): Observable<any>          { return this.api.post(`/audits/${id}/close`, {}); }
  addTeamMember(id: number, data: any): Observable<any>    { return this.api.post(`/audits/${id}/team`, data); }
  removeTeamMember(id: number, userId: number): Observable<any> { return this.api.delete(`/audits/${id}/team`); }
  getChecklist(id: number): Observable<any>   { return this.api.get(`/audits/${id}/checklist`); }
  addChecklist(id: number, data: any): Observable<any> { return this.api.post(`/audits/${id}/checklist`, data); }
  updateChecklistItem(id: number, itemId: number, data: any): Observable<any> { return this.api.put(`/audits/${id}/checklist/${itemId}`, data); }
  getFindings(id: number): Observable<any>    { return this.api.get(`/audits/${id}/findings`); }
  addFinding(id: number, data: any): Observable<any> { return this.api.post(`/audits/${id}/findings`, data); }
  updateFinding(id: number, findingId: number, data: any): Observable<any> { return this.api.put(`/audits/${id}/findings/${findingId}`, data); }
  raiseCapa(id: number, findingId: number): Observable<any> { return this.api.post(`/audits/${id}/findings/${findingId}/capa`, {}); }
  programs(): Observable<any>                 { return this.api.get('/audits/programs'); }
  createProgram(data: any): Observable<any>   { return this.api.post('/audits/programs', data); }
  stats(): Observable<any>                    { return this.api.get('/audits/stats'); }
  users(): Observable<any>                    { return this.api.get('/audits/users'); }
  departments(): Observable<any>              { return this.api.get('/audits/departments'); }
}
