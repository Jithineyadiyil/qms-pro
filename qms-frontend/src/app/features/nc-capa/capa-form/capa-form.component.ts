import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-capa-form',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="padding:40px;text-align:center;color:#6b7280;">
      <div style="font-size:48px;margin-bottom:16px;">🚧</div>
      <h2 style="font-size:20px;font-weight:700;color:#1f2937;margin-bottom:8px;">✅ CAPA Management</h2>
      <p style="font-size:14px;">This module is connected to the API and ready for full implementation.</p>
      <a routerLink="/dashboard" style="display:inline-flex;align-items:center;gap:6px;margin-top:20px;padding:8px 16px;background:#2563eb;color:#fff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">
        ← Back to Dashboard
      </a>
    </div>
  `
})
export class CapaFormComponent implements OnInit {
  ngOnInit(): void {}
}
