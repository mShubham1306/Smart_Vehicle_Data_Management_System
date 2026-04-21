import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent) },
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      // ALL users get Dashboard, Upload, Search, Entry — but data is scoped to their sheet on backend
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'upload',    loadComponent: () => import('./upload/upload.component').then(m => m.UploadComponent) },
      { path: 'search',    loadComponent: () => import('./search/search.component').then(m => m.SearchComponent) },
      { path: 'entry',     loadComponent: () => import('./entry/entry.component').then(m => m.EntryComponent) },
      // Admin-only: worker management
      { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
