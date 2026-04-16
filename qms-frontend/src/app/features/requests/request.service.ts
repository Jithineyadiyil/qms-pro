// ============================================================
// src/app/features/requests/request.service.ts  — QDM v2
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';   // ← FIXED: 3 levels up
import {
  RequestModel, RequestCategory, RequestComment,
  QdmTypeDefinition, QDM_TYPE_REGISTRY,
} from './request.model';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
}

export interface RequestFilters {
  page?: number;
  per_page?: number;
  status?: string;
  priority?: string;
  type?: string;
  department_id?: number;
  category_id?: number;
  assignee_id?: number;
  q?: string;
  date_from?: string;
  date_to?: string;
}

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly base = `${environment.apiUrl}/requests`;

  constructor(private http: HttpClient) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  getAll(filters: RequestFilters = {}): Observable<PaginatedResponse<RequestModel>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PaginatedResponse<RequestModel>>(this.base, { params });
  }

  getById(id: number): Observable<ApiResponse<RequestModel>> {
    return this.http.get<ApiResponse<RequestModel>>(`${this.base}/${id}`);
  }

  create(data: Partial<RequestModel>): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(this.base, data);
  }

  update(id: number, data: Partial<RequestModel>): Observable<ApiResponse<RequestModel>> {
    return this.http.put<ApiResponse<RequestModel>>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }

  getCategories(): Observable<ApiResponse<RequestCategory[]>> {
    return this.http.get<ApiResponse<RequestCategory[]>>(`${this.base}/categories`);
  }

  getComments(id: number): Observable<ApiResponse<RequestComment[]>> {
    return this.http.get<ApiResponse<RequestComment[]>>(`${this.base}/${id}/comments`);
  }

  addComment(id: number, comment: string, isInternal = false): Observable<ApiResponse<RequestComment>> {
    return this.http.post<ApiResponse<RequestComment>>(`${this.base}/${id}/comments`, {
      comment,
      is_internal: isInternal,
    });
  }

  // ── QDM v2 workflow actions ───────────────────────────────────────────────

  submit(id: number): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/submit`, {});
  }

  assign(id: number, assigneeId: number): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/assign`, { assignee_id: assigneeId });
  }

  acknowledge(id: number, estimatedDays: number): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/acknowledge`, {
      estimated_completion_days: estimatedDays,
    });
  }

  requestClarification(id: number, question: string): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/request-clarification`, {
      clarification_question: question,
    });
  }

  submitClarification(id: number, notes: string): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/submit-clarification`, {
      clarification_notes: notes,
    });
  }

  complete(id: number, resolution: string, delayReason?: string): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/complete`, {
      resolution,
      ...(delayReason ? { delay_reason: delayReason } : {}),
    });
  }

  confirmReceipt(id: number): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/confirm-receipt`, {});
  }

  cancel(id: number, reason: string): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/cancel`, { reason });
  }

  approve(id: number, comments?: string): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/approve`, { comments });
  }

  reject(id: number, reason: string): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/reject`, { reason });
  }

  close(id: number, resolution: string): Observable<ApiResponse<RequestModel>> {
    return this.http.post<ApiResponse<RequestModel>>(`${this.base}/${id}/close`, { resolution });
  }

  // ── QDM type registry (local — no API call needed) ───────────────────────

  /** Returns the full QDM sub-type registry from the local constant. */
  getRequestTypes(): Observable<QdmTypeDefinition[]> {
    return of(QDM_TYPE_REGISTRY);
  }

  /** Stats */
  getStats(): Observable<ApiResponse<Record<string, number>>> {
    return this.http.get<ApiResponse<Record<string, number>>>(`${this.base}/stats`);
  }
}
