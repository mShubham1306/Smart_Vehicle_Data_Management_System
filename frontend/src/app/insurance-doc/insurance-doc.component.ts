import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-insurance-doc',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  styles: [`
    :host { 
      display: block; 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      background: #e8e8e8;
      padding: 0;
    }
    
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }

    .doc {
      background: #ffffff;
      color: #1a1a1a;
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      font-size: 10.5px;
      line-height: 1.4;
      border: 1px solid #dcdcdc;
      padding: 24px 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      position: relative;
    }

    /* ── Header ── */
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      gap: 20px;
    }
    
    .greeting-box {
      flex: 1;
      font-size: 10.5px;
      color: #1a1a1a;
      line-height: 1.5;
    }
    
    .greeting-box p {
      margin-top: 6px;
    }

    .logo-banner {
      width: 200px;
      height: auto;
      object-fit: contain;
      display: block;
      border-radius: 4px;
    }

    /* ── Section Headers ── */
    .sec-hdr {
      background: #ffded4;
      color: #1a1a1a;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 10px;
      border: 1px solid #dcdcdc;
      border-bottom: none;
      margin-top: 15px;
      text-transform: capitalize;
    }

    /* ── Table Styling ── */
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #dcdcdc;
      margin-bottom: 0px;
    }

    .grid-table td {
      border: 1px solid #dcdcdc;
      padding: 5px 8px;
      font-size: 10.5px;
      vertical-align: middle;
    }

    .grid-table td.lbl {
      background: #f7f7f7;
      color: #333333;
      font-weight: 600;
      width: 25%;
    }

    .grid-table td.val {
      background: #ffffff;
      color: #000000;
      font-weight: 400;
      width: 25%;
    }

    .grid-table td.val-plain {
      background: #ffffff;
      color: #000000;
      font-weight: 400;
    }

    .grid-table td.lbl-hdr {
      background: #f7f7f7;
      color: #000000;
      font-weight: 700;
      font-size: 11px;
    }

    /* Sub headers inside premium table */
    .grid-table tr.sec-subhdr td {
      background: #f2f2f2;
      font-weight: 700;
      color: #1a1a1a;
      font-size: 10.5px;
    }

    /* ── Footer Strip ── */
    .footer-strip {
      background: linear-gradient(to right, #f58220, #e05e00);
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      line-height: 1.5;
      margin-top: 25px;
    }

    .footer-col {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .footer-col.right {
      text-align: right;
      align-items: flex-end;
    }

    @media print {
      :host {
        background: #ffffff;
        padding: 0;
      }
      .doc {
        border: none;
        box-shadow: none;
        max-width: 100%;
        padding: 0;
      }
      .grid-table tr {
        page-break-inside: avoid;
      }
    }
  `],
  template: `
    <div class="doc" *ngIf="data" id="ins-doc-main">

      <!-- HEADER -->
      <div class="hdr">
        <div class="greeting-box">
          <strong>Dear Customer,</strong>
          <p>
            Thank you for choosing us for your motor insurance needs. We are pleased to provide you with a quote for coverage, created on <strong>{{ formatDateOnly(generatedAt) }}</strong>. Please note that this quotation is valid for <strong>7 days</strong> from the date of issue.
          </p>
        </div>
        <img src="/icici-lombard-logo.png" alt="ICICI Lombard" class="logo-banner" (error)="onImgErr($event)">
      </div>

      <!-- VEHICLE DETAILS -->
      <div class="sec-hdr">Vehicle Details</div>
      <table class="grid-table">
        <tr>
          <td class="lbl">Registration Number</td>
          <td class="val" style="font-weight: 600;">{{ vehicleNumber || f('Vehicle','vehicle','VEHICLE NO','registration') || '—' }}</td>
          <td class="lbl">RTO Location</td>
          <td class="val">{{ f('rtoLocation','RTO','rto','state','RTO LOCATION') || '—' }}</td>
        </tr>
        <tr>
          <td class="lbl">Manufacture Model</td>
          <td class="val" colspan="3">{{ f('vehicleManufacturerName','vehicleMake','make','MANUFACTURER') }} {{ f('vehicleModel','model','VEHICLE MODEL') || '—' }}</td>
        </tr>
        <tr>
          <td class="lbl">Manufacturing Year</td>
          <td class="val">{{ f('manufacturingYear','YEAR','year','mfg year') || '—' }}</td>
          <td class="lbl">Registration Date</td>
          <td class="val">{{ f('registrationDate', 'REGISTRATION DATE', 'regDate', 'reg_date') || formatDateOnly(generatedAt) || '—' }}</td>
        </tr>
      </table>

      <!-- QUOTE DETAILS -->
      <div class="sec-hdr">Quote Details</div>
      <table class="grid-table">
        <tr>
          <td class="lbl">Insurance Plan</td>
          <td class="val">{{ f('insurancePlan','plan','PLAN','vehicleInsuranceCompanyName') || 'Two Wheeler Package' }}</td>
          <td class="lbl">Tenure</td>
          <td class="val">{{ f('tenure','TENURE') || '1 year Own Damage +' }}</td>
        </tr>
        <tr>
          <td class="lbl">CPA Tenure</td>
          <td class="val">{{ f('cpaTenure','CPA_TENURE','cpa') || '1' }}</td>
          <td class="lbl">Insured Declared Value (IDV)</td>
          <td class="val" style="font-weight: 600;">₹ {{ fmtAmt(f('idv','IDV','insuredDeclaredValue') || idvDisplay()) }}</td>
        </tr>
        <tr>
          <td class="lbl">Quote Start Date and Time</td>
          <td class="val">{{ formatDate(generatedAt) }}</td>
          <td class="lbl">Quote Valid Till</td>
          <td class="val">{{ quoteValidTill() }}</td>
        </tr>
        <tr>
          <td class="lbl">Policy Start Date</td>
          <td class="val">{{ f('policyStartDate', 'POLICY_START_DATE', 'policyStart') || formatDateOnly(generatedAt) }}</td>
          <td class="lbl">Policy End Date</td>
          <td class="val">{{ f('policyEndDate', 'POLICY_END_DATE', 'policyEnd', 'expiredInsuranceUpto') || '—' }}</td>
        </tr>
      </table>

      <!-- PLAN AND PREMIUM DETAILS -->
      <div class="sec-hdr">Plan and Premium Details</div>
      <table class="grid-table">
        <tr>
          <td class="lbl-hdr" style="width: 50%;">Description</td>
          <td class="lbl-hdr" colspan="2" style="width: 50%; text-align: right;">Basic Plan</td>
        </tr>
        <tr>
          <td class="val-plain">Quote ID</td>
          <td class="val-plain" colspan="2" style="text-align: right; font-weight: 600;">{{ quoteId || '—' }}</td>
        </tr>
        
        <!-- Own Damage Section -->
        <tr class="sec-subhdr">
          <td colspan="3">Own Damage (A)</td>
        </tr>
        <tr class="sec-subhdr">
          <td colspan="3">Own Damage - Add-on Covers</td>
        </tr>
        <tr>
          <td class="val-plain">Zero Depreciation</td>
          <td class="val-plain" style="text-align: center; color: #f58220; font-weight: bold; width: 15%;">{{ hasZeroDep() ? '✓' : '—' }}</td>
          <td class="val-plain" style="text-align: right; width: 35%;">Plan Type: SILVER</td>
        </tr>
        <tr class="sec-subhdr">
          <td colspan="3">Own Damage - Premium</td>
        </tr>
        <tr>
          <td class="val-plain">Basic OD Premium</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcBasicOD()) }}</td>
        </tr>
        <tr>
          <td class="val-plain">NCB Discount (20%)</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcNCB()) }}</td>
        </tr>
        <tr>
          <td class="val-plain">Total Own Damage Add-ons Premium</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcAddOn()) }}</td>
        </tr>
        <tr style="font-weight: 700;">
          <td class="val-plain">Total Own Damage Premium (A)</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcODTotal()) }}</td>
        </tr>

        <!-- Third Party Section -->
        <tr class="sec-subhdr">
          <td colspan="3">Third Party (B)</td>
        </tr>
        <tr class="sec-subhdr">
          <td colspan="3">Third Party - Add-ons</td>
        </tr>
        <tr>
          <td class="val-plain" colspan="3" style="color: #666; font-style: italic; font-size: 9.5px; padding-left: 12px;">No Add-ons selected</td>
        </tr>
        <tr class="sec-subhdr">
          <td colspan="3">Third Party - Premium</td>
        </tr>
        <tr>
          <td class="val-plain">Basic TP Premium</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcTPTotal()) }}</td>
        </tr>
        <tr>
          <td class="val-plain">Total Third Party Add-ons Premium</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">₹ 0.00</td>
        </tr>
        <tr style="font-weight: 700;">
          <td class="val-plain">Total Third Party Premium (B)</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcTPTotal()) }}</td>
        </tr>

        <!-- Total Premium Section -->
        <tr class="sec-subhdr">
          <td colspan="3">Total Premium (A+B+C)</td>
        </tr>
        <tr>
          <td class="val-plain">Net Premium (A + B)</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcNet()) }}</td>
        </tr>
        <tr>
          <td class="val-plain">GST&#64;18% C</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right;">{{ currency(calcGST()) }}</td>
        </tr>
        <tr style="font-weight: 700; background: #fffcf9;">
          <td class="val-plain">Total Premium Payable (A+B+C)</td>
          <td class="val-plain"></td>
          <td class="val-plain" style="text-align: right; font-size: 11px;">₹ {{ fmtAmt(total()) }}</td>
        </tr>
      </table>

      <!-- LONG TERM PLANS -->
      <div class="sec-hdr">Save more with Long Term Plans</div>
      <table class="grid-table">
        <tr>
          <td class="lbl" style="width: 50%; font-weight: 700;">Plan Type</td>
          <td class="lbl" style="width: 50%; font-weight: 700;">Basic Plan</td>
        </tr>
        <tr>
          <td class="val-plain" style="font-weight: 600; background: #fafafa;">1 Year Plan</td>
          <td class="val-plain" style="text-align: right;">₹ {{ fmtAmt(totalNum()) }}</td>
        </tr>
        <tr>
          <td class="val-plain" style="font-weight: 600; background: #fafafa;">2 Year Plan</td>
          <td class="val-plain" style="text-align: right;">₹ {{ fmtAmt(ltPremium(2)) }}</td>
        </tr>
        <tr>
          <td class="val-plain" style="font-weight: 600; background: #fafafa;">3 Year Plan</td>
          <td class="val-plain" style="text-align: right;">₹ {{ fmtAmt(ltPremium(3)) }}</td>
        </tr>
        <tr>
          <td class="val-plain" style="font-weight: 600; background: #fafafa;">4 Year Plan</td>
          <td class="val-plain" style="text-align: right;">
            <span style="text-decoration: line-through; color: #999; margin-right: 8px;">₹ {{ fmtAmt(ltPremium(4, false)) }}</span>
            <span style="font-weight: 700; margin-right: 8px;">₹ {{ fmtAmt(ltPremium(4)) }}</span>
            <span style="color: #22c55e; font-weight: 700;">Save ₹{{ fmtAmt(ltSavings(4)) }}</span>
          </td>
        </tr>
      </table>

      <!-- AGENT / PARTNER DETAILS -->
      <div class="sec-hdr">Agent/Partner Details</div>
      <table class="grid-table">
        <tr>
          <td class="lbl">Agent Name</td>
          <td class="val">{{ agentName || generatedByName || '—' }}</td>
          <td class="lbl">Location</td>
          <td class="val">{{ f('location','LOCATION','city','rtoLocation') || '—' }}</td>
        </tr>
        <tr>
          <td class="lbl">Agent Code</td>
          <td class="val">{{ agentCode() }}</td>
          <td class="lbl">Mobile Number</td>
          <td class="val">{{ f('agentMobile','agent mobile','partner mobile') || f('ownerMobileNo','MOBILE') || '—' }}</td>
        </tr>
        <tr>
          <td class="lbl">Vertical</td>
          <td class="val" colspan="3">{{ userRole || 'Insurance Partner' }}</td>
        </tr>
      </table>

      <!-- System notes / warnings -->
      <div style="margin-top: 15px; font-size: 9px; color: #555; line-height: 1.5;">
        <div>Correlation IDs: Quote - {{ correlationId() }}</div>
        <div>Note: Premium has been calculated for {{ agentName || generatedByName || '—' }}, {{ userRole || 'Insurance Partner' }}</div>
        <div style="color: #ff3b30; font-weight: 700; margin-top: 5px;">The displayed Quotation is valid subject to satisfactory break-in inspection, if applicable.</div>
      </div>

      <!-- FOOTER STRIP -->
      <div class="footer-strip">
        <div class="footer-col">
          <div>🌐 www.icicilombard.com</div>
          <div>💬 Chat with RIA on WhatsApp (+917738282666)</div>
          <div>UIN: ICIHLIP23075 V032223 ADV/19248</div>
        </div>
        <div class="footer-col right">
          <div>✉ customersupport&#64;icicilombard.com</div>
          <div>📞 18002666 (toll free)</div>
          <div>CIN: L67200MH2000PLC129408</div>
        </div>
      </div>

    </div>
  `
})
export class InsuranceDocComponent implements OnChanges {
  @Input() data: any = null;
  @Input() vehicleNumber: string = '';
  @Input() quoteId: string = '';
  @Input() systemId: string = '';
  @Input() generatedByName: string = '';
  @Input() agentName: string = '';
  @Input() fieldAgentName: string = '';
  @Input() adminName: string = '';
  @Input() userRole: string = '';
  @Input() generatedAt: string = '';
  @Input() logoUrl: string = '';

  logoFailed = false;
  private _normMap: Record<string, string> = {};
  private _junk = new Set(['', 'nan', 'none', 'null', 'n/a', 'na', '-', '0', 'undefined']);

  ngOnChanges(_c: SimpleChanges) {
    this._normMap = {};
    this.logoFailed = false;
    if (this.data) {
      for (const k of Object.keys(this.data)) {
        const norm = k.toLowerCase().replace(/[\s_\-\.]+/g, '');
        this._normMap[norm] = k;
      }
    }
  }

  private _val(raw: any): string {
    if (raw === null || raw === undefined) return '';
    const s = String(raw).trim();
    return this._junk.has(s.toLowerCase()) ? '' : s;
  }

  f(...keys: string[]): string {
    if (!this.data) return '';
    for (const key of keys) {
      const v = this._val(this.data[key]);
      if (v) return v;
    }
    for (const key of keys) {
      const searchNorm = key.toLowerCase().replace(/[\s_\-\.]+/g, '');
      for (const [norm, realKey] of Object.entries(this._normMap)) {
        if (norm.includes(searchNorm) || searchNorm.includes(norm)) {
          const v = this._val(this.data[realKey]);
          if (v) return v;
        }
      }
    }
    return '';
  }

  onImgErr(e: Event) {
    this.logoFailed = true;
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
  }

  fmtAmt(raw: string | number): string {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw || '').replace(/[^0-9.]/g, ''));
    if (isNaN(n) || n === 0) return '0.00';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  currency(val: string | number): string {
    const s = String(val);
    if (s === '—' || !s) return '—';
    const n = parseFloat(s.replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return s.startsWith('₹') ? s : `₹ ${s}`;
    return `₹ ${this.fmtAmt(n)}`;
  }

  total(): string {
    const raw = this.f('totalPremium', 'saleAmount', 'total_premium', 'premium', 'FINAL PREMIUM', 'final premium');
    const n = parseFloat(String(raw || '0').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? '0' : String(n);
  }

  totalNum(): number { return parseFloat(this.total()) || 0; }

  idvDisplay(): string {
    const idv = this.f('idv', 'IDV');
    if (idv) return idv;
    const t = this.totalNum();
    return t ? String(Math.round(t * 60)) : '0';
  }

  private netNum(): number {
    const ff = this.f('netPremium', 'nt premium', 'NT PREMIUM', 'net_premium', 'netAmount');
    if (ff) return parseFloat(ff.replace(/[^0-9.]/g, '')) || 0;
    const t = this.totalNum();
    return t ? Math.round(t / 1.18) : 0;
  }

  calcNet(): string {
    const n = this.netNum();
    return n ? String(n) : '0';
  }

  calcGST(): string {
    const ff = this.f('gstAmount', 'gst', 'GST', 'GST PREMIUM', 'gst premium');
    if (ff) return ff.replace(/[^0-9.]/g, '') || '0';
    const t = this.totalNum();
    return t ? String(Math.round(t - t / 1.18)) : '0';
  }

  calcBasicOD(): string {
    const ff = this.f('basicODPremium', 'BASIC PREMIUM', 'basic od', 'basicOD');
    if (ff) return ff.replace(/[^0-9.]/g, '') || '0';
    const n = this.netNum();
    return n ? String(Math.round(n * 0.55)) : '0';
  }

  calcNCB(): string {
    const ff = this.f('ncb', 'NCB', 'noClaimBonus', 'bonus');
    if (ff) return ff.replace(/[^0-9.]/g, '') || '0';
    const n = this.netNum();
    return n ? String(Math.round(n * 0.10)) : '0';
  }

  calcZeroDep(): string {
    const ff = this.f('zeroDepPremium', 'ZERO DEP', 'zeroDep');
    if (ff) return ff.replace(/[^0-9.]/g, '') || '0';
    const n = this.netNum();
    return n ? String(Math.round(n * 0.25)) : '0';
  }

  calcAddOn(): string {
    const ff = this.f('addOnPremium', 'withAddOnPremium', 'addOn');
    if (ff) return ff.replace(/[^0-9.]/g, '') || '0';
    const n = this.netNum();
    return n ? String(Math.round(n * 0.10)) : '0';
  }

  calcODTotal(): string {
    const basic = parseFloat(this.calcBasicOD()) || 0;
    const zd = parseFloat(this.calcZeroDep()) || 0;
    const addon = parseFloat(this.calcAddOn()) || 0;
    const ncb = parseFloat(this.calcNCB()) || 0;
    return String(Math.max(0, basic + zd + addon - ncb));
  }

  calcTPTotal(): string {
    const ff = this.f('tpPremium', 'TP PREMIUM', 'third party premium');
    if (ff) return ff.replace(/[^0-9.]/g, '') || '0';
    return '0';
  }

  hasZeroDep(): boolean {
    const z = parseFloat(this.calcZeroDep());
    return z > 0 || !!this.f('zeroDepPremium', 'ZERO DEP', 'zeroDep');
  }

  savingsAmount(): number {
    const ncb = parseFloat(this.calcNCB()) || 0;
    const lt = this.ltSavings(4);
    return ncb + lt;
  }

  ltPremium(years: number, discounted = true): number {
    const base = this.totalNum();
    if (!base) return 0;
    const mult = years;
    const discount = discounted ? (years === 4 ? 0.88 : years === 3 ? 0.92 : years === 2 ? 0.95 : 1) : 1;
    return Math.round(base * mult * discount);
  }

  ltSavings(years: number): number {
    const full = this.ltPremium(years, false);
    const disc = this.ltPremium(years, true);
    return Math.max(0, full - disc);
  }

  formatDate(iso: string): string {
    if (!iso) return new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    try {
      return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return iso; }
  }

  formatDateOnly(iso: string): string {
    if (!iso) return new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' });
    try { return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }); }
    catch { return '—'; }
  }

  formatTimeOnly(iso: string): string {
    if (!iso) return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  }

  quoteValidTill(): string {
    const base = this.generatedAt ? new Date(this.generatedAt) : new Date();
    const till = new Date(base);
    till.setDate(till.getDate() + 7);
    return till.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  agentCode(): string {
    if (this.quoteId) return `IM-${this.quoteId.slice(-7).toUpperCase()}`;
    return this.systemId ? `IM-${this.systemId.slice(0, 7).toUpperCase()}` : '—';
  }

  correlationId(): string {
    return this.systemId || this.quoteId || '';
  }
}
