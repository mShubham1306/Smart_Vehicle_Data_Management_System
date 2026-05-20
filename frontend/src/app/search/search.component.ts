import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService } from '../data.service';
import { InsuranceDocComponent } from '../insurance-doc/insurance-doc.component';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';

type PdfAction = 'download' | 'whatsapp' | 'regenerate' | null;

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, InsuranceDocComponent],
  styles: [`
    :host { display:block; font-family:'Inter',sans-serif; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block;flex-shrink:0; }

    .actions-bar { display:flex; flex-wrap:wrap; gap:10px; }
    .btn-action {
      display:inline-flex; align-items:center; justify-content:center; gap:8px;
      padding:10px 18px; font-size:0.82rem; font-weight:700; border:none; border-radius:8px;
      cursor:pointer; transition:all 0.2s; letter-spacing:0.3px; min-width:140px;
    }
    .btn-action:hover:not(:disabled) { transform:translateY(-2px); }
    .btn-action:disabled { opacity:0.6; cursor:not-allowed; }
    .btn-dl { background:linear-gradient(135deg,#1565c0,#0d47a1); color:#fff; box-shadow:0 4px 15px rgba(21,101,192,0.3); }
    .btn-wa { background:linear-gradient(135deg,#25D366,#128C7E); color:#fff; box-shadow:0 4px 15px rgba(37,211,102,0.3); }
    .btn-print { background:#333; color:#fff; }
    .btn-copy { background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; }
    .btn-regen { background:linear-gradient(135deg,#F58220,#e86f10); color:#fff; }

    .field-card { background:#0c0c0c; border:1px solid #222; border-radius:12px; padding:14px 16px; }
    .field-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.9px; color:#555; margin-bottom:5px; }
    .field-value { font-size:0.82rem; font-weight:600; color:#e8e8e8; word-break:break-word; }
    .badge-veh { background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:2px 8px; font-size:0.6rem; font-weight:800; margin-left:6px; }
    .sheet-badge { background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.25); border-radius:20px; padding:3px 10px; font-size:0.65rem; font-weight:700; }
    .fuzzy-banner { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:10px 16px; display:flex; align-items:center; gap:10px; margin-bottom:16px; }
    .fuzzy-banner p { font-size:0.78rem; font-weight:600; color:#f59e0b; }
    .form-group { display:flex; flex-direction:column; gap:4px; }
    .form-group label { font-size:0.75rem; color:#a1a1aa; font-weight:600; }
    .form-group input { background:#1a1a1a; border:1px solid #333; color:white; padding:8px 12px; border-radius:6px; font-size:0.85rem; }
    .form-group input:focus { border-color:#EF4444; outline:none; }
    .share-box { background:rgba(37,211,102,0.08); border:1px solid rgba(37,211,102,0.3); border-radius:10px; padding:12px 16px; }
    .share-url { font-size:0.78rem; color:#e8e8e8; word-break:break-all; font-family:monospace; }
    .toast { font-size:0.78rem; font-weight:600; padding:8px 12px; border-radius:8px; }
    .toast-ok { background:rgba(34,197,94,0.1); color:#22c55e; border:1px solid rgba(34,197,94,0.3); }
    .toast-err { background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.3); }

    @media print {
      .no-print { display:none !important; }
      #doc-wrapper { padding:0 !important; border:none !important; background:#fff !important; max-width:100% !important; }
    }
  `],
  template: `
    <div>
      <div class="mb-8 no-print">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Search Vehicle</h1>
        <p class="text-sm text-textGray mt-1">Search by plate number and generate a premium breakup quotation PDF.</p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl no-print" style="background:#141414; border:1px solid #262626">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-4 flex items-center text-textGray pointer-events-none text-sm">🔍</span>
          <input type="text" [(ngModel)]="query" (keyup.enter)="search()"
            placeholder="e.g. GJ06RC1934"
            class="input-field w-full pl-10 pr-4 py-3 font-mono uppercase tracking-widest text-sm">
        </div>
        <button (click)="search()" [disabled]="loading" class="btn-red px-8 py-3 text-sm disabled:opacity-50 whitespace-nowrap">
          {{ loading ? 'Searching…' : 'Search' }}
        </button>
      </div>

      <div *ngIf="loading" class="flex items-center justify-center py-20 no-print">
        <div class="w-10 h-10 rounded-full border-2 animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
      </div>

      <div *ngIf="error && !loading" class="p-5 rounded-2xl mb-6 no-print"
        style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2)">
        <p class="text-sm font-bold text-primary">Not Found</p>
        <p class="text-xs text-textGray mt-0.5">{{ error }}</p>
      </div>

      <div *ngIf="result && !loading">
        <div *ngIf="result.fuzzy_match" class="fuzzy-banner no-print">
          <span>⚠️</span>
          <p>Close match returned — please verify the vehicle number.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3 mb-5 no-print">
          <span class="text-2xl font-extrabold font-mono tracking-widest text-textLight">{{ result.vehicle_number }}</span>
          <span class="badge-veh">FOUND</span>
          <span class="sheet-badge">📄 {{ result.sheet_name }}</span>
        </div>

        <!-- Partner tracking -->
        <div class="mb-6 p-4 rounded-xl no-print" style="background:#141414; border:1px solid #262626">
          <h3 class="text-sm font-bold text-textLight mb-3">Partner Tracking (shown on PDF)</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="form-group">
              <label>Generated By</label>
              <input type="text" [(ngModel)]="tracking.generated_by_name" placeholder="Your name">
            </div>
            <div class="form-group">
              <label>Agent Name</label>
              <input type="text" [(ngModel)]="tracking.agent_name" placeholder="Agent">
            </div>
            <div class="form-group">
              <label>Field Agent</label>
              <input type="text" [(ngModel)]="tracking.field_agent_name" placeholder="Field agent">
            </div>
            <div *ngIf="isAdmin" class="form-group">
              <label>Admin Name</label>
              <input type="text" [(ngModel)]="tracking.admin_name" placeholder="Admin">
            </div>
          </div>
        </div>

        <!-- PDF Actions -->
        <div class="actions-bar mb-4 no-print">
          <button class="btn-action btn-dl" (click)="generatePdf('download')" [disabled]="generating">
            <span *ngIf="generating && currentAction==='download'" class="spin"></span>
            <span *ngIf="!generating || currentAction!=='download'">⬇️ Download PDF</span>
          </button>
          <button class="btn-action btn-print" (click)="printDoc()">🖨️ Print PDF</button>
          <button class="btn-action btn-wa" (click)="generatePdf('whatsapp')" [disabled]="generating">
            <span *ngIf="generating && currentAction==='whatsapp'" class="spin"></span>
            <span *ngIf="!generating || currentAction!=='whatsapp'">💬 Share on WhatsApp</span>
          </button>
          <button class="btn-action btn-copy" (click)="copyLink()" [disabled]="!shareUrl">🔗 Copy Quote Link</button>
          <button class="btn-action btn-regen" (click)="generatePdf('regenerate')" [disabled]="generating">
            <span *ngIf="generating && currentAction==='regenerate'" class="spin"></span>
            <span *ngIf="!generating || currentAction!=='regenerate'">🔄 Regenerate PDF</span>
          </button>
        </div>

        <div *ngIf="toastMsg" class="toast mb-4 no-print" [class.toast-ok]="toastOk" [class.toast-err]="!toastOk">{{ toastMsg }}</div>

        <div *ngIf="shareUrl" class="share-box mb-6 no-print">
          <p class="text-xs font-bold mb-2" style="color:#25D366">Shareable Quote Link</p>
          <p class="share-url">{{ shareUrl }}</p>
          <p *ngIf="currentQuoteId" class="text-xs text-textGray mt-2">Quote ID: <strong class="text-textLight">{{ currentQuoteId }}</strong></p>
        </div>

        <div class="flex items-center gap-2 mb-5 no-print">
          <button (click)="viewMode='document'" class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            [style.background]="viewMode==='document' ? '#EF4444' : 'rgba(255,255,255,0.05)'"
            [style.color]="viewMode==='document' ? '#fff' : '#A1A1AA'"
            [style.border]="viewMode==='document' ? '1px solid rgba(239,68,68,0.4)' : '1px solid #333'">
            📄 Premium Breakup
          </button>
          <button (click)="viewMode='card'" class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            [style.background]="viewMode==='card' ? '#EF4444' : 'rgba(255,255,255,0.05)'"
            [style.color]="viewMode==='card' ? '#fff' : '#A1A1AA'"
            [style.border]="viewMode==='card' ? '1px solid rgba(239,68,68,0.4)' : '1px solid #333'">
            🗂️ All Fields ({{ allFields.length }})
          </button>
        </div>

        <div *ngIf="viewMode==='document'" id="doc-wrapper"
          style="background:#e8e8e8;padding:20px;border-radius:12px;max-width:900px;margin:0 auto">
          <app-insurance-doc
            [data]="result.data"
            [vehicleNumber]="result.vehicle_number"
            [generatedByName]="tracking.generated_by_name"
            [agentName]="tracking.agent_name"
            [fieldAgentName]="tracking.field_agent_name"
            [adminName]="tracking.admin_name"
            [userRole]="userRole"
            [quoteId]="currentQuoteId"
            [systemId]="currentSystemId"
            [generatedAt]="currentGeneratedAt">
          </app-insurance-doc>
        </div>

        <div *ngIf="viewMode==='card'" class="rounded-2xl overflow-hidden no-print" style="background:#141414; border:1px solid #262626">
          <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let field of allFields" class="field-card">
              <p class="field-label">{{ getLabel(field) }}</p>
              <p class="field-value">{{ getVal(field) || '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SearchComponent implements OnInit, OnDestroy {
  @ViewChild(InsuranceDocComponent) docRef!: InsuranceDocComponent;

  query = '';
  result: any = null;
  error = '';
  loading = false;
  generating = false;
  currentAction: PdfAction = null;
  shareUrl = '';
  toastMsg = '';
  toastOk = true;
  viewMode: 'document' | 'card' = 'document';
  allFields: string[] = [];

  isAdmin = false;
  userRole = '';
  tracking = {
    generated_by_name: '',
    agent_name: '',
    field_agent_name: '',
    admin_name: ''
  };

  currentQuoteId = '';
  currentSystemId = '';
  currentGeneratedAt = '';

  private sub = new Subscription();

  constructor(private ds: DataService, private authService: AuthService) {}

  ngOnInit() {
    this.sub = this.authService.currentUser$.subscribe(user => {
      this.isAdmin = user?.role === 'admin';
      this.userRole = user?.role === 'admin' ? 'Administrator' : 'Agent / Partner';
      this.tracking.generated_by_name = user?.username || '';
      if (this.isAdmin) {
        this.tracking.admin_name = user?.username || '';
      }
    });
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  search() {
    const q = this.query.trim();
    if (!q) return;
    this.loading = true;
    this.error = '';
    this.result = null;
    this.allFields = [];
    this.shareUrl = '';
    this.currentQuoteId = '';
    this.currentSystemId = '';

    this.ds.searchVehicle(q).subscribe({
      next: res => {
        this.result = res;
        this.loading = false;
        this.viewMode = 'document';
        if (res?.data) {
          this.allFields = Object.keys(res.data).filter(k =>
            k && !k.startsWith('Unnamed') && k.toLowerCase() !== 'nan'
          );
        }
      },
      error: err => {
        this.error = err.error?.detail || 'Vehicle not found.';
        this.loading = false;
      }
    });
  }

  printDoc() {
    this.viewMode = 'document';
    setTimeout(() => window.print(), 150);
  }

  getVal(field: string): string {
    const v = this.result?.data?.[field];
    return ['', 'nan', 'none', 'null'].includes(String(v).trim().toLowerCase()) ? '' : String(v).trim();
  }

  getLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/[_\-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()).trim();
  }

  private showToast(msg: string, ok = true) {
    this.toastMsg = msg;
    this.toastOk = ok;
    setTimeout(() => this.toastMsg = '', 4000);
  }

  async generatePdf(action: 'download' | 'whatsapp' | 'regenerate') {
    if (this.generating || !this.result) return;
    this.generating = true;
    this.currentAction = action;
    this.viewMode = 'document';

    const ts = new Date().toISOString();
    this.currentGeneratedAt = ts;

    await new Promise(r => setTimeout(r, 350));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const docEl = document.getElementById('ins-doc-main') as HTMLElement;
      if (!docEl) throw new Error('Document element not found');

      const canvas = await html2canvas(docEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: docEl.scrollWidth,
        windowHeight: docEl.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfW = 210;
      const pageH = 297;
      const imgH = (canvas.height / canvas.width) * pdfW;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      if (imgH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, imgH, undefined, 'FAST');
      } else {
        let remaining = imgH;
        let srcY = 0;
        const sliceH = (canvas.height / imgH) * pageH;
        while (remaining > 0) {
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.min(sliceH, canvas.height - srcY);
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
          const sliceMmH = (sliceCanvas.height / canvas.width) * pdfW;
          if (srcY > 0) pdf.addPage();
          pdf.addImage(sliceData, 'JPEG', 0, 0, pdfW, sliceMmH, undefined, 'FAST');
          srcY += sliceCanvas.height;
          remaining -= pageH;
        }
      }

      const vNum = (this.result.vehicle_number || 'Quote').replace(/\s+/g, '_');
      const filename = `Premium_Breakup_${vNum}.pdf`;

      if (action === 'download' || action === 'regenerate') {
        pdf.save(filename);
        this.showToast(action === 'regenerate' ? 'PDF regenerated and downloaded.' : 'PDF downloaded successfully.');
      }

      const blob = pdf.output('blob');
      this.ds.uploadPdf(blob, {
        vehicle_number: this.result.vehicle_number,
        sheet_name: this.result.sheet_name,
        ...this.tracking
      }).subscribe({
        next: res => {
          this.currentQuoteId = res.quote_id;
          this.currentSystemId = res.system_id || '';
          this.shareUrl = res.url;
          if (res.admin_name && !this.tracking.admin_name) {
            this.tracking.admin_name = res.admin_name;
          }

          if (action === 'whatsapp') {
            const msg = encodeURIComponent(
              `Insurance Premium Breakup for ${this.result.vehicle_number}\n` +
              `Quote ID: ${res.quote_id}\n` +
              `View/Download: ${res.url}`
            );
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            const waUrl = isMobile
              ? `https://api.whatsapp.com/send?text=${msg}`
              : `https://web.whatsapp.com/send?text=${msg}`;
            window.open(waUrl, '_blank');
            this.showToast('WhatsApp opened with quote link.');
          }
        },
        error: () => this.showToast('PDF saved locally but upload failed.', false)
      });
    } catch (err) {
      console.error('[PDF]', err);
      this.showToast('PDF generation failed. Please try again.', false);
    } finally {
      this.generating = false;
      this.currentAction = null;
    }
  }

  copyLink() {
    if (!this.shareUrl) {
      this.showToast('Generate a PDF first to get a shareable link.', false);
      return;
    }
    navigator.clipboard.writeText(this.shareUrl).then(
      () => this.showToast('Quote link copied to clipboard.'),
      () => this.showToast('Could not copy link.', false)
    );
  }
}
