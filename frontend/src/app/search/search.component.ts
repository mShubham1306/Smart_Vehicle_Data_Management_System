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
    :host { display:block; font-family:'Inter',sans-serif; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block;flex-shrink:0; }
    
    .btn-action { display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;font-size:0.85rem;font-weight:700;border:none;border-radius:8px;cursor:pointer;transition:all 0.2s;letter-spacing:0.3px; flex: 1; }
    .btn-action:hover:not(:disabled) { transform:translateY(-2px); }
    .btn-action:disabled { opacity:0.6;cursor:not-allowed; }
    
    .btn-dl { background:linear-gradient(135deg,#1565c0,#0d47a1); color:#fff; box-shadow:0 4px 15px rgba(21,101,192,0.3); }
    .btn-wa { background:linear-gradient(135deg,#25D366,#128C7E); color:#fff; box-shadow:0 4px 15px rgba(37,211,102,0.3); }
    .btn-print { background:#333; color:#fff; }
    
    .field-card { background:#0c0c0c; border:1px solid #222; border-radius:12px; padding:14px 16px; transition:border-color 0.2s; }
    .field-card:hover { border-color:#333; }
    .field-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.9px; color:#555; margin-bottom:5px; }
    .field-value { font-size:0.82rem; font-weight:600; color:#e8e8e8; word-break:break-word; line-height:1.4; }
    .field-value.empty { color:#333; font-style:italic; }
    
    .badge-veh { background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:2px 8px; font-size:0.6rem; font-weight:800; letter-spacing:0.5px; display:inline-block; margin-left:6px; vertical-align:middle; }
    .sheet-badge { background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.25); border-radius:20px; padding:3px 10px; font-size:0.65rem; font-weight:700; display:inline-flex; align-items:center; gap:4px; }
    .fuzzy-banner { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:10px 16px; display:flex; align-items:center; gap:10px; margin-bottom:16px; }
    .fuzzy-banner p { font-size:0.78rem; font-weight:600; color:#f59e0b; }
    
    /* Form Inputs */
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 0.75rem; color: #a1a1aa; font-weight: 600; }
    .form-group input { background: #1a1a1a; border: 1px solid #333; color: white; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; }
    .form-group input:focus { border-color: #EF4444; outline: none; }
    
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; }
      #doc-wrapper { padding: 0 !important; border: none !important; background: white !important; }
    }
  `],
  template: `
    <div>
      <div class="mb-8 no-print">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Search Vehicle</h1>
        <p class="text-sm text-textGray mt-1">Enter any vehicle plate number — searches across all your sheets automatically.</p>
      </div>

      <!-- Search Bar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl no-print" style="background:#141414; border:1px solid #262626">
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
      <div *ngIf="loading" class="flex items-center justify-center py-20 no-print">
        <div class="w-10 h-10 rounded-full border-2 animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
      </div>

      <!-- Error -->
      <div *ngIf="error && !loading" class="p-5 rounded-2xl flex items-start gap-4 mb-6 no-print"
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

        <div *ngIf="result.fuzzy_match" class="fuzzy-banner no-print">
          <span style="font-size:1.1rem">⚠️</span>
          <p>Close match returned. Please verify the vehicle number below.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3 mb-5 no-print">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-extrabold font-mono tracking-widest text-textLight">{{ result.vehicle_number }}</span>
            <span class="badge-veh">FOUND</span>
          </div>
          <span class="sheet-badge">📄 {{ result.sheet_name }}</span>
        </div>

        <!-- 🛡️ AGENT DETAILS FORM -->
        <div class="mb-6 p-4 rounded-xl no-print" style="background:#141414; border:1px solid #262626">
          <h3 class="text-sm font-bold text-textLight mb-3">Partner Tracking Details (Will appear on PDF)</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="form-group">
              <label>Generated By</label>
              <input type="text" [(ngModel)]="tracking.generated_by_name" placeholder="Your Name">
            </div>
            <div class="form-group">
              <label>Agent Name</label>
              <input type="text" [(ngModel)]="tracking.agent_name" placeholder="Agent">
            </div>
            <div class="form-group">
              <label>Field Agent</label>
              <input type="text" [(ngModel)]="tracking.field_agent_name" placeholder="Field Agent">
            </div>
            <div class="form-group" *ngIf="isAdmin">
              <label>Admin Name</label>
              <input type="text" [(ngModel)]="tracking.admin_name" placeholder="Admin">
            </div>
          </div>
        </div>

        <!-- 🚀 ACTIONS BAR -->
        <div class="flex flex-wrap gap-3 mb-6 no-print">
          <button class="btn-action btn-dl" (click)="generateAndUpload('download')" [disabled]="generating">
            <span *ngIf="generating && currentAction === 'download'" class="spin"></span>
            <span *ngIf="!generating || currentAction !== 'download'">⬇️ Download PDF</span>
          </button>
          
          <button class="btn-action btn-print" (click)="printDoc()">🖨️ Print</button>
          
          <button class="btn-action btn-wa" (click)="generateAndUpload('whatsapp')" [disabled]="generating">
            <span *ngIf="generating && currentAction === 'whatsapp'" class="spin"></span>
            <span *ngIf="!generating || currentAction !== 'whatsapp'">💬 Share on WhatsApp</span>
          </button>
        </div>
        
        <div *ngIf="shareUrl" class="mb-6 p-3 rounded-lg no-print flex items-center justify-between" style="background:rgba(37,211,102,0.1); border:1px solid rgba(37,211,102,0.3)">
          <div class="text-sm text-white">
            <span class="font-bold text-[#25D366]">Link Ready:</span> {{ shareUrl }}
          </div>
          <button (click)="copyLink()" class="px-3 py-1 bg-[#222] hover:bg-[#333] rounded text-xs text-white transition-colors">Copy</button>
        </div>

        <!-- View Toggle -->
        <div class="flex items-center gap-2 mb-5 no-print">
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

        <!-- Document View -->
        <div *ngIf="viewMode==='document'" id="doc-wrapper" style="background:#f5f5f5;padding:12px;border-radius:12px;border:1px solid #ddd; max-width: 900px; margin: 0 auto;">
          <app-insurance-doc
            #docRef
            [data]="result.data"
            [vehicleNumber]="result.vehicle_number"
            [generatedByName]="tracking.generated_by_name"
            [agentName]="tracking.agent_name"
            [fieldAgentName]="tracking.field_agent_name"
            [adminName]="tracking.admin_name"
            [quoteId]="currentQuoteId"
            [generatedAt]="currentGeneratedAt">
          </app-insurance-doc>
        </div>

        <!-- Card View -->
        <div *ngIf="viewMode==='card'" class="rounded-2xl overflow-hidden no-print" style="background:#141414; border:1px solid #262626">
          <div class="px-6 py-5 flex items-center gap-4" style="background:linear-gradient(135deg,rgba(239,68,68,0.08),transparent); border-bottom:1px solid #262626">
            <h2 class="text-xl font-extrabold font-mono tracking-widest text-textLight">{{ result.vehicle_number }} Raw Data</h2>
          </div>
          <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let field of allFields" class="field-card">
              <p class="field-label">{{ getLabel(field) }}</p>
              <p class="field-value">{{ getVal(field) }}</p>
            </div>
          </div>
        </div>
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
  
  // Action state
  generating = false;
  currentAction: 'download' | 'whatsapp' | null = null;
  shareUrl = '';
  
  viewMode: 'document' | 'card' = 'document';
  allFields: string[] = [];
  
  // Tracking
  isAdmin = false;
  tracking = {
    generated_by_name: '',
    agent_name: '',
    field_agent_name: '',
    admin_name: ''
  };
  
  // Document metadata populated on generation
  currentQuoteId = '';
  currentGeneratedAt = '';

  private sub = new Subscription();

  constructor(private ds: DataService, private authService: AuthService) {}

  ngOnInit() {
    this.sub = this.authService.currentUser$.subscribe(user => {
      this.isAdmin = user?.role === 'admin';
      this.tracking.generated_by_name = user?.username || '';
      if (this.isAdmin) this.tracking.admin_name = user?.username || '';
    });
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  search() {
    const q = this.query.trim();
    if (!q) return;
    this.loading = true; this.error = ''; this.result = null; 
    this.allFields = []; this.shareUrl = ''; this.currentQuoteId = '';

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
    setTimeout(() => window.print(), 100);
  }

  getVal(field: string): string {
    const v = this.result?.data?.[field];
    return ['', 'nan', 'none', 'null'].includes(String(v).trim().toLowerCase()) ? '' : String(v).trim();
  }

  getLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }

  async generateAndUpload(action: 'download' | 'whatsapp') {
    if (this.generating) return;
    this.generating = true;
    this.currentAction = action;
    this.viewMode = 'document';
    this.shareUrl = '';
    
    // Set metadata for UI display before capture
    this.currentGeneratedAt = new Date().toISOString();
    
    // Give Angular a moment to render the tracking details
    await new Promise(r => setTimeout(r, 300));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const docEl = document.getElementById('ins-doc-main') as HTMLElement;
      if (!docEl) throw new Error("Document not found");

      const canvas = await html2canvas(docEl, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfW = 210;
      const pdfH = (canvas.height / canvas.width) * pdfW;

      const pdf = new jsPDF({
        orientation: pdfH > pdfW ? 'portrait' : 'landscape',
        unit: 'mm', format: [pdfW, pdfH]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      
      const vNum = (this.result?.vehicle_number || 'Document').replace(/\s+/g, '_');
      const filename = \`Insurance_\${vNum}.pdf\`;

      if (action === 'download') {
        pdf.save(filename);
      }
      
      // Upload blob to backend for tracking & WhatsApp share link
      const blob = pdf.output('blob');
      this.ds.uploadPdf(blob, {
        vehicle_number: this.result.vehicle_number,
        sheet_name: this.result.sheet_name,
        ...this.tracking
      }).subscribe({
        next: (res) => {
          this.currentQuoteId = res.quote_id;
          this.shareUrl = res.url;
          
          if (action === 'whatsapp') {
            const text = encodeURIComponent(\`Here is the insurance document for Vehicle \${this.result.vehicle_number}: \${res.url}\`);
            window.open(\`https://wa.me/?text=\${text}\`, '_blank');
          }
        },
        error: (err) => console.error("Upload failed", err)
      });

    } catch (err: any) {
      console.error('[PDF]', err);
      alert('PDF generation failed.');
    } finally {
      this.generating = false;
      this.currentAction = null;
    }
  }

  copyLink() {
    if (this.shareUrl) {
      navigator.clipboard.writeText(this.shareUrl);
      alert("Link copied to clipboard!");
    }
  }
}
