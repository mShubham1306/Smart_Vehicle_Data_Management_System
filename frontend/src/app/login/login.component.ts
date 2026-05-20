import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';

type Mode = 'login' | 'register' | 'forgot_password' | 'reset_password' | 'verify_email';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display:block; }
    .page { min-height:100vh; background:#080808; display:flex; align-items:center; justify-content:center; padding:20px; font-family:'Inter',sans-serif; position:relative; overflow:hidden; }
    .blob { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; }
    .card { width:100%; max-width:420px; background:#111; border:1px solid #222; border-radius:24px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.6); position:relative; z-index:10; }
    .tabs { display:flex; border-bottom:1px solid #1e1e1e; }
    .tab { flex:1; padding:15px; font-size:0.78rem; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; background:transparent; border:none; cursor:pointer; transition:all 0.2s; color:#555; position:relative; }
    .tab.active { color:#f0f0f0; background:rgba(255,255,255,0.02); }
    .tab.active::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:#ef4444; }
    .body { padding:28px; }
    .logo { display:flex; flex-direction:column; align-items:center; margin-bottom:24px; }
    .logo-icon { width:52px; height:52px; background:linear-gradient(135deg,#ef4444,#b91c1c); border-radius:14px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 24px rgba(239,68,68,0.35); margin-bottom:10px; }
    .logo-icon span { color:#fff; font-weight:900; font-size:1.1rem; }
    .logo h1 { font-size:1.4rem; font-weight:900; color:#f0f0f0; letter-spacing:-0.5px; }
    .logo p { font-size:0.68rem; color:#555; margin-top:2px; }
    .admin-toggle { display:flex; align-items:center; gap:10px; padding:12px 14px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18); border-radius:12px; margin-bottom:20px; cursor:pointer; transition:all 0.2s; }
    .admin-toggle:hover { background:rgba(239,68,68,0.1); }
    .admin-toggle input[type=checkbox] { width:16px; height:16px; accent-color:#ef4444; cursor:pointer; flex-shrink:0; }
    .admin-toggle-label { font-size:0.78rem; font-weight:700; color:#ef4444; cursor:pointer; user-select:none; }
    .admin-toggle-sub { font-size:0.65rem; color:#666; cursor:pointer; margin-top:1px; }
    .field { margin-bottom:16px; }
    .field label { display:block; font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#555; margin-bottom:6px; }
    .field input { width:100%; background:#0c0c0c; border:1px solid #2a2a2a; border-radius:10px; color:#f0f0f0; padding:12px 14px; font-size:0.85rem; outline:none; transition:border-color 0.2s; box-sizing:border-box; font-family:inherit; }
    .field input:focus { border-color:#ef4444; }
    /* Password strength */
    .strength-bar { height:3px; border-radius:2px; margin-top:6px; overflow:hidden; background:#1e1e1e; }
    .strength-fill { height:100%; border-radius:2px; transition:width 0.3s, background 0.3s; }
    .strength-label { font-size:0.62rem; margin-top:3px; font-weight:700; }
    /* Requirement checklist */
    .req-list { font-size:0.65rem; margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:2px; }
    .req-item { display:flex; align-items:center; gap:4px; }
    .req-item.met { color:#22c55e; }
    .req-item.unmet { color:#555; }
    /* Submit */
    .btn-submit { width:100%; padding:14px; border:none; border-radius:12px; font-size:0.85rem; font-weight:800; cursor:pointer; transition:all 0.2s; margin-top:4px; font-family:inherit; }
    .btn-admin { background:linear-gradient(135deg,#ef4444,#b91c1c); color:#fff; box-shadow:0 4px 16px rgba(239,68,68,0.35); }
    .btn-admin:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(239,68,68,0.45); }
    .btn-user { background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; box-shadow:0 4px 16px rgba(59,130,246,0.3); }
    .btn-user:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(59,130,246,0.4); }
    .btn-submit:disabled { opacity:0.5; cursor:not-allowed; transform:none !important; }
    .btn-secondary { width:100%; padding:11px; border:1px solid #333; border-radius:12px; font-size:0.82rem; font-weight:700; cursor:pointer; background:rgba(255,255,255,0.03); color:#888; transition:all 0.2s; font-family:inherit; margin-top:8px; }
    .btn-secondary:hover { background:rgba(255,255,255,0.07); color:#f0f0f0; }
    /* Alerts */
    .err { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:10px 14px; display:flex; gap:8px; align-items:flex-start; margin-bottom:16px; }
    .err span { font-size:0.75rem; color:#ef4444; font-weight:600; }
    .ok { background:rgba(34,197,94,0.07); border:1px solid rgba(34,197,94,0.25); border-radius:10px; padding:10px 14px; display:flex; gap:8px; align-items:flex-start; margin-bottom:16px; }
    .ok span { font-size:0.75rem; color:#22c55e; font-weight:600; }
    .info { background:rgba(59,130,246,0.07); border:1px solid rgba(59,130,246,0.25); border-radius:12px; padding:14px 16px; margin-bottom:16px; }
    /* Session warning banner */
    .session-banner { position:fixed; top:0; left:0; right:0; z-index:9999; background:linear-gradient(135deg,#f59e0b,#d97706); padding:10px 20px; display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; font-weight:700; color:#000; }
    /* Reauth overlay */
    .reauth-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9998; display:flex; align-items:center; justify-content:center; padding:20px; }
    .reauth-card { background:#111; border:1px solid #333; border-radius:20px; padding:32px; max-width:380px; width:100%; text-align:center; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin 0.8s linear infinite;display:inline-block;flex-shrink:0; }
    .footer { text-align:center; font-size:0.68rem; color:#333; padding:16px 0 8px; }
    .otp-input { text-align:center; font-size:2rem; letter-spacing:10px; font-family:monospace; font-weight:900; }
    .lock-badge { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:100px; font-size:0.72rem; font-weight:700; color:#f59e0b; margin-bottom:12px; }
  `],
  template: `
    <!-- Session Expiry Warning Banner -->
    <div class="session-banner" *ngIf="sessionWarningMins !== null">
      ⏱ Session expires in {{ sessionWarningMins }} min{{ sessionWarningMins === 1 ? '' : 's' }}
      <button (click)="dismissWarning()" style="background:rgba(0,0,0,0.2);border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:700">✕</button>
    </div>

    <!-- Re-auth Overlay -->
    <div class="reauth-overlay" *ngIf="showReauth">
      <div class="reauth-card">
        <div style="font-size:2.5rem;margin-bottom:16px">🔒</div>
        <h2 style="color:#f0f0f0;font-size:1.2rem;font-weight:800;margin:0 0 8px">Session Expired</h2>
        <p style="color:#888;font-size:0.82rem;margin:0 0 20px">Your session has timed out for security. Please sign in again to continue.</p>
        <button class="btn-submit btn-admin" (click)="goToLogin()">→ Sign In Again</button>
      </div>
    </div>

    <div class="page">
      <div class="blob" style="top:-15%;left:-15%;width:400px;height:400px;background:radial-gradient(circle,rgba(239,68,68,0.07),transparent 70%)"></div>
      <div class="blob" style="bottom:-15%;right:-15%;width:400px;height:400px;background:radial-gradient(circle,rgba(59,130,246,0.05),transparent 70%)"></div>

      <div style="width:100%;max-width:420px;z-index:10">
        <div class="card">

          <!-- Tabs -->
          <div class="tabs" *ngIf="mode === 'login' || mode === 'register'">
            <button class="tab" [class.active]="mode==='login'" (click)="switchMode('login')">Sign In</button>
            <button class="tab" [class.active]="mode==='register'" (click)="switchMode('register')">Create Account</button>
          </div>
          <div class="tabs" *ngIf="mode === 'forgot_password' || mode === 'reset_password'">
            <button class="tab active" style="text-align:left;padding-left:28px" disabled>Password Reset</button>
            <button class="tab" style="text-align:right;padding-right:28px" (click)="switchMode('login')">← Back</button>
          </div>
          <div class="tabs" *ngIf="mode === 'verify_email'">
            <button class="tab active" style="text-align:left;padding-left:28px" disabled>Email Verification</button>
            <button class="tab" style="text-align:right;padding-right:28px" (click)="switchMode('login')">← Back</button>
          </div>

          <div class="body">

            <!-- Logo -->
            <div class="logo">
              <div class="logo-icon"><span>SI</span></div>
              <h1>SmartInsure</h1>
              <p>Vehicle Data Management Platform</p>
            </div>

            <!-- Admin Toggle -->
            <label class="admin-toggle" for="adminChk" *ngIf="mode === 'login' || mode === 'register'">
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
            <!-- Success/Info -->
            <div class="ok" *ngIf="success">
              <span>✓ {{ success }}</span>
            </div>

            <!-- Account Locked Banner -->
            <div *ngIf="isLocked" style="text-align:center;margin-bottom:16px">
              <div class="lock-badge">🔒 Account Temporarily Locked</div>
              <p style="color:#888;font-size:0.75rem;margin:0">Too many failed attempts. Please wait before trying again.</p>
            </div>

            <!-- ══ EMAIL VERIFICATION MODE ══ -->
            <ng-container *ngIf="mode === 'verify_email'">
              <div class="info">
                <p style="color:#60a5fa;font-size:0.82rem;font-weight:700;margin:0 0 6px">📧 Check Your Inbox</p>
                <p style="color:#888;font-size:0.78rem;margin:0">We sent a verification code to <strong style="color:#f0f0f0">{{ email }}</strong>. Enter the 6-digit code below or click the link in the email.</p>
              </div>
              <div class="field">
                <label>6-Digit Verification Code</label>
                <input class="otp-input" type="text" [(ngModel)]="otp" maxlength="6" placeholder="000000" autocomplete="one-time-code">
              </div>
              <button class="btn-submit btn-admin" [disabled]="loading || otp.length !== 6" (click)="submitVerifyEmail()">
                <span *ngIf="!loading">✓ Verify Email</span>
                <span *ngIf="loading" style="display:flex;align-items:center;justify-content:center;gap:8px"><span class="spin"></span>Verifying…</span>
              </button>
              <button class="btn-secondary" [disabled]="resendCooldown > 0" (click)="resendVerification()">
                {{ resendCooldown > 0 ? 'Resend in ' + resendCooldown + 's' : '↺ Resend Verification Email' }}
              </button>
            </ng-container>

            <!-- ══ LOGIN / REGISTER MODE ══ -->
            <ng-container *ngIf="mode === 'login' || mode === 'register'">
              <!-- Username -->
              <div class="field">
                <label>{{ mode === 'login' ? 'Username or Email' : 'Username' }}</label>
                <input type="text" [(ngModel)]="username" [placeholder]="mode === 'login' ? 'Enter username or email' : 'Enter username (letters, numbers, _, -)'" autocomplete="username">
                <div *ngIf="mode === 'register' && username && usernameError" style="font-size:0.68rem;color:#ef4444;margin-top:4px;font-weight:600">
                  ⚠ {{ usernameError }}
                </div>
              </div>
              <!-- Email (register only) -->
              <div class="field" *ngIf="mode === 'register'">
                <label>Email Address</label>
                <input type="email" [(ngModel)]="email" placeholder="Enter email" autocomplete="email">
              </div>
              <!-- Password -->
              <div class="field">
                <label>Password</label>
                <input type="password" [(ngModel)]="password" (input)="onPasswordInput()" (keyup.enter)="submit()" placeholder="••••••••" autocomplete="current-password">
                <!-- Strength meter (register only) -->
                <ng-container *ngIf="mode === 'register' && password">
                  <div class="strength-bar">
                    <div class="strength-fill" [style.width]="strengthPct + '%'" [style.background]="strengthColor"></div>
                  </div>
                  <div class="strength-label" [style.color]="strengthColor">{{ strengthLabel }}</div>
                  <div class="req-list">
                    <div class="req-item" [class.met]="pw.length" [class.unmet]="!pw.length">
                      <span>{{ pw.length ? '✓' : '○' }}</span> 8+ chars
                    </div>
                    <div class="req-item" [class.met]="pw.upper" [class.unmet]="!pw.upper">
                      <span>{{ pw.upper ? '✓' : '○' }}</span> Uppercase
                    </div>
                    <div class="req-item" [class.met]="pw.digit" [class.unmet]="!pw.digit">
                      <span>{{ pw.digit ? '✓' : '○' }}</span> Number
                    </div>
                    <div class="req-item" [class.met]="pw.symbol" [class.unmet]="!pw.symbol">
                      <span>{{ pw.symbol ? '✓' : '○' }}</span> Symbol
                    </div>
                  </div>
                </ng-container>
              </div>
              <div *ngIf="mode === 'login'" style="text-align:right;margin-top:-8px;margin-bottom:16px">
                <a href="javascript:void(0)" (click)="switchMode('forgot_password')" style="font-size:0.75rem;color:#ef4444;text-decoration:none;font-weight:600">Forgot Password?</a>
              </div>
              <button class="btn-submit" [ngClass]="isAdminLogin ? 'btn-admin' : 'btn-user'" [disabled]="isSubmitDisabled" (click)="submit()">
                <span *ngIf="!loading">
                  {{ mode === 'login' ? (isAdminLogin ? '→ Sign in as Admin' : '→ Sign In') : (isAdminLogin ? '→ Register Admin' : '→ Create Account') }}
                </span>
                <span *ngIf="loading" style="display:flex;align-items:center;justify-content:center;gap:8px">
                  <span class="spin"></span>{{ mode === 'login' ? 'Signing in…' : 'Creating account…' }}
                </span>
              </button>
            </ng-container>

            <!-- ══ FORGOT PASSWORD MODE ══ -->
            <ng-container *ngIf="mode === 'forgot_password'">
              <div class="field">
                <label>Email Address</label>
                <input type="email" [(ngModel)]="email" placeholder="Enter your registered email" autocomplete="email">
              </div>
              <button class="btn-submit btn-admin" [disabled]="loading || !email" (click)="submit()">
                <span *ngIf="!loading">→ Send Reset Code</span>
                <span *ngIf="loading" style="display:flex;align-items:center;justify-content:center;gap:8px"><span class="spin"></span>Sending…</span>
              </button>
            </ng-container>

            <!-- ══ RESET PASSWORD MODE ══ -->
            <ng-container *ngIf="mode === 'reset_password'">
              <div class="info" style="margin-bottom:16px">
                <p style="color:#60a5fa;font-size:0.78rem;margin:0">Check your email for the 6-digit reset code. It expires in 15 minutes.</p>
              </div>
              <div class="field">
                <label>6-Digit OTP</label>
                <input class="otp-input" type="text" [(ngModel)]="otp" maxlength="6" placeholder="000000" autocomplete="one-time-code">
              </div>
              <div class="field">
                <label>New Password</label>
                <input type="password" [(ngModel)]="password" (input)="onPasswordInput()" placeholder="••••••••" autocomplete="new-password">
                <ng-container *ngIf="password">
                  <div class="strength-bar">
                    <div class="strength-fill" [style.width]="strengthPct + '%'" [style.background]="strengthColor"></div>
                  </div>
                  <div class="strength-label" [style.color]="strengthColor">{{ strengthLabel }}</div>
                </ng-container>
              </div>
              <button class="btn-submit btn-admin" [disabled]="loading || !otp || !password" (click)="submit()">
                <span *ngIf="!loading">→ Reset Password</span>
                <span *ngIf="loading" style="display:flex;align-items:center;justify-content:center;gap:8px"><span class="spin"></span>Resetting…</span>
              </button>
            </ng-container>

          </div>
        </div>
        <div class="footer">🔒 Secure vehicle data management platform</div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit, OnDestroy {
  mode: Mode = 'login';
  username = '';
  email = '';
  password = '';
  otp = '';
  error = '';
  success = '';
  loading = false;
  isAdminLogin = false;
  isLocked = false;
  showReauth = false;
  sessionWarningMins: number | null = null;
  resendCooldown = 0;
  private _resendInterval: any = null;
  private _subs: import('rxjs').Subscription[] = [];

  // Password strength
  pw = { length: false, upper: false, digit: false, symbol: false };
  strengthPct = 0;
  strengthLabel = '';
  strengthColor = '#555';

  constructor(private authService: AuthService, public router: Router) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.authService.isAdmin() ? '/app/dashboard' : '/app/search']);
      return;
    }

    this._subs.push(
      this.authService.sessionWarning$.subscribe(mins => { this.sessionWarningMins = mins; }),
      this.authService.requireReauth$.subscribe(needed => { this.showReauth = needed; })
    );
  }

  ngOnDestroy() { this._subs.forEach(s => s.unsubscribe()); clearInterval(this._resendInterval); }

  switchMode(m: Mode) {
    this.mode = m; this.error = ''; this.success = ''; this.isLocked = false;
  }

  goToLogin() { this.showReauth = false; this.switchMode('login'); }
  dismissWarning() { this.authService.dismissSessionWarning(); }

  onPasswordInput() {
    const p = this.password;
    this.pw = {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      digit: /[0-9]/.test(p),
      symbol: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(p),
    };
    const score = Object.values(this.pw).filter(Boolean).length;
    const map: Record<number, [number, string, string]> = {
      0: [0, '', '#555'],
      1: [25, 'Weak', '#ef4444'],
      2: [50, 'Fair', '#f59e0b'],
      3: [75, 'Good', '#3b82f6'],
      4: [100, 'Strong ✓', '#22c55e'],
    };
    [this.strengthPct, this.strengthLabel, this.strengthColor] = map[score] ?? [0, '', '#555'];
  }

  get usernameError(): string {
    const u = this.username.trim().toLowerCase();
    if (!u) return '';
    if (u.length < 3) return 'Username must be at least 3 characters.';
    if (u.length > 30) return 'Username too long (max 30 chars).';
    if (u.includes('@')) return 'Username cannot contain @. Use the Email field for your email.';
    if (!/^[a-z0-9_\-]+$/.test(u)) return 'Only letters, numbers, underscores, and hyphens allowed.';
    return '';
  }

  get isSubmitDisabled(): boolean {
    if (this.loading) return true;
    if (this.mode === 'forgot_password') return !this.email;
    if (this.mode === 'reset_password') return !this.otp || !this.password;
    if (this.mode === 'login') return !this.username || !this.password;
    if (this.mode === 'register') return !this.username || !this.email || !this.password || !!this.usernameError;
    return true;
  }

  submit() {
    this.error = ''; this.success = ''; this.loading = true;

    if (this.mode === 'forgot_password') {
      this.authService.forgotPassword({ email: this.email.trim().toLowerCase() }).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.success = 'Reset code sent! Check your email inbox (and spam folder).';
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
        email: this.email.trim().toLowerCase(), otp: this.otp, new_password: this.password
      }).subscribe({
        next: () => {
          this.loading = false;
          this.success = 'Password reset! You can now sign in.';
          setTimeout(() => this.switchMode('login'), 1500);
        },
        error: (err: any) => { this.loading = false; this.error = err.error?.detail || 'Reset failed.'; }
      });
      return;
    }

    const basePayload: any = { username: this.username.trim().toLowerCase(), password: this.password };
    if (this.mode === 'register') basePayload.email = this.email.trim().toLowerCase();
    if (this.mode === 'register' && this.isAdminLogin) basePayload.role = 'admin';

    const req = this.mode === 'login'
      ? this.authService.login(basePayload)
      : this.authService.register(basePayload);

    req.subscribe({
      next: (res: any) => {
        this.loading = false;

        // Registration — email verification required
        if (res.email_verification_required) {
          this.mode = 'verify_email';
          this.success = '';
          this.error = '';
          return;
        }

        const role = res?.user?.role ?? this.authService.getRole();
        if (this.mode === 'login' && this.isAdminLogin && role !== 'admin') {
          this.authService.logout();
          this.error = 'This account does not have admin privileges.';
          return;
        }
        this.router.navigate([role === 'admin' ? '/app/dashboard' : '/app/search']);
      },
      error: (err: any) => {
        this.loading = false;
        const status = err.status;
        const detail = this.formatAuthError(err);

        if (status === 423) {
          this.isLocked = true;
          this.error = detail;
        } else if (typeof err.error?.detail === 'string' && err.error.detail.toLowerCase().includes('email') && err.error.detail.toLowerCase().includes('verified')) {
          this.mode = 'verify_email';
          this.error = 'Please verify your email before logging in.';
        } else {
          this.error = detail;
        }
      }
    });
  }

  submitVerifyEmail() {
    this.error = ''; this.loading = true;
    this.authService.verifyEmailOtp({ email: this.email.trim().toLowerCase(), otp: this.otp }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Email verified! You can now sign in.';
        setTimeout(() => this.switchMode('login'), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.detail || 'Invalid or expired OTP.';
      }
    });
  }

  /** Map HTTP/network/CORS failures to a clear message (avoids generic "An error occurred"). */
  private formatAuthError(err: any): string {
    if (!err || err.status === 0) {
      return 'Cannot reach the API server. Check your connection, or wait if the backend is waking up (Render free tier).';
    }
    const d = err.error?.detail;
    if (typeof d === 'string' && d.trim()) return d;
    if (Array.isArray(d) && d.length) {
      return d.map((x: any) => x?.msg || JSON.stringify(x)).join(' ');
    }
    if (err.status === 401) return 'Invalid username/email or password.';
    if (err.status === 403) return 'Access denied. Verify your email or contact your admin.';
    if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    if (err.status >= 500) return 'Server error. Please try again in a moment.';
    return err.message || 'Login failed. Please try again.';
  }

  resendVerification() {
    if (this.resendCooldown > 0) return;
    this.loading = true;
    this.authService.resendVerification({ email: this.email.trim().toLowerCase() }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Verification email resent. Check your inbox.';
        this.resendCooldown = 60;
        this._resendInterval = setInterval(() => {
          this.resendCooldown--;
          if (this.resendCooldown <= 0) clearInterval(this._resendInterval);
        }, 1000);
      },
      error: () => { this.loading = false; }
    });
  }
}
