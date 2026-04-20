import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { DataService, SheetInfo } from '../data.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  template: `
    <div style="font-family:'Inter',sans-serif">
      <div class="mb-6">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Upload Data</h1>
        <p class="text-sm text-textGray mt-1">Upload any Excel or CSV file — columns auto-mapped to your schema.</p>
      </div>

      <!-- Sheet Selector Strip -->
      <div class="rounded-2xl mb-6 overflow-hidden" style="background:#141414; border:1px solid #262626">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
          style="border-bottom:1px solid #262626">
          <div class="flex items-center gap-2">
            <span class="text-lg">📂</span>
            <div>
              <p class="text-xs font-bold text-textLight">Target Sheet</p>
              <p class="text-[10px] text-textGray">Uploaded records will be added to the selected sheet</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div *ngIf="showNewSheet" class="flex items-center gap-2">
              <input type="text" [(ngModel)]="newSheetName" (keyup.enter)="createSheet()"
                placeholder="Sheet name…" class="input-field px-3 py-2 text-sm w-36 sm:w-44" style="height:36px">
              <button (click)="createSheet()" [disabled]="creatingSheet"
                class="btn-red px-4 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-50" style="height:36px">
                <span *ngIf="!creatingSheet">✓ Create</span>
                <span *ngIf="creatingSheet"><span class="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block"></span></span>
              </button>
              <button (click)="cancelNewSheet()" class="px-3 py-2 text-xs text-textGray hover:text-textLight" style="height:36px">✕</button>
            </div>
            <button *ngIf="!showNewSheet" (click)="showNewSheet=true"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-textGray hover:text-textLight transition-all"
              style="background:rgba(255,255,255,0.04); border:1px solid #333; height:36px">
              <span class="text-sm leading-none">+</span> New Sheet
            </button>
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
              [style.color]="activeSheet === sh.name ? '#fff' : '#71717A'">{{ sh.vehicle_count }}</span>
          </button>
        </div>
        <div *ngIf="sheetError" class="px-5 pb-3 text-xs font-semibold" style="color:#EF4444">⚠️ {{ sheetError }}</div>
      </div>

      <!-- Drop Zone -->
      <div class="relative rounded-2xl p-12 sm:p-20 text-center cursor-pointer transition-all duration-300 border-2 border-dashed"
        [style.borderColor]="dragOver ? '#EF4444' : '#262626'"
        [style.background]="dragOver ? 'rgba(239,68,68,0.04)' : '#141414'"
        (dragover)="onDrag($event, true)"
        (dragleave)="onDrag($event, false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">
        <div *ngIf="dragOver" class="absolute inset-0 rounded-2xl pointer-events-none"
          style="box-shadow:inset 0 0 30px rgba(239,68,68,0.08)"></div>
        <div class="relative">
          <div class="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl mb-6"
            style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2)">📁</div>
          <h3 class="text-xl font-bold text-textLight mb-2">Drop your file here</h3>
          <p class="text-sm text-textGray mb-2">Supports Excel (.xlsx, .xls) and CSV</p>
          <p class="text-xs mb-8" style="color:#EF4444">
            → Will import into: <strong>{{ activeSheet === 'default' ? 'Default' : activeSheet }}</strong> sheet
          </p>
          <input #fileInput type="file" class="hidden" accept=".csv,.xlsx,.xls" (change)="onFileChange($event)">
          <button class="btn-red px-8 py-3 text-sm" (click)="$event.stopPropagation(); fileInput.click()">
            Browse Files
          </button>
        </div>
      </div>

      <!-- Uploading -->
      <div *ngIf="uploading" class="mt-6 p-5 rounded-2xl" style="background:#141414; border:1px solid rgba(239,68,68,0.2)">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 rounded-full border-2 border-t-primary animate-spin" style="border-color: #262626; border-top-color:#EF4444"></div>
          <div>
            <p class="text-sm font-bold text-textLight">Processing your file…</p>
            <p class="text-xs text-textGray mt-0.5">Detecting columns and importing records into <span style="color:#EF4444">{{ activeSheet }}</span></p>
          </div>
        </div>
        <div class="h-1 rounded-full overflow-hidden" style="background:#262626">
          <div class="h-full bg-primary rounded-full animate-pulse w-2/3"></div>
        </div>
      </div>

      <!-- Success -->
      <div *ngIf="result" class="mt-6 rounded-2xl overflow-hidden" style="background:#141414; border:1px solid rgba(239,68,68,0.2)">
        <div class="px-6 py-4 flex items-center gap-3" style="background:rgba(239,68,68,0.06); border-bottom:1px solid rgba(239,68,68,0.15)">
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">✓</div>
          <div>
            <h3 class="font-bold text-textLight">Upload Successful</h3>
            <p class="text-[10px] text-textGray mt-0.5">Added to sheet: <span style="color:#EF4444">{{ result.sheet_name || activeSheet }}</span></p>
          </div>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="rounded-xl p-4 text-center" style="background:#0B0B0B; border:1px solid #262626">
              <p class="text-[10px] text-textGray uppercase tracking-wider mb-1">Total Rows</p>
              <p class="text-3xl font-extrabold text-textLight">{{ result.total_processed }}</p>
            </div>
            <div class="rounded-xl p-4 text-center" style="background:#0B0B0B; border:1px solid rgba(239,68,68,0.2)">
              <p class="text-[10px] text-textGray uppercase tracking-wider mb-1">New</p>
              <p class="text-3xl font-extrabold text-primary">{{ result.inserted }}</p>
            </div>
            <div class="rounded-xl p-4 text-center" style="background:#0B0B0B; border:1px solid #262626">
              <p class="text-[10px] text-textGray uppercase tracking-wider mb-1">Updated</p>
              <p class="text-3xl font-extrabold text-textGray">{{ result.updated }}</p>
            </div>
          </div>
          <div *ngIf="result.columns?.length">
            <p class="text-xs text-textGray font-semibold mb-3">{{ result.columns.length }} Columns Mapped</p>
            <div class="flex flex-wrap gap-2">
              <span *ngFor="let col of result.columns"
                class="text-xs px-3 py-1 rounded-full font-medium"
                [style.background]="col === result.vehicle_col ? '#EF4444' : 'rgba(255,255,255,0.04)'"
                [style.color]="col === result.vehicle_col ? '#fff' : '#A1A1AA'"
                [style.border]="col === result.vehicle_col ? 'none' : '1px solid #262626'">
                {{ col === result.vehicle_col ? '🚗 ' : '' }}{{ col }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="mt-6 p-5 rounded-2xl flex items-start gap-4"
        style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2)">
        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">!</div>
        <div>
          <p class="text-sm font-bold text-primary">Upload Failed</p>
          <p class="text-xs text-textGray mt-0.5">{{ error }}</p>
        </div>
      </div>
    </div>
  `
})
export class UploadComponent implements OnInit, OnDestroy {
  dragOver = false; uploading = false; result: any = null; error = '';
  sheets: SheetInfo[] = [];
  activeSheet = 'default';
  showNewSheet = false;
  newSheetName = '';
  creatingSheet = false;
  sheetError = '';
  private subs = new Subscription();

  constructor(private ds: DataService) {}

  ngOnInit() {
    this.subs.add(this.ds.sheets$.subscribe(s => this.sheets = s));
    this.subs.add(this.ds.activeSheet$.subscribe(s => this.activeSheet = s));
    this.ds.loadSheets();
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  selectSheet(name: string) { this.ds.setActiveSheet(name); this.sheetError = ''; }

  createSheet() {
    const name = this.newSheetName.trim();
    if (!name) { this.sheetError = 'Please enter a sheet name.'; return; }
    this.creatingSheet = true; this.sheetError = '';
    this.ds.createSheet(name).subscribe({
      next: () => { this.creatingSheet = false; this.ds.setActiveSheet(name); this.cancelNewSheet(); },
      error: (err) => { this.creatingSheet = false; this.sheetError = err.error?.detail || 'Failed to create sheet.'; }
    });
  }

  cancelNewSheet() { this.showNewSheet = false; this.newSheetName = ''; this.sheetError = ''; }

  onDrag(e: DragEvent, s: boolean) { e.preventDefault(); this.dragOver = s; }
  onDrop(e: DragEvent) { e.preventDefault(); this.dragOver = false; if (e.dataTransfer?.files?.[0]) this.upload(e.dataTransfer.files[0]); }
  onFileChange(e: any) { if (e.target.files?.[0]) this.upload(e.target.files[0]); }

  upload(file: File) {
    this.result = null; this.error = ''; this.uploading = true;
    this.ds.uploadFile(file, this.activeSheet).subscribe({
      next: res => { this.result = res; this.uploading = false; },
      error: err => { this.error = err.error?.detail || 'Upload failed. Please try again.'; this.uploading = false; }
    });
  }
}
