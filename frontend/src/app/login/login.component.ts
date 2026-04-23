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
    :host { display:block; }
    .page { min-height:100vh; background:#080808; display:flex; align-items:center; justify-content:center; padding:20px; font-family:'Inter',sans-serif; position:relative; overflow:hidden; }
    .blob { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; }
    .card { width:100%; max-width:420px; background:#111; border:1px solid #222; border-radius:24px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.6); position:relative; z-index:10; }
    /* Mode tabs */
    .tabs { display:flex; border-bottom:1px solid #1e1e1e; }
    .tab { flex:1; padding:15px; font-size:0.78rem; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; background:transparent; border:none; cursor:pointer; transition:all 0.2s; color:#555; position:relative; }
    .tab.active { color:#f0f0f0; background:rgba(255,255,255,0.02); }
    .tab.active::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:#ef4444; }
    /* Body */
    .body { padding:28px; }
    .logo { display:flex; flex-direction:column; align-items:center; margin-bottom:24px; }
    .logo-icon { width:52px; height:52px; background:linear-gradient(135deg,#ef4444,#b91c1c); border-radius:14px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 24px rgba(239,68,68,0.35); margin-bottom:10px; }
    .logo-icon span { color:#fff; font-weight:900; font-size:1.1rem; }
    .logo h1 { font-size:1.4rem; font-weight:900; color:#f0f0f0; letter-spacing:-0.5px; }
    .logo p { font-size:0.68rem; color:#555; margin-top:2px; }
    /* Admin toggle */
    .admin-toggle { display:flex; align-items:center; gap:10px; padding:12px 14px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18); border-radius:12px; margin-bottom:20px; cursor:pointer; transition:all 0.2s; }
    .admin-toggle:hover { background:rgba(239,68,68,0.1); }
    .admin-toggle input[type=checkbox] { width:16px; height:16px; accent-color:#ef4444; cursor:pointer; flex-shrink:0; }
    .admin-toggle-label { font-size:0.78rem; font-weight:700; color:#ef4444; cursor:pointer; user-select:none; }
    .admin-toggle-sub { font-size:0.65rem; color:#666; cursor:pointer; margin-top:1px; }
    /* Inputs */
    .field { margin-bottom:16px; }
    .field label { display:block; font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#555; margin-bottom:6px; }
    .field input { width:100%; background:#0c0c0c; border:1px solid #2a2a2a; border-radius:10px; color:#f0f0f0; padding:12px 14px; font-size:0.85rem; outline:none; transition:border-color 0.2s; box-sizing:border-box; font-family:inherit; }
    .field input:focus { border-color:#ef4444; }
    /* Submit */
    .btn-submit { width:100%; padding:14px; border:none; border-radius:12px; font-size:0.85rem; font-weight:800; cursor:pointer; transition:all 0.2s; margin-top:4px; font-family:inherit; }
    .btn-admin { background:linear-gradient(135deg,#ef4444,#b91c1c); color:#fff; box-shadow:0 4px 16px rgba(239,68,68,0.35); }
    .btn-admin:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(239,68,68,0.45); }
    .btn-user { background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; box-shadow:0 4px 16px rgba(59,130,246,0.3); }
    .btn-user:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(59,130,246,0.4); }
    .btn-submit:disabled { opacity:0.5; cursor:not-allowed; transform:none !important; }
    /* Error */
    .err { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:10px 14px; display:flex; gap:8px; align-items:flex-start; margin-bottom:16px; }
    .err span { font-size:0.75rem; color:#ef4444; font-weight:600; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block;flex-shrink:0; }
    .footer { text-align:center; font-size:0.68rem; color:#333; padding:16px 0 8px; }
  `],
  template: `
    <div class="page">
      <!-- Background blobs -->
      <div class="blob" style="top:-15%;left:-15%;width:400px;height:400px;background:radial-gradient(circle,rgba(239,68,68,0.07),transparent 70%)"></div>
      <div class="blob" style="bottom:-15%;right:-15%;width:400px;height:400px;background:radial-gradient(circle,rgba(59,130,246,0.05),transparent 70%)"></div>

      <div style="width:100%;max-width:420px;z-index:10">

        <!-- Card -->
        <div class="card">

          <!-- Mode Tabs -->
          <div class="tabs" *ngIf="mode === 'login' || mode === 'register'">
            <button class="tab" [class.active]="mode==='login'" (click)="mode='login';error=''">Sign In</button>
            <button class="tab" [class.active]="mode==='register'" (click)="mode='register';error=''">Create Account</button>
          </div>
          <div class="tabs" *ngIf="mode === 'forgot_password' || mode === 'reset_password'">
            <button class="tab active" style="text-align:left; padding-left:28px" disabled>Password Reset</button>
            <button class="tab" style="text-align:right; padding-right:28px" (click)="mode='login';error=''">Back to Login</button>
          </div>

          <div class="body">

            <!-- Logo -->
            <div class="logo">
              <div class="logo-icon"><span>SI</span></div>
              <h1>SmartInsure</h1>
              <p>Vehicle Data Management Platform</p>
            </div>

            <!-- Admin Toggle -->
            <label class="admin-toggle" for="adminChk">
              <input type="checkbox" id="adminChk" [(ngModel)]="isAdminLogin">
              <div>
                <div class="admin-toggle-label">{{ isAdminLogin ? '👑 Admin Login' : '👤 User Login' }}</div>
                <div class="admin-toggle-sub">{{ isAdminLogin ? 'Full access: all sheets, manage workers' : 'Standard access: your assigned sheet only' }}</div>
              </div>
            </label>

            <!-- Error -->
            <div class="err" *ngIf="error">
              <span>⚠ {{ error }}</span>
            </div>

            <!-- Username -->
            <div class="field" *ngIf="mode !== 'reset_password' && mode !== 'forgot_password'">
              <label>Username</label>
              <input type="text" [(ngModel)]="username" name="username" placeholder="Enter username" autocomplete="username">
            </div>

            <!-- Email (for Register & Forgot Password / Reset) -->
            <div class="field" *ngIf="mode === 'register' || mode === 'forgot_password' || mode === 'reset_password'">
              <label>Email Address</label>
              <input type="email" [(ngModel)]="email" name="email" placeholder="Enter email" autocomplete="email" [disabled]="mode === 'reset_password'">
            </div>

            <!-- OTP -->
            <div class="field" *ngIf="mode === 'reset_password'">
              <label>6-Digit OTP</label>
              <input type="text" [(ngModel)]="otp" name="otp" placeholder="Enter OTP from alert" autocomplete="one-time-code">
            </div>

            <!-- Password -->
            <div class="field" *ngIf="mode !== 'forgot_password'">
              <label>{{ mode === 'reset_password' ? 'New Password' : 'Password' }}</label>
              <input type="password" [(ngModel)]="password" name="password" (keyup.enter)="submit()" placeholder="••••••••" autocomplete="current-password">
              <p *ngIf="mode==='register' || mode==='reset_password'" style="font-size:0.63rem;color:#555;margin-top:4px">Minimum 6 characters</p>
            </div>
            
            <div *ngIf="mode === 'login'" style="text-align:right; margin-top:-8px; margin-bottom:16px">
              <a href="javascript:void(0)" (click)="mode='forgot_password';error=''" style="font-size:0.75rem; color:#ef4444; text-decoration:none; font-weight:600">Forgot Password?</a>
            </div>

            <!-- Submit -->
            <button class="btn-submit" [ngClass]="isAdminLogin ? 'btn-admin' : 'btn-user'"
              [disabled]="isSubmitDisabled" 
              (click)="submit()">
              <span *ngIf="!loading">
                {{ mode === 'login'
                   ? (isAdminLogin ? '→ Sign in as Admin' : '→ Sign in')
                   : mode === 'register' 
                     ? (isAdminLogin ? '→ Register Admin Account' : '→ Create Account')
                     : mode === 'forgot_password' 
                       ? '→ Get Reset OTP' 
                       : '→ Update Password' }}
              </span>
              <span *ngIf="loading" style="display:flex;align-items:center;justify-content:center;gap:8px">
                <span class="spin"></span>
                {{ mode === 'login' ? 'Signing in…' : mode === 'register' ? 'Creating account…' : 'Processing…' }}
              </span>
            </button>

          </div>
        </div>

        <div class="footer">Secure vehicle data management platform</div>
      </div>
    </div>
  `
})
export class LoginComponent {
  mode: 'login' | 'register' | 'forgot_password' | 'reset_password' = 'login';
  username = '';
  email = '';
  password = '';
  otp = '';
  error = '';
  loading = false;
  isAdminLogin = false;

  constructor(private authService: AuthService, public router: Router) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.authService.isAdmin() ? '/app/dashboard' : '/app/search']);
    }
  }

  get isSubmitDisabled(): boolean {
    if (this.loading) return true;
    if (this.mode === 'forgot_password') return !this.email || this.email.trim() === '';
    if (this.mode === 'reset_password') return (!this.otp || !this.password);
    if (this.mode === 'login') return (!this.username || !this.password);
    if (this.mode === 'register') return (!this.username || !this.email || !this.password);
    return true;
  }

  submit() {
    if (this.mode === 'forgot_password' && !this.email) return;
    if (this.mode === 'reset_password' && (!this.otp || !this.password)) return;
    if (this.mode === 'login' && (!this.username || !this.password)) return;
    if (this.mode === 'register' && (!this.username || !this.email || !this.password)) return;
    
    this.error = '';
    this.loading = true;

    if (this.mode === 'forgot_password') {
      this.authService.forgotPassword({ email: this.email.trim().toLowerCase() }).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.dev_otp) {
            alert(`SMTP is not configured! Here is your Test OTP: ${res.dev_otp}`);
          } else {
            alert('OTP sent! Please check your email inbox (and spam folder).');
          }
          this.mode = 'reset_password';
        },
        error: (err: any) => {
           this.loading = false;
           this.error = err.error?.detail || 'User not found.';
        }
      });
      return;
    }

    if (this.mode === 'reset_password') {
      this.authService.resetPassword({ 
        email: this.email.trim().toLowerCase(), 
        otp: this.otp, 
        new_password: this.password 
      }).subscribe({
        next: (res: any) => {
          this.loading = false;
          alert('Password reset successful! You can now log in.');
          this.mode = 'login';
          this.password = '';
          this.otp = '';
        },
        error: (err: any) => {
           this.loading = false;
           this.error = err.error?.detail || 'Reset failed.';
        }
      });
      return;
    }

    const basePayload: any = { username: this.username.trim().toLowerCase(), password: this.password };
    if (this.mode === 'register') {
      basePayload.email = this.email.trim().toLowerCase();
    }
    
    // When admin checkbox is checked during REGISTER, create admin account
    const payload = this.mode === 'register' && this.isAdminLogin
      ? { ...basePayload, role: 'admin' }
      : basePayload;
    const req = this.mode === 'login' ? this.authService.login(payload) : this.authService.register(payload);
    req.subscribe({
      next: (res: any) => {
        this.loading = false;
        const role = res?.user?.role ?? this.authService.getRole();
        // If user tried to LOGIN (not register) as admin but isn't one, show error
        if (this.mode === 'login' && this.isAdminLogin && role !== 'admin') {
          this.authService.logout();
          this.error = 'This account does not have admin privileges. Please sign in as a regular user.';
          return;
        }
        this.router.navigate([role === 'admin' ? '/app/dashboard' : '/app/search']);
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.detail || 'An error occurred. Please try again.';
      }
    });
  }
}
