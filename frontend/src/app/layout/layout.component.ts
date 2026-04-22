import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  template: `
    <div class="flex h-screen bg-background overflow-hidden" style="font-family:'Inter',sans-serif">

      <!-- Mobile overlay -->
      <div *ngIf="menuOpen" (click)="menuOpen=false"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 md:hidden"></div>

      <!-- Sidebar -->
      <aside [class.translate-x-0]="menuOpen" [class.-translate-x-full]="!menuOpen"
        class="fixed md:relative z-30 md:z-auto w-64 h-full flex flex-col transition-transform duration-300 md:translate-x-0"
        style="background:#111111; border-right:1px solid #262626">

        <!-- Mobile close -->
        <button (click)="menuOpen=false" class="absolute top-4 right-4 md:hidden text-textGray hover:text-textLight">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- Brand -->
        <button (click)="goHome()" class="px-5 py-6 text-left w-full transition-all group"
          style="border-bottom:1px solid #262626" title="Go to Home">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-105"
              style="box-shadow:0 0 14px rgba(239,68,68,0.4)">
              <span class="text-white font-extrabold text-sm">SI</span>
            </div>
            <div>
              <p class="font-extrabold text-sm text-textLight group-hover:text-primary transition-colors">SmartInsure</p>
              <p class="text-[10px] text-textGray">Vehicle Management</p>
            </div>
          </div>
        </button>

        <!-- Role Badge -->
        <div class="px-5 py-2" style="border-bottom:1px solid #1d1d1d">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
            [style.background]="isAdmin ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)'"
            [style.color]="isAdmin ? '#ef4444' : '#60a5fa'"
            [style.border]="isAdmin ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(59,130,246,0.25)'">
            <span class="w-1.5 h-1.5 rounded-full" [style.background]="isAdmin ? '#ef4444' : '#60a5fa'"></span>
            {{ isAdmin ? '👑 Admin' : '👷 Worker' }}
          </span>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p class="text-[10px] text-textGray uppercase tracking-widest font-semibold px-3 mb-3">Navigation</p>

          <!-- Admin nav -->
          <ng-container *ngIf="isAdmin">
            <a *ngFor="let item of adminNavItems"
              [routerLink]="item.link"
              (click)="menuOpen=false"
              class="flex items-center gap-3 px-3 py-2.5 text-textGray hover:text-textLight rounded-xl transition-all text-sm font-medium"
              [style.background]="isActive(item.link) ? 'rgba(239,68,68,0.08)' : ''"
              [style.border]="isActive(item.link) ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent'">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors"
                [style.background]="isActive(item.link) ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)'">
                {{ item.icon }}
              </span>
              <span [style.color]="isActive(item.link) ? '#EF4444' : ''">{{ item.label }}</span>
            </a>
          </ng-container>

          <!-- Worker nav (only Search + Entry) -->
          <ng-container *ngIf="!isAdmin">
            <a *ngFor="let item of workerNavItems"
              [routerLink]="item.link"
              (click)="menuOpen=false"
              class="flex items-center gap-3 px-3 py-2.5 text-textGray hover:text-textLight rounded-xl transition-all text-sm font-medium"
              [style.background]="isActive(item.link) ? 'rgba(239,68,68,0.08)' : ''"
              [style.border]="isActive(item.link) ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent'">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors"
                [style.background]="isActive(item.link) ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)'">
                {{ item.icon }}
              </span>
              <span [style.color]="isActive(item.link) ? '#EF4444' : ''">{{ item.label }}</span>
            </a>
          </ng-container>
        </nav>

        <!-- User Profile & Logout -->
        <div class="p-4" style="border-top:1px solid #262626">
          <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase" style="border:1px solid rgba(239,68,68,0.3)">
              {{ getInitial() }}
            </div>
            <div class="overflow-hidden">
              <p class="text-xs font-bold text-textLight truncate">{{ user?.username || 'User' }}</p>
              <p class="text-[10px] text-textGray truncate">{{ isAdmin ? 'Administrator' : 'Worker' }}</p>
            </div>
          </div>
          <button (click)="logout()"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-textGray hover:text-white transition-all"
            style="background:rgba(255,255,255,0.04); border:1px solid #333">
            <span>⎋</span> Sign Out
          </button>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">

        <!-- Mobile topbar -->
        <header class="md:hidden flex items-center justify-between px-4 py-3.5"
          style="background:#111111; border-bottom:1px solid #262626">
          <button (click)="menuOpen=true" class="p-2 rounded-lg text-textGray hover:text-textLight transition-colors"
            style="background:rgba(255,255,255,0.04)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <button (click)="goHome()" class="font-extrabold text-sm text-textLight hover:text-primary transition-colors px-2 py-1 rounded-lg">
            SmartInsure
          </button>
          <div class="w-9"></div>
        </header>

        <!-- Desktop topbar -->
        <header class="hidden md:flex items-center justify-between px-8 py-4"
          style="background:#111111; border-bottom:1px solid #262626">
          <div>
            <h1 class="font-bold text-sm text-textLight">{{ getTitle() }}</h1>
            <p class="text-xs text-textGray mt-0.5">{{ getSub() }}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2)">
              <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span class="text-xs text-primary font-semibold">Live Space</span>
            </div>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-10 bg-background">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class LayoutComponent implements OnInit, OnDestroy {
  menuOpen = false;
  user: User | null = null;
  isAdmin = false;
  private sub = new Subscription();

  adminNavItems = [
    { link: '/app/dashboard', icon: '📊', label: 'Dashboard' },
    { link: '/app/upload',    icon: '📂', label: 'Upload Data' },
    { link: '/app/search',    icon: '🔍', label: 'Search Vehicle' },
    { link: '/app/entry',     icon: '✏️', label: 'Data Entry' },
    { link: '/app/admin',     icon: '👥', label: 'Manage Workers' },
  ];

  // Workers can ONLY access Search and Data Entry
  workerNavItems = [
    { link: '/app/search', icon: '🔍', label: 'Search Vehicle' },
    { link: '/app/entry',  icon: '✏️', label: 'Data Entry' },
  ];

  private meta: Record<string, {title:string;sub:string}> = {
    '/app/dashboard': { title:'Dashboard',       sub:'Overview of your vehicle database' },
    '/app/search':    { title:'Search Vehicle',  sub:'Lookup by plate number & view insurance document' },
    '/app/upload':    { title:'Upload Data',     sub:'Import Excel or CSV files' },
    '/app/entry':     { title:'Data Entry',      sub:'Add or update vehicle records' },
    '/app/admin':     { title:'Manage Workers',  sub:'Create and manage worker accounts' },
  };

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.sub = this.authService.currentUser$.subscribe(u => {
      this.user = u;
      this.isAdmin = u?.role === 'admin';
      // Workers start at entry
      if (u && !this.isAdmin) {
        const path = window.location.pathname;
        const allowedForWorker = ['/app/search', '/app/entry'];
        if (!allowedForWorker.some(p => path.startsWith(p))) {
          this.router.navigate(['/app/entry']);
        }
      }
    });
  }

  ngOnDestroy() { this.sub.unsubscribe(); }
  goHome() { this.router.navigate(['/']); }
  logout() { this.authService.logout(); }
  getInitial() { return this.user?.username?.charAt(0).toUpperCase() || 'U'; }
  isActive(link: string) { return window.location.pathname.startsWith(link); }
  getTitle() { return this.meta[window.location.pathname]?.title ?? 'SmartInsure'; }
  getSub()   { return this.meta[window.location.pathname]?.sub   ?? ''; }
}
