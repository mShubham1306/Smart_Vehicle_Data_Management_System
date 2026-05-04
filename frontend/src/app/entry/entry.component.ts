import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { DataService, SheetInfo } from '../data.service';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Field type detection (mirrors backend logic) ─────────────────────────────

type FieldType = 'vehicle' | 'mobile' | 'date' | 'currency' | 'policy' | 'text' | 'custom';

interface DynamicField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  isCustom: boolean;
  source: 'canonical' | 'detected' | 'custom';
  confidence?: number; // 0-100
}

const CANONICAL_LABELS: Record<string, { label: string; type: FieldType; required?: boolean }> = {
  'Vehicle':                      { label: 'Vehicle / Plate Number', type: 'vehicle',   required: true  },
  'Sr. No.':                      { label: 'Sr. No.',                type: 'text'                      },
  'engineNum':                    { label: 'Engine Number',          type: 'text'                      },
  'chassisNum':                   { label: 'Chassis Number',         type: 'text'                      },
  'ownerName':                    { label: 'Owner / Customer Name',  type: 'text'                      },
  'ownerAddress':                 { label: 'Address',                type: 'text'                      },
  'vehicleMake':                  { label: 'Vehicle Make / Brand',   type: 'text'                      },
  'vehicleModel':                 { label: 'Vehicle Model',          type: 'text'                      },
  'vehicleClass':                 { label: 'Vehicle Class / Type',   type: 'text'                      },
  'fuelType':                     { label: 'Fuel Type',              type: 'text'                      },
  'saleAmount':                   { label: 'Sale Amount (₹)',        type: 'currency'                  },
  'ownerMobileNo':                { label: 'Mobile / Phone Number',  type: 'mobile'                    },
  'vehicleManufacturerName':      { label: 'Manufacturer',           type: 'text'                      },
  'model':                        { label: 'Model Variant',          type: 'text'                      },
  'vehicleInsuranceCompanyName':  { label: 'Insurance Company',      type: 'text'                      },
  'expiredInsuranceUpto':         { label: 'Expiry / Due Date',      type: 'date'                      },
  'vehicleInsurancePolicyNumber': { label: 'Policy Number',          type: 'policy'                    },
  'basicODPremium':               { label: 'Basic OD Premium (₹)',   type: 'currency'                  },
  'zeroDepPremium':               { label: 'Zero Dep Premium (₹)',   type: 'currency'                  },
  'ncb':                          { label: 'NCB / No Claim Bonus',   type: 'currency'                  },
  'idv':                          { label: 'IDV (₹)',                type: 'currency'                  },
  'netPremium':                   { label: 'Net Premium (₹)',        type: 'currency'                  },
  'gstAmount':                    { label: 'GST Amount (₹)',         type: 'currency'                  },
  'totalPremium':                 { label: 'Total Premium (₹)',      type: 'currency'                  },
};

function detectFieldType(key: string): FieldType {
  const k = key.toLowerCase().replace(/[\s_\-\.]+/g, '');
  if (k.includes('vehicle') || k.includes('veh') || k.includes('reg') || k.includes('plate') || k.includes('rc')) return 'vehicle';
  if (k.includes('mobile') || k.includes('phone') || k.includes('contact') || k.includes('mob')) return 'mobile';
  if (k.includes('date') || k.includes('expiry') || k.includes('due') || k.includes('renewal') || k.includes('upto')) return 'date';
  if (k.includes('premium') || k.includes('amount') || k.includes('gst') || k.includes('idv') || k.includes('price')) return 'currency';
  if (k.includes('policy') || k.includes('certificate')) return 'policy';
  return 'text';
}

function isVehicleKey(key: string): boolean {
  return detectFieldType(key) === 'vehicle';
}

