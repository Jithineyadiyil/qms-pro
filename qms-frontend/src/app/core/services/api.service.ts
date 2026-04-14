import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment.prod';


@Injectable({ providedIn: 'root' })
export class ApiService {
  //private base = '/api';
  private base = environment.apiUrl;


  constructor(private http: HttpClient) {
  console.log('API BASE:', this.base);
  }

  private url(path: string): string {
    // Ensure exactly one slash between base and path

    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }

  // get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
  //   let p = new HttpParams();
  //   if (params) Object.entries(params).forEach(([k, v]) => p = p.set(k, String(v)));
  //   return this.http.get<T>(this.url(path), { params: p });
  // }

  get<T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  responseType: 'json' | 'blob' = 'json'
): Observable<any> {

  let p = new HttpParams();

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      p = p.set(k, String(v));
    });
  }

  return this.http.get(this.url(path), {
    params: p,
    responseType: responseType as 'json'
  });

}

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  postForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(this.url(path), formData);
  }
}
