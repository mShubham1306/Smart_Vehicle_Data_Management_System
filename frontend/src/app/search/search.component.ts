import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService, FIXED_FIELDS } from '../data.service';
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
  `],
  template: `
    <div style="font-family:'Inter',sans-serif">
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Search Vehicle</h1>
        <p class="text-sm text-textGray mt-1">Enter a vehicle plate number to retrieve the insurance document.</p>
      </div>

      <!-- Search Bar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl" style="background:#141414; border:1px solid #262626">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-4 flex items-center text-textGray pointer-events-none text-sm">🔍</span>
          <input type="text" [(ngModel)]="query" (keyup.enter)="search()"
            placeholder="e.g. MH12AB1234"
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
        </div>
      </div>

      <!-- ✅ RESULT SECTION -->
      <div *ngIf="result && !loading">

        <!-- ⬇ DOWNLOAD BUTTON — always visible at top of results -->
        <div style="display:flex;justify-content:center;padding:16px 0 20px 0">
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
          <button *ngIf="isAdmin" (click)="viewMode='card'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            [style.background]="viewMode==='card' ? '#EF4444' : 'rgba(255,255,255,0.05)'"
            [style.color]="viewMode==='card' ? '#fff' : '#A1A1AA'"
            [style.border]="viewMode==='card' ? '1px solid rgba(239,68,68,0.4)' : '1px solid #333'">
            🗂️ Card View
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

        <!-- Card View (admin only) -->
        <div *ngIf="viewMode==='card' && isAdmin" class="rounded-2xl overflow-hidden" style="background:#141414; border:1px solid #262626">
          <!-- Header -->
          <div class="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style="background:linear-gradient(135deg,rgba(239,68,68,0.08),transparent); border-bottom:1px solid #262626">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25)">🚗</div>
              <div>
                <p class="text-[10px] text-textGray uppercase tracking-widest font-semibold mb-1">Vehicle Number</p>
                <h2 class="text-2xl font-extrabold font-mono tracking-widest text-textLight">{{ result.vehicle_number }}</h2>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style="background:rgba(239,68,68,0.1); color:#EF4444; border:1px solid rgba(239,68,68,0.2)">
              <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> RECORD FOUND
            </span>
          </div>
          <!-- Fields -->
          <div class="p-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div *ngFor="let field of allFields"
                [class.sm:col-span-2]="field === 'ownerAddress'"
                class="rounded-xl p-4"
                style="background:#0B0B0B; border:1px solid #262626">
                <p class="text-[10px] text-textGray uppercase tracking-wider font-semibold mb-1">{{ getLabel(field) }}</p>
                <p class="text-sm font-semibold text-textLight break-words">{{ result.data[field] || '—' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!result && !loading && !error" class="flex flex-col items-center py-24 text-center">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-5"
          style="background:#141414; border:1px solid #262626">🔍</div>
        <p class="text-base font-bold text-textLight mb-1">Search for a Vehicle</p>
        <p class="text-sm text-textGray max-w-xs">Enter a plate number above to view the insurance document.</p>
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
  isAdmin = false;
  allFields: string[] = [];
  private sub = new Subscription();

  private LABELS: Record<string, string> = {
    'Sr. No.': 'Sr. No.', 'Vehicle': 'Vehicle Number', 'engineNum': 'Engine Number',
    'chassisNum': 'Chassis Number', 'ownerName': 'Owner Name', 'ownerAddress': 'Owner Address',
    'vehicleMake': 'Vehicle Make', 'vehicleModel': 'Vehicle Model', 'vehicleClass': 'Vehicle Class',
    'fuelType': 'Fuel Type', 'saleAmount': 'Sale Amount / Premium', 'ownerMobileNo': 'Mobile No.',
    'vehicleManufacturerName': 'Manufacturer', 'model': 'Model',
    'vehicleInsuranceCompanyName': 'Insurance Company', 'expiredInsuranceUpto': 'Insurance Expiry',
    'vehicleInsurancePolicyNumber': 'Policy Number',
  };

  constructor(private ds: DataService, private authService: AuthService) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.sub = this.authService.currentUser$.subscribe(() => {
      this.isAdmin = this.authService.isAdmin();
    });
    this.allFields = [...FIXED_FIELDS];
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  search() {
    if (!this.query.trim()) return;
    this.loading = true; this.error = ''; this.result = null;
    this.ds.searchVehicle(this.query).subscribe({
      next: res => {
        this.result = res;
        this.loading = false;
        this.viewMode = 'document';
        if (res?.data) {
          const extra = Object.keys(res.data).filter(k => !FIXED_FIELDS.includes(k));
          this.allFields = [...FIXED_FIELDS, ...extra];
        }
      },
      error: err => {
        this.error = err.error?.detail || 'Vehicle not found. Check the plate number and try again.';
        this.loading = false;
      }
    });
  }

  getLabel(f: string) { return this.LABELS[f] ?? f.replace(/([A-Z])/g, ' $1').trim(); }

  /** Download the rendered insurance document as PDF */
  async downloadPDF() {
    if (this.generating) return;
    this.generating = true;

    // Switch to document view first
    this.viewMode = 'document';

    // Wait one tick for angular to render
    await new Promise(r => setTimeout(r, 300));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Target: the insurance document element inside InsuranceDocComponent
      const wrapper = document.getElementById('doc-wrapper');
      const docEl = wrapper?.querySelector('.doc') as HTMLElement ?? wrapper;

      if (!docEl) {
        alert('Document not ready. Please try again.');
        this.generating = false;
        return;
      }

      const canvas = await html2canvas(docEl, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: docEl.scrollWidth,
        height: docEl.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdfW = 210;
      const pdfH = Math.ceil((canvas.height / canvas.width) * pdfW);

      const pdf = new jsPDF({
        orientation: pdfH > pdfW ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfW, pdfH],
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      const fname = `Insurance_${(this.result?.vehicle_number || 'Document').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fname);
    } catch (err: any) {
      console.error('[PDF]', err);
      alert('PDF generation failed. Please try again.\n' + (err?.message || ''));
    } finally {
      this.generating = false;
    }
  }
}
