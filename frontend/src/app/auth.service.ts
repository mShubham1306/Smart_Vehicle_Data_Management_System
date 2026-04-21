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
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = new BehaviorSubject<User | null>(this.getStoredUser());
  currentUser$ = this._currentUser.asObservable();

  // Lazy reference to DataService — avoids circular DI at construction time
  private _dataService: any = null;

  constructor(private http: HttpClient, private router: Router) {}

  /** Called by DataService itself once created, to avoid circular injection */
  setDataService(ds: any) {
    this._dataService = ds;
  }

  get currentUser(): User | null {
    return this._currentUser.getValue();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setSession(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._currentUser.next(user);
    // Trigger full data reload now that we have a valid token
    if (this._dataService) {
      this._dataService.refresh();
    }
  }

  private getStoredUser(): User | null {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
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

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser.next(null);
    this.router.navigate(['/login']);
  }
}

