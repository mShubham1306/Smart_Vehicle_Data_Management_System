import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

const API = environment.apiUrl;

// Fixed canonical fields — mirrors backend FIXED_FIELDS
export const FIXED_FIELDS = [
  'Sr. No.',
  'Vehicle',
  'engineNum',
  'chassisNum',
  'ownerName',
  'ownerAddress',
  'vehicleMake',
  'vehicleModel',
  'vehicleClass',
  'fuelType',
  'saleAmount',
  'ownerMobileNo',
  'vehicleManufacturerName',
  'model',
  'vehicleInsuranceCompanyName',
  'expiredInsuranceUpto',
  'vehicleInsurancePolicyNumber',
];

export interface SheetInfo {
  name: string;
  vehicle_count: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private _schema = new BehaviorSubject<{columns: string[], vehicle_col: string | null}>({
    columns: FIXED_FIELDS,
    vehicle_col: 'Vehicle'
  });
  private _activeSheet = new BehaviorSubject<string>('default');
  private _sheets = new BehaviorSubject<SheetInfo[]>([{ name: 'default', vehicle_count: 0 }]);

  schema$ = this._schema.asObservable();
  activeSheet$ = this._activeSheet.asObservable();
  sheets$ = this._sheets.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    this._schema.next({ columns: FIXED_FIELDS, vehicle_col: 'Vehicle' });
    // Register this service with AuthService so it can trigger refresh after login
    this.authService.setDataService(this);
    // Only load data if a token already exists (returning user with valid session)
    if (this._hasToken()) {
      this.loadSchema();
      this.loadSheets();
    }
  }

  /** Call this after login/register to reload all user data with the fresh token */
  refresh() {
    this.loadSchema();
    this.loadSheets();
  }

  private _hasToken(): boolean {
    try {
      return !!localStorage.getItem('smartinsure_token');
    } catch {
      return false;
    }
  }

  get activeSheet(): string {
    return this._activeSheet.getValue();
  }

  setActiveSheet(name: string) {
    this._activeSheet.next(name);
  }

  loadSchema() {
    this.http.get<any>(`${API}/schema`).pipe(
      catchError(() => of({ columns: FIXED_FIELDS, vehicle_col: 'Vehicle' }))
    ).subscribe(s => this._schema.next(s));
  }

  loadSheets(): Observable<any> {
    const obs = this.http.get<any>(`${API}/sheets`).pipe(
      catchError(() => of({ sheets: [] }))
    );
    obs.subscribe({
      next: (res) => this._sheets.next(res.sheets || []),
      error: () => {}
    });
    return obs;
  }

  createSheet(name: string): Observable<any> {
    return this.http.post<any>(`${API}/sheets`, { name }).pipe(
      tap(() => this.loadSheets())
    );
  }

  deleteSheet(name: string): Observable<any> {
    return this.http.delete<any>(`${API}/sheets/${encodeURIComponent(name)}`).pipe(
      tap(() => {
        if (this.activeSheet === name) this.setActiveSheet('default');
        this.loadSheets();
      })
    );
  }

  uploadFile(file: File, sheetName?: string): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    form.append('sheet_name', sheetName ?? this.activeSheet);
    return this.http.post<any>(`${API}/upload`, form).pipe(
      tap(() => {
        this._schema.next({ columns: FIXED_FIELDS, vehicle_col: 'Vehicle' });
        this.loadSheets();
      })
    );
  }

  searchVehicle(vn: string): Observable<any> {
    // Global search — no sheet filter, backend searches all sheets
    return this.http.get<any>(`${API}/search/${encodeURIComponent(vn)}`);
  }

  getVehicle(vn: string, sheet?: string): Observable<any> {
    const s = sheet ?? this.activeSheet;
    return this.http.get<any>(`${API}/vehicles/${encodeURIComponent(vn)}?sheet=${encodeURIComponent(s)}`);
  }

  getVehiclesList(sheet?: string, page: number = 1, limit: number = 50): Observable<any> {
    const s = encodeURIComponent(sheet ?? this.activeSheet);
    return this.http.get<any>(`${API}/vehicles?sheet=${s}&page=${page}&limit=${limit}`);
  }

  getDashboardStats(sheet?: string): Observable<any> {
    const s = encodeURIComponent(sheet ?? this.activeSheet);
    return this.http.get<any>(`${API}/dashboard/stats?sheet=${s}`);
  }

  saveVehicle(payload: any): Observable<any> {
    return this.http.post<any>(`${API}/vehicles`, {
      ...payload,
      sheet_name: payload.sheet_name ?? this.activeSheet
    }).pipe(tap(() => this.loadSheets()));
  }

  exportUrl(sheet?: string): string {
    const s = encodeURIComponent(sheet ?? this.activeSheet);
    return `${API}/export?sheet=${s}`;
  }

  /** Returns the actual column names stored in a sheet (scans real records) */
  getSheetColumns(sheet?: string): Observable<any> {
    const s = encodeURIComponent(sheet ?? this.activeSheet);
    return this.http.get<any>(`${API}/sheets/${s}/columns`).pipe(
      catchError(() => of({ columns: FIXED_FIELDS }))
    );
  }

  /** Promote current user account to admin (requires password confirmation) */
  promoteToAdmin(password: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/promote-admin`, { password });
  }
}
