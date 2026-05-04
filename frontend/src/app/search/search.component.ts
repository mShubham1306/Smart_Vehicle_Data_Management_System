import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService } from '../data.service';
import { InsuranceDocComponent } from '../insurance-doc/insurance-doc.component';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, InsuranceDocComponent],
  styles: [`
    :host { display:block; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block;flex-shrink:0; }
    .btn-dl { display:inline-flex;align-items:center;gap:10px;padding:13px 36px;background:linear-gradient(135deg,#1565c0,#0d47a1);color:#fff;font-size:0.9rem;font-weight:800;border:none;border-radius:12px;cursor:pointer;box-shadow:0 6px 20px rgba(21,101,192,0.45);transition:all 0.2s;font-family:'Inter',sans-serif;letter-spacing:0.3px; }
    .btn-dl:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 10px 28px rgba(21,101,192,0.55); }
    .btn-dl:disabled { opacity:0.55;cursor:not-allowed; }
    .field-card { background:#0c0c0c; border:1px solid #222; border-radius:12px; padding:14px 16px; transition:border-color 0.2s; }
    .field-card:hover { border-color:#333; }
    .field-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.9px; color:#555; margin-bottom:5px; }
    .field-value { font-size:0.82rem; font-weight:600; color:#e8e8e8; word-break:break-word; line-height:1.4; }
    .field-value.empty { color:#333; font-style:italic; }
    .badge-veh { background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:2px 8px; font-size:0.6rem; font-weight:800; letter-spacing:0.5px; display:inline-block; margin-left:6px; vertical-align:middle; }
    .sheet-badge { background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.25); border-radius:20px; padding:3px 10px; font-size:0.65rem; font-weight:700; display:inline-flex; align-items:center; gap:4px; }
    .fuzzy-banner { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:10px 16px; display:flex; align-items:center; gap:10px; margin-bottom:16px; }
    .fuzzy-banner p { font-size:0.78rem; font-weight:600; color:#f59e0b; }
  `],
  template: `
    <div style="font-family:'Inter',sans-serif">
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Search Vehicle</h1>
        <p class="text-sm text-textGray mt-1">Enter any vehicle plate number — searches across all your sheets automatically.</p>
      </div>

      <!-- Search Bar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl" style="background:#141414; border:1px solid #262626">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-4 flex items-center text-textGray pointer-events-none text-sm">🔍</span>
          <input type="text" [(ngModel)]="query" (keyup.enter)="search()"
            placeholder="e.g. GJ06RC1934 or MH12AB1234"
            class="input-field w-full pl-10 pr-4 py-3 font-mono uppercase tracking-widest text-sm placeholder:normal-case placeholder:font-sans placeholder:tracking-normal">
        </div>
        <button (click)="search()" [disabled]="loading" class="btn-red px-8 py-3 text-sm disabled:opacity-50 whitespace-nowrap">
          {{ loading ? 'Searching…' : 'Search' }}
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex items-center justify-center py-20">
        <div class="w-10 h-10 rounded-full border-2 animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
      </div>

      <!-- Error -->
      <div *ngIf="error && !loading" class="p-5 rounded-2xl flex items-start gap-4 mb-6"
        style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2)">
        <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style="background:rgba(239,68,68,0.1); color:#EF4444">!</div>
        <div>
          <p class="text-sm font-bold text-primary">Not Found</p>
          <p class="text-xs text-textGray mt-0.5">{{ error }}</p>
          <p class="text-[10px] mt-2" style="color:#666">Tip: Make sure the file was uploaded and the sheet contains a vehicle/registration number column.</p>
        </div>
      </div>

      <!-- ✅ RESULT SECTION -->
      <div *ngIf="result && !loading">

        <!-- Fuzzy match warning -->
        <div *ngIf="result.fuzzy_match" class="fuzzy-banner">
          <span style="font-size:1.1rem">⚠️</span>
          <p>Close match returned — original plate searched was not found exactly. Please verify the vehicle number below.</p>
        </div>

        <!-- Result meta row -->
        <div class="flex flex-wrap items-center gap-3 mb-5">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-extrabold font-mono tracking-widest text-textLight">{{ result.vehicle_number }}</span>
            <span class="badge-veh">FOUND</span>
          </div>
          <span class="sheet-badge">📄 {{ result.sheet_name }}</span>
          <span class="text-xs text-textGray">{{ allFields.length }} fields</span>
        </div>

        <!-- ⬇ DOWNLOAD BUTTON -->
        <div style="display:flex;justify-content:center;padding:0 0 20px 0">
          <button class="btn-dl" (click)="downloadPDF()" [disabled]="generating">
            <ng-container *ngIf="!generating">⬇ Download Insurance PDF</ng-container>
            <ng-container *ngIf="generating">
              <span class="spin"></span> Generating PDF…
            </ng-container>
          </button>
        </div>

        <!-- View Toggle -->
        <div class="flex items-center gap-2 mb-5">
          <button (click)="viewMode='document'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            [style.background]="viewMode==='document' ? '#EF4444' : 'rgba(255,255,255,0.05)'"
            [style.color]="viewMode==='document' ? '#fff' : '#A1A1AA'"
            [style.border]="viewMode==='document' ? '1px solid rgba(239,68,68,0.4)' : '1px solid #333'">
            📄 Document View
          </button>
          <button (click)="viewMode='card'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            [style.background]="viewMode==='card' ? '#EF4444' : 'rgba(255,255,255,0.05)'"
            [style.color]="viewMode==='card' ? '#fff' : '#A1A1AA'"
            [style.border]="viewMode==='card' ? '1px solid rgba(239,68,68,0.4)' : '1px solid #333'">
            🗂️ All Fields ({{ allFields.length }})
          </button>
        </div>

        <!-- Document View — the actual insurance paper -->
        <div *ngIf="viewMode==='document'" id="doc-wrapper" style="background:#f5f5f5;padding:12px;border-radius:12px;border:1px solid #ddd">
          <app-insurance-doc
            #docRef
            [data]="result.data"
            [vehicleNumber]="result.vehicle_number">
          </app-insurance-doc>
        </div>

        <!-- ✅ FULLY DYNAMIC Card View — shows ALL actual fields from the stored record -->
        <div *ngIf="viewMode==='card'" class="rounded-2xl overflow-hidden" style="background:#141414; border:1px solid #262626">
          <!-- Header -->
          <div class="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style="background:linear-gradient(135deg,rgba(239,68,68,0.08),transparent); border-bottom:1px solid #262626">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25)">🚗</div>
              <div>
                <p class="text-[10px] text-textGray uppercase tracking-widest font-semibold mb-1">Vehicle Number</p>
                <h2 class="text-2xl font-extrabold font-mono tracking-widest text-textLight">{{ result.vehicle_number }}</h2>
                <p class="text-[10px] text-textGray mt-0.5">Sheet: <span style="color:#a5b4fc">{{ result.sheet_name }}</span></p>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style="background:rgba(239,68,68,0.1); color:#EF4444; border:1px solid rgba(239,68,68,0.2)">
              <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> RECORD FOUND
            </span>
          </div>

          <!-- Dynamic Fields Grid — ALL fields from the actual record -->
          <div class="p-5">
            <div *ngIf="allFields.length === 0" class="text-center py-10 text-textGray text-sm">No fields found in the record.</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <ng-container *ngFor="let field of allFields">
                <div class="field-card"
                  [class.sm:col-span-2]="isWide(field)"
                  [style.border-color]="field === 'Vehicle' ? 'rgba(239,68,68,0.4)' : ''">
                  <div class="flex items-center gap-1 mb-1">
                    <p class="field-label">{{ getLabel(field) }}</p>
                    <span *ngIf="field === 'Vehicle'" style="font-size:0.55rem;background:rgba(239,68,68,0.2);color:#ef4444;padding:1px 5px;border-radius:4px;font-weight:800;letter-spacing:0.5px">KEY</span>
                  </div>
                  <p class="field-value" [class.empty]="!getVal(field)">
                    {{ getVal(field) || '—' }}
                  </p>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!result && !loading && !error" class="flex flex-col items-center py-24 text-center">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-5"
          style="background:#141414; border:1px solid #262626">🔍</div>
        <p class="text-base font-bold text-textLight mb-1">Search for a Vehicle</p>
        <p class="text-sm text-textGray max-w-xs">Enter a plate number above to view the insurance document and all stored fields.</p>
      </div>
    </div>
  `
})
export class SearchComponent implements OnInit, OnDestroy {
  @ViewChild('docRef') docRef!: InsuranceDocComponent;

