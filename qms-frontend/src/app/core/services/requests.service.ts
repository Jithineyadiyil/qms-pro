import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  constructor(private api: ApiService) {}
  list(filters: any = {}): Observable<any>               { return this.api.get('/requests', filters); }
  get(id: number): Observable<any>                       { return this.api.get(`/requests/${id}`); }
  create(data: any): Observable<any>                     { return this.api.post('/requests', data); }
  update(id: number, data: any): Observable<any>         { return this.api.put(`/requests/${id}`, data); }
  delete(id: number): Observable<any>                    { return this.api.delete(`/requests/${id}`); }
  submit(id: number): Observable<any>                    { return this.api.post(`/requests/${id}/submit`, {}); }
  assign(id: number, assignee_id: number): Observable<any> { return this.api.post(`/requests/${id}/assign`, { assignee_id }); }
  approve(id: number, comments?: string): Observable<any>  { return this.api.post(`/requests/${id}/approve`, { comments }); }
  reject(id: number, reason: string): Observable<any>    { return this.api.post(`/requests/${id}/reject`, { reason }); }
  close(id: number, resolution: string): Observable<any> { return this.api.post(`/requests/${id}/close`, { resolution }); }
  comments(id: number): Observable<any>                  { return this.api.get(`/requests/${id}/comments`); }
  addComment(id: number, comment: string, is_internal = false): Observable<any> { return this.api.post(`/requests/${id}/comments`, { comment, is_internal }); }
  approvals(id: number): Observable<any>                 { return this.api.get(`/requests/${id}/approvals`); }
  categories(): Observable<any>                          { return this.api.get('/requests/categories'); }
  stats(): Observable<any>                               { return this.api.get('/requests/stats'); }
  users(params: any = {}): Observable<any>               { return this.api.get('/requests/users', params); }
  departments(): Observable<any>                         { return this.api.get('/requests/departments'); }
}
