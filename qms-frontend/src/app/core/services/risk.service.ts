import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RiskService {
  constructor(private api: ApiService) {}
  list(filters: any = {}): Observable<any>        { return this.api.get('/risks', filters); }
  get(id: number): Observable<any>                { return this.api.get(`/risks/${id}`); }
  create(data: any): Observable<any>              { return this.api.post('/risks', data); }
  update(id: number, data: any): Observable<any>  { return this.api.put(`/risks/${id}`, data); }
  delete(id: number): Observable<any>             { return this.api.delete(`/risks/${id}`); }
  assess(id: number, data: any): Observable<any>  { return this.api.put(`/risks/${id}/assess`, data); }
  addControl(id: number, data: any): Observable<any>                        { return this.api.post(`/risks/${id}/controls`, data); }
  updateControl(id: number, cid: number, data: any): Observable<any>        { return this.api.put(`/risks/${id}/controls/${cid}`, data); }
  deleteControl(id: number, cid: number): Observable<any>                   { return this.api.delete(`/risks/${id}/controls/${cid}`); }
  addReview(id: number, data: any): Observable<any>                         { return this.api.post(`/risks/${id}/reviews`, data); }
  matrix(): Observable<any>     { return this.api.get('/risks/matrix'); }
  categories(): Observable<any> { return this.api.get('/risks/categories'); }
  owners(): Observable<any>     { return this.api.get('/risks/owners'); }
  departments(): Observable<any>{ return this.api.get('/risks/departments'); }
  stats(): Observable<any>      { return this.api.get('/risks/stats'); }
}
