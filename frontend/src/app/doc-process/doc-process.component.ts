import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, User } from '../auth.service';

interface ExtractedFields {
  insured_name: string;
  policy_number: string;
  vehicle_number: string;
  vehicle_model: string;
  engine_number: string;
  chassis_number: string;
  insurance_company: string;
  policy_start_date: string;
  policy_end_date: string;
  idv: string;
  premium: string;
  mobile_number: string;
  email: string;
  rto: string;
}

interface DocumentUpload {
  id: string;
  doc_id: string;
  uploaded_by_user_id: string;
  uploaded_by_name: string;
  uploaded_by_email: string;
  upload_time: string;
  file_name: string;
  file_type: string;
  ocr_status: 'success' | 'partial' | 'failed';
  ocr_confidence: number;
  processing_time_ms: number;
  extracted_fields: ExtractedFields;
}

interface UserProductivity {
  user_id: string;
  name: string;
  email: string;
  total_processed: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  last_active: string;
}

interface AnalyticsStats {
  total_uploads: number;
  today_uploads: number;
  month_uploads: number;
  success_rate: number;
  status_distribution: {
    success: number;
    partial: number;
    failed: number;
  };
  user_productivity: UserProductivity[];
}

@Component({
  selector: 'app-doc-process',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  template: `
    <div class="space-y-6" style="font-family:'Inter',sans-serif">
      <div class="mb-6">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Document Processing</h1>
        <p class="text-sm text-textGray mt-1">Upload scanned insurance policies, run instant OCR field extraction, and review productivity logs.</p>
      </div>

      <!-- Tab Buttons (Glassmorphic Bar) -->
      <div class="flex gap-2 p-1.5 rounded-2xl bg-[#141414] border border-[#262626] overflow-x-auto w-fit">
        <button (click)="activeTab = 'upload'"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
          [style.background]="activeTab === 'upload' ? '#EF4444' : 'transparent'"
          [style.color]="activeTab === 'upload' ? '#fff' : '#A1A1AA'">
          <span>📁</span> Upload Document
        </button>
        <button (click)="activeTab = 'history'; loadHistory()"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
          [style.background]="activeTab === 'history' ? '#EF4444' : 'transparent'"
          [style.color]="activeTab === 'history' ? '#fff' : '#A1A1AA'">
          <span>📜</span> History & Search
        </button>
        <button *ngIf="isAdmin" (click)="activeTab = 'analytics'; loadAnalytics()"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
          [style.background]="activeTab === 'analytics' ? '#EF4444' : 'transparent'"
          [style.color]="activeTab === 'analytics' ? '#fff' : '#A1A1AA'">
          <span>📊</span> Analytics & Productivity
        </button>
      </div>

      <!-- TAB 1: UPLOAD & PROCESS -->
      <div *ngIf="activeTab === 'upload'" class="space-y-6">
        <!-- Drag & Drop Zone -->
        <div class="relative rounded-2xl p-10 sm:p-16 text-center cursor-pointer transition-all duration-300 border-2 border-dashed"
          [style.borderColor]="dragOver ? '#EF4444' : '#262626'"
          [style.background]="dragOver ? 'rgba(239,68,68,0.04)' : '#141414'"
          (dragover)="onDrag($event, true)"
          (dragleave)="onDrag($event, false)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          <div *ngIf="dragOver" class="absolute inset-0 rounded-2xl pointer-events-none"
            style="box-shadow:inset 0 0 30px rgba(239,68,68,0.08)"></div>
          <div class="relative">
            <div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4"
              style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2)">📄</div>
            <h3 class="text-lg font-bold text-textLight mb-1">Drag and drop insurance document</h3>
            <p class="text-xs text-textGray mb-4">Supports PDF, PNG, JPG, JPEG (Max 10MB)</p>
            <input #fileInput type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg" (change)="onFileChange($event)">
            <button class="btn-red px-6 py-2.5 text-xs font-bold" (click)="$event.stopPropagation(); fileInput.click()">
              Browse Files
            </button>
          </div>
        </div>

        <!-- Processing Loader -->
        <div *ngIf="uploading" class="p-5 rounded-2xl bg-[#141414] border border-red-500/20 space-y-3">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full border-2 border-t-primary animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
            <div>
              <p class="text-sm font-bold text-textLight">Running OCR and extracting fields…</p>
              <p class="text-[11px] text-textGray mt-0.5">Please wait, AI rule-based matching is mapping document details.</p>
            </div>
          </div>
          <div class="h-1 rounded-full overflow-hidden bg-[#262626]">
            <div class="h-full bg-primary rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>

        <!-- OCR Error Message -->
        <div *ngIf="uploadError" class="p-5 rounded-2xl flex items-start gap-4 bg-red-500/5 border border-red-500/20">
          <div class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">!</div>
          <div>
            <p class="text-sm font-bold text-primary">Processing Failed</p>
            <p class="text-xs text-textGray mt-0.5">{{ uploadError }}</p>
          </div>
        </div>

        <!-- Success Result Form -->
        <div *ngIf="activeDoc" class="rounded-2xl bg-[#141414] border border-[#262626] overflow-hidden">
          <div class="px-6 py-4 flex items-center justify-between border-b border-[#262626] bg-red-500/[0.02]">
            <div class="flex items-center gap-3">
              <span class="text-xl">✓</span>
              <div>
                <h3 class="font-bold text-textLight text-sm">Extracted Document Data</h3>
                <p class="text-[10px] text-textGray mt-0.5">File: {{ activeDoc.file_name }} ({{ activeDoc.processing_time_ms }}ms)</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2.5 py-1 rounded-full font-bold uppercase"
                [style.background]="getStatusBg(activeDoc.ocr_status)"
                [style.color]="getStatusColor(activeDoc.ocr_status)">
                OCR {{ activeDoc.ocr_status }}
              </span>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <!-- Alert message for partial data -->
            <div *ngIf="activeDoc.ocr_status !== 'success'" class="p-3.5 rounded-xl text-xs bg-amber-500/5 border border-amber-500/20 text-amber-500">
              ⚠️ Some fields could not be matched automatically. Please review and fill in the missing fields below.
            </div>

            <!-- Fields Form Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Customer / Insured Name</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.insured_name" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Policy Number</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.policy_number" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Vehicle Number</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.vehicle_number" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Vehicle Model</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.vehicle_model" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Engine Number</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.engine_number" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Chassis Number</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.chassis_number" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Insurance Company</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.insurance_company" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">IDV (Insured Declared Value)</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.idv" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Premium (Final/Net)</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.premium" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Policy Start Date</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.policy_start_date" class="input-field" placeholder="DD-MM-YYYY">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Policy End Date</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.policy_end_date" class="input-field" placeholder="DD-MM-YYYY">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Mobile Number</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.mobile_number" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">Email Address</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.email" class="input-field" placeholder="N/A">
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] text-textGray uppercase tracking-wider font-semibold">RTO Location</label>
                <input type="text" [(ngModel)]="activeDoc.extracted_fields.rto" class="input-field" placeholder="N/A">
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-[#262626]">
              <button (click)="downloadOriginal(activeDoc)"
                class="px-5 py-2.5 rounded-xl text-xs font-semibold text-textGray hover:text-white transition-all bg-white/[0.04] border border-[#333]">
                ⬇ Download Original
              </button>
              <button (click)="saveChanges(activeDoc)" [disabled]="saving"
                class="btn-red px-6 py-2.5 text-xs font-bold disabled:opacity-50">
                <span *ngIf="!saving">✓ Save & Verify</span>
                <span *ngIf="saving"><span class="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block"></span> Saving…</span>
              </button>
            </div>
            <div *ngIf="saveSuccess" class="text-xs font-semibold text-emerald-500 text-right">✓ Document fields updated successfully.</div>
            <div *ngIf="saveError" class="text-xs font-semibold text-primary text-right">⚠️ {{ saveError }}</div>
          </div>
        </div>
      </div>

      <!-- TAB 2: HISTORY & SEARCH -->
      <div *ngIf="activeTab === 'history'" class="space-y-4">
        <!-- Filters Strip -->
        <div class="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <!-- Search bar -->
            <div class="relative w-full sm:w-64">
              <input type="text" [(ngModel)]="filterQuery" (keyup.enter)="loadHistory()"
                placeholder="Search plate, policy, name…"
                class="input-field pl-9 w-full text-xs" style="height:38px">
              <span class="absolute left-3.5 top-2.5 text-textGray text-xs">🔍</span>
            </div>
            <!-- Status filter -->
            <select [(ngModel)]="filterStatus" (change)="loadHistory()"
              class="input-field text-xs w-full sm:w-40" style="height:38px; background:#141414">
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
            <!-- User filter (Admin only) -->
            <select *ngIf="isAdmin" [(ngModel)]="filterUser" (change)="loadHistory()"
              class="input-field text-xs w-full sm:w-48" style="height:38px; background:#141414">
              <option value="all">All Workers</option>
              <option *ngFor="let u of distinctUsers" [value]="u.id">{{ u.name }}</option>
            </select>
          </div>
          <button (click)="loadHistory()" class="btn-red px-5 py-2 text-xs font-bold w-full md:w-auto" style="height:38px">
            Search
          </button>
        </div>

        <!-- History Loading -->
        <div *ngIf="loadingHistory" class="py-12 text-center text-textGray">
          <div class="w-8 h-8 rounded-full border-2 border-t-primary animate-spin mx-auto mb-3" style="border-color:#262626; border-top-color:#EF4444"></div>
          Loading documents...
        </div>

        <!-- History Empty State -->
        <div *ngIf="!loadingHistory && historyDocs.length === 0" class="py-16 text-center text-textGray bg-[#141414] rounded-2xl border border-[#262626]">
          <p class="text-2xl mb-2">📄</p>
          <p class="text-sm font-semibold text-textLight">No documents found</p>
          <p class="text-xs text-textGray mt-0.5">Try adjusting your filters or upload a new policy.</p>
        </div>

        <!-- History Table -->
        <div *ngIf="!loadingHistory && historyDocs.length > 0" class="rounded-2xl bg-[#141414] border border-[#262626] overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-black/40 text-textGray uppercase tracking-wider font-semibold border-b border-[#262626]">
                  <th class="px-5 py-3.5">File Name</th>
                  <th *ngIf="isAdmin" class="px-5 py-3.5">Uploaded By</th>
                  <th class="px-5 py-3.5">Customer Name</th>
                  <th class="px-5 py-3.5">Vehicle No</th>
                  <th class="px-5 py-3.5">Policy No</th>
                  <th class="px-5 py-3.5">Premium</th>
                  <th class="px-5 py-3.5">Upload Date</th>
                  <th class="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let doc of historyDocs">
                  <tr (click)="toggleExpand(doc.doc_id)"
                    class="hover:bg-white/[0.02] border-b border-[#262626]/60 cursor-pointer transition-colors"
                    [style.background]="expandedDocId === doc.doc_id ? 'rgba(239,68,68,0.02)' : ''">
                    <td class="px-5 py-3.5 font-semibold text-textLight truncate max-w-[150px]">{{ doc.file_name }}</td>
                    <td *ngIf="isAdmin" class="px-5 py-3.5 text-textGray truncate max-w-[120px]">{{ doc.uploaded_by_name }}</td>
                    <td class="px-5 py-3.5 text-textGray truncate max-w-[130px]">{{ doc.extracted_fields.insured_name || 'N/A' }}</td>
                    <td class="px-5 py-3.5 font-mono text-textLight">{{ doc.extracted_fields.vehicle_number || 'N/A' }}</td>
                    <td class="px-5 py-3.5 text-textGray truncate max-w-[150px]">{{ doc.extracted_fields.policy_number || 'N/A' }}</td>
                    <td class="px-5 py-3.5 text-textLight">{{ doc.extracted_fields.premium ? '₹' + doc.extracted_fields.premium : 'N/A' }}</td>
                    <td class="px-5 py-3.5 text-textGray">{{ formatDate(doc.upload_time) }}</td>
                    <td class="px-5 py-3.5 text-center">
                      <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                        [style.background]="getStatusBg(doc.ocr_status)"
                        [style.color]="getStatusColor(doc.ocr_status)">
                        {{ doc.ocr_status }}
                      </span>
                    </td>
                  </tr>

                  <!-- Expanded Detail Row -->
                  <tr *ngIf="expandedDocId === doc.doc_id">
                    <td [attr.colspan]="isAdmin ? 8 : 7" class="px-6 py-6 bg-black/20 border-b border-[#262626]">
                      <div class="space-y-6">
                        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div>
                            <h4 class="text-xs font-bold text-textLight">Edit Extracted Document Fields</h4>
                            <p class="text-[10px] text-textGray mt-0.5">Correct values and save to persist updates. User ID: {{ doc.uploaded_by_user_id }}</p>
                          </div>
                          <div class="flex gap-2">
                            <button (click)="downloadOriginal(doc)" class="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-[#333] rounded-lg text-[10px] font-bold text-textGray hover:text-white transition-all">
                              ⬇ Download File
                            </button>
                            <button *ngIf="isAdmin" (click)="deleteDoc(doc.doc_id)" class="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-[10px] font-bold text-primary transition-all">
                              ✕ Delete Record
                            </button>
                          </div>
                        </div>

                        <!-- Editable fields grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Insured Customer</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.insured_name" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Policy No</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.policy_number" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Vehicle Plate</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.vehicle_number" class="input-field text-xs py-1.5 font-mono">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Vehicle Model</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.vehicle_model" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Engine No</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.engine_number" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Chassis No</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.chassis_number" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Company</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.insurance_company" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Premium</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.premium" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">IDV</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.idv" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">Start Date</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.policy_start_date" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">End Date</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.policy_end_date" class="input-field text-xs py-1.5">
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[9px] uppercase tracking-wider text-textGray font-semibold">RTO</label>
                            <input type="text" [(ngModel)]="doc.extracted_fields.rto" class="input-field text-xs py-1.5">
                          </div>
                        </div>

                        <div class="flex justify-end gap-2">
                          <button (click)="saveChanges(doc)" [disabled]="saving" class="btn-red px-5 py-2 text-[10px] font-bold">
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="px-5 py-4 border-t border-[#262626] flex items-center justify-between text-textGray text-xs">
            <div>
              Showing {{ (historyPage-1)*historyLimit + 1 }} to {{ min(historyPage*historyLimit, totalHistory) }} of {{ totalHistory }} documents
            </div>
            <div class="flex gap-2">
              <button (click)="changePage(-1)" [disabled]="historyPage === 1" class="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-[#333] disabled:opacity-30">
                Prev
              </button>
              <button (click)="changePage(1)" [disabled]="historyPage*historyLimit >= totalHistory" class="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-[#333] disabled:opacity-30">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: ANALYTICS & PRODUCTIVITY (ADMIN ONLY) -->
      <div *ngIf="activeTab === 'analytics' && isAdmin" class="space-y-6">
        <!-- Analytics Loading -->
        <div *ngIf="loadingAnalytics" class="py-12 text-center text-textGray">
          <div class="w-8 h-8 rounded-full border-2 border-t-primary animate-spin mx-auto mb-3" style="border-color:#262626; border-top-color:#EF4444"></div>
          Loading statistics...
        </div>

        <ng-container *ngIf="!loadingAnalytics && analytics">
          <!-- Stats Summary Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="rounded-2xl p-5 bg-[#141414] border border-[#262626]">
              <p class="text-[10px] text-textGray uppercase tracking-wider mb-1 font-semibold">Total Documents</p>
              <p class="text-3xl font-extrabold text-textLight">{{ analytics.total_uploads }}</p>
            </div>
            <div class="rounded-2xl p-5 bg-[#141414] border border-red-500/10">
              <p class="text-[10px] text-textGray uppercase tracking-wider mb-1 font-semibold">Processed Today</p>
              <p class="text-3xl font-extrabold text-primary">{{ analytics.today_uploads }}</p>
            </div>
            <div class="rounded-2xl p-5 bg-[#141414] border border-[#262626]">
              <p class="text-[10px] text-textGray uppercase tracking-wider mb-1 font-semibold">This Month</p>
              <p class="text-3xl font-extrabold text-textLight">{{ analytics.month_uploads }}</p>
            </div>
            <div class="rounded-2xl p-5 bg-[#141414] border border-emerald-500/10">
              <p class="text-[10px] text-textGray uppercase tracking-wider mb-1 font-semibold">OCR Success Rate</p>
              <p class="text-3xl font-extrabold text-emerald-500">{{ analytics.success_rate }}%</p>
            </div>
          </div>

          <!-- Excel Export controls card -->
          <div class="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">📥</span>
              <div>
                <h3 class="text-sm font-bold text-textLight">Excel Export Tools</h3>
                <p class="text-[10px] text-textGray mt-0.5">Download full spreadsheets of processed document schemas including employee names for productivity tracking.</p>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <!-- Export All Combined -->
              <button (click)="exportExcel('all')"
                class="btn-red px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
                <span>📊</span> Export All Combined Excel
              </button>

              <!-- Export Selected User -->
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <select [(ngModel)]="exportUserId"
                  class="input-field text-xs bg-[#141414] border-[#262626] flex-1 sm:w-48" style="height:36px">
                  <option value="">Select Worker...</option>
                  <option *ngFor="let u of distinctUsers" [value]="u.id">{{ u.name }}</option>
                </select>
                <button (click)="exportExcel(exportUserId)" [disabled]="!exportUserId"
                  class="px-5 py-2 rounded-xl text-xs font-bold text-textGray hover:text-white bg-white/[0.04] border border-[#333] disabled:opacity-30" style="height:36px">
                  Export User
                </button>
              </div>
            </div>
          </div>

          <!-- Productivity Table -->
          <div class="space-y-3">
            <h3 class="text-sm font-bold text-textLight">Employee Productivity Tracking</h3>
            <div class="rounded-2xl bg-[#141414] border border-[#262626] overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-black/40 text-textGray uppercase tracking-wider font-semibold border-b border-[#262626]">
                      <th class="px-5 py-3.5">User Name</th>
                      <th class="px-5 py-3.5">Email Address</th>
                      <th class="px-5 py-3.5 text-center">Total Processed</th>
                      <th class="px-5 py-3.5 text-center">OCR Success</th>
                      <th class="px-5 py-3.5 text-center">OCR Failed</th>
                      <th class="px-5 py-3.5 text-center">Success Rate</th>
                      <th class="px-5 py-3.5">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of analytics.user_productivity" class="hover:bg-white/[0.01] border-b border-[#262626]/50">
                      <td class="px-5 py-3.5 font-bold text-textLight">{{ p.name }}</td>
                      <td class="px-5 py-3.5 text-textGray">{{ p.email || 'N/A' }}</td>
                      <td class="px-5 py-3.5 text-center font-semibold text-textLight">{{ p.total_processed }}</td>
                      <td class="px-5 py-3.5 text-center text-emerald-500">{{ p.success_count }}</td>
                      <td class="px-5 py-3.5 text-center text-primary">{{ p.failed_count }}</td>
                      <td class="px-5 py-3.5 text-center font-bold"
                        [style.color]="p.success_rate >= 80 ? '#10B981' : (p.success_rate >= 50 ? '#F59E0B' : '#EF4444')">
                        {{ p.success_rate | number:'1.0-1' }}%
                      </td>
                      <td class="px-5 py-3.5 text-textGray">{{ p.last_active ? formatDate(p.last_active) : 'Never' }}</td>
                    </tr>
                    <tr *ngIf="analytics.user_productivity.length === 0">
                      <td colspan="7" class="px-5 py-8 text-center text-textGray">No productivity records available.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `
})
export class DocProcessComponent implements OnInit, OnDestroy {
  activeTab: 'upload' | 'history' | 'analytics' = 'upload';
  isAdmin = false;
  user: User | null = null;
  private subs = new Subscription();

