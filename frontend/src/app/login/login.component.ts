import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; }
    .card { background:#111; border:1px solid #262626; border-radius:24px; overflow:hidden; box-shadow:0 25px 60px rgba(0,0,0,0.5); }
    .role-tab { flex:1; padding:14px 0; font-size:0.8rem; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; transition:all 0.2s; border-bottom:2px solid transparent; cursor:pointer; border:none; outline:none; }
    .role-tab.admin { background: linear-gradient(135deg, #1c0a0a, #0f0f0f); color:#ef4444; border-bottom:2px solid #ef4444; }
    .role-tab.worker { background: linear-gradient(135deg, #0a0f1c, #0f0f0f); color:#60a5fa; border-bottom:2px solid #3b82f6; }
    .role-tab.inactive { background:#0f0f0f; color:#555; border-bottom:2px solid transparent; }
    .role-tab.inactive:hover { color:#999; }
    .btn-admin { background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; border-radius:12px; padding:14px; width:100%; font-weight:800; font-size:0.85rem; cursor:pointer; transition:all 0.2s; }
    .btn-admin:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(239,68,68,0.4); }
    .btn-admin:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
    .btn-worker { background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; border:none; border-radius:12px; padding:14px; width:100%; font-weight:800; font-size:0.85rem; cursor:pointer; transition:all 0.2s; }
    .btn-worker:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(59,130,246,0.4); }
    .btn-worker:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
    .input-f { background:#0b0b0b; border:1px solid #2a2a2a; border-radius:10px; color:#f0f0f0; padding:12px 16px; width:100%; font-size:0.85rem; outline:none; transition:border-color 0.2s; box-sizing:border-box; }
    .input-f:focus { border-color:#ef4444; }
    .input-f.worker-focus:focus { border-color:#3b82f6; }
    .role-icon { font-size:2.2rem; margin-bottom:6px; }
    .badge-admin { background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:4px 12px; border-radius:20px; font-size:0.65rem; font-weight:800; letter-spacing:1px; display:inline-block; }
    .badge-worker { background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); padding:4px 12px; border-radius:20px; font-size:0.65rem; font-weight:800; letter-spacing:1px; display:inline-block; }
    .divider { height:1px; background:linear-gradient(90deg,transparent,#333,transparent); margin:20px 0; }
    .spin { width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style="background:#0a0a0a; font-family:'Inter',sans-serif">

      <!-- Background blobs -->
      <div class="absolute pointer-events-none" style="top:-20%;left:-15%;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(239,68,68,0.06),transparent 70%);filter:blur(40px)"></div>
      <div class="absolute pointer-events-none" style="bottom:-20%;right:-15%;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,0.06),transparent 70%);filter:blur(40px)"></div>

      <div class="w-full z-10" style="max-width:420px">

        <!-- Logo -->
        <div class="flex flex-col items-center mb-8" style="cursor:pointer" (click)="router.navigate(['/'])">
          <div style="width:56px;height:56px;background:linear-gradient(135deg,#ef4444,#991b1b);border-radius:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px rgba(239,68,68,0.4);margin-bottom:14px">
            <span style="color:#fff;font-weight:900;font-size:1.1rem;letter-spacing:-1px">SI</span>
          </div>
          <h1 style="font-size:1.5rem;font-weight:900;color:#f0f0f0;letter-spacing:-0.5px">SmartInsure</h1>
          <p style="font-size:0.72rem;color:#666;margin-top:3px">Vehicle Data Management Platform</p>
        </div>

        <!-- Card -->
        <div class="card">

          <!-- Role Tabs -->
          <div style="display:flex;border-bottom:1px solid #1d1d1d">
            <button class="role-tab" [class.admin]="role==='admin'" [class.inactive]="role!=='admin'"
              (click)="role='admin'; error=''">
              👑 Admin
            </button>
            <button class="role-tab" [class.worker]="role==='worker'" [class.inactive]="role!=='worker'"
              (click)="role='worker'; error=''">
              👷 Worker
            </button>
          </div>

          <!-- Role Header -->
          <div style="padding:20px 28px 0 28px;text-align:center">
            <div class="role-icon">{{ role === 'admin' ? '🏛️' : '🔧' }}</div>
            <div [class.badge-admin]="role==='admin'" [class.badge-worker]="role==='worker'">
              {{ role === 'admin' ? 'ADMINISTRATOR ACCESS' : 'WORKER ACCESS' }}
            </div>
            <p style="font-size:0.7rem;color:#555;margin-top:8px;padding:0 10px">
              {{ role === 'admin'
                ? 'Full system control — upload sheets, manage workers, view all data'
                : 'Data entry access — search and add vehicle records to your assigned sheet' }}
            </p>
          </div>

          <!-- Form -->
          <form style="padding:20px 28px 28px 28px" (ngSubmit)="submit()">

            <!-- Mode tabs: Login / Register -->
            <div style="display:flex;gap:8px;margin-bottom:20px">
              <button type="button" (click)="mode='login'; error=''"
                style="flex:1;padding:8px;border-radius:10px;font-size:0.75rem;font-weight:700;cursor:pointer;transition:all 0.2s;border:1px solid"
                [style.background]="mode==='login' ? (role==='admin' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)') : 'rgba(255,255,255,0.03)'"
                [style.color]="mode==='login' ? (role==='admin' ? '#ef4444' : '#60a5fa') : '#555'"
                [style.border-color]="mode==='login' ? (role==='admin' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)') : '#222'">
                Sign In
              </button>
              <button type="button" (click)="mode='register'; error=''"
                style="flex:1;padding:8px;border-radius:10px;font-size:0.75rem;font-weight:700;cursor:pointer;transition:all 0.2s;border:1px solid"
                [style.background]="mode==='register' ? (role==='admin' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)') : 'rgba(255,255,255,0.03)'"
                [style.color]="mode==='register' ? (role==='admin' ? '#ef4444' : '#60a5fa') : '#555'"
                [style.border-color]="mode==='register' ? (role==='admin' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)') : '#222'">
                Create Account
              </button>
            </div>

            <!-- Error -->
            <div *ngIf="error" style="margin-bottom:16px;padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:8px"
              [style.background]="role==='admin' ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)'"
              [style.border]="role==='admin' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(59,130,246,0.25)'">
              <span style="font-size:0.85rem">⚠️</span>
              <p style="font-size:0.75rem;font-weight:600" [style.color]="role==='admin' ? '#ef4444' : '#60a5fa'">{{ error }}</p>
            </div>

            <!-- Username -->
            <div style="margin-bottom:14px">
              <label style="display:block;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:7px">Username</label>
              <input type="text" [(ngModel)]="username" name="username" required
                placeholder="Enter username"
                class="input-f" [class.worker-focus]="role==='worker'"
                autocomplete="username">
            </div>

            <!-- Password -->
            <div style="margin-bottom:20px">
              <label style="display:block;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:7px">Password</label>
              <input type="password" [(ngModel)]="password" name="password" required
                placeholder="••••••••"
                class="input-f" [class.worker-focus]="role==='worker'"
                autocomplete="current-password">
              <p *ngIf="mode==='register'" style="font-size:0.65rem;color:#555;margin-top:5px">Minimum 6 characters</p>
            </div>

            <!-- Submit -->
            <button type="submit" [disabled]="loading || !username || !password"
              [class.btn-admin]="role==='admin'" [class.btn-worker]="role==='worker'">
              <span *ngIf="!loading">
                {{ mode === 'login' ? '→ Sign in as ' + (role === 'admin' ? 'Admin' : 'Worker') : '→ Create ' + (role === 'admin' ? 'Admin' : 'Worker') + ' Account' }}
              </span>
              <span *ngIf="loading" style="display:flex;align-items:center;justify-content:center;gap:8px">
                <span class="spin"></span> {{ mode === 'login' ? 'Signing in…' : 'Creating…' }}
              </span>
            </button>

            <!-- Worker info note -->
            <p *ngIf="role==='worker' && mode==='register'" style="margin-top:12px;font-size:0.65rem;color:#444;text-align:center;line-height:1.5">
              ℹ️ Worker accounts are assigned to a specific sheet by the admin. After creation, ask your admin to assign your sheet in the Manage Workers panel.
            </p>

          </form>
        </div>

        <!-- Footer -->
        <p style="text-align:center;font-size:0.7rem;color:#444;margin-top:20px">
          Secure, encrypted vehicle data management
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  mode: 'login' | 'register' = 'login';
  role: 'admin' | 'worker' = 'admin';
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService, public router: Router) {
    if (this.authService.isLoggedIn()) {
      const dest = this.authService.isAdmin() ? '/app/dashboard' : '/app/search';
      this.router.navigate([dest]);
    }
  }

  submit() {
    if (!this.username || !this.password) return;
    this.error = '';
    this.loading = true;
    const payload = { username: this.username.trim().toLowerCase(), password: this.password };
    const req = this.mode === 'login' ? this.authService.login(payload) : this.authService.register(payload);
    req.subscribe({
      next: (res) => {
        this.loading = false;
        const userRole = res?.user?.role ?? this.authService.getRole();
        // Route based on actual role from response
        this.router.navigate([userRole === 'admin' ? '/app/dashboard' : '/app/search']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'An error occurred. Please try again.';
      }
    });
  }
}
