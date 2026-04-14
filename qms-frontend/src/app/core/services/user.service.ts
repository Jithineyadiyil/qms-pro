import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}
  list(filters: any = {}): Observable<any>           { return this.api.get('/users', filters); }
  get(id: number): Observable<any>                   { return this.api.get(`/users/${id}`); }
  create(data: any): Observable<any>                 { return this.api.post('/users', data); }
  update(id: number, data: any): Observable<any>     { return this.api.put(`/users/${id}`, data); }
  delete(id: number): Observable<any>                { return this.api.delete(`/users/${id}`); }
  departments(): Observable<any>                     { return this.api.get('/departments'); }
  roles(): Observable<any>                           { return this.api.get('/roles'); }
}