  // API Config
  private docApi = environment.apiUrl + '/docs';

  // Upload State
  dragOver = false;
  uploading = false;
  uploadError = '';
  activeDoc: DocumentUpload | null = null;
  saving = false;
  saveSuccess = false;
  saveError = '';

  // History State
  historyDocs: DocumentUpload[] = [];
  loadingHistory = false;
  expandedDocId = '';
  filterQuery = '';
  filterStatus = '';
  filterUser = 'all';
  distinctUsers: { id: string; name: string }[] = [];
  historyPage = 1;
  historyLimit = 10;
  totalHistory = 0;

  // Analytics State
  analytics: AnalyticsStats | null = null;
  loadingAnalytics = false;
  exportUserId = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.user = this.authService.currentUser;
    this.subs.add(this.authService.currentUser$.subscribe(u => {
      this.user = u;
      this.isAdmin = u?.role === 'admin';
    }));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // --- OCR UPLOADER ---

  onDrag(e: DragEvent, drag: boolean) {
    e.preventDefault();
    this.dragOver = drag;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
    if (e.dataTransfer?.files?.[0]) {
      this.uploadFile(e.dataTransfer.files[0]);
    }
  }

  onFileChange(e: any) {
    if (e.target.files?.[0]) {
      this.uploadFile(e.target.files[0]);
    }
  }

