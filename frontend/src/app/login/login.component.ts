import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden" style="font-family:'Inter',sans-serif">
      <!-- Background glow -->
      <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse 60% 60% at 50% 50%, rgba(239,68,68,0.05) 0%, transparent 100%)"></div>

      <div class="w-full max-w-[400px] z-10">
        <!-- Logo -->
        <div class="flex flex-col items-center mb-10 cursor-pointer" (click)="router.navigate(['/'])">
          <div class="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105"
            style="box-shadow:0 0 20px rgba(239,68,68,0.4)">
            <span class="text-white font-extrabold text-xl">SI</span>
          </div>
          <h1 class="text-2xl font-extrabold text-textLight tracking-tight">SmartInsure</h1>
          <p class="text-xs text-textGray mt-1">Vehicle Data Platform</p>
        </div>

        <div class="rounded-3xl overflow-hidden shadow-2xl relative" style="background:#111; border:1px solid #262626">
          
          <!-- Tabs -->
          <div class="flex border-b border-border">
            <button class="flex-1 py-4 text-sm font-bold transition-colors relative"
              (click)="mode = 'login'"
              [class.text-textLight]="mode === 'login'" [class.text-textGray]="mode !== 'login'"
              [style.background]="mode === 'login' ? 'rgba(255,255,255,0.02)' : 'transparent'">
              Login
              <div *ngIf="mode === 'login'" class="absolute bottom-0 left-0 w-full h-[2px] bg-primary"></div>
            </button>
            <button class="flex-1 py-4 text-sm font-bold transition-colors relative"
              (click)="mode = 'register'"
              [class.text-textLight]="mode === 'register'" [class.text-textGray]="mode !== 'register'"
              [style.background]="mode === 'register' ? 'rgba(255,255,255,0.02)' : 'transparent'">
              Create Account
              <div *ngIf="mode === 'register'" class="absolute bottom-0 left-0 w-full h-[2px] bg-primary"></div>
            </button>
          </div>

          <form class="p-8" (ngSubmit)="submit()">
            
            <div *ngIf="error" class="mb-6 p-3 rounded-xl border flex items-center gap-3" 
              style="background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.3)">
              <span class="text-primary text-sm">⚠️</span>
              <p class="text-xs font-semibold text-primary/90">{{ error }}</p>
            </div>

            <div class="space-y-5">
              <div>
                <label class="block text-[11px] uppercase tracking-wider text-textGray font-bold mb-2">Username</label>
                <input type="text" [(ngModel)]="username" name="username"
                  class="input-field w-full px-4 py-3 text-sm focus:border-primary transition-colors"
                  placeholder="Enter your username" autocomplete="username" required>
              </div>
              
              <div>
                <label class="block text-[11px] uppercase tracking-wider text-textGray font-bold mb-2">Password</label>
                <input type="password" [(ngModel)]="password" name="password"
                  class="input-field w-full px-4 py-3 text-sm focus:border-primary transition-colors"
                  placeholder="••••••••" autocomplete="current-password" required>
                <p *ngIf="mode === 'register'" class="text-[10px] text-textGray mt-2">Must be at least 6 characters</p>
              </div>
            </div>

            <button type="submit" [disabled]="loading || !username || !password"
              class="w-full btn-red py-3.5 mt-8 text-sm font-bold flex justify-center items-center gap-2 group">
              <span *ngIf="!loading">{{ mode === 'login' ? 'Sign In →' : 'Create Account →' }}</span>
              <span *ngIf="loading" class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
            </button>

          </form>
        </div>

        <p class="text-center text-xs text-textGray mt-8">
          Secure, isolated data management space.
        </p>

      </div>
    </div>
  `
})
export class LoginComponent {
  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService, public router: Router) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/app/dashboard']);
    }
  }

  submit() {
    if (!this.username || !this.password) return;
    
    this.error = '';
    this.loading = true;
    
    const payload = { username: this.username, password: this.password };
    const request = this.mode === 'login' 
      ? this.authService.login(payload) 
      : this.authService.register(payload);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'An error occurred. Please try again.';
      }
    });
  }
}
