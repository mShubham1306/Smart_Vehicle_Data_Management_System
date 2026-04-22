import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

const API = environment.apiUrl + '/auth';
const TOKEN_KEY = 'smartinsure_token';
const USER_KEY = 'smartinsure_user';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'worker';
  assigned_sheet?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = new BehaviorSubject<User | null>(this.getStoredUser());
  currentUser$ = this._currentUser.asObservable();

  private _dataService: any = null;

  constructor(private http: HttpClient, private router: Router) {}

  setDataService(ds: any) {
    this._dataService = ds;
  }

  get currentUser(): User | null {
    return this._currentUser.getValue();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const u = this._currentUser.getValue();
    return u?.role === 'admin';
  }

  getRole(): string {
    return this._currentUser.getValue()?.role ?? 'worker';
  }

  getAssignedSheet(): string {
    return this._currentUser.getValue()?.assigned_sheet ?? 'default';
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setSession(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._currentUser.next(user);
    if (this._dataService) {
      this._dataService.refresh();
    }
  }

  private getStoredUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  login(payload: any): Observable<any> {
    return this.http.post<any>(`${API}/login`, payload).pipe(
      tap((res) => {
        if (res.token && res.user) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  register(payload: any): Observable<any> {
    return this.http.post<any>(`${API}/register`, payload).pipe(
      tap((res) => {
        if (res.token && res.user) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  forgotPassword(payload: any): Observable<any> {
    return this.http.post<any>(`${API}/forgot-password`, payload);
  }

  resetPassword(payload: any): Observable<any> {
    return this.http.post<any>(`${API}/reset-password`, payload);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser.next(null);
    this.router.navigate(['/login']);
  }
}
