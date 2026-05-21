import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, interval, Subscription, timer, throwError } from 'rxjs';
import { retry } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

const API       = environment.apiUrl + '/auth';
const API_BASE  = environment.apiUrl.replace(/\/api\/?$/, '');
const TOKEN_KEY = 'smartinsure_token';
const USER_KEY  = 'smartinsure_user';
const REFRESH_KEY = 'smartinsure_refresh';
const EXPIRY_KEY  = 'smartinsure_token_exp'; // Unix timestamp (seconds)

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'worker';
  assigned_sheet?: string;
  email_verified?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = new BehaviorSubject<User | null>(this.getStoredUser());
  currentUser$ = this._currentUser.asObservable();

  // Session warning stream: emits minutes remaining when < 5 min left
  private _sessionWarning = new BehaviorSubject<number | null>(null);
  sessionWarning$ = this._sessionWarning.asObservable();

  // Re-auth required stream
  private _requireReauth = new BehaviorSubject<boolean>(false);
  requireReauth$ = this._requireReauth.asObservable();

  private _dataService: any = null;
  private _sessionTimer: Subscription | null = null;

  constructor(private http: HttpClient, private router: Router, private zone: NgZone) {
    // Start session countdown if already logged in
    if (this.isLoggedIn()) {
      this._startSessionTimer();
    }
  }

  setDataService(ds: any) { this._dataService = ds; }

  get currentUser(): User | null { return this._currentUser.getValue(); }

  isLoggedIn(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  isAdmin(): boolean { return this._currentUser.getValue()?.role === 'admin'; }
  getRole(): string  { return this._currentUser.getValue()?.role ?? 'worker'; }
  getAssignedSheet(): string { return this._currentUser.getValue()?.assigned_sheet ?? 'default'; }

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }
  getUserId(): string | null { return this._currentUser.getValue()?.id ?? null; }

  /** Returns true if the access token is expired or within 30s of expiry */
  isTokenExpired(bufferSeconds = 30): boolean {
    const expStr = localStorage.getItem(EXPIRY_KEY);
    if (!expStr) return true;
    const exp = parseInt(expStr, 10);
    return Date.now() / 1000 >= exp - bufferSeconds;
  }

  /** Returns seconds until token expires */
  getSecondsUntilExpiry(): number {
    const expStr = localStorage.getItem(EXPIRY_KEY);
    if (!expStr) return 0;
    return Math.max(0, parseInt(expStr, 10) - Math.floor(Date.now() / 1000));
  }

  private setSession(token: string, user: User, refreshToken?: string, expiresInHours?: number) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);

    // Store expiry timestamp
    const hours = expiresInHours ?? (user.role === 'admin' ? 48 : 3);
    const expiry = Math.floor(Date.now() / 1000) + hours * 3600;
    localStorage.setItem(EXPIRY_KEY, expiry.toString());

    this._currentUser.next(user);
    this._requireReauth.next(false);
    this._sessionWarning.next(null);
    this._startSessionTimer();

    if (this._dataService) this._dataService.refresh();
  }

  private getStoredUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  /** Starts a 30-second interval that monitors session expiry */
  private _startSessionTimer() {
    this._stopSessionTimer();
    this.zone.runOutsideAngular(() => {
      this._sessionTimer = interval(30_000).subscribe(() => {
        this.zone.run(() => {
          const secs = this.getSecondsUntilExpiry();
          if (secs <= 0) {
            this._handleSessionExpired();
          } else if (secs <= 300) {
            // Warn when < 5 minutes remain
            this._sessionWarning.next(Math.ceil(secs / 60));
          } else {
            this._sessionWarning.next(null);
          }
        });
      });
    });
  }

  private _stopSessionTimer() {
    this._sessionTimer?.unsubscribe();
    this._sessionTimer = null;
  }

  private _handleSessionExpired() {
    this._stopSessionTimer();
    const refreshToken = this.getRefreshToken();
    const userId = this.getUserId();
    if (refreshToken && userId) {
      // Attempt silent refresh
      this.http.post<any>(`${API}/refresh`, { refresh_token: refreshToken, user_id: userId })
        .subscribe({
          next: (res) => {
            if (res.token && this._currentUser.getValue()) {
              const user = this._currentUser.getValue()!;
              this.setSession(res.token, user, res.refresh_token, res.expires_in_hours);
            }
          },
          error: () => {
            // Refresh failed — require re-auth
            this._requireReauth.next(true);
            this._clearStorage();
          }
        });
    } else {
      this._requireReauth.next(true);
      this._clearStorage();
    }
  }

  private _clearStorage() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    this._currentUser.next(null);
  }

  // ── Public Auth Methods ───────────────────────────────────────────────────

  /** Wake backend on cold start (Render free tier) — no UI side effects */
  warmUpApi(): Observable<unknown> {
    return this.http.get(`${API_BASE}/health`);
  }

  private postAuth(path: string, payload: unknown): Observable<any> {
    return this.http.post<any>(`${API}${path}`, payload).pipe(
      retry({
        count: 2,
        delay: (err, attempt) =>
          err?.status === 0 ? timer(1500 * attempt) : throwError(() => err),
      }),
    );
  }

  login(payload: any): Observable<any> {
    return this.postAuth('/login', payload).pipe(
      tap((res) => {
        if (res.token && res.user) {
          this.setSession(res.token, res.user, res.refresh_token, res.expires_in_hours);
        }
      })
    );
  }

  register(payload: any): Observable<any> {
    return this.postAuth('/register', payload).pipe(
      tap((res) => {
        if (res.token && res.user) {
          this.setSession(res.token, res.user, res.refresh_token, res.expires_in_hours);
        }
      })
    );
  }

  logout() {
    const token = this.getToken();
    if (token) {
      this.http.post(`${API}/logout`, {}).subscribe({ error: () => {} });
    }
    this._stopSessionTimer();
    this._clearStorage();
    this._sessionWarning.next(null);
    this._requireReauth.next(false);
    this.router.navigate(['/login']);
  }

  forgotPassword(payload: any): Observable<any> {
    return this.postAuth('/forgot-password', payload);
  }

  verifyOtp(payload: any): Observable<any> {
    return this.postAuth('/verify-otp', payload);
  }

  resetPassword(payload: any): Observable<any> {
    return this.postAuth('/reset-password', payload);
  }

  verifyEmailOtp(payload: any): Observable<any> {
    return this.postAuth('/verify-email-otp', payload);
  }

  resendVerification(payload: any): Observable<any> {
    return this.postAuth('/resend-verification', payload);
  }

  verifyEmailByLink(token: string): Observable<any> {
    return this.http.get<any>(`${API}/verify-email`, { params: { token } });
  }

  getEmailStatus(): Observable<{ email_enabled: boolean }> {
    return this.http.get<{ email_enabled: boolean }>(`${API}/email-status`);
  }

  refreshAccessToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    const userId = this.getUserId();
    return this.http.post<any>(`${API}/refresh`, { refresh_token: refreshToken, user_id: userId });
  }

  dismissSessionWarning() {
    this._sessionWarning.next(null);
  }

  forceReauth() {
    this._requireReauth.next(true);
    this._clearStorage();
  }
}
