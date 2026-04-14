import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VendorService {
  constructor(private api: ApiService) {}
  // Vendors
  list(filters: any = {}): Observable<any>              { return this.api.get('/vendors', filters); }
  get(id: number): Observable<any>                      { return this.api.get(`/vendors/${id}`); }
  create(data: any): Observable<any>                    { return this.api.post('/vendors', data); }
  update(id: number, data: any): Observable<any>        { return this.api.put(`/vendors/${id}`, data); }
  delete(id: number): Observable<any>                   { return this.api.delete(`/vendors/${id}`); }
  qualify(id: number): Observable<any>                  { return this.api.post(`/vendors/${id}/qualify`, {}); }
  suspend(id: number): Observable<any>                  { return this.api.post(`/vendors/${id}/suspend`, {}); }
  addEvaluation(id: number, data: any): Observable<any> { return this.api.post(`/vendors/${id}/evaluations`, data); }
  getEvaluations(id: number): Observable<any>           { return this.api.get(`/vendors/${id}/evaluations`); }
  addContract(id: number, data: any): Observable<any>   { return this.api.post(`/vendors/${id}/contracts`, data); }
  getContracts(id: number): Observable<any>             { return this.api.get(`/vendors/${id}/contracts`); }
  categories(): Observable<any>                         { return this.api.get('/vendors/categories'); }
  vendorsList(): Observable<any>                        { return this.api.get('/vendors/list'); }
  users(): Observable<any>                              { return this.api.get('/vendors/users'); }
  stats(): Observable<any>                              { return this.api.get('/vendors/stats'); }
  expiringContracts(): Observable<any>                  { return this.api.get('/vendors/expiring-contracts'); }
  // Contracts
  listContracts(filters: any = {}): Observable<any>     { return this.api.get('/contracts', filters); }
  getContract(id: number): Observable<any>              { return this.api.get(`/contracts/${id}`); }
  createContract(data: any): Observable<any>            { return this.api.post('/contracts', data); }
  updateContract(id: number, data: any): Observable<any>{ return this.api.put(`/contracts/${id}`, data); }
  activateContract(id: number): Observable<any>         { return this.api.post(`/contracts/${id}/activate`, {}); }
  terminateContract(id: number): Observable<any>        { return this.api.post(`/contracts/${id}/terminate`, {}); }
  contractStats(): Observable<any>                      { return this.api.get('/contracts/stats'); }
  // Partnerships
  listPartnerships(filters: any = {}): Observable<any>  { return this.api.get('/partnerships', filters); }
  createPartnership(data: any): Observable<any>         { return this.api.post('/partnerships', data); }
}
