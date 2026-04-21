import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-insurance-doc',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: block; font-family: Arial, Helvetica, sans-serif; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Download Button ── */
    .dl-section {
      display: flex;
      justify-content: center;
      padding: 16px 0 12px 0;
    }
    .btn-dl {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 13px 40px;
      background: linear-gradient(135deg, #1565c0, #0d47a1);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 800;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(21,101,192,0.45);
      transition: all 0.2s;
      letter-spacing: 0.4px;
      font-family: Arial, sans-serif;
    }
    .btn-dl:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(21,101,192,0.55);
    }
    .btn-dl:active:not(:disabled) { transform: translateY(0); }
    .btn-dl:disabled { opacity: 0.55; cursor: not-allowed; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { width:15px; height:15px; border-radius:50%; border:2.5px solid rgba(255,255,255,0.3); border-top-color:#fff; animation:spin 0.8s linear infinite; display:inline-block; flex-shrink:0; }

    /* ══════ DOCUMENT ══════ */
    .doc {
      background: #fff;
      color: #111;
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      border: 1.5px solid #999;
      font-family: Arial, Helvetica, sans-serif;
    }

    /* ── HEADER ── */
    .hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px 10px 20px;
      border-bottom: 2.5px solid #111;
      background: #fff;
    }
    .logo-block { display: flex; flex-direction: column; gap: 4px; }
    .logo-row { display: flex; align-items: center; gap: 0; }
    /* Italic red "i" */
    .li { font-size: 3rem; font-weight: 900; font-style: italic; color: #cc0000; line-height: 1; margin-right: 2px; }
    /* "ICICI" in dark blue */
    .licici { font-size: 2.2rem; font-weight: 900; color: #00237a; letter-spacing: -1.5px; line-height: 1; }
    /* chevron */
    .lchev { font-size: 1.6rem; font-weight: 900; color: #00237a; margin: 0 1px; line-height: 1; }
    /* "Lombard" */
    .llomb { font-size: 2.2rem; font-weight: 900; color: #00237a; letter-spacing: -1px; line-height: 1; }
    /* GENERAL INSURANCE */
    .ltag { font-size: 0.8rem; font-weight: 700; letter-spacing: 5px; color: #111; text-align: center; padding-top: 3px; }
    .ltag span { margin: 0 6px; }
    /* Right: bike + text */
    .hdr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .bike-img { width: 160px; height: 100px; object-fit: contain; }
    .tw-txt { font-size: 0.85rem; font-weight: 900; color: #1565c0; letter-spacing: 0.5px; text-transform: uppercase; }

    /* ── TITLE ── */
    .title-bar {
      border-bottom: 1px solid #999;
      padding: 7px 16px;
      text-align: center;
      background: #fff;
    }
    .title-bar p {
      font-size: 0.82rem;
      font-weight: 900;
      color: #d4500e;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    /* ── TWO-COL SECTIONS ── */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #999; }
    .col { }
    .col:first-child { border-right: 1px solid #999; }
    .col-hd {
      background: #cfe2f3;
      text-align: center;
      padding: 6px 10px;
      font-size: 0.75rem;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #111;
      border-bottom: 1px solid #999;
    }
    .dr { display: grid; grid-template-columns: 40% 60%; padding: 4px 10px; min-height: 24px; align-items: start; }
    .dr:not(:last-child) { border-bottom: 1px solid #e0e0e0; }
    .dl { font-size: 0.7rem; font-weight: 700; color: #111; text-transform: uppercase; letter-spacing: 0.1px; padding-top: 1px; }
    .dv { font-size: 0.73rem; font-weight: 600; color: #111; word-break: break-word; padding-top: 1px; }
    .dv.bold { font-weight: 900; font-size: 0.77rem; }

    /* ── PREMIUM SECTION ── */
    .prem { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #999; }
    .pl { border-right: 1px solid #999; }
    .pr { display: flex; flex-direction: column; }
    .pl-hd {
      background: #cfe2f3;
      text-align: center;
      padding: 6px 10px;
      font-size: 0.75rem;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #111;
      border-bottom: 1px solid #999;
    }
    .prow { display: grid; grid-template-columns: 58% 42%; padding: 5px 10px; border-bottom: 1px solid #e0e0e0; }
    .prow:last-child { border-bottom: none; }
    .pl-l { font-size: 0.7rem; font-weight: 700; color: #111; text-transform: uppercase; }
    .pl-v { font-size: 0.73rem; font-weight: 600; color: #111; }
    /* Right side */
    .tot-head { display: grid; grid-template-columns: 1fr auto; align-items: stretch; background: #cfe2f3; border-bottom: 1px solid #999; }
    .tot-lbl { padding: 6px 10px; font-size: 0.73rem; font-weight: 900; color: #111; display: flex; align-items: center; }
    .tot-amt { background: #e07020; color: #fff; padding: 6px 16px; font-size: 0.9rem; font-weight: 900; display: flex; align-items: center; white-space: nowrap; }
    .idv-row { display: grid; grid-template-columns: 58% 42%; padding: 5px 10px; border-bottom: 1px solid #e0e0e0; }
    .idv-row:last-child { border-bottom: none; }
    .idv-l { font-size: 0.7rem; font-weight: 700; color: #111; text-transform: uppercase; }
    .idv-v { font-size: 0.73rem; font-weight: 600; color: #111; text-align: right; }

    /* ── TAGLINE ── */
    .tagline { background: #cfe2f3; text-align: center; padding: 7px 16px; border-bottom: 1px solid #999; }
    .tagline p { font-size: 0.85rem; font-weight: 700; color: #00237a; font-style: italic; }

    /* ── NET/GST rows ── */
    .ngrow { display: flex; justify-content: space-between; align-items: center; padding: 6px 20px; border-bottom: 1px solid #e0e0e0; background: #fff; }
    .ng-l { font-size: 0.7rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.3px; }
    .ng-v { font-size: 0.73rem; font-weight: 600; color: #111; }

    /* ── TOTAL ── */
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 20px; background: #ffd700; border-bottom: 1px solid #999; }
    .tr-l { font-size: 0.85rem; font-weight: 900; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .tr-v { font-size: 1rem; font-weight: 900; color: #111; }

    /* ── WARNING ── */
    .warn { background: #e07020; padding: 8px 20px; display: flex; align-items: center; gap: 8px; }
    .warn-icon { font-size: 1rem; flex-shrink: 0; }
    .warn p { font-size: 0.75rem; font-weight: 700; color: #fff; }

    /* Mobile */
    @media (max-width: 580px) {
      .two-col { grid-template-columns: 1fr; }
      .col:first-child { border-right: none; border-bottom: 1px solid #999; }
      .prem { grid-template-columns: 1fr; }
      .pl { border-right: none; border-bottom: 1px solid #999; }
      .hdr { flex-direction: column; gap: 8px; align-items: flex-start; }
      .hdr-right { align-items: flex-start; }
      .bike-img { width: 120px; height: 75px; }
    }
  `],
  template: `
    <!-- ► THE DOCUMENT (captured for PDF) -->
    <div #docRoot class="doc" *ngIf="data" id="ins-doc-main">

      <!-- ════ HEADER ════ -->
      <div class="hdr">
        <!-- Logo Left -->
        <div class="logo-block">
          <div class="logo-row">
            <span class="li">i</span>
            <span class="licici">ICICI</span>
            <span class="lchev">❮</span>
            <span class="llomb">Lombard</span>
          </div>
          <div class="ltag"><span>—</span>GENERAL INSURANCE<span>—</span></div>
        </div>
        <!-- Bike + label Right -->
        <div class="hdr-right">
          <img class="bike-img" src="bike.png" alt="Two Wheeler" (error)="onBikeError($event)">
          <span class="tw-txt">Two Wheeler Insurance</span>
        </div>
      </div>

      <!-- ════ TITLE BAR ════ -->
      <div class="title-bar">
        <p>Stand Alone Own Damage Two Wheeler Insurance Renewal Proposal</p>
      </div>

      <!-- ════ VEHICLE + CUSTOMER ════ -->
      <div class="two-col">

        <!-- Vehicle -->
        <div class="col">
          <div class="col-hd">Vehicle Detail</div>
          <div class="dr">
            <span class="dl">MAKE</span>
            <span class="dv">{{ f('vehicleManufacturerName') || f('vehicleMake') || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">MODEL</span>
            <span class="dv">{{ f('vehicleModel') || f('model') || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">VEHICLE NUMBER</span>
            <span class="dv bold" style="letter-spacing:1px">{{ vehicleNumber || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">DUE DATE</span>
            <span class="dv">{{ f('expiredInsuranceUpto') || '—' }}</span>
          </div>
        </div>

        <!-- Customer -->
        <div class="col">
          <div class="col-hd">Customer Detail</div>
          <div class="dr">
            <span class="dl">NAME</span>
            <span class="dv bold">{{ f('ownerName') || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">MOBILE NO</span>
            <span class="dv">{{ f('ownerMobileNo') || '—' }}</span>
          </div>
          <div class="dr" style="align-items:start">
            <span class="dl" style="padding-top:2px">ADDRESS</span>
            <span class="dv" style="font-size:0.66rem;line-height:1.5">{{ f('ownerAddress') || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ════ PREMIUM SECTION ════ -->
      <div class="prem">
        <!-- Left: Premium Schedule -->
        <div class="pl">
          <div class="pl-hd">Premium Schedule</div>
          <div class="prow">
            <span class="pl-l">Basic OD Premium</span>
            <span class="pl-v">{{ f('basicODPremium') || f('basic_od') || calcBasicOD() }}</span>
          </div>
          <div class="prow">
            <span class="pl-l">No Claim Bonus</span>
            <span class="pl-v">{{ f('noClaimBonus') || f('ncb') || calcNCB() }}</span>
          </div>
          <div class="prow">
            <span class="pl-l">Zero Dep Premium</span>
            <span class="pl-v">{{ f('zeroDepPremium') || f('zero_dep') || calcZeroDep() }}</span>
          </div>
          <div class="prow">
            <span class="pl-l">With Add On Premium</span>
            <span class="pl-v">{{ f('addOnPremium') || f('withAddOnPremium') || calcAddOn() }}</span>
          </div>
        </div>
        <!-- Right: Total -->
        <div class="pr">
          <div class="tot-head">
            <span class="tot-lbl">Total Premium</span>
            <span class="tot-amt">₹ {{ fmtAmt(f('saleAmount') || f('totalPremium') || '0') }}</span>
          </div>
          <div class="idv-row">
            <span class="idv-l">Insure Declared Value (IDV)</span>
            <span class="idv-v">{{ f('idv') || f('IDV') || f('insuredDeclaredValue') || f('saleAmount') || '—' }}</span>
          </div>
          <div class="idv-row">
            <span class="idv-l">Tenure</span>
            <span class="idv-v">{{ f('tenure') || '1 Yr' }}</span>
          </div>
        </div>
      </div>

      <!-- ════ TAGLINE ════ -->
      <div class="tagline">
        <p>Your Peace of Mind : Zero Depreciation, Unlimited Claims!</p>
      </div>

      <!-- ════ NET / GST ════ -->
      <div class="ngrow">
        <span class="ng-l">NET PREMIUM</span>
        <span class="ng-v">Rs. {{ calcNet() }}</span>
      </div>
      <div class="ngrow">
        <span class="ng-l">GST 18%</span>
        <span class="ng-v">Rs. {{ calcGST() }}</span>
      </div>

      <!-- ════ TOTAL PAYABLE ════ -->
      <div class="total-row">
        <span class="tr-l">Total Premium Payable</span>
        <span class="tr-v">Rs. {{ fmtAmt(f('saleAmount') || f('totalPremium') || '0') }}</span>
      </div>

      <!-- ════ WARNING ════ -->
      <div class="warn">
        <span class="warn-icon">⚠</span>
        <p>If you have taken any claim in the last policy year, please inform us immediately.</p>
      </div>

    </div>
  `
})
export class InsuranceDocComponent implements OnChanges {
  @Input() data: any = null;
  @Input() vehicleNumber: string = '';
  @ViewChild('docRoot') docRoot!: ElementRef<HTMLElement>;

  generating = false;

  ngOnChanges(_c: SimpleChanges) {}

  /** Safe field getter — returns '' for null/nan/none values */
  f(key: string): string {
    if (!this.data) return '';
    const v = this.data[key];
    if (v === undefined || v === null) return '';
    const s = String(v).trim();
    if (['', 'nan', 'none', 'null', 'n/a', 'na', '-'].includes(s.toLowerCase())) return '';
    return s;
  }

  onBikeError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  fmtAmt(raw: string): string {
    const n = parseFloat(String(raw || '').replace(/[^0-9.]/g, ''));
    if (isNaN(n) || n === 0) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private total(): number {
    const n = parseFloat(String(this.f('saleAmount') || this.f('totalPremium') || '0').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  calcNet(): string {
    const ff = this.f('netPremium') || this.f('net_premium');
    if (ff) return this.fmtAmt(ff);
    const t = this.total(); if (!t) return '—';
    return Math.round(t / 1.18).toLocaleString('en-IN');
  }

  calcGST(): string {
    const ff = this.f('gstAmount') || this.f('gst');
    if (ff) return this.fmtAmt(ff);
    const t = this.total(); if (!t) return '—';
    return Math.round(t - t / 1.18).toLocaleString('en-IN');
  }

  calcBasicOD(): string  { const t = this.total(); return t ? Math.round(t * 0.557).toLocaleString('en-IN') : '—'; }
  calcNCB(): string      { const t = this.total(); return t ? Math.round(t * 0.112).toLocaleString('en-IN') : '—'; }
  calcZeroDep(): string  { const t = this.total(); return t ? Math.round(t * 0.403).toLocaleString('en-IN') : '—'; }
  calcAddOn(): string    { const t = this.total(); return t ? Math.round(t * 0.960).toLocaleString('en-IN') : '—'; }

  async downloadPDF(): Promise<void> {
    const el = this.docRoot?.nativeElement;
    if (!el || this.generating) return;
    this.generating = true;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Preserve existing styles, then force white bg for capture
      const prevStyles = {
        bg: el.style.backgroundColor,
        boxShadow: el.style.boxShadow,
        border: el.style.border,
      };
      el.style.backgroundColor = '#ffffff';
      el.style.boxShadow = 'none';

      const canvas = await html2canvas(el, {
        scale: 3,                    // 3× for crispy PDF quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      // Restore
      el.style.backgroundColor = prevStyles.bg;
      el.style.boxShadow = prevStyles.boxShadow;
      el.style.border = prevStyles.border;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // A4 width = 210mm, compute height proportionally
      const pdfW = 210;
      const pdfH = Math.ceil((canvas.height / canvas.width) * pdfW);

      const pdf = new jsPDF({
        orientation: pdfH > pdfW ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfW, pdfH],
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');

      const fname = `Insurance_${(this.vehicleNumber || 'Document').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fname);

    } catch (err: any) {
      console.error('[InsuranceDoc] PDF error:', err);
      alert('Could not generate PDF. Please try again.\n' + (err?.message || ''));
    } finally {
      this.generating = false;
    }
  }
}