function buildDynamicFields(columns: string[]): DynamicField[] {
  return columns
    .filter(c => c && !c.startsWith('Unnamed') && c.toLowerCase() !== 'nan')
    .map(col => {
      const canonical = CANONICAL_LABELS[col];
      return {
        key: col,
        label: canonical?.label ?? humanize(col),
        type: canonical?.type ?? detectFieldType(col),
        required: canonical?.required ?? isVehicleKey(col),
        isCustom: !canonical,
        source: canonical ? 'canonical' : 'detected',
        confidence: canonical ? 100 : 70,
      } as DynamicField;
    });
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

const API = environment.apiUrl;

@Component({
  selector: 'app-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  styles: [`
    :host { display:block; }
    .field-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:14px; }
    .field-grid.grid-2 { grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); }
    .dfield { background:#0c0c0c; border:1px solid #222; border-radius:12px; padding:14px 16px; transition:border-color 0.2s; position:relative; }
    .dfield:hover { border-color:#333; }
    .dfield.veh-field { border-color:rgba(239,68,68,0.5); background:rgba(239,68,68,0.03); }
    .dfield.custom-field { border-color:rgba(99,102,241,0.3); }
    .field-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#555; margin-bottom:6px; display:flex; align-items:center; gap:5px; }
    .field-label.veh { color:#ef4444; }
    .dfield input, .dfield textarea {
      width:100%; background:#111; border:1px solid #2a2a2a; border-radius:8px; color:#f0f0f0;
      padding:10px 12px; font-size:0.82rem; outline:none; transition:border-color 0.2s;
      box-sizing:border-box; font-family:'Inter',sans-serif; resize:vertical;
    }
    .dfield input:focus, .dfield textarea:focus { border-color:#ef4444; }
    .dfield.veh-field input:focus { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1); }
    .type-badge { font-size:0.5rem; padding:1px 6px; border-radius:100px; font-weight:700; letter-spacing:0.4px; }
    .type-vehicle  { background:rgba(239,68,68,0.15); color:#ef4444; }
    .type-mobile   { background:rgba(34,197,94,0.12); color:#22c55e; }
    .type-date     { background:rgba(245,158,11,0.12); color:#f59e0b; }
    .type-currency { background:rgba(59,130,246,0.12); color:#60a5fa; }
    .type-policy   { background:rgba(168,85,247,0.12); color:#a855f7; }
    .type-custom   { background:rgba(99,102,241,0.12); color:#818cf8; }
    .type-text     { background:rgba(255,255,255,0.06); color:#888; }
    .mode-btn { padding:8px 18px; border-radius:10px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.2s; border:1px solid #333; }
    .mode-btn.active { background:#ef4444; color:#fff; border-color:rgba(239,68,68,0.5); }
    .mode-btn:not(.active) { background:rgba(255,255,255,0.03); color:#888; }
    .grid-table { width:100%; border-collapse:collapse; font-size:0.78rem; }
    .grid-table th { padding:8px 10px; text-align:left; font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.7px; color:#555; background:#0c0c0c; border-bottom:1px solid #262626; }
    .grid-table td { padding:4px 6px; border-bottom:1px solid #1a1a1a; }
    .grid-table td input { width:100%; background:#0c0c0c; border:1px solid #222; border-radius:6px; color:#e8e8e8; padding:7px 9px; font-size:0.78rem; outline:none; font-family:'Inter',sans-serif; }
    .grid-table td input:focus { border-color:#ef4444; }
    .btn-save { background:linear-gradient(135deg,#ef4444,#b91c1c); color:#fff; border:none; border-radius:12px; padding:13px 36px; font-size:0.88rem; font-weight:800; cursor:pointer; transition:all 0.2s; font-family:'Inter',sans-serif; }
    .btn-save:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(239,68,68,0.4); }
    .btn-save:disabled { opacity:0.5; cursor:not-allowed; }
    .info-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:100px; font-size:0.62rem; font-weight:700; }
    .conf-bar { height:3px; border-radius:2px; background:#333; margin-top:6px; overflow:hidden; }
    .conf-fill { height:100%; border-radius:2px; transition:width 0.3s; }
    .add-field-row { display:flex; gap:8px; align-items:center; margin-top:14px; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block; }
  `],
  template: `
    <div style="font-family:'Inter',sans-serif">

      <!-- ── PAGE HEADER ──────────────────────────────────────────── -->
      <div class="mb-6">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Data Entry</h1>
        <p class="text-sm text-textGray mt-1">
          Universal dynamic form — adapts automatically to <strong style="color:#e8e8e8">any sheet structure</strong>, any field names, any schema.
        </p>
      </div>

      <!-- ── SHEET SELECTOR ─────────────────────────────────────── -->
      <div class="rounded-2xl mb-5 overflow-hidden" style="background:#141414; border:1px solid #262626">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4" style="border-bottom:1px solid #262626">
          <div class="flex items-center gap-2">
            <span class="text-lg">📋</span>
            <div>
              <p class="text-xs font-bold text-textLight">Active Sheet — <span style="color:#ef4444">{{ activeSheet }}</span></p>
              <p class="text-[10px] text-textGray">Form auto-adapts to this sheet's schema</p>
            </div>
          </div>
          <div *ngIf="isAdmin" class="flex items-center gap-2">
            <div *ngIf="showNewSheet" class="flex items-center gap-2">
              <input type="text" [(ngModel)]="newSheetName" (keyup.enter)="createSheet()"
                placeholder="Sheet name…" class="input-field px-3 py-2 text-sm w-36" style="height:36px">
              <button (click)="createSheet()" [disabled]="creatingSheet" class="btn-red px-4 py-2 text-xs font-bold disabled:opacity-50" style="height:36px">
                <span *ngIf="!creatingSheet">✓</span>
                <span *ngIf="creatingSheet" class="spin"></span>
              </button>
              <button (click)="cancelNewSheet()" class="px-3 py-2 text-xs text-textGray" style="height:36px">✕</button>
            </div>
            <button *ngIf="!showNewSheet" (click)="showNewSheet=true"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-textGray"
              style="background:rgba(255,255,255,0.04); border:1px solid #333; height:36px">
              <span>+</span> New Sheet
            </button>
          </div>
        </div>

        <!-- Sheet Tabs -->
        <div class="flex gap-1.5 px-4 py-3 flex-wrap">
          <button *ngFor="let s of sheets"
            (click)="selectSheet(s.name)"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            [style.background]="activeSheet===s.name ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)'"
            [style.color]="activeSheet===s.name ? '#ef4444' : '#888'"
            [style.border]="activeSheet===s.name ? '1px solid rgba(239,68,68,0.3)' : '1px solid #222'">
            {{ s.name }}
            <span class="ml-1 opacity-60">{{ s.vehicle_count }}</span>
          </button>
        </div>
      </div>

      <!-- ── SCHEMA INTELLIGENCE BAR ─────────────────────────────── -->
      <div *ngIf="!loadingCols && dynamicFields.length" class="flex flex-wrap items-center gap-3 mb-5 px-1">
        <span class="info-pill" style="background:rgba(239,68,68,0.08); color:#ef4444; border:1px solid rgba(239,68,68,0.2)">
          🧠 {{ dynamicFields.length }} Fields Detected
        </span>
        <span class="info-pill" style="background:rgba(34,197,94,0.08); color:#22c55e; border:1px solid rgba(34,197,94,0.2)">
          ✓ {{ canonicalCount }} Normalized
        </span>
        <span *ngIf="customCount" class="info-pill" style="background:rgba(99,102,241,0.08); color:#818cf8; border:1px solid rgba(99,102,241,0.2)">
          ✦ {{ customCount }} Custom / Raw
        </span>
        <span *ngIf="!vehicleKey" class="info-pill" style="background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.3)">
          ⚠ No vehicle key detected
        </span>
        <span *ngIf="vehicleKey" class="info-pill" style="background:rgba(239,68,68,0.08); color:#ef4444; border:1px solid rgba(239,68,68,0.2)">
          🔑 Key: {{ vehicleKey }}
        </span>
      </div>

      <!-- ── MODE SWITCHER ─────────────────────────────────────────── -->
      <div class="flex items-center gap-2 mb-5 flex-wrap">
        <button class="mode-btn" [class.active]="mode==='smart'" (click)="mode='smart'">📝 Smart Form</button>
        <button class="mode-btn" [class.active]="mode==='grid'" (click)="mode='grid'">🔲 Grid Mode</button>
        <button class="mode-btn" [class.active]="mode==='paste'" (click)="mode='paste'">📋 Bulk Paste</button>
      </div>

      <!-- ── LOADING ─────────────────────────────────────────────── -->
      <div *ngIf="loadingCols" class="flex items-center justify-center py-20">
        <div class="w-10 h-10 rounded-full border-2 animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- MODE A: SMART UNIVERSAL FORM                             -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div *ngIf="mode==='smart' && !loadingCols">
        <div *ngIf="dynamicFields.length" class="rounded-2xl overflow-hidden" style="background:#141414; border:1px solid #262626">
          <div class="px-5 py-4 flex items-center justify-between" style="border-bottom:1px solid #262626">
            <p class="text-sm font-bold text-textLight">New Record — <span style="color:#a5b4fc">{{ activeSheet }}</span></p>
            <button (click)="resetForm()" class="text-xs text-textGray hover:text-textLight px-3 py-1.5 rounded-lg transition-colors" style="background:rgba(255,255,255,0.04); border:1px solid #333">↺ Clear</button>
          </div>

          <div class="p-5">
            <div class="field-grid">
              <!-- VEHICLE KEY — always first, always highlighted -->
              <ng-container *ngIf="vehicleField">
                <div class="dfield veh-field">
                  <div class="field-label veh">
                    <span>{{ vehicleField.label }}</span>
                    <span class="type-badge type-vehicle">KEY</span>
                    <span class="type-badge type-vehicle">REQUIRED</span>
                  </div>
                  <input type="text" [(ngModel)]="formData[vehicleField.key]"
                    placeholder="e.g. GJ06RC1934"
                    (input)="autoFormat(vehicleField)"
                    style="font-weight:700; letter-spacing:2px; font-family:monospace; font-size:0.88rem">
                </div>
              </ng-container>

              <!-- ALL OTHER FIELDS -->
              <ng-container *ngFor="let field of nonVehicleFields">
                <div class="dfield"
                  [class.custom-field]="field.isCustom"
                  [style.grid-column]="isWide(field.key) ? 'span 2' : 'span 1'">
                  <div class="field-label">
                    <span>{{ field.label }}</span>
                    <span class="type-badge"
                      [class.type-mobile]="field.type==='mobile'"
                      [class.type-date]="field.type==='date'"
                      [class.type-currency]="field.type==='currency'"
                      [class.type-policy]="field.type==='policy'"
                      [class.type-custom]="field.isCustom"
                      [class.type-text]="field.type==='text' && !field.isCustom">
                      {{ field.isCustom ? 'CUSTOM' : field.type.toUpperCase() }}
                    </span>
                  </div>
                  <textarea *ngIf="isWide(field.key)"
                    [(ngModel)]="formData[field.key]"
                    [placeholder]="'Enter ' + field.label"
                    rows="2"></textarea>
                  <input *ngIf="!isWide(field.key)"
                    [type]="field.type==='date' ? 'text' : 'text'"
                    [(ngModel)]="formData[field.key]"
                    [placeholder]="fieldPlaceholder(field)"
                    (input)="autoFormat(field)">
                  <!-- Confidence bar for custom/detected fields -->
                  <div *ngIf="field.isCustom" class="conf-bar mt-2">
                    <div class="conf-fill" [style.width]="(field.confidence||70)+'%'"
                      style="background:linear-gradient(90deg,#6366f1,#818cf8)"></div>
                  </div>
                </div>
              </ng-container>
            </div>

            <!-- Add Custom Field Row -->
            <div class="add-field-row">
              <div class="flex-1 flex items-center gap-2 p-3 rounded-xl" style="background:#0c0c0c; border:1px dashed #333">
                <span class="text-sm mr-1">➕</span>
                <input type="text" [(ngModel)]="newFieldKey" placeholder="Add custom field name…"
                  (keyup.enter)="addCustomField()"
                  style="flex:1; background:transparent; border:none; color:#e8e8e8; font-size:0.82rem; outline:none; font-family:'Inter',sans-serif">
                <select [(ngModel)]="newFieldType"
                  style="background:#141414; border:1px solid #333; border-radius:8px; color:#888; padding:5px 8px; font-size:0.75rem; outline:none">
                  <option value="text">Text</option>
                  <option value="vehicle">Vehicle No</option>
                  <option value="mobile">Phone</option>
                  <option value="date">Date</option>
                  <option value="currency">Amount (₹)</option>
                  <option value="policy">Policy No</option>
                </select>
                <button (click)="addCustomField()" [disabled]="!newFieldKey.trim()"
                  class="px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                  style="background:rgba(99,102,241,0.12); color:#818cf8; border:1px solid rgba(99,102,241,0.3)">
                  Add
                </button>
              </div>
            </div>
          </div>

          <!-- Save Row -->
          <div class="px-5 pb-5 flex flex-wrap items-center gap-4">
            <button class="btn-save" (click)="save()" [disabled]="saving">
              <span *ngIf="!saving">💾 Save Record</span>
              <span *ngIf="saving" class="flex items-center gap-2"><span class="spin"></span> Saving…</span>
            </button>
            <button class="btn-save" style="background:linear-gradient(135deg,#16a34a,#15803d)"
              (click)="exportSheet()" *ngIf="isAdmin">
              📤 Export Sheet
            </button>
            <div *ngIf="successMsg" class="flex-1 text-sm font-semibold" style="color:#22c55e">{{ successMsg }}</div>
            <div *ngIf="errorMsg" class="flex-1 text-sm font-semibold" style="color:#ef4444">{{ errorMsg }}</div>
          </div>
        </div>

        <!-- Empty Schema State -->
        <div *ngIf="!dynamicFields.length && !loadingCols"
          class="flex flex-col items-center py-20 rounded-2xl text-center"
          style="background:#141414; border:1px solid #262626">
          <div class="text-4xl mb-4">📊</div>
          <p class="text-sm font-bold text-textLight mb-1">No Schema Detected</p>
          <p class="text-xs text-textGray max-w-xs">This sheet has no uploaded data yet. Upload a file first, or add custom fields using the form below.</p>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- MODE B: GRID MODE                                        -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div *ngIf="mode==='grid' && !loadingCols && dynamicFields.length">
        <div class="rounded-2xl overflow-hidden" style="background:#141414; border:1px solid #262626">
          <div class="px-5 py-4 flex items-center justify-between" style="border-bottom:1px solid #262626">
            <p class="text-sm font-bold text-textLight">Grid Entry — <span style="color:#a5b4fc">{{ activeSheet }}</span></p>
            <button (click)="addGridRow()"
              class="px-4 py-2 rounded-xl text-xs font-bold"
              style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.25)">
              + Add Row
            </button>
          </div>
          <div class="overflow-x-auto p-2">
            <table class="grid-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th *ngFor="let f of dynamicFields">{{ f.label }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of gridRows; let i=index">
                  <td style="color:#555; padding:6px 10px; font-size:0.7rem">{{ i+1 }}</td>
                  <td *ngFor="let f of dynamicFields">
                    <input [type]="'text'" [(ngModel)]="row[f.key]"
                      [placeholder]="f.label"
                      (input)="autoFormatGrid(f, row)">
                  </td>
                  <td>
                    <button (click)="removeGridRow(i)" style="color:#ef4444; border:none; background:transparent; cursor:pointer; padding:4px 6px; font-size:0.8rem">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="px-5 pb-5 pt-3 flex items-center gap-4">
            <button class="btn-save" (click)="saveGrid()" [disabled]="saving">
              <span *ngIf="!saving">💾 Save All Rows</span>
              <span *ngIf="saving" class="flex items-center gap-2"><span class="spin"></span> Saving…</span>
            </button>
            <div *ngIf="successMsg" class="text-sm font-semibold" style="color:#22c55e">{{ successMsg }}</div>
            <div *ngIf="errorMsg" class="text-sm font-semibold" style="color:#ef4444">{{ errorMsg }}</div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- MODE C: BULK PASTE MODE                                  -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div *ngIf="mode==='paste' && !loadingCols">
        <div class="rounded-2xl overflow-hidden" style="background:#141414; border:1px solid #262626">
          <div class="px-5 py-4" style="border-bottom:1px solid #262626">
            <p class="text-sm font-bold text-textLight">Bulk Paste</p>
            <p class="text-[10px] text-textGray mt-0.5">Paste rows from any spreadsheet — first row must be headers. Tab-separated or comma-separated.</p>
          </div>
          <div class="p-5">
            <textarea [(ngModel)]="pasteData" rows="10" placeholder="Paste spreadsheet data here (headers in first row)..."
              style="width:100%; background:#0c0c0c; border:1px solid #262626; border-radius:12px; color:#e8e8e8; padding:14px; font-size:0.78rem; font-family:'Courier New',monospace; outline:none; resize:vertical; box-sizing:border-box;">
            </textarea>
            <div class="flex items-center gap-3 mt-4 flex-wrap">
              <button (click)="parsePaste()" class="btn-save" style="padding:10px 24px; font-size:0.82rem">
                🔍 Preview &amp; Detect Fields
              </button>
              <button (click)="savePaste()" *ngIf="parsedPasteRows.length" [disabled]="saving" class="btn-save">
                <span *ngIf="!saving">💾 Save {{ parsedPasteRows.length }} Records</span>
                <span *ngIf="saving" class="flex items-center gap-2"><span class="spin"></span> Saving…</span>
              </button>
              <span *ngIf="parsedPasteRows.length" class="text-xs" style="color:#22c55e">
                ✓ {{ parsedPasteRows.length }} rows detected, {{ parsedPasteFields.length }} fields
              </span>
              <div *ngIf="errorMsg" class="text-sm font-semibold" style="color:#ef4444">{{ errorMsg }}</div>
              <div *ngIf="successMsg" class="text-sm font-semibold" style="color:#22c55e">{{ successMsg }}</div>
            </div>

            <!-- Paste Preview Table -->
            <div *ngIf="parsedPasteRows.length" class="mt-5 overflow-x-auto rounded-xl" style="border:1px solid #262626; max-height:300px">
              <table class="grid-table" style="min-width:600px">
                <thead>
                  <tr>
                    <th *ngFor="let h of parsedPasteFields">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of parsedPasteRows | slice:0:10">
                    <td *ngFor="let h of parsedPasteFields" style="padding:6px 10px; color:#a1a1aa; font-size:0.75rem">{{ row[h] }}</td>
                  </tr>
                </tbody>
              </table>
              <p *ngIf="parsedPasteRows.length > 10" style="text-align:center; color:#555; font-size:0.7rem; padding:8px">
                … and {{ parsedPasteRows.length - 10 }} more rows
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class EntryComponent implements OnInit, OnDestroy {
  // ── Core State ────────────────────────────────────────────────────────
  sheets: SheetInfo[] = [];
  activeSheet = 'default';
  isAdmin = false;
  loadingCols = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  // ── Dynamic Schema ────────────────────────────────────────────────────
  dynamicFields: DynamicField[] = [];
  formData: Record<string, string> = {};

  get vehicleField(): DynamicField | undefined {
    return this.dynamicFields.find(f => f.type === 'vehicle');
  }
  get vehicleKey(): string | null {
    return this.vehicleField?.key ?? null;
  }
  get nonVehicleFields(): DynamicField[] {
    return this.dynamicFields.filter(f => f.type !== 'vehicle');
  }
  get canonicalCount(): number {
    return this.dynamicFields.filter(f => f.source === 'canonical').length;
  }
  get customCount(): number {
    return this.dynamicFields.filter(f => f.isCustom).length;
  }

  // ── Sheet management ──────────────────────────────────────────────────
  showNewSheet = false;
  newSheetName = '';
  creatingSheet = false;

  // ── Modes ─────────────────────────────────────────────────────────────
  mode: 'smart' | 'grid' | 'paste' = 'smart';

  // ── Grid Mode ─────────────────────────────────────────────────────────
  gridRows: Record<string, string>[] = [{}];

  // ── Bulk Paste Mode ───────────────────────────────────────────────────
  pasteData = '';
  parsedPasteRows: Record<string, string>[] = [];
  parsedPasteFields: string[] = [];

  // ── Add Custom Field ──────────────────────────────────────────────────
  newFieldKey = '';
  newFieldType: FieldType = 'text';

  private subs = new Subscription();

  constructor(private ds: DataService, private authService: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.subs.add(this.authService.currentUser$.subscribe(u => {
      this.isAdmin = u?.role === 'admin';
    }));
    this.loadSheets();
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  // ── Sheet Loading ──────────────────────────────────────────────────────

  loadSheets() {
    this.ds.getSheets().subscribe({
      next: res => {
        this.sheets = res.sheets || [];
        if (!this.sheets.find(s => s.name === this.activeSheet)) {
          this.activeSheet = this.sheets[0]?.name || 'default';
        }
        this.loadColumns(this.activeSheet);
      }
    });
  }

  selectSheet(name: string) {
    this.activeSheet = name;
    this.loadColumns(name);
  }

  loadColumns(sheet: string) {
    this.loadingCols = true;
    this.dynamicFields = [];
    this.formData = {};
    this.ds.getSheetColumns(sheet).subscribe({
      next: (res: any) => {
        const cols: string[] = res.columns || [];
        this.dynamicFields = buildDynamicFields(cols);
        this.resetForm();
        this.gridRows = [this.emptyGridRow()];
        this.loadingCols = false;
      },
      error: () => { this.loadingCols = false; }
    });
  }

  createSheet() {
    if (!this.newSheetName.trim()) return;
    this.creatingSheet = true;
    this.ds.createSheet(this.newSheetName.trim()).subscribe({
      next: () => {
        this.cancelNewSheet();
        this.creatingSheet = false;
        this.loadSheets();
      },
      error: () => { this.creatingSheet = false; }
    });
  }

  cancelNewSheet() { this.showNewSheet = false; this.newSheetName = ''; }

  // ── Form Helpers ──────────────────────────────────────────────────────

  resetForm() {
    this.formData = {};
    this.dynamicFields.forEach(f => this.formData[f.key] = '');
    this.successMsg = ''; this.errorMsg = '';
  }

  isWide(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('address') || k.includes('addr') || k.includes('note') || k.includes('remark') || k.includes('description');
  }

  fieldPlaceholder(f: DynamicField): string {
    switch (f.type) {
      case 'vehicle': return 'e.g. GJ06RC1934';
      case 'mobile': return 'e.g. 9876543210';
      case 'date': return 'DD/MM/YYYY';
      case 'currency': return '0.00';
      case 'policy': return 'e.g. POL-2024-001';
      default: return `Enter ${f.label}`;
    }
  }

  autoFormat(field: DynamicField) {
    let val = this.formData[field.key] || '';
    if (field.type === 'vehicle') {
      val = val.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      this.formData[field.key] = val;
    }
    if (field.type === 'mobile') {
      val = val.replace(/\D/g, '').slice(0, 10);
      this.formData[field.key] = val;
    }
  }

  autoFormatGrid(field: DynamicField, row: Record<string, string>) {
    let val = row[field.key] || '';
    if (field.type === 'vehicle') {
      row[field.key] = val.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }
    if (field.type === 'mobile') {
      row[field.key] = val.replace(/\D/g, '').slice(0, 10);
    }
  }

  addCustomField() {
    const key = this.newFieldKey.trim();
    if (!key) return;
    const existing = this.dynamicFields.find(f => f.key === key);
    if (existing) { this.errorMsg = `Field "${key}" already exists.`; return; }
    const newField: DynamicField = {
      key, label: humanize(key),
      type: this.newFieldType, required: false,
      isCustom: true, source: 'custom', confidence: 100,
    };
    this.dynamicFields.push(newField);
    this.formData[key] = '';
    this.newFieldKey = '';
    this.newFieldType = 'text';
  }

  // ── Save (Smart Form) ─────────────────────────────────────────────────

  save() {
    const vf = this.vehicleField;
    const vehicleNo = vf ? (this.formData[vf.key] || '').trim() : '';
    if (!vehicleNo) {
      this.errorMsg = vf ? `"${vf.label}" is required.` : 'No vehicle number field detected. Add one via "Add custom field".';
      setTimeout(() => this.errorMsg = '', 4000); return;
    }
    this.saving = true; this.errorMsg = ''; this.successMsg = '';
    this.ds.saveVehicle({ vehicle_number: vehicleNo, sheet_name: this.activeSheet, data: { ...this.formData } })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = `✅ Record "${vehicleNo}" saved to "${this.activeSheet}"`;
          setTimeout(() => this.successMsg = '', 4000);
          this.resetForm();
        },
        error: (err: any) => {
          this.saving = false;
          this.errorMsg = err.error?.detail || 'Save failed.';
          setTimeout(() => this.errorMsg = '', 5000);
        }
      });
  }

  // ── Grid Mode ─────────────────────────────────────────────────────────

  emptyGridRow(): Record<string, string> {
    const r: Record<string, string> = {};
    this.dynamicFields.forEach(f => r[f.key] = '');
    return r;
  }

  addGridRow() { this.gridRows.push(this.emptyGridRow()); }
  removeGridRow(i: number) { this.gridRows.splice(i, 1); }

  saveGrid() {
    const vf = this.vehicleField;
    if (!vf) { this.errorMsg = 'No vehicle key detected.'; return; }
    const valid = this.gridRows.filter(r => (r[vf.key] || '').trim());
    if (!valid.length) { this.errorMsg = 'Add at least one row with a vehicle number.'; return; }
    this.saving = true; this.errorMsg = ''; this.successMsg = '';

    const requests = valid.map(row =>
      this.ds.saveVehicle({ vehicle_number: row[vf.key].trim(), sheet_name: this.activeSheet, data: { ...row } }).toPromise()
    );
    Promise.all(requests).then(() => {
      this.saving = false;
      this.successMsg = `✅ ${valid.length} records saved to "${this.activeSheet}"`;
      setTimeout(() => this.successMsg = '', 5000);
      this.gridRows = [this.emptyGridRow()];
    }).catch(err => {
      this.saving = false;
      this.errorMsg = err?.error?.detail || 'Some records failed to save.';
    });
  }

  // ── Bulk Paste Mode ───────────────────────────────────────────────────

  parsePaste() {
    const text = this.pasteData.trim();
    if (!text) return;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { this.errorMsg = 'Paste at least 2 rows (header + 1 data row).'; return; }

    // Detect delimiter: tab or comma
    const delim = lines[0].includes('\t') ? '\t' : ',';
    this.parsedPasteFields = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
    this.parsedPasteRows = lines.slice(1).map(line => {
      const vals = line.split(delim).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      this.parsedPasteFields.forEach((h, i) => row[h] = vals[i] || '');
      return row;
    });
    this.errorMsg = '';
  }

  savePaste() {
    if (!this.parsedPasteRows.length) return;
    // Find vehicle key from parsed fields
    const vKey = this.parsedPasteFields.find(f => isVehicleKey(f));
    if (!vKey) {
      this.errorMsg = 'Could not detect a vehicle number column in the pasted data.'; return;
    }
    const valid = this.parsedPasteRows.filter(r => (r[vKey] || '').trim());
    this.saving = true; this.errorMsg = ''; this.successMsg = '';

    const requests = valid.map(row =>
      this.ds.saveVehicle({ vehicle_number: row[vKey].trim(), sheet_name: this.activeSheet, data: { ...row } }).toPromise()
    );
    Promise.all(requests).then(() => {
      this.saving = false;
      this.successMsg = `✅ ${valid.length} records pasted into "${this.activeSheet}"`;
      setTimeout(() => this.successMsg = '', 5000);
      this.pasteData = ''; this.parsedPasteRows = []; this.parsedPasteFields = [];
    }).catch(err => {
      this.saving = false;
      this.errorMsg = err?.error?.detail || 'Bulk save failed.';
    });
  }

  // ── Export ────────────────────────────────────────────────────────────

  exportSheet() {
    const token = localStorage.getItem('token') || '';
    this.http.get(`${API}/export?sheet=${this.activeSheet}`,
      { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
    ).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${this.activeSheet}_export.xlsx`; a.click();
      URL.revokeObjectURL(url);
    });
  }
}
