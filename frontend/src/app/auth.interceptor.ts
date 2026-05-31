import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError, BehaviorSubject, Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';

// Prevent multiple simultaneous refresh calls
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const addAuth = (r: typeof req, token: string) =>
    r.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const token = authService.getToken();
  const authReq = token && req.url.includes('/api/') ? addAuth(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Skip auth refresh endpoints to avoid infinite loops
      const isAuthEndpoint = req.url.includes('/auth/login')
        || req.url.includes('/auth/refresh')
        || req.url.includes('/auth/register');

      if (error.status === 401 && !isAuthEndpoint) {
        return _handle401(req, next, authService, router);
      }

      // Account locked — specific handling
      if (error.status === 423) {
        return throwError(() => error);
      }

      return throwError(() => error);
    })
  );
};

function _handle401(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<any> {
  authService.forceReauth();
  return throwError(() => new HttpErrorResponse({ status: 401 }));
}
