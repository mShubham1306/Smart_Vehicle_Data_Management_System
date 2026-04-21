import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { DataService, SheetInfo } from '../data.service';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

/** Human-readable labels for well-known field names */
const KNOWN_LABELS: Record<string, string> = {
  'Sr. No.': 'Sr. No.', 'Vehicle': 'Vehicle Number', 'engineNum': 'Engine Number',
  'chassisNum': 'Chassis Number', 'ownerName': 'Owner Name', 'ownerAddress': 'Owner Address',
  'vehicleMake': 'Vehicle Make', 'vehicleModel': 'Vehicle Model', 'vehicleClass': 'Vehicle Class',
  'fuelType': 'Fuel Type', 'saleAmount': 'Total Premium (₹)', 'ownerMobileNo': 'Mobile No.',
  'vehicleManufacturerName': 'Manufacturer', 'model': 'Model Variant',
  'vehicleInsuranceCompanyName': 'Insurance Company', 'expiredInsuranceUpto': 'Due Date',
  'vehicleInsurancePolicyNumber': 'Policy Number',
};

function labelFor(key: string): string {
  return KNOWN_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

@Component({
  selector: 'app-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  styles: [`
    :host { display:block; }
    .field-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
    .field-card { background:#0c0c0c; border:1px solid #262626; border-radius:12px; padding:14px 16px; }
    .field-card label { display:block; font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#555; margin-bottom:6px; }
    .field-card input, .field-card textarea, .field-card select {
      width:100%; background:#111; border:1px solid #2a2a2a; border-radius:8px; color:#f0f0f0;
      padding:10px 12px; font-size:0.82rem; outline:none; transition:border-color 0.2s;
      box-sizing:border-box; font-family:'Inter',sans-serif; resize:vertical;
    }
    .field-card input:focus, .field-card textarea:focus { border-color:#ef4444; }
    .btn-save { background:linear-gradient(135deg,#ef4444,#b91c1c); color:#fff; border:none; border-radius:12px; padding:13px 36px; font-size:0.88rem; font-weight:800; cursor:pointer; transition:all 0.2s; font-family:'Inter',sans-serif; }
    .btn-save:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(239,68,68,0.4); }
    .btn-save:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-export { background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; border:none; border-radius:12px; padding:13px 28px; font-size:0.88rem; font-weight:800; cursor:pointer; transition:all 0.2s; font-family:'Inter',sans-serif; }
    .btn-export:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(22,163,74,0.4); }
    .success { background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.2); border-radius:10px; padding:12px 16px; color:#22c55e; font-size:0.8rem; font-weight:600; }
    .errmsg { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; color:#ef4444; font-size:0.8rem; font-weight:600; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block; }
  `],
  template: `
    <div style="font-family:'Inter',sans-serif">

      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Data Entry</h1>
        <p class="text-sm text-textGray mt-1">
          <span *ngIf="isAdmin">Select a sheet — form fields auto-match the sheet's columns.</span>
          <span *ngIf="!isAdmin">Entering data into your assigned sheet: <strong class="text-primary ml-1">{{ activeSheet }}</strong></span>
        </p>
      </div>

      <!-- Sheet Selector (Admin only) -->
      <div *ngIf="isAdmin" class="rounded-2xl mb-6 overflow-hidden" style="background:#141414; border:1px solid #262626">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4" style="border-bottom:1px solid #262626">
          <div class="flex items-center gap-2">
            <span class="text-lg">📋</span>
            <div>
              <p class="text-xs font-bold text-textLight">Active Sheet</p>
              <p class="text-[10px] text-textGray">Form fields will match this sheet's columns</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div *ngIf="showNewSheet" class="flex items-center gap-2">
              <input type="text" [(ngModel)]="newSheetName" (keyup.enter)="createSheet()"
                placeholder="Sheet name…" class="input-field px-3 py-2 text-sm w-36 sm:w-44" style="height:36px">
              <button (click)="createSheet()" [disabled]="creatingSheet" class="btn-red px-4 py-2 text-xs font-bold disabled:opacity-50" style="height:36px">
                <span *ngIf="!creatingSheet">✓ Create</span>
                <span *ngIf="creatingSheet" class="spin"></span>
              </button>
              <button (click)="cancelNewSheet()" class="px-3 py-2 text-xs text-textGray hover:text-textLight" style="height:36px">✕</button>
            </div>
            <button *ngIf="!showNewSheet" (click)="showNewSheet=true"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-textGray hover:text-textLight transition-all"
              style="background:rgba(255,255,255,0.04); border:1px solid #333; height:36px">
              <span class="text-sm leading-none">+</span> New Sheet
            </button>
          </div>
        </div>
        <!-- Sheet tabs -->
        <div class="flex flex-wrap gap-2 p-4">
          <button *ngFor="let s of sheets"
            (click)="selectSheet(s.name)"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            [style.background]="activeSheet===s.name ? '#ef4444' : 'rgba(255,255,255,0.04)'"
            [style.color]="activeSheet===s.name ? '#fff' : '#A1A1AA'"
            [style.border]="activeSheet===s.name ? '1px solid rgba(239,68,68,0.4)' : '1px solid #262626'">
            {{ s.name }}
            <span class="ml-1 opacity-60">({{ s.vehicle_count }})</span>
          </button>
        </div>
      </div>

      <!-- Loading columns indicator -->
      <div *ngIf="loadingCols" class="flex items-center gap-3 mb-6 p-4 rounded-xl" style="background:#141414;border:1px solid #262626">
        <span class="spin" style="border-top-color:#ef4444"></span>
        <span class="text-sm text-textGray">Loading sheet fields…</span>
      </div>

      <!-- Messages -->
      <div *ngIf="successMsg" class="success mb-5">✅ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="errmsg mb-5">⚠ {{ errorMsg }}</div>

      <!-- Dynamic Form — auto-generated from sheet columns -->
      <div *ngIf="!loadingCols && columns.length" class="rounded-2xl p-5 mb-6" style="background:#141414; border:1px solid #262626">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-sm font-bold text-textLight">New Record — {{ activeSheet }}</h2>
            <p class="text-[10px] text-textGray mt-0.5">{{ columns.length }} fields detected from sheet</p>
          </div>
        </div>

        <div class="field-grid">
          <div *ngFor="let col of columns" class="field-card"
            [style.grid-column]="isWideField(col) ? 'span 2' : 'span 1'">
            <label>{{ getLabel(col) }}</label>
            <textarea *ngIf="isWideField(col)" [(ngModel)]="formData[col]"
              [placeholder]="'Enter ' + getLabel(col)" rows="2"></textarea>
            <input *ngIf="!isWideField(col)" type="text" [(ngModel)]="formData[col]"
              [placeholder]="'Enter ' + getLabel(col)">
          </div>
        </div>

        <div class="flex items-center gap-4 mt-6 flex-wrap">
          <button class="btn-save" (click)="save()" [disabled]="saving">
            <span *ngIf="!saving">💾 Save Record</span>
            <span *ngIf="saving" style="display:flex;align-items:center;gap:8px"><span class="spin"></span> Saving…</span>
          </button>
          <button class="px-6 py-3 rounded-xl text-sm font-semibold text-textGray hover:text-textLight transition-all"
            style="background:rgba(255,255,255,0.04); border:1px solid #333" (click)="reset()">
            ↺ Clear Form
          </button>
          <button class="btn-export" (click)="exportExcel()">
            📊 Export Sheet to Excel
          </button>
        </div>
      </div>

      <!-- Empty sheet message -->
      <div *ngIf="!loadingCols && !columns.length" class="flex flex-col items-center py-20 text-center">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4" style="background:#141414; border:1px solid #262626">📭</div>
        <p class="text-base font-bold text-textLight mb-1">No columns found in this sheet</p>
        <p class="text-sm text-textGray max-w-xs">Upload a spreadsheet first to define the columns for this sheet.</p>
      </div>

    </div>
  `
})
export class EntryComponent implements OnInit, OnDestroy {
  columns: string[] = [];
  formData: Record<string, string> = {};
  sheets: SheetInfo[] = [];
  activeSheet = 'default';
  isAdmin = false;
  saving = false;
  successMsg = '';
  errorMsg = '';
  loadingCols = false;
  showNewSheet = false;
  newSheetName = '';
  creatingSheet = false;

  private subs = new Subscription();

  constructor(
    private ds: DataService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.subs.add(this.authService.currentUser$.subscribe(() => {
      this.isAdmin = this.authService.isAdmin();
    }));

    // Load sheets list
    this.subs.add(this.ds.sheets$.subscribe(s => {
      this.sheets = s;
    }));

    // Follow active sheet
    this.subs.add(this.ds.activeSheet$.subscribe(sh => {
      this.activeSheet = sh;
      this.loadColumns(sh);
    }));

    // Workers: lock to assigned sheet
    if (!this.isAdmin) {
      const assignedSheet = this.authService.getAssignedSheet();
      this.ds.setActiveSheet(assignedSheet);
    }

    this.ds.loadSheets();
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  selectSheet(name: string) {
    this.ds.setActiveSheet(name);
    // loadColumns will be called via activeSheet$ subscription
  }

  loadColumns(sheet: string) {
    this.loadingCols = true;
    this.columns = [];
    this.formData = {};
    this.ds.getSheetColumns(sheet).subscribe({
      next: (res: any) => {
        this.columns = res.columns || [];
        this.resetFormData();
        this.loadingCols = false;
      },
      error: () => {
        this.loadingCols = false;
      }
    });
  }

  resetFormData() {
    this.formData = {};
    for (const col of this.columns) {
      this.formData[col] = '';
    }
  }

  getLabel(key: string): string { return KNOWN_LABELS[key] ?? labelFor(key); }
  isWideField(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('address') || k.includes('addr') || k.includes('note') || k.includes('remark');
  }

  save() {
    const vehicleKey = this.columns.find(c => c === 'Vehicle' || c.toLowerCase().includes('vehicle'));
    const vehicleNo = vehicleKey ? this.formData[vehicleKey] : '';
    if (!vehicleNo) {
      this.errorMsg = 'Vehicle number is required.'; this.successMsg = '';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }
    this.saving = true; this.errorMsg = ''; this.successMsg = '';
    const payload = {
      vehicle_number: vehicleNo,
      sheet_name: this.activeSheet,
      data: { ...this.formData }
    };
    this.ds.saveVehicle(payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = `✅ Record saved to sheet "${this.activeSheet}"`;
        setTimeout(() => this.successMsg = '', 4000);
        this.resetFormData();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMsg = err.error?.detail || 'Failed to save record.';
        setTimeout(() => this.errorMsg = '', 5000);
      }
    });
  }

  reset() { this.resetFormData(); this.successMsg = ''; this.errorMsg = ''; }

  exportExcel() {
    const token = this.authService.getToken();
    const url = this.ds.exportUrl(this.activeSheet);
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    this.http.get(url, { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `${this.activeSheet}_export_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: () => {
        this.errorMsg = 'Export failed. Please try again.';
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  createSheet() {
    if (!this.newSheetName.trim()) return;
    this.creatingSheet = true;
    this.ds.createSheet(this.newSheetName.trim()).subscribe({
      next: () => {
        this.creatingSheet = false;
        this.showNewSheet = false;
        this.newSheetName = '';
        this.ds.loadSheets();
      },
      error: () => { this.creatingSheet = false; }
    });
  }

  cancelNewSheet() { this.showNewSheet = false; this.newSheetName = ''; }
}
