import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterModule, NgFor, NgIf],
  template: `
    <div class="min-h-screen bg-background text-textLight" style="font-family:'Inter',sans-serif">

      <!-- Navbar -->
      <nav class="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-primary rounded-xl flex items-center justify-center" style="box-shadow:0 0 14px rgba(239,68,68,0.4)">
              <span class="text-white font-extrabold text-sm">SI</span>
            </div>
            <span class="font-extrabold text-base tracking-tight text-textLight">SmartInsure</span>
          </div>
          <div class="hidden md:flex items-center gap-8 text-sm text-textGray font-medium">
            <a href="#features" class="hover:text-primary transition-colors">Features</a>
            <a href="#how" class="hover:text-primary transition-colors">How It Works</a>
            <a href="#cases" class="hover:text-primary transition-colors">Use Cases</a>
          </div>
          <!-- Direct to /login -->
          <a routerLink="/login" class="btn-red px-5 py-2.5 text-sm hidden md:inline-block">
            Get Started →
          </a>
          <a routerLink="/login" class="btn-red px-4 py-2 text-sm md:hidden">Go →</a>
        </div>
      </nav>

      <!-- Hero -->
      <section class="relative py-28 px-6 overflow-hidden">
        <div class="absolute inset-0 pointer-events-none"
          style="background:radial-gradient(ellipse 60% 40% at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 70%)"></div>
        <div class="relative max-w-4xl mx-auto text-center">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold mb-8">
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Secure & Isolated Workspaces
          </div>
          <h1 class="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Take Full Control<br>
            <span class="text-primary" style="text-shadow:0 0 40px rgba(239,68,68,0.3)">of Your Data.</span>
          </h1>
          <p class="text-base md:text-lg text-textGray max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload any Excel or CSV file. Auto-map vehicle records to a structured database. Search, analyze, and export — securely entirely within your own workspace.
          </p>
          <!-- Direct to /login -->
          <a routerLink="/login" class="btn-red inline-block px-10 py-4 text-base">
            🚀 Get Started Free
          </a>
          <!-- Stats -->
          <div class="mt-20 grid grid-cols-3 divide-x divide-border max-w-sm mx-auto border border-border rounded-xl overflow-hidden">
            <div *ngFor="let s of stats" class="py-4 text-center bg-card">
              <p class="text-xl font-extrabold text-textLight">{{ s.val }}</p>
              <p class="text-[10px] text-textGray mt-0.5 uppercase tracking-wider">{{ s.label }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Problem -->
      <section class="py-20 px-6 border-t border-border" style="background:linear-gradient(135deg,#0B0B0B,#111111)">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-12">
            <p class="text-xs text-primary uppercase tracking-[0.2em] font-bold mb-2">The Problem</p>
            <h2 class="text-3xl font-bold text-textLight">Your Data Is Working Against You</h2>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div *ngFor="let p of problems"
              class="flex items-start gap-4 bg-card border border-border rounded-2xl p-5 red-glow transition-all">
              <div class="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                <span class="text-primary text-xs font-bold">✕</span>
              </div>
              <p class="text-sm text-textGray leading-relaxed">{{ p }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Solution -->
      <section class="py-20 px-6 border-t border-border bg-background">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-12">
            <p class="text-xs text-primary uppercase tracking-[0.2em] font-bold mb-2">The Solution</p>
            <h2 class="text-3xl font-bold text-textLight">A Smarter, Faster System</h2>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div *ngFor="let s of solutions"
              class="flex items-start gap-4 bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all">
              <div class="w-7 h-7 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center mt-0.5">
                <span class="text-white text-xs font-bold">✓</span>
              </div>
              <p class="text-sm text-textGray leading-relaxed">{{ s }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section id="features" class="py-20 px-6 border-t border-border" style="background:#111111">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-12">
            <p class="text-xs text-primary uppercase tracking-[0.2em] font-bold mb-2">Features</p>
            <h2 class="text-3xl font-bold text-textLight">Everything You Need, One Platform</h2>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let f of features"
              class="bg-card border border-border rounded-2xl p-7 red-glow hover:border-primary/30 hover:-translate-y-1 transition-all group">
              <div class="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-primary/20 transition-colors">
                {{ f.icon }}
              </div>
              <h3 class="text-sm font-bold text-textLight mb-2">{{ f.title }}</h3>
              <p class="text-xs text-textGray leading-relaxed">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works -->
      <section id="how" class="py-20 px-6 border-t border-border bg-background">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-14">
            <p class="text-xs text-primary uppercase tracking-[0.2em] font-bold mb-2">Process</p>
            <h2 class="text-3xl font-bold text-textLight">Simple Process. Powerful Results.</h2>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-6 relative">
            <div class="hidden sm:block absolute top-7 left-14 right-14 h-px bg-border z-0"></div>
            <div *ngFor="let step of steps; let i = index" class="flex flex-col items-center text-center z-10 flex-1">
              <div class="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4"
                style="box-shadow:0 0 16px rgba(239,68,68,0.35)">
                {{ i + 1 }}
              </div>
              <p class="text-sm font-bold text-textLight">{{ step.label }}</p>
              <p class="text-xs text-textGray mt-1">{{ step.sub }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Use Cases -->
      <section id="cases" class="py-20 px-6 border-t border-border" style="background:#111111">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-12">
            <p class="text-xs text-primary uppercase tracking-[0.2em] font-bold mb-2">Use Cases</p>
            <h2 class="text-3xl font-bold text-textLight">Built for Data-Driven Teams</h2>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div *ngFor="let u of useCases"
              class="bg-card border border-border rounded-2xl p-6 text-center red-glow hover:border-primary/40 hover:-translate-y-1 transition-all">
              <div class="text-3xl mb-3">{{ u.icon }}</div>
              <p class="text-sm font-semibold text-textLight">{{ u.label }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="py-24 px-6 border-t border-border bg-background">
        <div class="max-w-2xl mx-auto text-center" style="background:linear-gradient(135deg,#141414,#1A1A1A); border:1px solid #262626; border-radius:24px; padding:64px 40px">
          <div class="w-14 h-14 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center" style="box-shadow:0 0 24px rgba(239,68,68,0.4)">
            <span class="text-white text-2xl">🔐</span>
          </div>
          <h2 class="text-3xl md:text-4xl font-extrabold text-textLight mb-4">Your Private Workspace Awaits</h2>
          <p class="text-textGray text-sm mb-10 max-w-md mx-auto leading-relaxed">Create an account to get your own isolated, secure database. Upgrade from manual systems to a smarter way of working.</p>
          <a routerLink="/login" class="btn-red inline-block px-10 py-4 text-base">Create Account →</a>
        </div>
      </section>

      <!-- Footer -->
      <footer class="border-t border-border py-8 px-6">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xs">SI</span>
            </div>
            <span class="font-bold text-sm text-textLight">SmartInsure</span>
          </div>
          <p class="text-xs text-textGray">© 2025 SmartInsure. All rights reserved.</p>
        </div>
      </footer>
    </div>
  `
})
export class LandingComponent {
  stats = [
    { val: '100%', label: 'Private' },
    { val: 'Any', label: 'File Format' },
    { val: 'Live', label: 'Dashboard' },
  ];
  problems = [
    'Searching through files wastes hours every single day',
    'Unstructured data makes it impossible to scale efficiently',
    'No real-time visibility or insights into your records',
    'Manual entry introduces errors and slows down your team',
  ];
  solutions = [
    'Upload any file — columns auto-mapped to your fixed schema instantly',
    'Search any vehicle plate number in milliseconds, 100% accuracy',
    'All 16 insurance + ownership fields returned in one click',
    'Live dashboard with upload history and record counts',
  ];
  features = [
    { icon: '🔐', title: 'Isolated Workspace',      desc: 'Your data is 100% private. True multi-tenant architecture keeps user data completely separated.' },
    { icon: '📂', title: 'Multi-File Upload',       desc: 'Excel (.xlsx, .xls) and CSV. Every column auto-detected, zero data loss.' },
    { icon: '🔍', title: 'Instant Smart Search',    desc: 'Search any vehicle plate in milliseconds from your entire database.' },
    { icon: '📊', title: 'Live Dashboard',          desc: 'Real-time stats, upload history, and column insights at a glance.' },
    { icon: '✏️', title: 'Structured Data Entry',   desc: 'All 16 fields ready. Lookup existing records and prefill the form.' },
    { icon: '📤', title: 'Excel Export',            desc: 'Export all records into a perfectly formatted Excel file anytime.' },
  ];
  steps = [
    { label: 'Register',      sub: 'Private space' },
    { label: 'Upload File',   sub: 'Excel or CSV' },
    { label: 'Search',        sub: 'Instant lookup' },
    { label: 'Enter / Edit',  sub: 'Update records' },
    { label: 'Export',        sub: 'Excel backup' },
  ];
  useCases = [
    { icon: '🛡️', label: 'Insurance Firms' },
    { icon: '🚘', label: 'Dealerships' },
    { icon: '🔧', label: 'Service Centers' },
    { icon: '📋', label: 'Ops Teams' },
  ];
}