  query = '';
  result: any = null;
  error = '';
  loading = false;
  generating = false;
  viewMode: 'document' | 'card' = 'document';
  allFields: string[] = [];
  private sub = new Subscription();

  constructor(private ds: DataService, private authService: AuthService) {}

  ngOnInit() {
    this.sub = this.authService.currentUser$.subscribe(() => {});
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  search() {
    const q = this.query.trim();
    if (!q) return;
    this.loading = true; this.error = ''; this.result = null; this.allFields = [];

    this.ds.searchVehicle(q).subscribe({
      next: res => {
        this.result = res;
        this.loading = false;
        this.viewMode = 'document';
        // ✅ Build field list from ALL keys in the actual returned data object
        // This is 100% dynamic — reflects whatever columns are in the stored record
        if (res?.data) {
          // Filter out empty-looking system keys; keep all real data fields
          this.allFields = Object.keys(res.data).filter(k =>
            k && !k.startsWith('Unnamed') && k.toLowerCase() !== 'nan'
          );
        }
      },
      error: err => {
        this.error = err.error?.detail || 'Vehicle not found. Check the plate number and try again.';
        this.loading = false;
      }
    });
  }

  /** Get display value for a field from result.data */
  getVal(field: string): string {
    if (!this.result?.data) return '';
    const v = this.result.data[field];
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    return ['', 'nan', 'none', 'null', 'n/a', 'na', '-'].includes(s.toLowerCase()) ? '' : s;
  }

  /** Human-readable label from any column name format */
  getLabel(key: string): string {
    const LABELS: Record<string, string> = {
      'Sr. No.': 'Sr. No.', 'Vehicle': 'Vehicle Number', 'engineNum': 'Engine Number',
      'chassisNum': 'Chassis Number', 'ownerName': 'Owner Name', 'ownerAddress': 'Owner Address',
      'vehicleMake': 'Vehicle Make', 'vehicleModel': 'Vehicle Model', 'vehicleClass': 'Vehicle Class',
      'fuelType': 'Fuel Type', 'saleAmount': 'Sale / Premium', 'ownerMobileNo': 'Mobile No.',
      'vehicleManufacturerName': 'Manufacturer', 'model': 'Model',
      'vehicleInsuranceCompanyName': 'Insurance Company', 'expiredInsuranceUpto': 'Insurance Expiry',
      'vehicleInsurancePolicyNumber': 'Policy Number', 'basicODPremium': 'Basic OD Premium',
      'zeroDepPremium': 'Zero Dep Premium', 'ncb': 'No Claim Bonus', 'idv': 'IDV',
      'netPremium': 'Net Premium', 'gstAmount': 'GST Amount', 'totalPremium': 'Total Premium',
    };
    if (LABELS[key]) return LABELS[key];
    // Handle ALL_UPPER_CASE, camelCase, snake_case, PascalCase
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  isWide(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('address') || k.includes('addr') || k.includes('note') || k.includes('remark');
  }

  /** Download ONLY the insurance document as PDF — no app chrome */
  async downloadPDF() {
    if (this.generating) return;
    this.generating = true;
    this.viewMode = 'document';
    await new Promise(r => setTimeout(r, 400));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const docEl = document.getElementById('ins-doc-main') as HTMLElement;
      if (!docEl) {
        alert('Insurance document not ready. Please wait a moment and try again.');
        this.generating = false;
        return;
      }

      const prevBg = docEl.style.background;
      docEl.style.background = '#ffffff';

      const canvas = await html2canvas(docEl, {
        scale: 3, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false,
        windowWidth: docEl.scrollWidth, windowHeight: docEl.scrollHeight,
      });

      docEl.style.background = prevBg;

      const imgData = canvas.toDataURL('image/jpeg', 0.97);
      const pdfW = 210;
      const pdfH = Math.ceil((canvas.height / canvas.width) * pdfW);

      const pdf = new jsPDF({
        orientation: pdfH > pdfW ? 'portrait' : 'landscape',
        unit: 'mm', format: [pdfW, pdfH], compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      const vNum = (this.result?.vehicle_number || 'Document').replace(/\s+/g, '_');
      pdf.save(`Insurance_${vNum}_${new Date().toISOString().slice(0, 10)}.pdf`);

    } catch (err: any) {
      console.error('[PDF]', err);
      alert('PDF generation failed: ' + (err?.message || String(err)));
    } finally {
      this.generating = false;
    }
  }
}
