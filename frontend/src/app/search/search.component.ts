import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService, FIXED_FIELDS } from '../data.service';

const LABELS: Record<string, string> = {
  'Sr. No.':'Sr. No.','Vehicle':'Vehicle Number','engineNum':'Engine Number',
  'chassisNum':'Chassis Number','ownerName':'Owner Name','ownerAddress':'Owner Address',
  'vehicleMake':'Vehicle Make','vehicleModel':'Vehicle Model','vehicleClass':'Vehicle Class',
  'fuelType':'Fuel Type','saleAmount':'Sale Amount','ownerMobileNo':'Mobile No.',
  'vehicleManufacturerName':'Manufacturer','model':'Model',
  'vehicleInsuranceCompanyName':'Insurance Company','expiredInsuranceUpto':'Insurance Expiry',
  'vehicleInsurancePolicyNumber':'Policy Number',
};
const ICONS: Record<string,string> = {
  'Vehicle':'🚗','engineNum':'⚙️','chassisNum':'🔩','ownerName':'👤','ownerAddress':'📍',
  'vehicleMake':'🏭','vehicleModel':'🚙','vehicleClass':'📂','fuelType':'⛽','saleAmount':'💰',
  'ownerMobileNo':'📱','vehicleManufacturerName':'🏗️','model':'🔖',
  'vehicleInsuranceCompanyName':'🛡️','expiredInsuranceUpto':'📅',
  'vehicleInsurancePolicyNumber':'📋','Sr. No.':'🔢',
};

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div style="font-family:'Inter',sans-serif">
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Search Vehicle</h1>
        <p class="text-sm text-textGray mt-1">Enter a vehicle plate number to retrieve all insurance and ownership records.</p>
      </div>

      <!-- Search Bar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl" style="background:#141414; border:1px solid #262626">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-4 flex items-center text-textGray pointer-events-none text-sm">🔍</span>
          <input type="text" [(ngModel)]="query" (keyup.enter)="search()"
            placeholder="e.g. MH12AB1234"
            class="input-field w-full pl-10 pr-4 py-3 font-mono uppercase tracking-widest text-sm placeholder:normal-case placeholder:font-sans placeholder:tracking-normal">
        </div>
        <button (click)="search()" [disabled]="loading" class="btn-red px-8 py-3 text-sm disabled:opacity-50 whitespace-nowrap">
          {{ loading ? 'Searching…' : 'Search' }}
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex items-center justify-center py-20">
        <div class="w-10 h-10 rounded-full border-2 animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
      </div>

      <!-- Error -->
      <div *ngIf="error && !loading" class="p-5 rounded-2xl flex items-start gap-4 mb-6"
        style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2)">
        <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style="background:rgba(239,68,68,0.1); color:#EF4444">!</div>
        <div>
          <p class="text-sm font-bold text-primary">Not Found</p>
          <p class="text-xs text-textGray mt-0.5">{{ error }}</p>
        </div>
      </div>

      <!-- Result -->
      <div *ngIf="result && !loading" class="rounded-2xl overflow-hidden" style="background:#141414; border:1px solid #262626">
        <!-- Header -->
        <div class="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style="background:linear-gradient(135deg,rgba(239,68,68,0.08),transparent); border-bottom:1px solid #262626">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); box-shadow:0 0 20px rgba(239,68,68,0.15)">🚗</div>
            <div>
              <p class="text-[10px] text-textGray uppercase tracking-widest font-semibold mb-1">Vehicle Number</p>
              <h2 class="text-2xl font-extrabold font-mono tracking-widest text-textLight">{{ result.vehicle_number }}</h2>
            </div>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold w-fit"
            style="background:rgba(239,68,68,0.1); color:#EF4444; border:1px solid rgba(239,68,68,0.2)">
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> RECORD FOUND
          </span>
        </div>
        <!-- Fields -->
        <div class="p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div *ngFor="let field of fixedFields"
              [class.sm:col-span-2]="field === 'ownerAddress'"
              class="rounded-xl p-4 transition-all hover:-translate-y-0.5"
              style="background:#0B0B0B; border:1px solid #262626">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm">{{ getIcon(field) }}</span>
                <p class="text-[10px] text-textGray uppercase tracking-wider font-semibold">{{ getLabel(field) }}</p>
              </div>
              <p class="text-sm font-semibold text-textLight break-words">{{ result.data[field] || '—' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!result && !loading && !error" class="flex flex-col items-center py-24 text-center">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-5"
          style="background:#141414; border:1px solid #262626">🔍</div>
        <p class="text-base font-bold text-textLight mb-1">Search for a Vehicle</p>
        <p class="text-sm text-textGray max-w-xs">Enter a plate number above to retrieve all 16 insurance and ownership fields.</p>
      </div>
    </div>
  `
})
export class SearchComponent {
  query = ''; result: any = null; error = ''; loading = false;
  fixedFields = FIXED_FIELDS;
  constructor(private ds: DataService) {}
  search() {
    if (!this.query.trim()) return;
    this.loading = true; this.error = ''; this.result = null;
    this.ds.searchVehicle(this.query).subscribe({
      next: res => { this.result = res; this.loading = false; },
      error: err => { this.error = err.error?.detail || 'Vehicle not found.'; this.loading = false; }
    });
  }
  getLabel(f: string) { return LABELS[f] ?? f; }
  getIcon(f: string)  { return ICONS[f]  ?? '📄'; }
}
