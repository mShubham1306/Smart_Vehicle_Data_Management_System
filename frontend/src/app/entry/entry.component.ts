import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService, FIXED_FIELDS, SheetInfo } from '../data.service';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';

const FIELD_CONFIG: Record<string, {label:string; placeholder:string}> = {
  'Sr. No.':                      {label:'Sr. No.',                   placeholder:'1, 2, 3…'},
  'Vehicle':                      {label:'Vehicle Number',            placeholder:'e.g. MH12AB1234'},
  'engineNum':                    {label:'Engine Number',             placeholder:'Engine serial number'},
  'chassisNum':                   {label:'Chassis Number',            placeholder:'Chassis serial number'},
  'ownerName':                    {label:'Owner Name',                placeholder:'Full name of owner'},
  'ownerAddress':                 {label:'Owner Address',             placeholder:'Full address'},
  'vehicleMake':                  {label:'Vehicle Make',              placeholder:'e.g. Maruti, Hyundai'},
  'vehicleModel':                 {label:'Vehicle Model',             placeholder:'e.g. Swift, i20'},
  'vehicleClass':                 {label:'Vehicle Class',             placeholder:'e.g. Private Car'},
  'fuelType':                     {label:'Fuel Type',                 placeholder:'e.g. Petrol, Diesel'},
  'saleAmount':                   {label:'Total Premium',             placeholder:'e.g. 995'},
  'ownerMobileNo':                {label:'Owner Mobile No.',          placeholder:'10-digit mobile'},
  'vehicleManufacturerName':      {label:'Manufacturer Name',         placeholder:'e.g. Hero MotoCorp Ltd'},
  'model':                        {label:'Model',                     placeholder:'Model variant'},
  'vehicleInsuranceCompanyName':  {label:'Insurance Company',         placeholder:'e.g. ICICI Lombard'},
  'expiredInsuranceUpto':         {label:'Due Date (Insurance Expiry)', placeholder:'DD/MM/YYYY'},
  'vehicleInsurancePolicyNumber': {label:'Policy Number',             placeholder:'Insurance policy number'},
};

