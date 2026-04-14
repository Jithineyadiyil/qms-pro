import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OkrService {
  constructor(private api: ApiService) {}
  listObjectives(filters: any = {}): Observable<any> { return this.api.get('/okr/objectives', filters); }
  getObjective(id: number): Observable<any> { return this.api.get(`/okr/objectives/${id}`); }
  createObjective(data: any): Observable<any> { return this.api.post('/okr/objectives', data); }
  updateObjective(id: number, data: any): Observable<any> { return this.api.put(`/okr/objectives/${id}`, data); }
  checkIn(objId: number, krId: number, data: any): Observable<any> { return this.api.post(`/okr/objectives/${objId}/key-results/${krId}/check-ins`, data); }
  stats(): Observable<any> { return this.api.get('/okr/stats'); }
  listSlas(filters: any = {}): Observable<any> { return this.api.get('/sla', filters); }
  getSla(id: number): Observable<any> { return this.api.get(`/sla/${id}`); }
  slaDashboard(): Observable<any> { return this.api.get('/sla/dashboard'); }
}
