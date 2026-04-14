import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  constructor(private api: ApiService) {}
  getAll(filters: any = {}): Observable<any>    { return this.api.get('/complaints', filters); }
  getById(id: number): Observable<any>          { return this.api.get(`/complaints/${id}`); }
  create(data: any): Observable<any>            { return this.api.post('/complaints', data); }
  update(id: number, data: any): Observable<any>{ return this.api.put(`/complaints/${id}`, data); }
  delete(id: number): Observable<any>           { return this.api.delete(`/complaints/${id}`); }
  acknowledge(id: number): Observable<any>      { return this.api.post(`/complaints/${id}/acknowledge`, {}); }
  assign(id: number, assignee_id: number): Observable<any> { return this.api.post(`/complaints/${id}/assign`, { assignee_id }); }
  investigate(id: number): Observable<any>      { return this.api.post(`/complaints/${id}/investigate`, {}); }
  escalate(id: number, escalated_to_id: number, reason: string): Observable<any> { return this.api.post(`/complaints/${id}/escalate`, { escalated_to_id, reason }); }
  resolve(id: number, data: any): Observable<any>  { return this.api.post(`/complaints/${id}/resolve`, data); }
  close(id: number, data: any): Observable<any>    { return this.api.post(`/complaints/${id}/close`, data); }
  withdraw(id: number, reason: string): Observable<any> { return this.api.post(`/complaints/${id}/withdraw`, { reason }); }
  raiseCapa(id: number): Observable<any>            { return this.api.post(`/complaints/${id}/raise-capa`, {}); }
  getUpdates(id: number): Observable<any>           { return this.api.get(`/complaints/${id}/updates`); }
  addUpdate(id: number, data: any): Observable<any> { return this.api.post(`/complaints/${id}/updates`, data); }
  getStats(): Observable<any>                       { return this.api.get('/complaints/stats'); }
  categories(): Observable<any>                     { return this.api.get('/complaints/categories'); }
  users(): Observable<any>                          { return this.api.get('/complaints/users'); }
  clients(): Observable<any>                        { return this.api.get('/complaints/clients'); }
  departments(): Observable<any>                    { return this.api.get('/complaints/departments'); }
}
