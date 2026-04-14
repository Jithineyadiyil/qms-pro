import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}
  stats(): Observable<any>             { return this.api.get('/dashboard/stats'); }
  charts(): Observable<any>            { return this.api.get('/dashboard/charts'); }
  recentActivities(): Observable<any>  { return this.api.get('/dashboard/recent-activities'); }
  myTasks(): Observable<any>           { return this.api.get('/dashboard/my-tasks'); }
  overdueItems(): Observable<any>      { return this.api.get('/dashboard/overdue'); }
}
