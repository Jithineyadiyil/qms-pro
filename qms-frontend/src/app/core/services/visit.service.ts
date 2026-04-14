import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VisitService {
  constructor(private api: ApiService) {}
  // Visits
  list(filters: any = {}): Observable<any>               { return this.api.get('/visits', filters); }
  get(id: number): Observable<any>                       { return this.api.get(`/visits/${id}`); }
  create(data: any): Observable<any>                     { return this.api.post('/visits', data); }
  update(id: number, data: any): Observable<any>         { return this.api.put(`/visits/${id}`, data); }
  delete(id: number): Observable<any>                    { return this.api.delete(`/visits/${id}`); }
  confirm(id: number): Observable<any>                   { return this.api.post(`/visits/${id}/confirm`, {}); }
  start(id: number): Observable<any>                     { return this.api.post(`/visits/${id}/start`, {}); }
  complete(id: number, data: any): Observable<any>       { return this.api.post(`/visits/${id}/complete`, data); }
  addParticipant(id: number, data: any): Observable<any> { return this.api.post(`/visits/${id}/participants`, data); }
  addFinding(id: number, data: any): Observable<any>     { return this.api.post(`/visits/${id}/findings`, data); }
  rate(id: number, data: any): Observable<any>           { return this.api.post(`/visits/${id}/rate`, data); }
  visitClients(): Observable<any>                        { return this.api.get('/visits/stats'); }
  stats(): Observable<any>                               { return this.api.get('/visits/stats'); }
  calendar(): Observable<any>                            { return this.api.get('/visits/calendar'); }
  // Clients
  clientList(filters: any = {}): Observable<any>         { return this.api.get('/clients', filters); }
  clientStats(): Observable<any>                         { return this.api.get('/clients/stats'); }
  clientUsers(): Observable<any>                         { return this.api.get('/clients/users'); }
  getClient(id: number): Observable<any>                 { return this.api.get(`/clients/${id}`); }
  createClient(data: any): Observable<any>               { return this.api.post('/clients', data); }
  updateClient(id: number, data: any): Observable<any>   { return this.api.put(`/clients/${id}`, data); }
  deleteClient(id: number): Observable<any>              { return this.api.delete(`/clients/${id}`); }
  clientVisits(id: number): Observable<any>              { return this.api.get(`/clients/${id}/visits`); }
  clients(): Observable<any>                             { return this.api.get('/visits/clients'); }
}
