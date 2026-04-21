import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-insurance-doc',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .ins-doc {
      background: #ffffff;
      color: #1a1a1a;
      font-family: Arial, Helvetica, sans-serif;
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      box-shadow: 0 4px 32px rgba(0,0,0,0.18);
      border: 1px solid #c8c8c8;
      box-sizing: border-box;
    }

    /* ── Header ── */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px 8px 20px;
      border-bottom: 2px solid #1a1a1a;
      background: #ffffff;
    }
    .brand-left { display: flex; flex-direction: column; gap: 2px; }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .logo-i {
      font-size: 2.4rem;
      font-weight: 900;
      font-style: italic;
      color: #d0021b;
      line-height: 1;
      margin-right: 3px;
    }
    .logo-icici {
      font-size: 1.9rem;
      font-weight: 900;
      color: #1a1a8c;
      letter-spacing: -1px;
      line-height: 1;
    }
    .logo-chevron {
      font-size: 1.4rem;
      color: #1a1a8c;
      font-weight: 900;
      margin: 0 1px;
    }
    .logo-lombard {
      font-size: 1.9rem;
      font-weight: 900;
      color: #1a1a8c;
      letter-spacing: -1px;
      line-height: 1;
    }
    .brand-tagline {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 4px;
      color: #1a1a1a;
      padding-top: 2px;
      padding-left: 2px;
      text-align: center;
    }
    .brand-tagline span { margin: 0 3px; color: #1a1a1a; }
    .brand-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .bike-emoji {
      font-size: 3.5rem;
      line-height: 1;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.15);
    }
    .two-wheeler-badge {
      font-size: 0.75rem;
      font-weight: 800;
      color: #1a74bb;
      letter-spacing: 1px;
      text-align: right;
    }

    /* ── Title Bar ── */
    .doc-title-bar {
      background: #ffffff;
      text-align: center;
      padding: 7px 20px;
      border-bottom: 1px solid #b0b0b0;
    }
    .doc-title-bar p {
      font-size: 0.78rem;
      font-weight: 800;
      color: #c8501a;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }

    /* ── Two-column detail sections ── */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #b0b0b0;
    }
    .detail-col {
      padding: 0;
    }
    .detail-col:first-child {
      border-right: 1px solid #b0b0b0;
    }
    .detail-col-header {
      background: #d6e4f7;
      text-align: center;
      padding: 5px 10px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #1a1a1a;
      border-bottom: 1px solid #b0b0b0;
      text-transform: uppercase;
    }
    .detail-row {
      display: grid;
      grid-template-columns: 38% 62%;
      padding: 4px 10px;
      min-height: 24px;
      align-items: start;
    }
    .detail-row:not(:last-child) {
      border-bottom: 1px solid #e8e8e8;
    }
    .detail-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      padding-top: 1px;
    }
    .detail-value {
      font-size: 0.72rem;
      font-weight: 600;
      color: #1a1a1a;
      word-break: break-word;
      padding-top: 1px;
    }

    /* ── Premium Section ── */
    .premium-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #b0b0b0;
    }
    .premium-left {
      border-right: 1px solid #b0b0b0;
    }
    .premium-header-left {
      background: #d6e4f7;
      text-align: center;
      padding: 5px 10px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #1a1a1a;
      border-bottom: 1px solid #b0b0b0;
      text-transform: uppercase;
    }
    .premium-right {
      display: flex;
      flex-direction: column;
    }
    .total-prem-header {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      background: #d6e4f7;
      border-bottom: 1px solid #b0b0b0;
    }
    .total-prem-label {
      padding: 5px 10px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .total-prem-amount {
      background: #e87722;
      color: #fff;
      padding: 5px 14px;
      font-size: 0.82rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .prem-row {
      display: grid;
      grid-template-columns: 60% 40%;
      padding: 4px 10px;
      align-items: start;
      border-bottom: 1px solid #e8e8e8;
    }
    .prem-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
    }
    .prem-value {
      font-size: 0.72rem;
      font-weight: 600;
      color: #1a1a1a;
      text-align: right;
    }
    .idv-row {
      display: grid;
      grid-template-columns: 60% 40%;
      padding: 4px 10px;
      align-items: start;
      border-bottom: 1px solid #e8e8e8;
    }
    .idv-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
    }
    .idv-value {
      font-size: 0.72rem;
      font-weight: 600;
      color: #1a1a1a;
      text-align: right;
    }

    /* ── Tagline ── */
    .tagline-bar {
      background: #cce0f5;
      text-align: center;
      padding: 6px 20px;
      border-bottom: 1px solid #b0b0b0;
    }
    .tagline-bar p {
      font-size: 0.78rem;
      font-weight: 700;
      color: #1a1a8c;
      margin: 0;
      font-style: italic;
    }

    /* ── Net/GST rows ── */
    .net-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    .net-row .net-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #444;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .net-row .net-value {
      font-size: 0.72rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    /* ── Total Row (yellow) ── */
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 20px;
      background: #ffd700;
      border-bottom: 1px solid #b0b0b0;
    }
    .total-row .total-label {
      font-size: 0.78rem;
      font-weight: 900;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .total-row .total-value {
      font-size: 0.88rem;
      font-weight: 900;
      color: #1a1a1a;
    }

    /* ── Warning Footer ── */
    .warning-footer {
      background: #e87722;
      padding: 7px 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .warning-footer p {
      font-size: 0.72rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .warning-icon {
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    /* ── Download Button (outside doc) ── */
    .download-wrap {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 28px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      letter-spacing: 0.3px;
    }
    .btn-pdf {
      background: #1a74bb;
      color: #fff;
      box-shadow: 0 4px 14px rgba(26,116,187,0.35);
    }
    .btn-pdf:hover { background: #155fa0; transform: translateY(-1px); }
    .btn-pdf:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    @media (max-width: 640px) {
      .detail-grid { grid-template-columns: 1fr; }
      .detail-col:first-child { border-right: none; border-bottom: 1px solid #b0b0b0; }
      .premium-grid { grid-template-columns: 1fr; }
      .premium-left { border-right: none; border-bottom: 1px solid #b0b0b0; }
      .doc-header { flex-direction: column; gap: 8px; align-items: flex-start; }
      .brand-right { align-items: flex-start; }
    }
  `],
  template: `
    <div class="download-wrap" *ngIf="data">
      <button class="btn-download btn-pdf" (click)="downloadPDF()" [disabled]="generating">
        <span *ngIf="!generating">⬇ Download PDF</span>
        <span *ngIf="generating" style="display:flex;align-items:center;gap:6px">
          <span style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block"></span>
          Generating…
        </span>
      </button>
    </div>

    <div #docRef class="ins-doc" *ngIf="data" id="insurance-doc-print">

      <!-- ═══════════════ HEADER ═══════════════ -->
      <div class="doc-header">
        <div class="brand-left">
          <div class="brand-logo">
            <span class="logo-i">i</span>
            <span class="logo-icici">ICICI</span>
            <span class="logo-chevron">⟨</span>
            <span class="logo-lombard">Lombard</span>
          </div>
          <div class="brand-tagline">
            <span>—</span> GENERAL INSURANCE <span>—</span>
          </div>
        </div>
        <div class="brand-right">
          <div class="bike-emoji">🏍️</div>
          <div class="two-wheeler-badge">TWO WHEELER INSURANCE</div>
        </div>
      </div>

      <!-- ═══════════════ TITLE ═══════════════ -->
      <div class="doc-title-bar">
        <p>STAND ALONE OWN DAMAGE TWO WHEELER INSURANCE RENEWAL PROPOSAL</p>
      </div>

      <!-- ═══════════════ VEHICLE + CUSTOMER ═══════════════ -->
      <div class="detail-grid">
        <!-- Vehicle Detail -->
        <div class="detail-col">
          <div class="detail-col-header">Vehicle Detail</div>
          <div class="detail-row">
            <span class="detail-label">MAKE</span>
            <span class="detail-value">{{ v('vehicleManufacturerName') || v('vehicleMake') || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">MODEL</span>
            <span class="detail-value">{{ v('vehicleModel') || v('model') || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">VEHICLE NUMBER</span>
            <span class="detail-value" style="font-weight:800;letter-spacing:1px">{{ vehicleNumber || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">DUE DATE</span>
            <span class="detail-value">{{ v('expiredInsuranceUpto') || '—' }}</span>
          </div>
        </div>

        <!-- Customer Detail -->
        <div class="detail-col">
          <div class="detail-col-header">Customer Detail</div>
          <div class="detail-row">
            <span class="detail-label">NAME</span>
            <span class="detail-value" style="font-weight:700">{{ v('ownerName') || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">MOBILE NO</span>
            <span class="detail-value">{{ v('ownerMobileNo') || '—' }}</span>
          </div>
          <div class="detail-row" style="align-items:start">
            <span class="detail-label" style="padding-top:2px">ADDRESS</span>
            <span class="detail-value" style="font-size:0.65rem;line-height:1.4">{{ v('ownerAddress') || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ═══════════════ PREMIUM SECTION ═══════════════ -->
      <div class="premium-grid">

        <!-- Left: Premium Schedule -->
        <div class="premium-left">
          <div class="premium-header-left">Premium Schedule</div>
          <div class="prem-row">
            <span class="prem-label">BASIC OD PREMIUM</span>
            <span class="prem-value">{{ v('basicODPremium') || v('od_premium') || v('basic_od') || computeBasicOD() }}</span>
          </div>
          <div class="prem-row">
            <span class="prem-label">NO CLAIM BONUS</span>
            <span class="prem-value">{{ v('noClaimBonus') || v('ncb') || v('no_claim_bonus') || computeNCB() }}</span>
          </div>
          <div class="prem-row">
            <span class="prem-label">ZERO DEP PREMIUM</span>
            <span class="prem-value">{{ v('zeroDepPremium') || v('zero_dep') || v('zeroDep') || computeZeroDep() }}</span>
          </div>
          <div class="prem-row" style="border-bottom:none">
            <span class="prem-label">WITH ADD ON PREMIUM</span>
            <span class="prem-value">{{ v('addOnPremium') || v('add_on_premium') || v('withAddOnPremium') || computeAddOn() }}</span>
          </div>
        </div>

        <!-- Right: Total Summary -->
        <div class="premium-right">
          <div class="total-prem-header">
            <span class="total-prem-label">Total Premium</span>
            <span class="total-prem-amount">₹ {{ formatAmount(v('saleAmount') || v('totalPremium') || v('total_premium') || '0') }}</span>
          </div>
          <div class="idv-row">
            <span class="idv-label">INSURE DECLARED VALUE (IDV)</span>
            <span class="idv-value">{{ v('idv') || v('IDV') || v('insuredDeclaredValue') || v('saleAmount') || '—' }}</span>
          </div>
          <div class="idv-row" style="border-bottom:none">
            <span class="idv-label">TENURE</span>
            <span class="idv-value">{{ v('tenure') || v('policyTenure') || '1 Yr' }}</span>
          </div>
        </div>

      </div>

      <!-- ═══════════════ TAGLINE ═══════════════ -->
      <div class="tagline-bar">
        <p>Your Peace of Mind : Zero Depreciation, Unlimited Claims!</p>
      </div>

      <!-- ═══════════════ NET / GST ROWS ═══════════════ -->
      <div class="net-row">
        <span class="net-label">NET PREMIUM</span>
        <span class="net-value">Rs. {{ computeNetPremium() }}</span>
      </div>
      <div class="net-row">
        <span class="net-label">GST 18%</span>
        <span class="net-value">Rs. {{ computeGST() }}</span>
      </div>

      <!-- ═══════════════ TOTAL ROW ═══════════════ -->
      <div class="total-row">
        <span class="total-label">TOTAL PREMIUM PAYABLE</span>
        <span class="total-value">Rs. {{ formatAmount(v('saleAmount') || v('totalPremium') || '0') }}</span>
      </div>

      <!-- ═══════════════ WARNING FOOTER ═══════════════ -->
      <div class="warning-footer">
        <span class="warning-icon">⚠</span>
        <p>If you have taken any claim in the last policy year, please inform us immediately.</p>
      </div>

    </div>

    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `
})
export class InsuranceDocComponent implements OnChanges {
  @Input() data: any = null;
  @Input() vehicleNumber: string = '';
  @ViewChild('docRef') docRef!: ElementRef;

  generating = false;

  ngOnChanges(changes: SimpleChanges) {}

  v(field: string): string {
    if (!this.data) return '';
    const val = this.data[field];
    if (!val || val === 'nan' || val === 'None' || val === '-') return '';
    return String(val).trim();
  }

  formatAmount(raw: string): string {
    const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return raw || '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private getTotal(): number {
    const raw = this.v('saleAmount') || this.v('totalPremium') || this.v('total_premium') || '0';
    const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  computeNetPremium(): string {
    const netField = this.v('netPremium') || this.v('net_premium');
    if (netField) return this.formatAmount(netField);
    const total = this.getTotal();
    if (!total) return '—';
    // Net = Total / 1.18 (reverse GST)
    return Math.round(total / 1.18).toLocaleString('en-IN');
  }

  computeGST(): string {
    const gstField = this.v('gst') || this.v('gstAmount') || this.v('gst_amount');
    if (gstField) return this.formatAmount(gstField);
    const total = this.getTotal();
    if (!total) return '—';
    return Math.round(total - total / 1.18).toLocaleString('en-IN');
  }

  computeBasicOD(): string {
    const total = this.getTotal();
    if (!total) return '—';
    return Math.round(total * 0.557).toLocaleString('en-IN');
  }

  computeNCB(): string {
    const total = this.getTotal();
    if (!total) return '—';
    return Math.round(total * 0.112).toLocaleString('en-IN');
  }

  computeZeroDep(): string {
    const total = this.getTotal();
    if (!total) return '—';
    return Math.round(total * 0.403).toLocaleString('en-IN');
  }

  computeAddOn(): string {
    const total = this.getTotal();
    if (!total) return '—';
    return Math.round(total * 0.96).toLocaleString('en-IN');
  }

  async downloadPDF() {
    if (!this.docRef?.nativeElement) return;
    this.generating = true;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const el: HTMLElement = this.docRef.nativeElement;

      // Temporarily force a fixed white background and full width for capture
      const prevBg = el.style.background;
      el.style.background = '#ffffff';

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      el.style.background = prevBg;

      const imgData = canvas.toDataURL('image/png');
      const pdfW = 210; // A4 width mm
      const pxPerMm = canvas.width / pdfW;
      const pdfH = canvas.height / pxPerMm;

      const pdf = new jsPDF({
        orientation: pdfH > pdfW ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfW, pdfH],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      const filename = `Insurance_${this.vehicleNumber || 'Document'}_${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF generation failed', err);
    } finally {
      this.generating = false;
    }
  }
}
