import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, SheetInfo } from '../data.service';
import { AuthService } from '../auth.service';
import { HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';

declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  template: `
    <div style="font-family:'Inter',sans-serif">

      <!-- ══════════════════════════════════════════
           SHEET SELECTOR STRIP
      ══════════════════════════════════════════ -->
      <div class="rounded-2xl mb-6 overflow-hidden" style="background:#141414; border:1px solid #262626">
        <!-- Admin: full sheet switcher -->
        <ng-container *ngIf="isAdmin">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
            style="border-bottom:1px solid #262626">
            <div class="flex items-center gap-2">
              <span class="text-lg">📊</span>
              <div>
                <p class="text-xs font-bold text-textLight">Dashboard Sheet</p>
                <p class="text-[10px] text-textGray">Analytics shown for the selected sheet</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div *ngIf="showNewSheet" class="flex items-center gap-2">
                <input type="text" [(ngModel)]="newSheetName" (keyup.enter)="createSheet()"
                  placeholder="Sheet name…"
                  class="input-field px-3 py-2 text-sm w-36 sm:w-44" style="height:36px">
                <button (click)="createSheet()" [disabled]="creatingSheet"
                  class="btn-red px-4 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-50"
                  style="height:36px">
                  <span *ngIf="!creatingSheet">✓ Create</span>
                  <span *ngIf="creatingSheet" class="flex items-center gap-1">
                    <span class="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                  </span>
                </button>
                <button (click)="cancelNewSheet()" class="px-3 py-2 text-xs text-textGray hover:text-textLight" style="height:36px">✕</button>
              </div>
              <button *ngIf="!showNewSheet" (click)="showNewSheet=true"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-textGray hover:text-textLight transition-all"
                style="background:rgba(255,255,255,0.04); border:1px solid #333; height:36px">
                <span class="text-sm leading-none">+</span> New Sheet
              </button>
              <button (click)="loadStats()" class="px-3 py-2 rounded-xl text-xs text-textGray hover:text-textLight transition-all"
                style="background:rgba(255,255,255,0.04); border:1px solid #333; height:36px" title="Refresh">🔄</button>
            </div>
          </div>
          <div class="flex items-center gap-2 px-4 py-3 overflow-x-auto" style="scrollbar-width:none">
            <button *ngFor="let sh of sheets"
              (click)="selectSheet(sh.name)"
              class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
              [style.background]="activeSheet === sh.name ? '#EF4444' : 'rgba(255,255,255,0.04)'"
              [style.color]="activeSheet === sh.name ? '#fff' : '#A1A1AA'"
              [style.border]="activeSheet === sh.name ? '1px solid rgba(239,68,68,0.4)' : '1px solid #282828'"
              [style.box-shadow]="activeSheet === sh.name ? '0 0 12px rgba(239,68,68,0.25)' : 'none'">
              <span>{{ sh.name === 'default' ? '📂' : '📄' }}</span>
              <span>{{ sh.name === 'default' ? 'Default' : sh.name }}</span>
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                [style.background]="activeSheet === sh.name ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'"
                [style.color]="activeSheet === sh.name ? '#fff' : '#71717A'">
                {{ sh.vehicle_count }}
              </span>
            </button>
            <div *ngIf="!sheets.length" class="text-xs text-textGray px-2">Loading sheets…</div>
          </div>
          <div *ngIf="sheetError" class="px-5 pb-3 text-xs font-semibold" style="color:#EF4444">⚠️ {{ sheetError }}</div>
        </ng-container>
        <!-- Worker: assigned sheet badge -->
        <ng-container *ngIf="!isAdmin">
          <div class="flex items-center gap-3 px-5 py-4">
            <span class="text-lg">📊</span>
            <div>
              <p class="text-xs font-bold text-textLight">Your Dashboard</p>
              <p class="text-[10px]" style="color:#60a5fa">Sheet: <strong>{{ activeSheet }}</strong></p>
            </div>
            <button (click)="loadStats()" class="ml-auto px-3 py-2 rounded-xl text-xs text-textGray hover:text-textLight transition-all"
              style="background:rgba(255,255,255,0.04); border:1px solid #333; height:36px" title="Refresh">🔄</button>
          </div>
        </ng-container>
      </div>
      <!-- END SHEET SELECTOR -->

      <!-- Header Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Dashboard</h1>
          <p class="text-sm text-textGray mt-1">
            Real-time insights from
            <span class="font-semibold" style="color:#EF4444">
              {{ activeSheet === 'default' ? 'Default' : activeSheet }}
            </span>
            sheet
          </p>
        </div>
        <!-- Quick Search -->
        <div class="flex gap-2">
          <input type="text" [(ngModel)]="quickSearch" (keyup.enter)="doQuickSearch()"
            placeholder="Quick search vehicle…"
            class="input-field px-4 py-2.5 text-sm w-52 font-mono uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal">
          <button (click)="doQuickSearch()" class="btn-red px-4 py-2.5 text-sm whitespace-nowrap">🔍</button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="flex items-center justify-center py-20">
        <div class="flex flex-col items-center gap-4">
          <div class="w-10 h-10 rounded-full border-2 animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
          <p class="text-xs text-textGray">Loading sheet data…</p>
        </div>
      </div>

      <div *ngIf="!loading">

        <!-- Quick Search Result -->
        <div *ngIf="quickResult" class="mb-6 rounded-2xl p-5" style="background:#1A1A1A; border:1px solid rgba(239,68,68,0.3)">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs text-textGray uppercase tracking-wider font-semibold">Quick Result</span>
            <button (click)="quickResult=null" class="text-textGray hover:text-primary text-xs">✕ Close</button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p class="text-xs text-textGray">Vehicle</p><p class="font-bold text-primary font-mono">{{ quickResult.vehicle_number }}</p></div>
            <div><p class="text-xs text-textGray">Owner</p><p class="font-semibold text-textLight">{{ quickResult.data['ownerName'] || '—' }}</p></div>
            <div><p class="text-xs text-textGray">Insurance Co.</p><p class="font-semibold text-textLight">{{ quickResult.data['vehicleInsuranceCompanyName'] || '—' }}</p></div>
            <div><p class="text-xs text-textGray">Expiry</p><p class="font-semibold text-textLight">{{ quickResult.data['expiredInsuranceUpto'] || '—' }}</p></div>
          </div>
        </div>
        <div *ngIf="quickError" class="mb-6 text-sm text-primary px-4 py-3 rounded-xl"
          style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2)">
          {{ quickError }}
        </div>

        <!-- 🚨 Alerts -->
        <div *ngIf="stats?.expiring_in_7_days > 0" class="mb-6 rounded-2xl p-4 flex items-start gap-4"
          style="background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.25)">
          <span class="text-2xl">🚨</span>
          <div>
            <p class="font-bold text-primary text-sm">{{ stats.expiring_in_7_days }} vehicle{{ stats.expiring_in_7_days > 1 ? 's' : '' }} expiring within 7 days</p>
            <p class="text-xs text-textGray mt-0.5">{{ stats.expiring_in_30_days }} expiring within the next 30 days — plan renewals now.</p>
          </div>
        </div>

        <!-- Empty sheet state -->
        <div *ngIf="stats?.total_vehicles === 0" class="rounded-2xl p-10 text-center mb-6"
          style="background:#141414; border:1px dashed #333">
          <div class="text-5xl mb-4 opacity-30">📄</div>
          <p class="text-sm font-bold text-textLight mb-1">Sheet is empty</p>
          <p class="text-xs text-textGray">Go to <strong>Data Entry</strong> or <strong>Upload Data</strong> to add records to this sheet.</p>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div *ngFor="let card of summaryCards" class="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
            style="background:#141414; border:1px solid #262626">
            <div class="flex items-start justify-between mb-4">
              <p class="text-[10px] text-textGray uppercase tracking-wider font-semibold leading-tight">{{ card.label }}</p>
              <span class="text-xl">{{ card.icon }}</span>
            </div>
            <p class="text-3xl font-extrabold" [style.color]="card.color">{{ card.value }}</p>
            <p class="text-[10px] text-textGray mt-2">{{ card.sub }}</p>
          </div>
        </div>

        <!-- Charts Row 1: Pie + Bar -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Insurance Status Pie -->
          <div class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
            <h3 class="text-sm font-bold text-textLight mb-1">Insurance Status</h3>
            <p class="text-xs text-textGray mb-5">Active vs Expired vs No Data</p>
            <div class="relative flex items-center justify-center" style="height:220px">
              <canvas #pieCanvas></canvas>
            </div>
            <div class="flex justify-center gap-5 mt-4">
              <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full" style="background:#EF4444"></span><span class="text-xs text-textGray">Active</span></div>
              <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full" style="background:#3D3D3D"></span><span class="text-xs text-textGray">Expired</span></div>
              <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full" style="background:#2D2D2D"></span><span class="text-xs text-textGray">No Data</span></div>
            </div>
          </div>

          <!-- Monthly Trend Bar -->
          <div class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
            <h3 class="text-sm font-bold text-textLight mb-1">Records Added Monthly</h3>
            <p class="text-xs text-textGray mb-5">Upload history — new records per month</p>
            <div style="height:240px; position:relative">
              <canvas #barCanvas></canvas>
              <div *ngIf="stats && (!stats.chart_monthly_labels?.length)" class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span class="text-3xl mb-2 opacity-20">📊</span>
                <p class="text-xs text-textGray">No upload data for this sheet yet</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Expiry Trend Line -->
        <div class="rounded-2xl p-6 mb-6" style="background:#141414; border:1px solid #262626">
          <h3 class="text-sm font-bold text-textLight mb-1">Insurance Expiry Tracker</h3>
          <p class="text-xs text-textGray mb-5">Number of policies expiring by month — plan renewals in advance</p>
          <div style="height:200px; position:relative">
            <canvas #lineCanvas></canvas>
            <div *ngIf="stats && (!stats.chart_expiry_labels?.length)" class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-3xl mb-2 opacity-20">📈</span>
              <p class="text-xs text-textGray">No expiry date data available for this sheet yet</p>
            </div>
          </div>
        </div>

        <!-- Bottom Row: Top Companies + Fuel Types + Recent Uploads -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <!-- Top Insurance Cos -->
          <div class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
            <h3 class="text-sm font-bold text-textLight mb-5">🏆 Top Insurance Companies</h3>
            <div *ngIf="!stats?.top_companies?.length" class="text-xs text-textGray text-center py-8 opacity-60">No data yet</div>
            <div class="space-y-3">
              <div *ngFor="let c of stats?.top_companies; let i = index">
                <div class="flex justify-between items-center mb-1.5">
                  <span class="text-xs font-medium text-textLight truncate max-w-[160px]">{{ c.name }}</span>
                  <span class="text-xs text-textGray">{{ c.count }}</span>
                </div>
                <div class="h-1.5 rounded-full" style="background:#262626">
                  <div class="h-full rounded-full transition-all" [style.width]="getBarWidth(c.count, stats.top_companies)" style="background:#EF4444"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Fuel Types -->
          <div class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
            <h3 class="text-sm font-bold text-textLight mb-5">⛽ Fuel Type Breakdown</h3>
            <div *ngIf="!stats?.fuel_types?.length" class="text-xs text-textGray text-center py-8 opacity-60">No data yet</div>
            <div class="space-y-3">
              <div *ngFor="let f of stats?.fuel_types">
                <div class="flex justify-between items-center mb-1.5">
                  <span class="text-xs font-medium text-textLight">{{ f.name }}</span>
                  <span class="text-xs text-textGray">{{ f.count }}</span>
                </div>
                <div class="h-1.5 rounded-full" style="background:#262626">
                  <div class="h-full rounded-full transition-all" [style.width]="getBarWidth(f.count, stats.fuel_types)" style="background:#5A5A5A"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Uploads -->
          <div class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
            <h3 class="text-sm font-bold text-textLight mb-5">📤 Recent Uploads</h3>
            <div *ngIf="!stats?.recent_uploads?.length" class="text-xs text-textGray text-center py-8 opacity-60">No uploads yet for this sheet</div>
            <div class="space-y-3">
              <div *ngFor="let u of stats?.recent_uploads" class="pb-3" style="border-bottom:1px solid rgba(255,255,255,0.03)">
                <p class="text-xs font-semibold text-textLight truncate">{{ u.filename }}</p>
                <div class="flex gap-3 mt-1">
                  <span class="text-[10px]" style="color:#EF4444">+{{ u.inserted }} new</span>
                  <span class="text-[10px] text-textGray">↑{{ u.updated }} updated</span>
                  <span class="text-[10px] text-textGray ml-auto">{{ u.timestamp | date:'d MMM' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Vehicles Table -->
        <div class="rounded-2xl p-6" style="background:#141414; border:1px solid #262626">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 class="text-sm font-bold text-textLight">📋 Recent Vehicle Records</h3>
            <div class="flex flex-wrap gap-2">
              <button *ngFor="let f of ['all','active','expired','expiring-soon','no-data']"
                (click)="tableFilter = f"
                class="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all"
                [style.background]="tableFilter === f ? '#EF4444' : 'rgba(255,255,255,0.04)'"
                [style.color]="tableFilter === f ? '#fff' : '#A1A1AA'">
                {{ f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'expired' ? 'Expired' : f === 'expiring-soon' ? 'Expiring' : 'No Data' }}
              </button>
            </div>
          </div>
          <div *ngIf="!stats?.recent_vehicles?.length" class="text-center py-10">
            <div class="text-4xl mb-3 opacity-20">📭</div>
            <p class="text-sm text-textGray">No vehicle records in this sheet yet</p>
          </div>
          <div *ngIf="filteredVehicles.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-[10px] text-textGray uppercase tracking-wider" style="border-bottom:1px solid #262626">
                  <th class="pb-3 pr-6 text-left">Vehicle No.</th>
                  <th class="pb-3 pr-6 text-left">Owner</th>
                  <th class="pb-3 pr-6 text-left hidden sm:table-cell">Insurance Co.</th>
                  <th class="pb-3 pr-6 text-left hidden sm:table-cell">Expiry</th>
                  <th class="pb-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let v of filteredVehicles" style="border-bottom:1px solid rgba(255,255,255,0.03)">
                  <td class="py-3 pr-6 font-mono font-bold text-textLight text-xs">{{ v.vehicle_number }}</td>
                  <td class="py-3 pr-6 text-xs text-textGray">{{ v.owner }}</td>
                  <td class="py-3 pr-6 text-xs text-textGray truncate max-w-[120px] hidden sm:table-cell">{{ v.company }}</td>
                  <td class="py-3 pr-6 text-xs text-textGray hidden sm:table-cell">{{ v.expiry }}</td>
                  <td class="py-3">
                    <span class="text-[10px] px-2.5 py-1 rounded-full font-bold"
                      [style.background]="getStatusBg(v.status)"
                      [style.color]="getStatusColor(v.status)">
                      {{ getStatusLabel(v.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="stats?.recent_vehicles?.length && !filteredVehicles.length" class="text-center py-8">
            <p class="text-xs text-textGray">No records match this filter</p>
          </div>
        </div>

      </div><!-- /!loading -->
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pieCanvas') pieCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;

  stats: any = null;
  summaryCards: any[] = [];
  tableFilter = 'all';
  quickSearch = '';
  quickResult: any = null;
  quickError = '';
  loading = false;
  isAdmin = false;

  // Sheet state
  sheets: SheetInfo[] = [];
  activeSheet = 'default';
  showNewSheet = false;
  newSheetName = '';
  creatingSheet = false;
  sheetError = '';

  private charts: any[] = [];
  private subs = new Subscription();
  private chartsBuilt = false;

  constructor(private ds: DataService, private authService: AuthService) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    if (this.isAdmin) {
      this.subs.add(this.ds.sheets$.subscribe(sheets => { this.sheets = sheets; }));
      this.subs.add(this.ds.activeSheet$.subscribe(sheet => {
        this.activeSheet = sheet;
        this.loadStats();
      }));
      this.ds.loadSheets();
    } else {
      // Workers: locked to their assigned sheet
      this.activeSheet = this.authService.getAssignedSheet();
      this.ds.setActiveSheet(this.activeSheet);
      this.loadStats();
    }
  }

  ngAfterViewInit() { this.chartsBuilt = true; }

  selectSheet(name: string) {
    this.ds.setActiveSheet(name);
    this.sheetError = '';
  }

  createSheet() {
    const name = this.newSheetName.trim();
    if (!name) { this.sheetError = 'Please enter a sheet name.'; return; }
    this.creatingSheet = true; this.sheetError = '';
    this.ds.createSheet(name).subscribe({
      next: () => {
        this.creatingSheet = false;
        this.ds.setActiveSheet(name);
        this.cancelNewSheet();
      },
      error: (err) => {
        this.creatingSheet = false;
        this.sheetError = err.error?.detail || 'Failed to create sheet.';
      }
    });
  }

  cancelNewSheet() {
    this.showNewSheet = false;
    this.newSheetName = '';
    this.sheetError = '';
  }

  loadStats() {
    this.loading = true;
    this.stats = null;
    this.summaryCards = [];
    this.destroyCharts();
    this.ds.getDashboardStats(this.activeSheet).subscribe({
      next: (res) => {
        this.stats = res;
        this.loading = false;
        this.buildSummaryCards();
        setTimeout(() => this.buildCharts(), 120);
      },
      error: () => { this.loading = false; }
    });
  }

  buildSummaryCards() {
    const s = this.stats;
    this.summaryCards = [
      { label: 'Total Records',      icon: '📦', value: s.total_vehicles,      color: '#F5F5F5', sub: 'All vehicles in sheet' },
      { label: 'Active Insurance',   icon: '✅', value: s.active_insurance,    color: '#EF4444', sub: 'Valid policies' },
      { label: 'Expired Insurance',  icon: '❌', value: s.expired_insurance,   color: '#A1A1AA', sub: 'Need renewal' },
      { label: 'Expiring (30 days)', icon: '⚠️', value: s.expiring_in_30_days, color: '#F87171', sub: 'Upcoming renewals' },
    ];
  }

  buildCharts() {
    this.destroyCharts();
    const s = this.stats;
    if (!s) return;
    const gridColor = 'rgba(255,255,255,0.04)';
    const textColor = '#A1A1AA';

    // Pie
    if (this.pieCanvas?.nativeElement && s.chart_pie_data?.some((v: number) => v > 0)) {
      this.charts.push(new Chart(this.pieCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: s.chart_pie_labels,
          datasets: [{
            data: s.chart_pie_data,
            backgroundColor: ['#EF4444', '#3D3D3D', '#2D2D2D'],
            borderColor: '#141414', borderWidth: 3, hoverBorderColor: '#EF4444',
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1A1A1A', titleColor: '#F5F5F5', bodyColor: '#A1A1AA', borderColor: '#262626', borderWidth: 1 } },
        }
      }));
    }

    // Bar
    if (this.barCanvas?.nativeElement && s.chart_monthly_labels?.length) {
      this.charts.push(new Chart(this.barCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: s.chart_monthly_labels,
          datasets: [{ label: 'Records Added', data: s.chart_monthly_data, backgroundColor: 'rgba(239,68,68,0.7)', borderColor: '#EF4444', borderWidth: 1, borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1A1A1A', titleColor: '#F5F5F5', bodyColor: '#A1A1AA', borderColor: '#262626', borderWidth: 1 } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, stepSize: 1 }, beginAtZero: true }
          }
        }
      }));
    }

    // Line
    if (this.lineCanvas?.nativeElement && s.chart_expiry_labels?.length) {
      this.charts.push(new Chart(this.lineCanvas.nativeElement, {
        type: 'line',
        data: {
          labels: s.chart_expiry_labels,
          datasets: [{
            label: 'Expiring Policies', data: s.chart_expiry_data,
            borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)',
            tension: 0.4, fill: true,
            pointBackgroundColor: '#EF4444', pointBorderColor: '#141414', pointBorderWidth: 2, pointRadius: 5,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1A1A1A', titleColor: '#F5F5F5', bodyColor: '#A1A1AA', borderColor: '#262626', borderWidth: 1 } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, stepSize: 1 }, beginAtZero: true }
          }
        }
      }));
    }
  }

  destroyCharts() {
    this.charts.forEach(c => { try { c.destroy(); } catch {} });
    this.charts = [];
  }

  ngOnDestroy() { this.destroyCharts(); this.subs.unsubscribe(); }

  doQuickSearch() {
    if (!this.quickSearch.trim()) return;
    this.quickResult = null; this.quickError = '';
    this.ds.searchVehicle(this.quickSearch).subscribe({
      next: res => this.quickResult = res,
      error: () => { this.quickError = `Vehicle "${this.quickSearch.toUpperCase()}" not found in this sheet.`; }
    });
  }

  get filteredVehicles() {
    if (!this.stats?.recent_vehicles) return [];
    if (this.tableFilter === 'all') return this.stats.recent_vehicles;
    return this.stats.recent_vehicles.filter((v: any) => v.status === this.tableFilter);
  }

  getBarWidth(count: number, list: any[]): string {
    const max = Math.max(...list.map((x: any) => x.count), 1);
    return Math.round((count / max) * 100) + '%';
  }

  getStatusLabel(s: string) {
    return s === 'active' ? 'Active' : s === 'expired' ? 'Expired' : s === 'expiring-soon' ? 'Expiring Soon' : 'No Data';
  }
  getStatusColor(s: string) {
    return s === 'active' ? '#EF4444' : s === 'expiring-soon' ? '#F87171' : '#A1A1AA';
  }
  getStatusBg(s: string) {
    return s === 'active' ? 'rgba(239,68,68,0.12)' : s === 'expiring-soon' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)';
  }
}
