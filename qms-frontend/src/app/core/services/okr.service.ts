import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OkrService {
  constructor(private api: ApiService) {}

  // OKR — backend prefix: /objectives
  listObjectives(filters: any = {}): Observable<any>  { return this.api.get('/objectives', filters); }
  getObjective(id: number): Observable<any>           { return this.api.get(`/objectives/${id}`); }
  createObjective(data: any): Observable<any>         { return this.api.post('/objectives', data); }
  updateObjective(id: number, data: any): Observable<any> { return this.api.put(`/objectives/${id}`, data); }
  deleteObjective(id: number): Observable<any>        { return this.api.delete(`/objectives/${id}`); }
  tree(): Observable<any>                             { return this.api.get('/objectives/tree'); }
  users(): Observable<any>                            { return this.api.get('/objectives/users'); }
  departments(): Observable<any>                      { return this.api.get('/objectives/departments'); }
  stats(): Observable<any>                            { return this.api.get('/objectives/stats'); }
  keyResults(objId: number): Observable<any>          { return this.api.get(`/objectives/${objId}/key-results`); }
  addKeyResult(objId: number, data: any): Observable<any> { return this.api.post(`/objectives/${objId}/key-results`, data); }
  updateKeyResult(objId: number, krId: number, data: any): Observable<any> {
    return this.api.put(`/objectives/${objId}/key-results/${krId}`, data);
  }
  // Note: backend route is /check-in (singular), not /check-ins
  checkIn(objId: number, krId: number, data: any): Observable<any> {
    return this.api.post(`/objectives/${objId}/key-results/${krId}/check-in`, data);
  }

  // SLA — backend prefix: /sla
  listSlas(filters: any = {}): Observable<any> { return this.api.get('/sla', filters); }
  getSla(id: number): Observable<any>          { return this.api.get(`/sla/${id}`); }
  slaDashboard(): Observable<any>              { return this.api.get('/sla/dashboard'); }
}
