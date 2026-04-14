// src/app/modules/dashboard/dashboard.module.ts
//
// ⚠️  MIGRATION NOTE
// DashboardComponent has been converted to a standalone component.
// This NgModule is kept only for backward-compatibility with any feature
// module that imports DashboardModule by name.  New code should import
// DashboardComponent directly.
//
// Angular Material is NOT installed in this project — all Material
// imports have been removed.  See dashboard.component.ts for the
// standalone implementation that uses only @angular/common and
// @angular/router.

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

@NgModule({
  imports: [
    RouterModule,
    DashboardComponent, // standalone component — imported, not declared
  ],
  exports: [DashboardComponent],
})
export class DashboardModule {}
