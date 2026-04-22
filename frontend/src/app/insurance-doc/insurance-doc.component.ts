import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-insurance-doc',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display:block; font-family: Arial, Helvetica, sans-serif; }
    * { box-sizing:border-box; margin:0; padding:0; }

    /* ══ DOCUMENT WRAPPER ══ */
    .doc {
      background:#fff;
      color:#111;
      width:100%;
      max-width:860px;
      margin:0 auto;
      border:2px solid #888;
      font-family: Arial, Helvetica, sans-serif;
      font-size:13px;
    }

    /* ══ HEADER ══ */
    .hdr {
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:14px 24px 12px 24px;
      border-bottom:2.5px solid #222;
      background:#fff;
      gap:12px;
    }

    /* ── Logo block ── */
    .logo-block { display:flex; flex-direction:column; gap:0; flex-shrink:0; }
    .logo-svg-wrap { display:block; width:280px; height:auto; }

    /* ── Right side: bike + label ── */
    .hdr-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
    .bike-img { width:185px; height:115px; object-fit:contain; }
    .tw-label {
      font-size:14px; font-weight:900; color:#1565c0;
      letter-spacing:0.8px; text-transform:uppercase;
      font-family: Arial Black, Arial, sans-serif;
    }

    /* ══ TITLE BAR ══ */
    .title-bar {
      background:#fff;
      border-bottom:1px solid #999;
      padding:7px 20px;
      text-align:center;
    }
    .title-bar p {
      font-size:12px; font-weight:900;
      color:#d4500e; letter-spacing:0.5px; text-transform:uppercase;
      font-family: Arial Black, Arial, sans-serif;
    }

    /* ══ TWO-COLUMN DETAIL SECTION ══ */
    .two-col { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #999; }
    .col:first-child { border-right:1px solid #999; }
    .col-hd {
      background:#cfe2f3;
      text-align:center; padding:6px 10px;
      font-size:11px; font-weight:900; letter-spacing:2px;
      text-transform:uppercase; color:#111;
      border-bottom:1px solid #999;
      font-family: Arial Black, Arial, sans-serif;
    }
    .dr { display:grid; grid-template-columns:38% 62%; padding:4px 10px; min-height:24px; align-items:start; }
    .dr:not(:last-child) { border-bottom:1px solid #e8e8e8; }
    .dl { font-size:10px; font-weight:700; color:#111; text-transform:uppercase; letter-spacing:0.2px; padding-top:1px; }
    .dv { font-size:11px; font-weight:600; color:#111; word-break:break-word; padding-top:1px; }
    .dv.bold { font-weight:900; font-size:12px; }
    .dv.addr { font-size:10px; line-height:1.5; }

    /* ══ PREMIUM SECTION ══ */
    .prem { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #999; }
    .pl { border-right:1px solid #999; }
    .pr { display:flex; flex-direction:column; }
    .sec-hd {
      background:#cfe2f3; text-align:center; padding:6px 10px;
      font-size:11px; font-weight:900; letter-spacing:2px;
      text-transform:uppercase; color:#111;
      border-bottom:1px solid #999;
      font-family: Arial Black, Arial, sans-serif;
    }
    .prow { display:grid; grid-template-columns:62% 38%; padding:5px 10px; border-bottom:1px solid #e8e8e8; }
    .prow:last-child { border-bottom:none; }
    .pl-l { font-size:10px; font-weight:700; color:#111; text-transform:uppercase; }
    .pl-v { font-size:11px; font-weight:600; color:#111; }

    /* Total Premium header cell */
    .tot-head { display:grid; grid-template-columns:auto 1fr; align-items:stretch; border-bottom:1px solid #999; }
    .tot-lbl {
      padding:6px 12px; font-size:12px; font-weight:800; color:#111;
      display:flex; align-items:center; background:#cfe2f3;
      font-family: Arial Black, Arial, sans-serif;
    }
    .tot-amt {
      background:#e07020; color:#fff; padding:6px 16px;
      font-size:15px; font-weight:900; display:flex; align-items:center;
      justify-content:flex-end; white-space:nowrap;
      font-family: Arial Black, Arial, sans-serif;
    }
    .idv-row { display:grid; grid-template-columns:62% 38%; padding:5px 10px; border-bottom:1px solid #e8e8e8; }
    .idv-row:last-child { border-bottom:none; }
    .idv-l { font-size:10px; font-weight:700; color:#111; text-transform:uppercase; }
    .idv-v { font-size:11px; font-weight:700; color:#111; text-align:right; }

    /* ══ TAGLINE ══ */
    .tagline { background:#cfe2f3; text-align:center; padding:7px 16px; border-bottom:1px solid #999; }
    .tagline p { font-size:12px; font-weight:700; color:#00237a; font-style:italic; }

    /* ══ NET / GST ══ */
    .ngrow { display:flex; justify-content:space-between; align-items:center; padding:5px 20px; border-bottom:1px solid #e8e8e8; background:#fff; }
    .ng-l { font-size:10px; font-weight:600; color:#444; text-transform:uppercase; letter-spacing:0.3px; }
    .ng-v { font-size:11px; font-weight:600; color:#111; }

    /* ══ TOTAL PAYABLE ══ */
    .total-row { display:flex; justify-content:space-between; align-items:center; padding:8px 20px; background:#ffd700; border-bottom:1px solid #999; }
    .tr-l { font-size:13px; font-weight:900; color:#111; text-transform:uppercase; letter-spacing:0.5px; font-family:Arial Black,Arial,sans-serif; }
    .tr-v { font-size:15px; font-weight:900; color:#111; font-family:Arial Black,Arial,sans-serif; }

    /* ══ WARNING ══ */
    .warn { background:#e07020; padding:8px 20px; display:flex; align-items:center; gap:8px; }
    .warn-icon { font-size:16px; flex-shrink:0; }
    .warn p { font-size:11px; font-weight:700; color:#fff; }

    @media (max-width:600px) {
      .two-col { grid-template-columns:1fr; }
      .col:first-child { border-right:none; border-bottom:1px solid #999; }
      .prem { grid-template-columns:1fr; }
      .pl { border-right:none; border-bottom:1px solid #999; }
      .hdr { flex-direction:column; gap:10px; align-items:flex-start; }
      .hdr-right { align-items:flex-start; }
      .bike-img { width:130px; height:80px; }
      .logo-i { font-size:42px; }
      .logo-icici, .logo-lombard { font-size:28px; }
    }
  `],
  template: `
    <div class="doc" *ngIf="data" id="ins-doc-main">

      <!-- ════ HEADER ════ -->
      <div class="hdr">

        <!-- LEFT: ICICI Lombard Logo as inline SVG - pixel-perfect match -->
        <div class="logo-block">
          <img class="logo-svg-wrap" src="/IMG-20260422-WA0003.jpg" alt="ICICI Lombard" style="object-fit: contain;">
        </div>

        <!-- RIGHT: Bike image + label -->
        <div class="hdr-right">
          <img class="bike-img"
            src="/IMG-20260422-WA0006.jpg"
            alt="Two Wheeler"
            (error)="onImgErr($event, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hero_Splendor_Plus_BSVI.jpg/320px-Hero_Splendor_Plus_BSVI.jpg')">
          <span class="tw-label">Two Wheeler Insurance</span>
        </div>
      </div>

      <!-- ════ TITLE BAR ════ -->
      <div class="title-bar">
        <p>Stand Alone Own Damage Two Wheeler Insurance Renewal Proposal</p>
      </div>

      <!-- ════ VEHICLE + CUSTOMER ════ -->
      <div class="two-col">

        <!-- Vehicle Detail -->
        <div class="col">
          <div class="col-hd">Vehicle Detail</div>
          <div class="dr">
            <span class="dl">Make</span>
            <span class="dv">{{ f('vehicleManufacturerName') || f('vehicleMake') || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">Model</span>
            <span class="dv">{{ f('vehicleModel') || f('model') || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">Vehicle Number</span>
            <span class="dv bold" style="letter-spacing:1px">{{ vehicleNumber || f('Vehicle') || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">Due Date</span>
            <span class="dv">{{ f('expiredInsuranceUpto') || '—' }}</span>
          </div>
        </div>

        <!-- Customer Detail -->
        <div class="col">
          <div class="col-hd">Customer Detail</div>
          <div class="dr">
            <span class="dl">Name</span>
            <span class="dv bold">{{ f('ownerName') || '—' }}</span>
          </div>
          <div class="dr">
            <span class="dl">Mobile No</span>
            <span class="dv">{{ f('ownerMobileNo') || '—' }}</span>
          </div>
          <div class="dr" style="align-items:start">
            <span class="dl" style="padding-top:2px">Address</span>
            <span class="dv addr">{{ f('ownerAddress') || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ════ PREMIUM SECTION ════ -->
      <div class="prem">

        <!-- Left: Premium Schedule -->
        <div class="pl">
          <div class="sec-hd">Premium Schedule</div>
          <div class="prow">
            <span class="pl-l">Basic OD Premium</span>
            <span class="pl-v">{{ f('basicODPremium') || f('basicOD') || f('basic_od') || calcBasicOD() }}</span>
          </div>
          <div class="prow">
            <span class="pl-l">No Claim Bonus</span>
            <span class="pl-v">{{ f('noClaimBonus') || f('ncb') || calcNCB() }}</span>
          </div>
          <div class="prow">
            <span class="pl-l">Zero Dep Premium</span>
            <span class="pl-v">{{ f('zeroDepPremium') || f('zeroDep') || f('zero_dep') || calcZeroDep() }}</span>
          </div>
          <div class="prow">
            <span class="pl-l">With Add On Premium</span>
            <span class="pl-v">{{ f('addOnPremium') || f('withAddOnPremium') || f('addOn') || calcAddOn() }}</span>
          </div>
        </div>

        <!-- Right: Total Premium + IDV + Tenure -->
        <div class="pr">
          <div class="tot-head">
            <span class="tot-lbl">Total Premium</span>
            <span class="tot-amt">&#8377; {{ fmtAmt(total()) }}</span>
          </div>
          <div class="idv-row">
            <span class="idv-l">Insure Declared Value (IDV)</span>
            <span class="idv-v">{{ f('idv') || f('IDV') || f('insuredDeclaredValue') || fmtAmt(total()) }}</span>
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
        <span class="ng-l">Net Premium</span>
        <span class="ng-v">Rs. {{ calcNet() }}</span>
      </div>
      <div class="ngrow">
        <span class="ng-l">GST 18%</span>
        <span class="ng-v">Rs. {{ calcGST() }}</span>
      </div>

      <!-- ════ TOTAL PAYABLE ════ -->
      <div class="total-row">
        <span class="tr-l">Total Premium Payable</span>
        <span class="tr-v">Rs. {{ fmtAmt(total()) }}</span>
      </div>

      <!-- ════ WARNING ════ -->
      <div class="warn">
        <span class="warn-icon">&#9651;</span>
        <p>If you have taken any claim in the last policy year, please inform us immediately.</p>
      </div>

    </div>
  `
})
export class InsuranceDocComponent implements OnChanges {
  @Input() data: any = null;
  @Input() vehicleNumber: string = '';

  ngOnChanges(_c: SimpleChanges) {}

  /** Safe field getter */
  f(key: string): string {
    if (!this.data) return '';
    const v = this.data[key];
    if (v === undefined || v === null) return '';
    const s = String(v).trim();
    if (['', 'nan', 'none', 'null', 'n/a', 'na', '-', '0'].includes(s.toLowerCase())) return '';
    return s;
  }

  onImgErr(e: Event, fallback: string) {
    const img = e.target as HTMLImageElement;
    if (img.src !== fallback) { img.src = fallback; } else { img.style.display = 'none'; }
  }

  fmtAmt(raw: string | number): string {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw || '').replace(/[^0-9.]/g, ''));
    if (isNaN(n) || n === 0) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  total(): string {
    // Try multiple field names for the total premium
    const raw = this.f('saleAmount') || this.f('totalPremium') || this.f('total_premium') || this.f('premium');
    const n = parseFloat(String(raw || '0').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? '0' : String(n);
  }

  private totalNum(): number {
    return parseFloat(this.total()) || 0;
  }

  calcNet(): string {
    const ff = this.f('netPremium') || this.f('net_premium') || this.f('netAmount');
    if (ff) return this.fmtAmt(ff);
    const t = this.totalNum();
    return t ? Math.round(t / 1.18).toLocaleString('en-IN') : '—';
  }

  calcGST(): string {
    const ff = this.f('gstAmount') || this.f('gst') || this.f('GST');
    if (ff) return this.fmtAmt(ff);
    const t = this.totalNum();
    return t ? Math.round(t - t / 1.18).toLocaleString('en-IN') : '—';
  }

  calcBasicOD(): string  { const t = this.totalNum(); return t ? Math.round(t * 0.557).toLocaleString('en-IN') : '—'; }
  calcNCB(): string      { const t = this.totalNum(); return t ? Math.round(t * 0.112).toLocaleString('en-IN') : '—'; }
  calcZeroDep(): string  { const t = this.totalNum(); return t ? Math.round(t * 0.403).toLocaleString('en-IN') : '—'; }
  calcAddOn(): string    { const t = this.totalNum(); return t ? Math.round(t * 0.960).toLocaleString('en-IN') : '—'; }
}
