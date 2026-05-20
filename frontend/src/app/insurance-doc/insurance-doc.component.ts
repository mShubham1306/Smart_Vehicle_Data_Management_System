import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-insurance-doc',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  styles: [`
    :host { display: block; font-family: 'Inter', 'Segoe UI', Arial, Helvetica, sans-serif; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .doc {
      background: #fff;
      color: #1a1a1a;
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      font-size: 11px;
      line-height: 1.45;
      border: 1px solid #e8e8e8;
    }

    /* ── Header ── */
    .hdr {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 3px solid #F58220;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 52px; height: 52px;
      background: linear-gradient(135deg, #EE3124, #c41e12);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 900; font-size: 18px; letter-spacing: -0.5px;
    }
    .brand-name { font-size: 20px; font-weight: 800; color: #1a1a1a; }
    .brand-sub { font-size: 10px; color: #666; margin-top: 2px; }
    .hdr-logo-img { max-height: 48px; max-width: 140px; object-fit: contain; }
    .greeting {
      max-width: 420px;
      font-size: 11px;
      color: #444;
      line-height: 1.55;
      text-align: right;
    }
    .greeting strong { color: #1a1a1a; }

    /* ── Section bar (ICICI orange) ── */
    .sec-bar {
      background: linear-gradient(90deg, #FDE8D4, #FCD5B0);
      border-left: 4px solid #F58220;
      padding: 7px 14px;
      font-size: 11px;
      font-weight: 800;
      color: #7a3d00;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .sec-block { border-bottom: 1px solid #eee; }
    .sec-body { padding: 12px 16px; }

    /* ── Two-column detail grid ── */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 28px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px 16px;
    }
    .d-item { display: flex; flex-direction: column; gap: 2px; }
    .d-lbl {
      font-size: 9px; font-weight: 600; color: #888;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .d-val { font-size: 11px; font-weight: 700; color: #1a1a1a; word-break: break-word; }
    .d-val.accent { color: #C41E12; }
    .d-val.muted { color: #555; font-weight: 600; }

    /* ── Premium tables ── */
    .prem-wrap { padding: 0; }
    .prem-table { width: 100%; border-collapse: collapse; }
    .prem-table th {
      background: #f5f5f5;
      text-align: left;
      padding: 8px 12px;
      font-size: 9px;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      border-bottom: 1px solid #ddd;
    }
    .prem-table td {
      padding: 7px 12px;
      font-size: 11px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }
    .prem-table .r { text-align: right; font-weight: 600; white-space: nowrap; }
    .prem-table .sub-hd td {
      background: #fafafa;
      font-weight: 800;
      font-size: 10px;
      color: #333;
      border-top: 1px solid #e0e0e0;
    }
    .prem-table .tot td { background: #fff8f0; font-weight: 800; border-top: 2px solid #F58220; }
    .prem-table .grand td {
      background: linear-gradient(90deg, #F58220, #e86f10);
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      border: none;
    }
    .prem-table .save td { background: #f0fdf4; color: #15803d; font-weight: 700; }
    .prem-table .disc td { color: #15803d; }
    .check { color: #22c55e; font-weight: 900; margin-right: 4px; }

    /* ── Long-term comparison ── */
    .lt-table { width: 100%; border-collapse: collapse; margin-top: 0; }
    .lt-table th {
      background: #F58220;
      color: #fff;
      padding: 8px;
      font-size: 10px;
      font-weight: 700;
      text-align: center;
    }
    .lt-table td {
      padding: 10px 8px;
      text-align: center;
      border: 1px solid #eee;
      font-weight: 700;
      font-size: 11px;
    }
    .lt-table .best {
      background: #f0fdf4;
      border: 2px solid #22c55e;
      position: relative;
    }
    .save-badge {
      display: inline-block;
      background: #22c55e;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 100px;
      margin-top: 4px;
    }
    .strike { text-decoration: line-through; color: #999; font-size: 10px; font-weight: 500; display: block; }

    /* ── Metadata strip ── */
    .meta-strip {
      background: #f8f9fa;
      border-top: 1px dashed #ddd;
      border-bottom: 1px dashed #ddd;
      padding: 10px 16px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 16px;
    }
    .meta-title {
      font-size: 9px;
      font-weight: 800;
      color: #F58220;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      grid-column: 1 / -1;
    }

    /* ── Disclaimer ── */
    .disclaimer {
      padding: 10px 16px;
      font-size: 9px;
      color: #c41e12;
      font-weight: 600;
      font-style: italic;
      border-bottom: 1px solid #eee;
    }
    .fine-print {
      padding: 8px 16px;
      font-size: 8px;
      color: #888;
      line-height: 1.5;
    }

    /* ── Footer bar ── */
    .footer-bar {
      background: linear-gradient(90deg, #F58220, #e86f10);
      color: #fff;
      padding: 14px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .footer-contact { display: flex; flex-wrap: wrap; gap: 16px; font-size: 10px; font-weight: 600; }
    .footer-contact span { display: flex; align-items: center; gap: 5px; }
    .footer-legal { font-size: 7px; opacity: 0.85; text-align: right; max-width: 280px; line-height: 1.4; }

    @media print {
      .doc { border: none; max-width: 100%; }
      .sec-block { page-break-inside: avoid; }
    }
  `],
  template: `
    <div class="doc" *ngIf="data" id="ins-doc-main">

      <!-- HEADER -->
      <div class="hdr">
        <div class="logo-wrap">
          <img *ngIf="logoUrl" [src]="logoUrl" alt="Logo" class="hdr-logo-img" (error)="onImgErr($event)">
          <div *ngIf="!logoUrl || logoFailed">
            <div class="logo-box">SI</div>
          </div>
          <div>
            <div class="brand-name">SmartInsure</div>
            <div class="brand-sub">Vehicle Data Management Platform</div>
          </div>
        </div>
        <div class="greeting">
          <strong>Dear Customer,</strong><br>
          Thank you for considering SmartInsure for your vehicle insurance needs.
          Your quotation was generated on <strong>{{ formatDate(generatedAt) }}</strong>
          and is valid for <strong>7 days</strong> from the date of issue.
        </div>
      </div>

      <!-- GENERATED METADATA -->
      <div class="meta-strip">
        <div class="meta-title">Document Generation Details</div>
        <div class="meta-grid">
          <div class="d-item"><span class="d-lbl">Generated By</span><span class="d-val">{{ generatedByName || '—' }}</span></div>
          <div class="d-item"><span class="d-lbl">Agent Name</span><span class="d-val">{{ agentName || '—' }}</span></div>
          <div class="d-item"><span class="d-lbl">Field Agent</span><span class="d-val">{{ fieldAgentName || '—' }}</span></div>
          <div class="d-item"><span class="d-lbl">Admin (Creator)</span><span class="d-val">{{ adminName || '—' }}</span></div>
          <div class="d-item"><span class="d-lbl">User Role</span><span class="d-val">{{ userRole || '—' }}</span></div>
          <div class="d-item"><span class="d-lbl">Quote ID</span><span class="d-val accent">{{ quoteId || 'Pending' }}</span></div>
          <div class="d-item"><span class="d-lbl">System ID</span><span class="d-val muted" style="font-size:9px">{{ systemId || '—' }}</span></div>
          <div class="d-item"><span class="d-lbl">Generated Date</span><span class="d-val">{{ formatDateOnly(generatedAt) }}</span></div>
          <div class="d-item"><span class="d-lbl">Generated Time</span><span class="d-val">{{ formatTimeOnly(generatedAt) }}</span></div>
        </div>
      </div>

      <!-- CUSTOMER INFORMATION -->
      <div class="sec-block">
        <div class="sec-bar">Customer Information</div>
        <div class="sec-body grid-2">
          <div class="d-item">
            <span class="d-lbl">Insured Name</span>
            <span class="d-val">{{ f('ownerName','OWNER NAME','customer name','NAME','insured name') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Mobile Number</span>
            <span class="d-val">{{ f('ownerMobileNo','MOBILE','mobile','OWNER MOBILE NO','phone','contact') || '—' }}</span>
          </div>
          <div class="d-item" style="grid-column: 1 / -1">
            <span class="d-lbl">Correspondence Address</span>
            <span class="d-val">{{ f('ownerAddress','OWNER ADDRESS','address','ADDRESS') || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- VEHICLE DETAILS -->
      <div class="sec-block">
        <div class="sec-bar">Vehicle Details</div>
        <div class="sec-body grid-2">
          <div class="d-item">
            <span class="d-lbl">Registration Number</span>
            <span class="d-val accent">{{ vehicleNumber || f('Vehicle','vehicle','VEHICLE NO','registration') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">RTO Location</span>
            <span class="d-val">{{ f('rtoLocation','RTO','rto','state','RTO LOCATION') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Manufacture / Model</span>
            <span class="d-val">{{ f('vehicleManufacturerName','vehicleMake','make','MANUFACTURER') }} {{ f('vehicleModel','model','VEHICLE MODEL') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Manufacturing Year</span>
            <span class="d-val">{{ f('manufacturingYear','YEAR','year','mfg year') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Engine Number</span>
            <span class="d-val">{{ f('engineNum','engine number','engine no','ENGINE') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Chassis Number</span>
            <span class="d-val">{{ f('chassisNum','chassis number','chassis no','CHASSIS') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Fuel Type</span>
            <span class="d-val">{{ f('fuelType','FUEL','fuel') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Vehicle Class</span>
            <span class="d-val">{{ f('vehicleClass','class','TYPE','vehicle type') || 'Two Wheeler' }}</span>
          </div>
        </div>
      </div>

      <!-- QUOTE DETAILS -->
      <div class="sec-block">
        <div class="sec-bar">Quote Details</div>
        <div class="sec-body grid-2">
          <div class="d-item">
            <span class="d-lbl">Insurance Plan</span>
            <span class="d-val">{{ f('insurancePlan','plan','PLAN','vehicleInsuranceCompanyName') || 'Two Wheeler Package' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Tenure</span>
            <span class="d-val">{{ f('tenure','TENURE') || '1 Year Own Damage' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Insured Declared Value (IDV)</span>
            <span class="d-val accent">₹ {{ fmtAmt(f('idv','IDV','insuredDeclaredValue') || idvDisplay()) }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Previous Insurer</span>
            <span class="d-val">{{ f('vehicleInsuranceCompanyName','insurer','INSURANCE COMPANY','company') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Quote Start Date &amp; Time</span>
            <span class="d-val">{{ formatDate(generatedAt) }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Quote Valid Till</span>
            <span class="d-val">{{ quoteValidTill() }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Policy Expiry / Due Date</span>
            <span class="d-val accent">{{ f('expiredInsuranceUpto','DUE DATE','due date','EXPIRY DATE','expiry') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Previous Policy Number</span>
            <span class="d-val">{{ f('vehicleInsurancePolicyNumber','policy number','policy no','POLICY') || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- PLAN & PREMIUM DETAILS -->
      <div class="sec-block">
        <div class="sec-bar">Plan and Premium Details</div>
        <div class="prem-wrap">
          <table class="prem-table">
            <thead>
              <tr>
                <th style="width:55%">Description</th>
                <th class="r" style="width:45%">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="sub-hd">
                <td colspan="2">Quote ID: <strong>{{ quoteId || '—' }}</strong> &nbsp;|&nbsp; Plan: <strong>Basic Plan</strong></td>
              </tr>
              <tr class="sub-hd">
                <td colspan="2"><strong>Own Damage (A)</strong></td>
              </tr>
              <tr>
                <td>
                  <span class="check" *ngIf="hasZeroDep()">✓</span>
                  Zero Depreciation Cover
                  <span *ngIf="hasZeroDep()" style="color:#888;font-size:9px"> — Plan Type: SILVER</span>
                </td>
                <td class="r">{{ currency(calcZeroDep()) }}</td>
              </tr>
              <tr>
                <td>Basic OD Premium</td>
                <td class="r">{{ currency(calcBasicOD()) }}</td>
              </tr>
              <tr class="disc">
                <td>Less: No Claim Bonus (NCB)</td>
                <td class="r">- {{ currency(calcNCB()) }}</td>
              </tr>
              <tr>
                <td>Add-on Cover Premium</td>
                <td class="r">{{ currency(calcAddOn()) }}</td>
              </tr>
              <tr class="tot">
                <td><strong>Total Own Damage Premium (A)</strong></td>
                <td class="r"><strong>{{ currency(calcODTotal()) }}</strong></td>
              </tr>
              <tr class="sub-hd">
                <td colspan="2"><strong>Third Party (B)</strong></td>
              </tr>
              <tr>
                <td>Basic TP Premium</td>
                <td class="r">{{ currency(f('tpPremium','TP PREMIUM','third party') || '0') }}</td>
              </tr>
              <tr class="tot">
                <td><strong>Total Third Party Premium (B)</strong></td>
                <td class="r"><strong>{{ currency(calcTPTotal()) }}</strong></td>
              </tr>
              <tr class="sub-hd">
                <td colspan="2"><strong>Total Premium (A + B + C)</strong></td>
              </tr>
              <tr>
                <td>Net Premium (A + B)</td>
                <td class="r">{{ currency(calcNet()) }}</td>
              </tr>
              <tr>
                <td>GST &#64; 18% (C)</td>
                <td class="r">{{ currency(calcGST()) }}</td>
              </tr>
              <tr class="grand">
                <td>Total Premium Payable (A + B + C)</td>
                <td class="r">₹ {{ fmtAmt(total()) }}</td>
              </tr>
              <tr class="save" *ngIf="savingsAmount() > 0">
                <td colspan="2" style="text-align:center">
                  🎉 You save approximately <strong>₹ {{ fmtAmt(savingsAmount()) }}</strong> with applicable NCB &amp; add-on benefits
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- LONG TERM PLAN COMPARISON -->
      <div class="sec-block">
        <div class="sec-bar">Save more with Long Term Plans</div>
        <div class="sec-body" style="padding:12px 16px 16px">
          <table class="lt-table">
            <thead>
              <tr>
                <th>Plan Type</th>
                <th>1 Year</th>
                <th>2 Year</th>
                <th>3 Year</th>
                <th>4 Year</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:800;background:#fafafa">Basic Plan</td>
                <td>₹ {{ fmtAmt(totalNum()) }}</td>
                <td>₹ {{ fmtAmt(ltPremium(2)) }}</td>
                <td>₹ {{ fmtAmt(ltPremium(3)) }}</td>
                <td [class.best]="true">
                  <span class="strike">₹ {{ fmtAmt(ltPremium(4, false)) }}</span>
                  ₹ {{ fmtAmt(ltPremium(4)) }}
                  <span class="save-badge">Save ₹{{ fmtAmt(ltSavings(4)) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- AGENT / PARTNER DETAILS -->
      <div class="sec-block" *ngIf="agentName || fieldAgentName || generatedByName">
        <div class="sec-bar">Agent / Partner Details</div>
        <div class="sec-body grid-2">
          <div class="d-item">
            <span class="d-lbl">Agent Name</span>
            <span class="d-val">{{ agentName || generatedByName || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Field Agent</span>
            <span class="d-val">{{ fieldAgentName || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Location</span>
            <span class="d-val">{{ f('location','LOCATION','city','rtoLocation') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Agent Code</span>
            <span class="d-val">{{ agentCode() }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Contact</span>
            <span class="d-val">{{ f('agentMobile','agent mobile','partner mobile') || f('ownerMobileNo','MOBILE') || '—' }}</span>
          </div>
          <div class="d-item">
            <span class="d-lbl">Vertical</span>
            <span class="d-val">{{ userRole || 'Insurance Partner' }}</span>
          </div>
        </div>
      </div>

      <div class="disclaimer">
        The displayed quotation is valid subject to satisfactory break-in inspection, if applicable.
        This is a system-generated document and does not require a physical signature.
      </div>

      <div class="fine-print" *ngIf="correlationId()">
        Correlation ID: {{ correlationId() }} | Generated via SmartInsure Platform
      </div>

      <!-- FOOTER -->
      <div class="footer-bar">
        <div class="footer-contact">
          <span>🌐 insuradrive.vercel.app</span>
          <span>💬 WhatsApp Support</span>
          <span>✉ support&#64;smartinsure.in</span>
          <span>📞 1800-266-4545 (Toll Free)</span>
        </div>
        <div class="footer-legal">
          SmartInsure — Vehicle Data Management Platform.
          UIN: IRDAN123RP0001V01200001 | CIN: U67200MH2000PLC129408
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
    if (this.quoteId) return `SI-${this.quoteId.slice(-8)}`;
    return this.systemId ? `SI-${this.systemId.slice(0, 8).toUpperCase()}` : '—';
  }

  correlationId(): string {
    return this.systemId || this.quoteId || '';
  }
}
