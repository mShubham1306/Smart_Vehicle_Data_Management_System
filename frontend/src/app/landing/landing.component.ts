import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterModule, CommonModule],
  styles: [`
    :host { display: block; }

    /* ─── Reset & Base ─── */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .page { background: #050507; color: #f0f0f0; font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }

    /* ─── Scroll Animations ─── */
    .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    .reveal-left { opacity: 0; transform: translateX(-40px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .reveal-left.visible { opacity: 1; transform: translateX(0); }
    .reveal-right { opacity: 0; transform: translateX(40px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .reveal-right.visible { opacity: 1; transform: translateX(0); }

    /* ─── Navbar ─── */
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      padding: 0 48px;
      height: 72px;
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(5, 5, 7, 0.7);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      transition: background 0.3s ease, height 0.3s ease, box-shadow 0.3s ease;
    }
    .nav.scrolled {
      background: rgba(5,5,7,0.95);
      height: 62px;
      box-shadow: 0 4px 30px rgba(0,0,0,0.5);
    }
    .nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .nav-logo-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 0.85rem; color: #fff;
      box-shadow: 0 0 20px rgba(239,68,68,0.4);
    }
    .nav-logo-text { font-weight: 800; font-size: 1rem; color: #f5f5f5; letter-spacing: -0.3px; }
    .nav-links { display: flex; align-items: center; gap: 36px; }
    .nav-links a { color: #999; font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: color 0.2s; }
    .nav-links a:hover { color: #f5f5f5; }
    .nav-cta {
      padding: 10px 24px; background: #ef4444; color: #fff;
      border-radius: 10px; font-size: 0.85rem; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer;
      transition: all 0.2s; box-shadow: 0 4px 16px rgba(239,68,68,0.35);
      white-space: nowrap;
    }
    .nav-cta:hover { background: #dc2626; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(239,68,68,0.45); }
    .nav-mobile-btn { display: none; background: none; border: none; cursor: pointer; color: #999; }
    @media (max-width: 768px) {
      .nav { padding: 0 20px; }
      .nav-links { display: none; }
      .nav-mobile-btn { display: block; }
    }

    /* ─── Hero ─── */
    .hero {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      text-align: center; padding: 140px 24px 100px;
      position: relative; overflow: hidden;
    }
    .hero-bg {
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 80% 60% at 50% -10%, rgba(239,68,68,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 80% 80%, rgba(139,92,246,0.07) 0%, transparent 50%),
        radial-gradient(ellipse 40% 30% at 10% 70%, rgba(59,130,246,0.05) 0%, transparent 50%);
    }
    /* Animated grid lines */
    .hero-grid {
      position: absolute; inset: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
    }
    /* Floating blobs */
    .blob {
      position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
      animation: blobFloat 8s ease-in-out infinite;
    }
    .blob1 { width: 500px; height: 500px; background: rgba(239,68,68,0.06); top: -100px; left: -150px; animation-delay: 0s; }
    .blob2 { width: 400px; height: 400px; background: rgba(139,92,246,0.05); bottom: -80px; right: -100px; animation-delay: -3s; }
    .blob3 { width: 300px; height: 300px; background: rgba(59,130,246,0.04); top: 40%; left: 60%; animation-delay: -5s; }
    @keyframes blobFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -40px) scale(1.05); }
      66% { transform: translate(-20px, 20px) scale(0.95); }
    }
    .hero-inner { position: relative; z-index: 2; max-width: 860px; margin: 0 auto; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 16px; border-radius: 100px;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
      color: #ef4444; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;
      text-transform: uppercase; margin-bottom: 32px;
      animation: fadeSlideDown 0.7s ease both;
    }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.4)} }
    .hero-title {
      font-size: clamp(2.6rem, 6vw, 5rem); font-weight: 900;
      line-height: 1.08; letter-spacing: -2px; color: #f5f5f5;
      margin-bottom: 28px;
      animation: fadeSlideDown 0.7s ease 0.15s both;
    }
    .hero-title .accent {
      background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #ef4444 100%);
      background-size: 200% 100%;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      animation: gradientShift 4s ease infinite;
    }
    @keyframes gradientShift { 0%,100%{background-position:0%} 50%{background-position:100%} }
    .hero-sub {
      font-size: clamp(1rem, 2.5vw, 1.2rem); color: #888; line-height: 1.7;
      max-width: 620px; margin: 0 auto 48px;
      animation: fadeSlideDown 0.7s ease 0.3s both;
    }
    .hero-actions {
      display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;
      animation: fadeSlideDown 0.7s ease 0.45s both;
    }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 16px 36px; background: linear-gradient(135deg, #ef4444, #b91c1c);
      color: #fff; border-radius: 12px; font-size: 1rem; font-weight: 800;
      text-decoration: none; border: none; cursor: pointer;
      box-shadow: 0 8px 28px rgba(239,68,68,0.4);
      transition: all 0.25s; letter-spacing: -0.2px;
    }
    .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(239,68,68,0.5); }
    .btn-secondary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 16px 32px; background: rgba(255,255,255,0.05);
      color: #d0d0d0; border-radius: 12px; font-size: 1rem; font-weight: 600;
      text-decoration: none; border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.2s;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.2); }
    @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    /* Stats strip */
    .hero-stats {
      display: flex; align-items: center; justify-content: center;
      gap: 0; margin-top: 72px; border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px; overflow: hidden; max-width: 480px; margin-left: auto; margin-right: auto;
      animation: fadeSlideDown 0.7s ease 0.6s both;
    }
    .stat-item { flex: 1; text-align: center; padding: 20px 16px; background: rgba(255,255,255,0.02); }
    .stat-item:not(:last-child) { border-right: 1px solid rgba(255,255,255,0.07); }
    .stat-val { font-size: 1.5rem; font-weight: 900; color: #f5f5f5; letter-spacing: -1px; }
    .stat-lbl { font-size: 0.62rem; color: #666; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; font-weight: 600; }

    /* ─── Scroll indicator ─── */
    .scroll-ind {
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      color: #444; font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase;
      animation: fadeSlideDown 1s ease 1s both;
    }
    .scroll-arrow { width: 20px; height: 20px; border-right: 2px solid #444; border-bottom: 2px solid #444; transform: rotate(45deg); animation: scrollBounce 1.5s ease-in-out infinite; }
    @keyframes scrollBounce { 0%,100%{transform:rotate(45deg) translateY(0)} 50%{transform:rotate(45deg) translateY(5px)} }

    /* ─── Section Shell ─── */
    .section { padding: 100px 48px; position: relative; }
    .section-inner { max-width: 1120px; margin: 0 auto; }
    .section-label { font-size: 0.72rem; color: #ef4444; text-transform: uppercase; letter-spacing: 3px; font-weight: 800; margin-bottom: 10px; }
    .section-title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; color: #f5f5f5; letter-spacing: -1px; margin-bottom: 48px; line-height: 1.15; }
    .section-sub { font-size: 1rem; color: #777; line-height: 1.7; max-width: 560px; }
    .text-center { text-align: center; }
    .text-center .section-sub { margin: 0 auto; }
    @media (max-width: 640px) { .section { padding: 70px 20px; } }

    /* ─── Divider ─── */
    .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); margin: 0; }

    /* ─── Role Cards ─── */
    .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 48px; }
    @media (max-width: 768px) { .role-grid { grid-template-columns: 1fr; } }
    .role-card {
      border-radius: 20px; padding: 36px; position: relative; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
      transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
    }
    .role-card:hover { transform: translateY(-4px); }
    .role-card.admin-card { border-color: rgba(239,68,68,0.2); }
    .role-card.admin-card:hover { border-color: rgba(239,68,68,0.4); box-shadow: 0 20px 60px rgba(239,68,68,0.08); }
    .role-card.worker-card { border-color: rgba(59,130,246,0.2); }
    .role-card.worker-card:hover { border-color: rgba(59,130,246,0.4); box-shadow: 0 20px 60px rgba(59,130,246,0.08); }
    .role-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 100px;
      font-size: 0.78rem; font-weight: 800; margin-bottom: 20px;
    }
    .role-badge.admin { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    .role-badge.worker { background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2); }
    .role-title { font-size: 1.4rem; font-weight: 800; color: #f5f5f5; margin-bottom: 8px; }
    .role-sub { font-size: 0.875rem; color: #777; margin-bottom: 28px; line-height: 1.6; }
    .role-perms { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .role-perms li { display: flex; align-items: flex-start; gap: 10px; font-size: 0.85rem; color: #bbb; line-height: 1.5; }
    .perm-check { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 900; flex-shrink: 0; margin-top: 1px; }
    .perm-check.yes { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.25); }
    .perm-check.no { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    .role-card-glow {
      position: absolute; width: 200px; height: 200px; border-radius: 50%;
      filter: blur(60px); pointer-events: none; top: -60px; right: -60px; opacity: 0.4;
    }
    .admin-card .role-card-glow { background: rgba(239,68,68,0.15); }
    .worker-card .role-card-glow { background: rgba(59,130,246,0.12); }

    /* ─── Features Grid ─── */
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    @media (max-width: 900px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .features-grid { grid-template-columns: 1fr; } }
    .feat-card {
      border-radius: 18px; padding: 30px; border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.02);
      transition: all 0.3s; position: relative; overflow: hidden;
    }
    .feat-card:hover { border-color: rgba(239,68,68,0.3); transform: translateY(-4px); background: rgba(239,68,68,0.03); }
    .feat-card:hover .feat-icon { transform: scale(1.1); background: rgba(239,68,68,0.2); }
    .feat-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.18);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; margin-bottom: 18px;
      transition: all 0.3s;
    }
    .feat-title { font-size: 0.95rem; font-weight: 800; color: #f5f5f5; margin-bottom: 8px; }
    .feat-desc { font-size: 0.82rem; color: #777; line-height: 1.65; }

    /* ─── How It Works ─── */
    .steps-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; position: relative; margin-top: 64px; }
    @media (max-width: 860px) { .steps-grid { grid-template-columns: 1fr 1fr; gap: 30px 20px; } }
    @media (max-width: 480px) { .steps-grid { grid-template-columns: 1fr; } }
    .step-connector {
      position: absolute; top: 33px; left: 10%; right: 10%; height: 2px;
      background: linear-gradient(90deg, #ef4444, rgba(239,68,68,0.2));
      z-index: 0;
    }
    @media (max-width: 860px) { .step-connector { display: none; } }
    .step-item { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 1; }
    .step-num {
      width: 66px; height: 66px; border-radius: 50%;
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; font-weight: 900; color: #fff; margin-bottom: 16px;
      box-shadow: 0 8px 24px rgba(239,68,68,0.35);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .step-item:hover .step-num { transform: scale(1.1); box-shadow: 0 12px 32px rgba(239,68,68,0.5); }
    .step-label { font-size: 0.88rem; font-weight: 800; color: #f5f5f5; margin-bottom: 6px; }
    .step-sub { font-size: 0.75rem; color: #666; }

    /* ─── Stats Counter ─── */
    .stats-section { background: rgba(239,68,68,0.03); border-top: 1px solid rgba(239,68,68,0.1); border-bottom: 1px solid rgba(239,68,68,0.1); }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    .stats-item { text-align: center; padding: 48px 20px; border-right: 1px solid rgba(255,255,255,0.06); }
    .stats-item:last-child { border-right: none; }
    .stats-num { font-size: 2.8rem; font-weight: 900; color: #ef4444; letter-spacing: -2px; line-height: 1; }
    .stats-label { font-size: 0.78rem; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; font-weight: 600; }

    /* ─── Security Section ─── */
    .security-visual {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 48px;
    }
    @media (max-width: 700px) { .security-visual { grid-template-columns: 1fr; } }
    .tenant-card {
      border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.02); text-align: center;
    }
    .tenant-card.center-card {
      border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.04);
    }
    .tenant-icon { font-size: 2rem; margin-bottom: 12px; }
    .tenant-label { font-size: 0.82rem; font-weight: 700; color: #f5f5f5; margin-bottom: 6px; }
    .tenant-sub { font-size: 0.72rem; color: #666; }
    .isolation-badge {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 12px;
      padding: 4px 12px; border-radius: 100px;
      background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);
      color: #22c55e; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    }

    /* ─── Use Cases ─── */
    .usecase-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 860px) { .usecase-grid { grid-template-columns: repeat(2, 1fr); } }
    .usecase-card {
      border-radius: 16px; padding: 28px 20px; text-align: center;
      border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02);
      transition: all 0.3s;
    }
    .usecase-card:hover { border-color: rgba(239,68,68,0.3); transform: translateY(-4px); background: rgba(239,68,68,0.03); }
    .usecase-icon { font-size: 2.2rem; margin-bottom: 14px; }
    .usecase-label { font-size: 0.88rem; font-weight: 700; color: #f5f5f5; margin-bottom: 4px; }
    .usecase-sub { font-size: 0.72rem; color: #666; }

    /* ─── CTA Banner ─── */
    .cta-section { padding: 100px 48px; }
    .cta-box {
      max-width: 760px; margin: 0 auto;
      border-radius: 28px; padding: 72px 56px; text-align: center;
      background: linear-gradient(135deg, #0f0f0f, #1a0a0a);
      border: 1px solid rgba(239,68,68,0.2);
      box-shadow: 0 0 80px rgba(239,68,68,0.07);
      position: relative; overflow: hidden;
    }
    .cta-box::before {
      content: ''; position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
      width: 400px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, rgba(239,68,68,0.1), transparent 70%);
      pointer-events: none;
    }
    .cta-icon {
      width: 68px; height: 68px; border-radius: 18px; margin: 0 auto 24px;
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      display: flex; align-items: center; justify-content: center; font-size: 1.8rem;
      box-shadow: 0 12px 36px rgba(239,68,68,0.4);
    }
    .cta-title { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 900; color: #f5f5f5; letter-spacing: -1.5px; margin-bottom: 16px; }
    .cta-sub { font-size: 0.95rem; color: #777; line-height: 1.7; max-width: 460px; margin: 0 auto 40px; }
    @media (max-width: 640px) { .cta-section { padding: 60px 20px; } .cta-box { padding: 48px 24px; } }

    /* ─── Footer ─── */
    .footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 60px 48px 40px; }
    .footer-inner { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: 1.8fr 1fr 1fr 1fr; gap: 48px; }
    @media (max-width: 860px) { .footer-inner { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 540px) { .footer-inner { grid-template-columns: 1fr; } .footer { padding: 48px 20px 32px; } }
    .footer-brand .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .footer-logo-icon { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#ef4444,#b91c1c); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.78rem; color: #fff; }
    .footer-logo-name { font-weight: 800; color: #f5f5f5; font-size: 0.95rem; }
    .footer-desc { font-size: 0.8rem; color: #555; line-height: 1.7; max-width: 260px; }
    .footer-col-title { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 16px; }
    .footer-links { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .footer-links a { color: #666; font-size: 0.82rem; text-decoration: none; transition: color 0.2s; }
    .footer-links a:hover { color: #f5f5f5; }
    .footer-bottom { max-width: 1120px; margin: 48px auto 0; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .footer-copy { font-size: 0.78rem; color: #444; }
    .footer-legal { display: flex; gap: 24px; }
    .footer-legal a { font-size: 0.78rem; color: #444; text-decoration: none; transition: color 0.2s; }
    .footer-legal a:hover { color: #999; }

    /* ─── Dark section alternation ─── */
    .bg-darker { background: #080809; }
    .bg-dark2 { background: rgba(255,255,255,0.01); }

    /* ─── Stagger delays for grid reveals ─── */
    .delay-1 { transition-delay: 0.1s; }
    .delay-2 { transition-delay: 0.2s; }
    .delay-3 { transition-delay: 0.3s; }
    .delay-4 { transition-delay: 0.4s; }
    .delay-5 { transition-delay: 0.5s; }
  `],
  template: `
    <div class="page">

      <!-- ─── NAVBAR ─── -->
      <nav class="nav" [class.scrolled]="scrolled">
        <a routerLink="/" class="nav-logo">
          <div class="nav-logo-icon">SI</div>
          <span class="nav-logo-text">SmartInsure</span>
        </a>
        <div class="nav-links">
          <a href="#roles">Roles</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#security">Security</a>
        </div>
        <a routerLink="/login" class="nav-cta">Get Started →</a>
        <button class="nav-mobile-btn" (click)="mobileNav=!mobileNav">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </nav>

      <!-- ─── HERO ─── -->
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-grid"></div>
        <div class="blob blob1"></div>
        <div class="blob blob2"></div>
        <div class="blob blob3"></div>

        <div class="hero-inner">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            Multi-Tenant · Role-Based Access · Secure
          </div>

          <h1 class="hero-title">
            Vehicle Data Management<br>
            <span class="accent">Built for Teams.</span>
          </h1>

          <p class="hero-sub">
            Upload Excel & CSV. Instant search. Insurance documents in one click.
            Admins manage everything — workers get exactly what they need.
          </p>

          <div class="hero-actions">
            <a routerLink="/login" class="btn-primary">
              🚀 Start for Free
            </a>
            <a href="#roles" class="btn-secondary">
              See How It Works ↓
            </a>
          </div>

          <div class="hero-stats">
            <div class="stat-item">
              <div class="stat-val">100%</div>
              <div class="stat-lbl">Isolated</div>
            </div>
            <div class="stat-item">
              <div class="stat-val">Any</div>
              <div class="stat-lbl">File Format</div>
            </div>
            <div class="stat-item">
              <div class="stat-val">Live</div>
              <div class="stat-lbl">Dashboard</div>
            </div>
          </div>
        </div>

        <div class="scroll-ind">
          <div class="scroll-arrow"></div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ─── ROLES ─── -->
      <section class="section bg-darker" id="roles">
        <div class="section-inner">
          <div class="text-center">
            <p class="section-label reveal">Access Control</p>
            <h2 class="section-title reveal">Two Roles. One System.</h2>
            <p class="section-sub reveal">Every person gets exactly the right level of access — no more, no less.</p>
          </div>
          <div class="role-grid">

            <div class="role-card admin-card reveal-left">
              <div class="role-card-glow"></div>
              <div class="role-badge admin">👑 Admin</div>
              <div class="role-title">Full Control</div>
              <p class="role-sub">Admins own their workspace. They manage all data, all sheets, and all users independently from other admins.</p>
              <ul class="role-perms">
                <li><span class="perm-check yes">✓</span> Upload & manage vehicle data</li>
                <li><span class="perm-check yes">✓</span> Full dashboard & analytics</li>
                <li><span class="perm-check yes">✓</span> Create & manage worker accounts</li>
                <li><span class="perm-check yes">✓</span> Export data to Excel</li>
                <li><span class="perm-check yes">✓</span> Manage multiple sheets</li>
                <li><span class="perm-check yes">✓</span> View insurance documents & PDFs</li>
              </ul>
            </div>

            <div class="role-card worker-card reveal-right">
              <div class="role-card-glow"></div>
              <div class="role-badge worker">👷 Worker</div>
              <div class="role-title">Focused Access</div>
              <p class="role-sub">Workers operate within their admin's workspace. They access all vehicle data but can't modify system settings or manage accounts.</p>
              <ul class="role-perms">
                <li><span class="perm-check yes">✓</span> Search vehicle records</li>
                <li><span class="perm-check yes">✓</span> View & download insurance PDF</li>
                <li><span class="perm-check yes">✓</span> Add & update vehicle records</li>
                <li><span class="perm-check yes">✓</span> View all assigned sheets</li>
                <li><span class="perm-check no">✕</span> Cannot create/manage users</li>
                <li><span class="perm-check no">✕</span> Cannot access other admin data</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ─── STATS ─── -->
      <section class="stats-section">
        <div class="section-inner">
          <div class="stats-grid">
            <div class="stats-item reveal">
              <div class="stats-num">{{ displayStats[0] }}+</div>
              <div class="stats-label">Records Processed</div>
            </div>
            <div class="stats-item reveal delay-1">
              <div class="stats-num">{{ displayStats[1] }}ms</div>
              <div class="stats-label">Search Speed</div>
            </div>
            <div class="stats-item reveal delay-2">
              <div class="stats-num">{{ displayStats[2] }}%</div>
              <div class="stats-label">Data Isolation</div>
            </div>
            <div class="stats-item reveal delay-3">
              <div class="stats-num">{{ displayStats[3] }}</div>
              <div class="stats-label">File Formats</div>
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ─── FEATURES ─── -->
      <section class="section" id="features">
        <div class="section-inner">
          <div class="text-center">
            <p class="section-label reveal">Features</p>
            <h2 class="section-title reveal">Everything Your Team Needs</h2>
          </div>
          <div class="features-grid">
            <div class="feat-card reveal" *ngFor="let f of features; let i = index"
              [class.delay-1]="i===1" [class.delay-2]="i===2"
              [class.delay-3]="i===3" [class.delay-4]="i===4" [class.delay-5]="i===5">
              <div class="feat-icon">{{ f.icon }}</div>
              <div class="feat-title">{{ f.title }}</div>
              <p class="feat-desc">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ─── HOW IT WORKS ─── -->
      <section class="section bg-darker" id="how-it-works">
        <div class="section-inner">
          <div class="text-center">
            <p class="section-label reveal">Process</p>
            <h2 class="section-title reveal">Simple. Powerful. Done.</h2>
          </div>
          <div class="steps-grid reveal">
            <div class="step-connector"></div>
            <div class="step-item" *ngFor="let s of steps; let i = index">
              <div class="step-num">{{ s.icon }}</div>
              <div class="step-label">{{ s.label }}</div>
              <div class="step-sub">{{ s.sub }}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ─── SECURITY ─── -->
      <section class="section" id="security">
        <div class="section-inner">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center">
            <div class="reveal-left">
              <p class="section-label">Security</p>
              <h2 class="section-title" style="margin-bottom:20px">Zero Data Leakage.<br>Ever.</h2>
              <p class="section-sub" style="margin-bottom:32px">
                Each admin operates in a completely isolated workspace. All records are tagged with an <code style="background:rgba(239,68,68,0.1);color:#ef4444;padding:2px 8px;border-radius:6px;font-size:0.8rem">admin_id</code> — every API call is scoped to it. Workers inherit this automatically.
              </p>
              <ul style="list-style:none;display:flex;flex-direction:column;gap:14px">
                <li *ngFor="let s of securityPoints" style="display:flex;align-items:flex-start;gap:12px;font-size:0.875rem;color:#aaa">
                  <span style="width:22px;height:22px;border-radius:50%;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);color:#22c55e;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:900;flex-shrink:0;margin-top:1px">✓</span>
                  {{ s }}
                </li>
              </ul>
            </div>
            <div class="reveal-right">
              <div class="security-visual">
                <div class="tenant-card">
                  <div class="tenant-icon">👑</div>
                  <div class="tenant-label">Admin A</div>
                  <div class="tenant-sub">Their workspace</div>
                  <div class="isolation-badge">🔒 Isolated</div>
                </div>
                <div class="tenant-card center-card">
                  <div class="tenant-icon">🛡️</div>
                  <div class="tenant-label">SmartInsure</div>
                  <div class="tenant-sub">Shared engine</div>
                  <div class="isolation-badge" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.2);color:#ef4444">⚙ Engine</div>
                </div>
                <div class="tenant-card">
                  <div class="tenant-icon">👑</div>
                  <div class="tenant-label">Admin B</div>
                  <div class="tenant-sub">Their workspace</div>
                  <div class="isolation-badge">🔒 Isolated</div>
                </div>
              </div>
              <p style="text-align:center;font-size:0.72rem;color:#555;margin-top:16px">
                Admins A and B share zero data — ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ─── USE CASES ─── -->
      <section class="section bg-darker">
        <div class="section-inner">
          <div class="text-center">
            <p class="section-label reveal">Use Cases</p>
            <h2 class="section-title reveal">Who Uses SmartInsure?</h2>
          </div>
          <div class="usecase-grid">
            <div class="usecase-card reveal" *ngFor="let u of useCases; let i = index"
              [class.delay-1]="i===1" [class.delay-2]="i===2" [class.delay-3]="i===3">
              <div class="usecase-icon">{{ u.icon }}</div>
              <div class="usecase-label">{{ u.label }}</div>
              <div class="usecase-sub">{{ u.sub }}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ─── CTA ─── -->
      <section class="cta-section">
        <div class="cta-box reveal">
          <div class="cta-icon">🔐</div>
          <h2 class="cta-title">Your Private Workspace Awaits</h2>
          <p class="cta-sub">Register as an Admin, upload your data, create workers, and go live in minutes. No setup fees. No complexity.</p>
          <a routerLink="/login" class="btn-primary" style="font-size:1.05rem;padding:18px 48px">
            🚀 Create Free Account →
          </a>
        </div>
      </section>

      <!-- ─── FOOTER ─── -->
      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <div class="footer-logo">
              <div class="footer-logo-icon">SI</div>
              <span class="footer-logo-name">SmartInsure</span>
            </div>
            <p class="footer-desc">Multi-tenant vehicle data management with role-based access control. Built for insurance teams.</p>
          </div>
          <div>
            <div class="footer-col-title">Product</div>
            <ul class="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#roles">Access Roles</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-col-title">Platform</div>
            <ul class="footer-links">
              <li><a routerLink="/login">Sign In</a></li>
              <li><a routerLink="/login">Register Admin</a></li>
              <li><a routerLink="/app/dashboard">Dashboard</a></li>
            </ul>
          </div>
          <div>
            <div class="footer-col-title">Roles</div>
            <ul class="footer-links">
              <li><a href="#roles">Admin Access</a></li>
              <li><a href="#roles">Worker Access</a></li>
              <li><a href="#security">Data Isolation</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p class="footer-copy">© 2025 SmartInsure. All rights reserved.</p>
          <div class="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  `
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  scrolled = false;
  mobileNav = false;
  displayStats = [0, 0, 0, 0];
  private observer: IntersectionObserver | null = null;
  private scrollFn = () => { this.scrolled = window.scrollY > 40; };

  features = [
    { icon: '🔐', title: 'Isolated Workspaces', desc: 'True multi-tenant architecture. Your data is 100% private and never mixed with other admins.' },
    { icon: '📂', title: 'Any File Format', desc: 'Upload Excel (.xlsx, .xls) and CSV files. Every column auto-detected — zero data loss.' },
    { icon: '🔍', title: 'Instant Search', desc: 'Search any vehicle plate number in milliseconds across your entire database.' },
    { icon: '📊', title: 'Live Dashboard', desc: 'Real-time stats, upload history, insurance expiry tracking, and column insights.' },
    { icon: '✏️', title: 'Data Entry & Edit', desc: 'Add or update vehicle records directly. Workers and admins can both enter data.' },
    { icon: '📄', title: 'PDF Insurance Doc', desc: 'Generate and download a formatted insurance document for any vehicle in one click.' },
  ];

  steps = [
    { icon: '👤', label: 'Register Admin', sub: 'Create your workspace' },
    { icon: '📁', label: 'Upload Data', sub: 'Excel or CSV file' },
    { icon: '👷', label: 'Add Workers', sub: 'Set credentials' },
    { icon: '🔍', label: 'Search & Entry', sub: 'Instant lookup & edit' },
    { icon: '📄', label: 'Export / PDF', sub: 'Download anytime' },
  ];

  securityPoints = [
    'JWT tokens carry admin_id — all queries auto-scoped',
    'Workers inherit admin workspace — no configuration needed',
    'Cross-tenant data access is impossible at the API layer',
    'Role-based route guards on both frontend and backend',
    'Bcrypt password hashing with salting',
  ];

  useCases = [
    { icon: '🛡️', label: 'Insurance Firms', sub: 'Multi-agent workflows' },
    { icon: '🚘', label: 'Dealerships', sub: 'Vehicle record tracking' },
    { icon: '🔧', label: 'Service Centers', sub: 'Insurance verification' },
    { icon: '📋', label: 'Ops Teams', sub: 'Bulk data management' },
  ];

  targetStats = [50000, 200, 100, 3];
  statSuffixes = ['+', 'ms', '%', ''];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    window.addEventListener('scroll', this.scrollFn, { passive: true });
  }

  ngAfterViewInit() {
    // Intersection Observer for scroll reveal
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Trigger stat counter when stats section enters view
          if (entry.target.classList.contains('stats-item') || entry.target.closest('.stats-grid')) {
            this.animateStats();
          }
          this.observer?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    // Observe all reveal elements
    setTimeout(() => {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
        this.observer?.observe(el);
      });
    }, 100);
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.scrollFn);
    this.observer?.disconnect();
  }

  animateStats() {
    const duration = 1800;
    const targets = [50000, 200, 100, 3];
    const start = performance.now();
    const update = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      this.displayStats = targets.map(t => Math.round(t * ease));
      this.cdr.markForCheck();
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
}
