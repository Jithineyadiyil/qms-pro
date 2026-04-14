import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  constructor(private api: ApiService) {}
  list(filters: any = {}): Observable<any>                    { return this.api.get('/surveys', filters); }
  get(id: number): Observable<any>                            { return this.api.get(`/surveys/${id}`); }
  create(data: any): Observable<any>                          { return this.api.post('/surveys', data); }
  update(id: number, data: any): Observable<any>              { return this.api.put(`/surveys/${id}`, data); }
  delete(id: number): Observable<any>                         { return this.api.delete(`/surveys/${id}`); }
  activate(id: number): Observable<any>                       { return this.api.post(`/surveys/${id}/activate`, {}); }
  close(id: number): Observable<any>                          { return this.api.post(`/surveys/${id}/close`, {}); }
  pause(id: number): Observable<any>                          { return this.api.post(`/surveys/${id}/pause`, {}); }
  addQuestion(id: number, data: any): Observable<any>         { return this.api.post(`/surveys/${id}/questions`, data); }
  updateQuestion(id: number, qid: number, d: any): Observable<any> { return this.api.put(`/surveys/${id}/questions/${qid}`, d); }
  deleteQuestion(id: number, qid: number): Observable<any>    { return this.api.delete(`/surveys/${id}/questions/${qid}`); }
  responses(id: number): Observable<any>                      { return this.api.get(`/surveys/${id}/responses`); }
  submitResponse(id: number, data: any): Observable<any>      { return this.api.post(`/surveys/${id}/responses`, data); }
  analytics(id: number): Observable<any>                      { return this.api.get(`/surveys/${id}/analytics`); }
  stats(): Observable<any>                                     { return this.api.get('/surveys/stats'); }
  users(): Observable<any>                                     { return this.api.get('/surveys/users'); }
  clients(): Observable<any>                                   { return this.api.get('/surveys/clients'); }
  departments(): Observable<any>                               { return this.api.get('/surveys/departments'); }
}
