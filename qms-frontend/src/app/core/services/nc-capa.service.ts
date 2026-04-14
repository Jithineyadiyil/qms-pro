import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NcCapaService {
  constructor(private api: ApiService) {}
  // Non-Conformances
  listNcs(filters: any = {}): Observable<any>    { return this.api.get('/nonconformances', filters); }
  getNc(id: number): Observable<any>             { return this.api.get(`/nonconformances/${id}`); }
  createNc(data: any): Observable<any>           { return this.api.post('/nonconformances', data); }
  updateNc(id: number, data: any): Observable<any> { return this.api.put(`/nonconformances/${id}`, data); }
  deleteNc(id: number): Observable<any>          { return this.api.delete(`/nonconformances/${id}`); }
  assignNc(id: number, userId: number): Observable<any> { return this.api.post(`/nonconformances/${id}/assign`, { user_id: userId }); }
  startInvestigation(id: number, rootCause: string): Observable<any> { return this.api.post(`/nonconformances/${id}/investigate`, { root_cause: rootCause }); }
  closeNc(id: number, data: any): Observable<any> { return this.api.post(`/nonconformances/${id}/close`, data); }
  raiseCapa(id: number): Observable<any>         { return this.api.post(`/nonconformances/${id}/raise-capa`, {}); }
  ncCategories(): Observable<any>                { return this.api.get('/nonconformances/categories'); }
  ncUsers(): Observable<any>                     { return this.api.get('/nonconformances/users'); }
  ncDepartments(): Observable<any>               { return this.api.get('/nonconformances/departments'); }
  ncStats(): Observable<any>                     { return this.api.get('/nonconformances/stats'); }
  // CAPAs
  listCapas(filters: any = {}): Observable<any>  { return this.api.get('/capas', filters); }
  getCapa(id: number): Observable<any>           { return this.api.get(`/capas/${id}`); }
  createCapa(data: any): Observable<any>         { return this.api.post('/capas', data); }
  updateCapa(id: number, data: any): Observable<any> { return this.api.put(`/capas/${id}`, data); }
  deleteCapa(id: number): Observable<any>        { return this.api.delete(`/capas/${id}`); }
  addTask(capaId: number, data: any): Observable<any> { return this.api.post(`/capas/${capaId}/tasks`, data); }
  updateTask(capaId: number, taskId: number, data: any): Observable<any> { return this.api.put(`/capas/${capaId}/tasks/${taskId}`, data); }
  completeTask(capaId: number, taskId: number, notes: string): Observable<any> { return this.api.post(`/capas/${capaId}/tasks/${taskId}/complete`, { completion_notes: notes }); }
  effectivenessReview(id: number, result: string): Observable<any> { return this.api.post(`/capas/${id}/effectiveness-review`, { effectiveness_result: result }); }
  closeCapa(id: number): Observable<any>         { return this.api.post(`/capas/${id}/close`, {}); }
  capaUsers(): Observable<any>                   { return this.api.get('/capas/users'); }
  capaDepartments(): Observable<any>             { return this.api.get('/capas/departments'); }
  openNcs(): Observable<any>                     { return this.api.get('/capas/open-ncs'); }
  capaStats(): Observable<any>                   { return this.api.get('/capas/stats'); }
}