@Component({
  selector: 'app-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div style="font-family:'Inter',sans-serif">

      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Data Entry</h1>
        <p class="text-sm text-textGray mt-1">
          <span *ngIf="isAdmin">Add or update vehicle records. Select a sheet to target.</span>
          <span *ngIf="!isAdmin">Enter vehicle records into your assigned sheet:
            <strong class="text-primary ml-1">{{ activeSheet }}</strong>
          </span>
        </p>
      </div>

      <!-- ══ SHEET SELECTOR (Admin only) ══ -->
      <div *ngIf="isAdmin" class="rounded-2xl mb-6 overflow-hidden" style="background:#141414; border:1px solid #262626">
        <!-- Header row -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
          style="border-bottom:1px solid #262626">
          <div class="flex items-center gap-2">
            <span class="text-lg">📋</span>
            <div>
              <p class="text-xs font-bold text-textLight">Active Sheet</p>
              <p class="text-[10px] text-textGray">Data saves to the selected sheet below</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div *ngIf="showNewSheet" class="flex items-center gap-2">
              <input type="text" [(ngModel)]="newSheetName" (keyup.enter)="createSheet()"
                placeholder="Sheet name…"
                class="input-field px-3 py-2 text-sm w-36 sm:w-44"
                style="height:36px">
              <button (click)="createSheet()" [disabled]="creatingSheet"
                class="btn-red px-4 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-50"
                style="height:36px">
                <span *ngIf="!creatingSheet">✓ Create</span>
                <span *ngIf="creatingSheet" class="flex items-center gap-1">
                  <span class="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                </span>
              </button>
              <button (click)="cancelNewSheet()" class="px-3 py-2 text-xs text-textGray hover:text-textLight transition-colors" style="height:36px">✕</button>
            </div>
            <button *ngIf="!showNewSheet" (click)="showNewSheet=true"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-textGray hover:text-textLight transition-all"
              style="background:rgba(255,255,255,0.04); border:1px solid #333; height:36px">
              <span class="text-sm leading-none">+</span> New Sheet
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 px-4 py-3 overflow-x-auto" style="scrollbar-width:none">
          <button *ngFor="let sh of sheets"
            (click)="selectSheet(sh.name)"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            [style.background]="activeSheet === sh.name ? '#EF4444' : 'rgba(255,255,255,0.04)'"
            [style.color]="activeSheet === sh.name ? '#fff' : '#A1A1AA'"
            [style.border]="activeSheet === sh.name ? '1px solid rgba(239,68,68,0.4)' : '1px solid #282828'"
            [style.box-shadow]="activeSheet === sh.name ? '0 0 12px rgba(239,68,68,0.25)' : 'none'">
            <span>{{ sh.name === 'default' ? '📂' : '📄' }}</span>
            <span>{{ sh.name === 'default' ? 'Default' : sh.name }}</span>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              [style.background]="activeSheet === sh.name ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'"
              [style.color]="activeSheet === sh.name ? '#fff' : '#71717A'">
              {{ sh.vehicle_count }}
            </span>
          </button>
          <div *ngIf="!sheets.length" class="text-xs text-textGray px-2">Loading sheets…</div>
        </div>

        <div *ngIf="sheetError" class="px-5 pb-3 text-xs font-semibold" style="color:#EF4444">
          ⚠️ {{ sheetError }}
        </div>
      </div>

      <!-- ══ WORKER Sheet Badge ══ -->
      <div *ngIf="!isAdmin" class="rounded-2xl mb-6 p-4" style="background:#141414; border:1px solid #262626">
        <div class="flex items-center gap-3">
          <span class="text-xl">📋</span>
          <div>
            <p class="text-xs text-textGray">You are entering data into:</p>
            <p class="text-sm font-bold" style="color:#60a5fa">{{ activeSheet }}</p>
          </div>
          <span class="ml-auto text-[10px] px-2.5 py-1 rounded-full font-semibold"
            style="background:rgba(59,130,246,0.1); color:#60a5fa; border:1px solid rgba(59,130,246,0.25)">
            🔒 Assigned Sheet
          </span>
        </div>
      </div>

      <!-- Lookup Strip -->
      <div class="rounded-2xl p-5 mb-6" style="background:#141414; border:1px solid #262626">
        <p class="text-[10px] text-textGray uppercase tracking-wider font-semibold mb-3">
          Vehicle Lookup &amp; Prefill
          <span class="ml-2 px-2 py-0.5 rounded text-[9px] font-bold normal-case tracking-normal"
            style="background:rgba(239,68,68,0.1); color:#EF4444; border:1px solid rgba(239,68,68,0.2)">
            Sheet: {{ activeSheet === 'default' ? 'Default' : activeSheet }}
          </span>
        </p>
        <div class="flex flex-col sm:flex-row gap-3">
          <input type="text" [(ngModel)]="lookupQuery" (keyup.enter)="lookup()"
            placeholder="Enter vehicle number to prefill form…"
            class="input-field flex-1 px-4 py-3 font-mono uppercase tracking-widest text-sm placeholder:normal-case placeholder:font-sans placeholder:tracking-normal">
          <button (click)="lookup()" [disabled]="lookupLoading" class="btn-red px-6 py-3 text-sm whitespace-nowrap disabled:opacity-50">
            <span *ngIf="!lookupLoading">🔍 Lookup &amp; Fill</span>
            <span *ngIf="lookupLoading" class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>Loading…
            </span>
          </button>
          <button (click)="resetForm()" class="px-5 py-3 rounded-xl text-sm font-medium text-textGray hover:text-textLight transition-colors whitespace-nowrap"
            style="background:rgba(255,255,255,0.04); border:1px solid #262626">Clear</button>
        </div>
        <div *ngIf="lookupFound" class="mt-3 flex items-center gap-2 text-xs" style="color:#EF4444">
          <span class="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[9px]">✓</span>
          Record found — form prefilled. Edit and save to update.
        </div>
        <div *ngIf="lookupNotFound" class="mt-3 flex items-center gap-2 text-xs text-textGray">
          <span>⚠️</span> Vehicle not found — form ready to create a new record.
        </div>
      </div>

      <!-- Grid: Form + Sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Form -->
        <div class="lg:col-span-2 rounded-2xl p-6 sm:p-8" style="background:#141414; border:1px solid #262626">
          <div class="flex items-center gap-2 mb-5 pb-4" style="border-bottom:1px solid #262626">
            <span class="text-xs text-textGray">Saving to sheet:</span>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold"
              style="background:rgba(239,68,68,0.1); color:#EF4444; border:1px solid rgba(239,68,68,0.25)">
              {{ activeSheet === 'default' ? '📂 Default' : '📄 ' + activeSheet }}
            </span>
          </div>

          <form (ngSubmit)="submit()">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div *ngFor="let field of fields" [class.sm:col-span-2]="field === 'ownerAddress'">
                <label class="flex items-center gap-2 text-[10px] text-textGray uppercase tracking-wider mb-2 font-semibold">
                  {{ getLabel(field) }}
                  <span *ngIf="field === 'Vehicle'" class="px-1.5 py-0.5 rounded text-[9px] font-bold normal-case tracking-normal"
                    style="background:rgba(239,68,68,0.15); color:#EF4444; border:1px solid rgba(239,68,68,0.3)">🚗 required</span>
                </label>
                <textarea *ngIf="field === 'ownerAddress'"
                  [(ngModel)]="formValues[field]" [name]="'f_'+field" rows="2"
                  [placeholder]="getPlaceholder(field)"
                  class="input-field w-full px-4 py-3 text-sm resize-none"></textarea>
                <input *ngIf="field !== 'ownerAddress'"
                  type="text" [(ngModel)]="formValues[field]" [name]="'f_'+field"
                  [required]="field === 'Vehicle'" [placeholder]="getPlaceholder(field)"
                  [class.font-mono]="field === 'Vehicle'" [class.uppercase]="field === 'Vehicle'"
                  [class.tracking-widest]="field === 'Vehicle'"
                  class="input-field w-full px-4 py-3 text-sm">
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 mt-10 pt-6" style="border-top:1px solid #262626">
              <button type="submit" [disabled]="submitting" class="btn-red px-10 py-3 text-sm disabled:opacity-50 flex-1 sm:flex-none">
                <span class="flex items-center justify-center gap-2">
                  <span *ngIf="submitting" class="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                  {{ submitting ? 'Saving…' : '💾 Save Record' }}
                </span>
              </button>
              <button type="button" (click)="resetForm()" class="px-8 py-3 rounded-xl font-medium text-sm text-textGray hover:text-textLight transition-colors flex-1 sm:flex-none"
                style="background:rgba(255,255,255,0.04); border:1px solid #262626">Clear Form</button>
            </div>
          </form>

          <div *ngIf="successMsg" class="mt-5 p-4 rounded-xl flex items-center gap-3"
            style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2)">
            <span class="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</span>
            <p class="text-sm font-semibold text-primary">{{ successMsg }}</p>
          </div>
          <div *ngIf="errorMsg" class="mt-5 p-4 rounded-xl flex items-center gap-3"
            style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15)">
            <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
              style="background:rgba(239,68,68,0.1); color:#EF4444">!</span>
            <p class="text-sm font-semibold" style="color:#EF4444">{{ errorMsg }}</p>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-5">
          <!-- Fields List -->
          <div class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
            <h3 class="text-sm font-bold text-textLight mb-4 flex items-center gap-2">
              📋 Form Fields
              <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style="background:rgba(239,68,68,0.1); color:#EF4444">{{ fields.length }}</span>
            </h3>
            <div class="space-y-1 max-h-[260px] overflow-y-auto">
              <div *ngFor="let f of fields" class="flex items-center justify-between py-2" style="border-bottom:1px solid rgba(255,255,255,0.03)">
                <span class="text-xs text-textGray truncate">{{ getLabel(f) }}</span>
                <div class="flex items-center gap-2 ml-2 flex-shrink-0">
                  <span *ngIf="f === 'Vehicle'" class="text-xs text-primary">🚗</span>
                  <span *ngIf="formValues[f]" class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Export (admin only) -->
          <div *ngIf="isAdmin" class="rounded-2xl p-6 relative overflow-hidden" style="background:#141414; border:1px solid #262626">
            <div class="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
              style="background:rgba(239,68,68,0.06); filter:blur(20px)"></div>
            <div class="relative z-10">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2)">📤</div>
              <h3 class="text-sm font-bold text-textLight mb-1">Export Sheet</h3>
              <p class="text-[11px] text-textGray mb-1 leading-relaxed">Download all records from:</p>
              <p class="text-xs font-bold mb-4" style="color:#EF4444">
                {{ activeSheet === 'default' ? '📂 Default' : '📄 ' + activeSheet }}
              </p>
              <a [href]="currentExportUrl" target="_blank"
                class="btn-red flex items-center justify-center gap-2 w-full py-3 text-sm">
                ⬇️ Export Excel
              </a>
            </div>
          </div>

          <!-- All Sheets summary (admin only) -->
          <div *ngIf="isAdmin" class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
            <h3 class="text-sm font-bold text-textLight mb-4">🗂️ All Sheets</h3>
            <div class="space-y-2">
              <div *ngFor="let sh of sheets"
                class="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-all"
                [style.background]="activeSheet === sh.name ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)'"
                [style.border]="activeSheet === sh.name ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent'"
                (click)="selectSheet(sh.name)">
                <span class="text-xs text-textGray truncate">
                  {{ sh.name === 'default' ? '📂 Default' : '📄 ' + sh.name }}
                </span>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="text-[10px] text-textGray">{{ sh.vehicle_count }} records</span>
                  <span *ngIf="sh.name !== 'default'" (click)="$event.stopPropagation(); deleteSheet(sh.name)"
                    class="text-[10px] px-1.5 py-0.5 rounded cursor-pointer hover:text-red-400 transition-colors text-textGray"
                    title="Delete sheet">🗑️</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class EntryComponent implements OnInit, OnDestroy {
  fields = FIXED_FIELDS;
  formValues: Record<string,string> = {};
  submitting = false; successMsg = ''; errorMsg = '';
  lookupQuery = ''; lookupLoading = false; lookupFound = false; lookupNotFound = false;

  sheets: SheetInfo[] = [];
  activeSheet = 'default';
  showNewSheet = false;
  newSheetName = '';
  creatingSheet = false;
  sheetError = '';
  currentExportUrl = '';
  isAdmin = false;

  private subs = new Subscription();

  constructor(private ds: DataService, private authService: AuthService) {}

  ngOnInit() {
    this.resetForm();
    this.isAdmin = this.authService.isAdmin();

    if (this.isAdmin) {
      this.subs.add(this.ds.sheets$.subscribe(sheets => { this.sheets = sheets; }));
      this.subs.add(this.ds.activeSheet$.subscribe(sheet => {
        this.activeSheet = sheet;
        this.currentExportUrl = this.ds.exportUrl(sheet);
      }));
      this.ds.loadSheets();
    } else {
      // Workers use their assigned sheet, locked
      this.activeSheet = this.authService.getAssignedSheet();
      this.currentExportUrl = '';
      this.ds.setActiveSheet(this.activeSheet);
    }
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  selectSheet(name: string) {
    if (!this.isAdmin) return;
    this.ds.setActiveSheet(name);
    this.sheetError = ''; this.successMsg = ''; this.errorMsg = '';
  }

  createSheet() {
    const name = this.newSheetName.trim();
    if (!name) { this.sheetError = 'Please enter a sheet name.'; return; }
    this.creatingSheet = true; this.sheetError = '';
    this.ds.createSheet(name).subscribe({
      next: () => { this.creatingSheet = false; this.ds.setActiveSheet(name); this.cancelNewSheet(); },
      error: (err) => { this.creatingSheet = false; this.sheetError = err.error?.detail || 'Failed to create sheet.'; }
    });
  }

  cancelNewSheet() { this.showNewSheet = false; this.newSheetName = ''; this.sheetError = ''; }

  deleteSheet(name: string) {
    if (!confirm(`Delete sheet "${name}" and ALL its vehicle records? This cannot be undone.`)) return;
    this.ds.deleteSheet(name).subscribe({
      error: (err) => this.sheetError = err.error?.detail || 'Failed to delete sheet.'
    });
  }

  getLabel(f: string) { return FIELD_CONFIG[f]?.label ?? f; }
  getPlaceholder(f: string) { return FIELD_CONFIG[f]?.placeholder ?? 'Enter value…'; }

  lookup() {
    const q = this.lookupQuery.trim(); if (!q) return;
    this.lookupLoading = true; this.lookupFound = false; this.lookupNotFound = false;
    this.ds.getVehicle(q).subscribe({
      next: res => {
        this.lookupLoading = false;
        if (res?.data) {
          this.lookupFound = true;
          FIXED_FIELDS.forEach(f => this.formValues[f] = res.data[f] ?? '');
          this.formValues['Vehicle'] = res.vehicle_number || this.formValues['Vehicle'];
        }
      },
      error: () => {
        this.lookupLoading = false; this.lookupNotFound = true;
        this.formValues['Vehicle'] = this.lookupQuery.replace(/ /g,'').toUpperCase();
      }
    });
  }

  submit() {
    const vn = (this.formValues['Vehicle']||'').replace(/ /g,'').toUpperCase().trim();
    if (!vn) { this.errorMsg = 'Vehicle Number is required.'; return; }
    this.submitting = true; this.successMsg = ''; this.errorMsg = '';
    const sheet = this.isAdmin ? this.activeSheet : this.authService.getAssignedSheet();
    this.ds.saveVehicle({ vehicle_number: vn, data: {...this.formValues}, sheet_name: sheet }).subscribe({
      next: () => {
        this.successMsg = `Vehicle ${vn} saved to sheet "${sheet}" successfully!`;
        this.submitting = false; this.lookupFound = false;
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: err => { this.errorMsg = err.error?.detail || 'Save failed.'; this.submitting = false; }
    });
  }

  resetForm() {
    this.formValues = {};
    FIXED_FIELDS.forEach(f => this.formValues[f] = '');
    this.successMsg = ''; this.errorMsg = '';
    this.lookupFound = false; this.lookupNotFound = false; this.lookupQuery = '';
  }
}
