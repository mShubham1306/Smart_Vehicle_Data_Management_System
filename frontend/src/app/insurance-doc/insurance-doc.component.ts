import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-insurance-doc',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  styles: [`
    :host { display:block; font-family: 'Inter', Arial, Helvetica, sans-serif; }
    * { box-sizing:border-box; margin:0; padding:0; }

    /* ══ DOCUMENT WRAPPER ══ */
    .doc {
      background:#fff;
      color:#111;
      width:100%;
      max-width:860px;
      margin:0 auto;
      border:1px solid #ccc;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      font-size:12px;
      line-height: 1.4;
    }

    /* ══ HEADER ══ */
    .hdr {
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:16px 30px;
      background:#fff;
      border-bottom: 4px solid #EE3124;
    }

    .logo-block img { max-height: 50px; object-fit: contain; }
    
    .hdr-right { text-align:right; }
    .hdr-title { font-size:18px; font-weight:900; color:#003087; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
    .hdr-subtitle { font-size:11px; font-weight:600; color:#555; }

    /* ══ META BAR ══ */
    .meta-bar {
      display:flex; justify-content:space-between; padding:8px 30px;
      background:#f8f9fa; border-bottom:1px solid #e0e0e0;
      font-size:10px; font-weight:600; color:#444;
    }
    .meta-item span { color:#111; font-weight:700; }

    /* ══ SECTIONS ══ */
    .section { margin: 15px 30px; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
    .sec-hd {
      background:#003087; color:#fff; padding:6px 12px;
      font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
    }
    
    .sec-content { padding: 12px; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap: 12px 24px; }
    
    .d-row { display:flex; flex-direction:column; margin-bottom:8px; }
    .d-lbl { font-size:9px; font-weight:700; color:#666; text-transform:uppercase; }
    .d-val { font-size:12px; font-weight:700; color:#111; word-break:break-word; }
    .d-val.highlight { color:#003087; }
    
    /* ══ PREMIUM TABLE ══ */
    .prem-table { width:100%; border-collapse:collapse; }
    .prem-table th { background:#f5f5f5; text-align:left; padding:8px; font-size:10px; font-weight:700; color:#444; text-transform:uppercase; border-bottom:1px solid #ddd; }
    .prem-table td { padding:8px; font-size:11px; font-weight:600; border-bottom:1px solid #eee; }
    .prem-table tr:last-child td { border-bottom:none; }
    .val-col { text-align:right; }
    
    .tot-row td { background:#f8f9fa; font-weight:800; font-size:12px; border-top:1px solid #ccc; }
    .final-row td { background:#EE3124; color:#fff; font-size:14px; font-weight:900; }

    /* ══ FOOTER ══ */
    .footer {
      background:#f8f9fa; padding:15px 30px; text-align:center;
      font-size:9px; color:#555; border-top:1px solid #ddd; margin-top:20px;
    }
    .footer strong { color:#111; }
    
    /* ══ PRINT STYLES ══ */
    @media print {
      .doc { box-shadow:none; border:none; margin:0; max-width:100%; width:100%; }
      .section { page-break-inside: avoid; }
    }
  `],
  template: `
    <div class="doc" *ngIf="data" id="ins-doc-main">

      <!-- 1. HEADER -->
      <div class="hdr">
        <div class="logo-block">
          <img src="/IMG-20260422-WA0003.jpg" alt="ICICI Lombard" (error)="onImgErr($event, 'https://upload.wikimedia.org/wikipedia/commons/8/87/ICICI_Lombard_Logo.svg')">
        </div>
        <div class="hdr-right">
          <div class="hdr-title">Two Wheeler Insurance</div>
          <div class="hdr-subtitle">Stand Alone Own Damage Renewal</div>
        </div>
      </div>

      <!-- 2. META BAR -->
      <div class="meta-bar">
        <div class="meta-item">Quote ID: <span>{{ quoteId || '—' }}</span></div>
        <div class="meta-item">Generated: <span>{{ (generatedAt | date:'medium') || '—' }}</span></div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0;">
        <!-- 3. CUSTOMER DETAILS -->
        <div class="section" style="margin-right:15px">
          <div class="sec-hd">Customer Details</div>
          <div class="sec-content grid-2">
            <div class="d-row">
              <span class="d-lbl">Insured Name</span>
              <span class="d-val">{{ f('ownerName','OWNER NAME','customer name','NAME') || '—' }}</span>
            </div>
            <div class="d-row">
              <span class="d-lbl">Mobile No</span>
              <span class="d-val">{{ f('ownerMobileNo','MOBILE','mobile','OWNER MOBILE NO','phone') || '—' }}</span>
            </div>
            <div class="d-row" style="grid-column: 1 / -1;">
              <span class="d-lbl">Address</span>
              <span class="d-val">{{ f('ownerAddress','OWNER ADDRESS','address','ADDRESS') || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- 4. VEHICLE DETAILS -->
        <div class="section" style="margin-left:0">
          <div class="sec-hd">Vehicle Details</div>
          <div class="sec-content grid-2">
            <div class="d-row">
              <span class="d-lbl">Vehicle Number</span>
              <span class="d-val highlight">{{ vehicleNumber || f('Vehicle','vehicle','VEHICLE NO') || '—' }}</span>
            </div>
            <div class="d-row">
              <span class="d-lbl">Make / Model</span>
              <span class="d-val">{{ f('vehicleManufacturerName','vehicleMake','make') }} / {{ f('vehicleModel','model','VEHICLE MODEL') || '—' }}</span>
            </div>
            <div class="d-row">
              <span class="d-lbl">Engine No</span>
              <span class="d-val">{{ f('engineNum','engine number','engine no') || '—' }}</span>
            </div>
            <div class="d-row">
              <span class="d-lbl">Chassis No</span>
              <span class="d-val">{{ f('chassisNum','chassis number','chassis no') || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. QUOTE DETAILS -->
      <div class="section">
        <div class="sec-hd">Quote Details</div>
        <div class="sec-content grid-2">
          <div class="d-row">
            <span class="d-lbl">Insured Declared Value (IDV)</span>
            <span class="d-val highlight">&#8377; {{ f('idv','IDV','insuredDeclaredValue') || fmtAmt(total()) }}</span>
          </div>
          <div class="d-row">
            <span class="d-lbl">Expiry Date</span>
            <span class="d-val" style="color:#EE3124">{{ f('expiredInsuranceUpto','DUE DATE','due date','EXPIRY DATE') || '—' }}</span>
          </div>
          <div class="d-row">
            <span class="d-lbl">Previous Policy No</span>
            <span class="d-val">{{ f('vehicleInsurancePolicyNumber','policy number','policy no') || '—' }}</span>
          </div>
          <div class="d-row">
            <span class="d-lbl">Tenure</span>
            <span class="d-val">{{ f('tenure','TENURE') || '1 Year' }}</span>
          </div>
        </div>
      </div>

      <!-- 6 & 7. PREMIUM BREAKDOWN & ADD-ONS -->
      <div class="section">
        <div class="sec-hd">Premium Calculation</div>
        <table class="prem-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="val-col">Premium (&#8377;)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Own Damage Premium</td>
              <td class="val-col">{{ f('basicODPremium','BASIC PREMIUM','basicOD') || calcBasicOD() }}</td>
            </tr>
            <tr>
              <td>Zero Depreciation Cover</td>
              <td class="val-col">{{ f('zeroDepPremium','ZERO DEP','zeroDep') || calcZeroDep() }}</td>
            </tr>
            <tr>
              <td>Add-on Cover Premium</td>
              <td class="val-col">{{ f('addOnPremium','withAddOnPremium','addOn') || calcAddOn() }}</td>
            </tr>
            <tr>
              <td>Less: No Claim Bonus (NCB)</td>
              <td class="val-col" style="color:green">- {{ f('ncb','NCB','noClaimBonus') || calcNCB() }}</td>
            </tr>
            <tr class="tot-row">
              <td>Net Premium</td>
              <td class="val-col">{{ calcNet() }}</td>
            </tr>
            <tr>
              <td>Add: GST (18%)</td>
              <td class="val-col">{{ calcGST() }}</td>
            </tr>
            <tr class="final-row">
              <td>Total Premium Payable</td>
              <td class="val-col">&#8377; {{ fmtAmt(total()) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 9. AGENT DETAILS -->
      <div class="section" *ngIf="agentName || generatedByName">
        <div class="sec-hd" style="background:#444;">Partner Details</div>
        <div class="sec-content" style="display:flex; justify-content:space-around; text-align:center;">
          <div class="d-row" *ngIf="agentName">
            <span class="d-lbl">Agent</span>
            <span class="d-val">{{ agentName }}</span>
          </div>
          <div class="d-row" *ngIf="fieldAgentName">
            <span class="d-lbl">Field Agent</span>
            <span class="d-val">{{ fieldAgentName }}</span>
          </div>
          <div class="d-row" *ngIf="generatedByName">
            <span class="d-lbl">Generated By</span>
            <span class="d-val">{{ generatedByName }}</span>
          </div>
        </div>
      </div>

      <!-- 10. FOOTER -->
      <div class="footer">
        <p>This is a system generated quotation and does not require physical signature.</p>
        <p style="margin-top:4px"><strong>SmartInsure</strong> - Empowering Insurance Partners. For any discrepancies, please contact support.</p>
      </div>

    </div>
  `
})
export class InsuranceDocComponent implements OnChanges {
  @Input() data: any = null;
  @Input() vehicleNumber: string = '';
  
  // New Inputs for tracking
  @Input() quoteId: string = '';
  @Input() systemId: string = '';
  @Input() generatedByName: string = '';
  @Input() agentName: string = '';
  @Input() fieldAgentName: string = '';
  @Input() adminName: string = '';
  @Input() userRole: string = '';
  @Input() generatedAt: string = '';

  ngOnChanges(_c: SimpleChanges) {
    this._normMap = {};
    if (this.data) {
      for (const k of Object.keys(this.data)) {
        const norm = k.toLowerCase().replace(/[\s_\-\.]+/g, '');
        this._normMap[norm] = k;
      }
    }
  }

  private _normMap: Record<string, string> = {};
  private _junk = new Set(['', 'nan', 'none', 'null', 'n/a', 'na', '-', '0', 'undefined']);

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
    const raw = this.f('totalPremium', 'saleAmount', 'total_premium', 'premium', 'FINAL PREMIUM', 'final premium');
    const n = parseFloat(String(raw || '0').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? '0' : String(n);
  }

  private totalNum(): number { return parseFloat(this.total()) || 0; }

  private netNum(): number {
    const ff = this.f('netPremium', 'nt premium', 'NT PREMIUM', 'net_premium', 'netAmount');
    if (ff) return parseFloat(ff.replace(/[^0-9.]/g, '')) || 0;
    const t = this.totalNum();
    return t ? Math.round(t / 1.18) : 0;
  }

  calcNet(): string {
    const n = this.netNum();
    return n ? n.toLocaleString('en-IN') : '—';
  }

  calcGST(): string {
    const ff = this.f('gstAmount', 'gst', 'GST', 'GST PREMIUM', 'gst premium');
    if (ff) return this.fmtAmt(ff);
    const t = this.totalNum();
    return t ? Math.round(t - t / 1.18).toLocaleString('en-IN') : '—';
  }

  calcBasicOD(): string {
    const ff = this.f('basicODPremium', 'BASIC PREMIUM', 'basic od', 'basicOD');
    if (ff) return this.fmtAmt(ff);
    const n = this.netNum();
    return n ? Math.round(n * 0.65).toLocaleString('en-IN') : '—';
  }

  calcNCB(): string {
    const ff = this.f('ncb', 'NCB', 'noClaimBonus', 'bonus');
    if (ff) return this.fmtAmt(ff);
    const n = this.netNum();
    return n ? Math.round(n * 0.10).toLocaleString('en-IN') : '—';
  }

  calcZeroDep(): string {
    const ff = this.f('zeroDepPremium', 'ZERO DEP', 'zeroDep');
    if (ff) return this.fmtAmt(ff);
    const n = this.netNum();
    return n ? Math.round(n * 0.35).toLocaleString('en-IN') : '—';
  }

  calcAddOn(): string {
    const ff = this.f('addOnPremium', 'withAddOnPremium', 'addOn');
    if (ff) return this.fmtAmt(ff);
    const n = this.netNum();
    return n ? Math.round(n * 0.10).toLocaleString('en-IN') : '—';
  }
}