  uploadFile(file: File) {
    this.activeDoc = null;
    this.uploadError = '';
    this.uploading = true;
    this.saveSuccess = false;
    this.saveError = '';

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<DocumentUpload>(`${this.docApi}/upload`, formData).subscribe({
      next: (res) => {
        this.activeDoc = res;
        this.uploading = false;
      },
      error: (err) => {
        this.uploadError = err.error?.detail || 'An error occurred during file upload and OCR processing.';
        this.uploading = false;
      }
    });
  }

  saveChanges(doc: DocumentUpload) {
    this.saving = true;
    this.saveSuccess = false;
    this.saveError = '';

    const payload = {
      extracted_fields: doc.extracted_fields
    };

    this.http.patch<DocumentUpload>(`${this.docApi}/${doc.doc_id}`, payload).subscribe({
      next: (res) => {
        // Update both activeDoc and history inline item
        this.activeDoc = res;
        const idx = this.historyDocs.findIndex(d => d.doc_id === doc.doc_id);
        if (idx !== -1) {
          this.historyDocs[idx] = res;
        }
        this.saving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        this.saveError = err.error?.detail || 'Failed to update changes.';
        this.saving = false;
      }
    });
  }

  downloadOriginal(doc: DocumentUpload) {
    this.http.get(`${this.docApi}/${doc.doc_id}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('File download failed', err);
        alert('File download failed. The file may no longer exist on Render/disk.');
      }
    });
  }

  // --- HISTORY & CRUD ---

  loadHistory() {
    this.loadingHistory = true;
    this.expandedDocId = '';

    let params = `?page=${this.historyPage}&limit=${this.historyLimit}`;
    if (this.filterQuery.trim()) params += `&search=${encodeURIComponent(this.filterQuery)}`;
    if (this.filterStatus) params += `&ocr_status=${this.filterStatus}`;
    if (this.isAdmin && this.filterUser) params += `&user_id=${this.filterUser}`;

    this.http.get<any>(`${this.docApi}/${params}`).subscribe({
      next: (res) => {
        this.historyDocs = res.documents;
        this.totalHistory = res.total;
        if (res.users) {
          this.distinctUsers = res.users;
        }
        this.loadingHistory = false;
      },
      error: (err) => {
        console.error('History fetch failed', err);
        this.loadingHistory = false;
      }
    });
  }

  toggleExpand(docId: string) {
    this.expandedDocId = this.expandedDocId === docId ? '' : docId;
  }

  deleteDoc(docId: string) {
    if (!confirm('Are you sure you want to permanently delete this document and its file?')) {
      return;
    }

    this.http.delete(`${this.docApi}/${docId}`).subscribe({
      next: () => {
        this.historyDocs = this.historyDocs.filter(d => d.doc_id !== docId);
        this.totalHistory--;
        if (this.expandedDocId === docId) this.expandedDocId = '';
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to delete document.');
      }
    });
  }

  changePage(dir: number) {
    this.historyPage += dir;
    this.loadHistory();
  }

  // --- ANALYTICS & EXPORTS ---

  loadAnalytics() {
    this.loadingAnalytics = true;
    this.http.get<AnalyticsStats>(`${this.docApi}/analytics`).subscribe({
      next: (res) => {
        this.analytics = res;
        this.loadingAnalytics = false;
      },
      error: (err) => {
        console.error('Analytics load failed', err);
        this.loadingAnalytics = false;
      }
    });
  }

  exportExcel(userId: string) {
    if (!userId) return;

    this.http.get(`${this.docApi}/export/excel?user_id=${userId}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartInsure_Docs_Export_${userId}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Excel export failed', err);
        alert('Failed to download Excel export.');
      }
    });
  }

  // --- UTILS ---

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  getStatusBg(status: string): string {
    if (status === 'success') return 'rgba(16,185,129,0.12)';
    if (status === 'partial') return 'rgba(245,158,11,0.12)';
    return 'rgba(239,68,68,0.12)';
  }

  getStatusColor(status: string): string {
    if (status === 'success') return '#10B981';
    if (status === 'partial') return '#F59E0B';
    return '#EF4444';
  }
}
