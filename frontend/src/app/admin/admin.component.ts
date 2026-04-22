import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface WorkerUser {
  id: string;
  username: string;
  role: 'admin' | 'worker';
  assigned_sheet: string;
  admin_id?: string;
  created_at: string;
}

const API = environment.apiUrl;

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="font-family:'Inter',sans-serif">
      <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-textLight tracking-tight">Manage Workers</h1>
        <p class="text-sm text-textGray mt-1">Create worker accounts. Workers will see all your sheets automatically.</p>
      </div>

      <!-- Create Worker -->
      <div class="rounded-2xl p-6 mb-8" style="background:#141414; border:1px solid #262626">
        <h2 class="text-base font-bold text-textLight mb-5 flex items-center gap-2">
          ➕ Create Worker Account
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] text-textGray uppercase tracking-wider font-semibold mb-2">Username</label>
            <input type="text" [(ngModel)]="newUser.username" placeholder="e.g. worker1"
              class="input-field w-full px-4 py-3 text-sm">
          </div>
          <div>
            <label class="block text-[10px] text-textGray uppercase tracking-wider font-semibold mb-2">Password</label>
            <input type="password" [(ngModel)]="newUser.password" placeholder="Min 6 chars"
              class="input-field w-full px-4 py-3 text-sm">
          </div>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <button (click)="createWorker()" [disabled]="creating" class="btn-red px-8 py-3 text-sm disabled:opacity-50">
            <span *ngIf="!creating">👷 Create Worker</span>
            <span *ngIf="creating" class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>Creating…
            </span>
          </button>
          <p *ngIf="createMsg" class="text-sm font-semibold" [style.color]="createError ? '#EF4444' : '#22c55e'">
            {{ createMsg }}
          </p>
        </div>
      </div>

      <!-- Worker List -->
      <div class="rounded-2xl overflow-hidden" style="background:#141414; border:1px solid #262626">
        <div class="px-6 py-4 flex items-center justify-between" style="border-bottom:1px solid #262626">
          <h2 class="text-base font-bold text-textLight">Your Workers</h2>
          <button (click)="loadUsers()" class="text-xs text-textGray hover:text-textLight transition-colors px-3 py-1.5 rounded-lg"
            style="background:rgba(255,255,255,0.04); border:1px solid #333">🔄 Refresh</button>
        </div>

        <div *ngIf="loadingUsers" class="flex justify-center py-12">
          <div class="w-8 h-8 rounded-full border-2 animate-spin" style="border-color:#262626; border-top-color:#EF4444"></div>
        </div>

        <div *ngIf="!loadingUsers" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr style="border-bottom:1px solid #262626; background:rgba(255,255,255,0.02)">
                <th class="text-left px-6 py-3 text-[10px] font-bold text-textGray uppercase tracking-wider">Username</th>
                <th class="text-left px-4 py-3 text-[10px] font-bold text-textGray uppercase tracking-wider">Role</th>
                <th class="text-left px-4 py-3 text-[10px] font-bold text-textGray uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of users" style="border-bottom:1px solid #1d1d1d" class="hover:bg-white/[0.01] transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                      style="background:rgba(239,68,68,0.1); color:#EF4444">{{ u.username.charAt(0) }}</div>
                    <span class="font-semibold text-textLight">{{ u.username }}</span>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    [style.background]="u.role==='admin' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)'"
                    [style.color]="u.role==='admin' ? '#ef4444' : '#60a5fa'"
                    [style.border]="u.role==='admin' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(59,130,246,0.25)'">
                    {{ u.role === 'admin' ? '👑 Admin' : '👷 Worker' }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-2" *ngIf="u.role==='worker'">
                    <button (click)="resetPassword(u)"
                      class="text-[10px] px-3 py-1.5 rounded-lg transition-all"
                      style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); color:#60a5fa">
                      🔑 Reset Pass
                    </button>
                    <button (click)="deleteWorker(u)"
                      class="text-[10px] px-3 py-1.5 rounded-lg transition-all"
                      style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#ef4444">
                      🗑 Delete
                    </button>
                  </div>
                  <span *ngIf="u.role==='admin'" class="text-[10px] text-textGray">—</span>
                </td>
              </tr>
              <tr *ngIf="!users.length">
                <td colspan="3" class="text-center text-textGray py-12 text-sm">No workers yet. Create one above.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  users: WorkerUser[] = [];
  loadingUsers = false;
  creating = false;
  createMsg = '';
  createError = false;

  newUser = { username: '', password: '' };

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.loadingUsers = true;
    this.http.get<any>(`${API}/admin/users`).subscribe({
      next: res => { this.users = res.users || []; this.loadingUsers = false; },
      error: () => { this.loadingUsers = false; }
    });
  }

  createWorker() {
    const { username, password } = this.newUser;
    if (!username.trim() || !password.trim()) {
      this.createMsg = 'Username and password are required.';
      this.createError = true; return;
    }
    this.creating = true; this.createMsg = ''; this.createError = false;
    // Use the new dedicated worker-create endpoint (sets admin_id automatically)
    this.http.post<any>(`${API}/admin/workers`, {
      username: username.trim().toLowerCase(), password
    }).subscribe({
      next: res => {
        this.createMsg = `Worker "${res.username}" created. They can access all your sheets.`;
        this.createError = false;
        this.newUser = { username: '', password: '' };
        this.creating = false;
        setTimeout(() => this.loadUsers(), 400);
      },
      error: err => {
        this.createMsg = err.error?.detail || 'Failed to create worker.';
        this.createError = true; this.creating = false;
      }
    });
  }

  deleteWorker(u: WorkerUser) {
    if (!confirm(`Delete worker "${u.username}"? This cannot be undone.`)) return;
    this.http.delete<any>(`${API}/admin/users/${u.id}`).subscribe({
      next: () => { this.users = this.users.filter(x => x.id !== u.id); },
      error: err => alert(err.error?.detail || 'Delete failed.')
    });
  }

  resetPassword(u: WorkerUser) {
    const newPass = prompt(`Enter new password for ${u.username} (min 6 characters):`);
    if (newPass === null) return;
    if (newPass.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    
    this.http.patch<any>(`${API}/admin/users/${u.id}`, { password: newPass }).subscribe({
      next: () => alert(`Password for ${u.username} updated successfully.`),
      error: err => alert(err.error?.detail || 'Update failed.')
    });
  }
}
