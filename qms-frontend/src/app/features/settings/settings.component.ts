import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';

type MainTab = 'users'|'departments'|'roles'|'categories'|'email_templates'|'settings'|'activity';
type CatType = 'request'|'nc'|'risk'|'document'|'vendor'|'complaint';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, DatePipe, SlicePipe, FormsModule],
  template: `
<div class="adm-shell">

  <!-- ═══ SIDEBAR NAV ═══ -->
  <div class="adm-nav">
    <div class="adm-nav-title">Administration</div>
    @for (t of mainTabs; track t.id) {
      <button class="adm-nav-item" [class.active]="activeTab()===t.id" (click)="switchTab(t.id)">
        <i [class]="t.icon"></i>
        <span>{{ t.label }}</span>
        @if (t.badge) { <span class="nav-badge">{{ t.badge() }}</span> }
      </button>
    }
  </div>

  <!-- ═══ CONTENT ═══ -->
  <div class="adm-content">

    <!-- ══ USERS ══ -->
    @if (activeTab()==='users') {
      <div class="content-header">
        <div>
          <div class="content-title"><i class="fas fa-users"></i> Users</div>
          <div class="content-sub">Manage system users, roles and access</div>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openUserForm()">
          <i class="fas fa-plus"></i> Add User
        </button>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-box">
          <i class="fas fa-magnifying-glass"></i>
          <input [(ngModel)]="userSearch" (input)="loadUsers()" placeholder="Search name, email, employee ID…">
        </div>
        <select class="sel" [(ngModel)]="userRoleFilter" (change)="loadUsers()">
          <option value="">All Roles</option>
          @for (r of roles(); track r.id) { <option [value]="r.id">{{ r.name }}</option> }
        </select>
        <select class="sel" [(ngModel)]="userDeptFilter" (change)="loadUsers()">
          <option value="">All Departments</option>
          @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
        </select>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>USER</th><th>EMPLOYEE ID</th><th>ROLE</th><th>DEPARTMENT</th>
              <th>PHONE</th><th>STATUS</th><th></th>
            </tr></thead>
            <tbody>
              @if (loadingUsers()) { @for (i of [1,2,3,4,5]; track i) {
                <tr><td colspan="7"><div class="sk-row"></div></td></tr>
              }}
              @for (u of users(); track u.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <div class="ava" [style.background]="avatarColor(u.name)">{{ u.name?.charAt(0) }}</div>
                      <div>
                        <div class="user-name">{{ u.name }}</div>
                        <div class="user-email">{{ u.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="mono">{{ u.employee_id || '—' }}</span></td>
                  <td><span class="badge badge-blue">{{ u.role?.name }}</span></td>
                  <td class="sm">{{ u.department?.name || '—' }}</td>
                  <td class="sm">{{ u.phone || '—' }}</td>
                  <td>
                    <span class="badge" [class]="u.is_active?'badge-green':'badge-draft'">
                      {{ u.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="ra-btn" title="Edit" (click)="openEditUser(u)"><i class="fas fa-pen"></i></button>
                      <button class="ra-btn" [title]="u.is_active?'Deactivate':'Activate'" (click)="toggleUser(u)">
                        <i [class]="u.is_active?'fas fa-ban':'fas fa-check'"></i>
                      </button>
                      <button class="ra-btn" title="Reset Password" (click)="openResetPw(u)"><i class="fas fa-key"></i></button>
                    </div>
                  </td>
                </tr>
              }
              @if (!loadingUsers() && !users().length && !apiError()) {
                <tr><td colspan="7" class="empty-cell"><i class="fas fa-users"></i><div>No users found</div></td></tr>
              }
              @if (!loadingUsers() && apiError()) {
                <tr><td colspan="7" class="empty-cell" style="color:#dc2626"><i class="fas fa-circle-exclamation"></i><div>{{ apiError() }}</div></td></tr>
              }
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div class="pagination">
          <span class="pg-info">{{ userTotal() }} users · Page {{ userPage() }} of {{ userPages() }}</span>
          <button class="btn btn-secondary btn-xs" [disabled]="userPage()<=1" (click)="prevPage()"><i class="fas fa-chevron-left"></i></button>
          <button class="btn btn-secondary btn-xs" [disabled]="userPage()>=userPages()" (click)="nextPage()"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
    }

    <!-- ══ DEPARTMENTS ══ -->
    @if (activeTab()==='departments') {
      <div class="content-header">
        <div>
          <div class="content-title"><i class="fas fa-building"></i> Departments</div>
          <div class="content-sub">Manage organizational departments and their heads</div>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openDeptForm()">
          <i class="fas fa-plus"></i> Add Department
        </button>
      </div>
      <div class="dept-grid">
        @if (loadingDepts()) { @for (i of [1,2,3,4,5,6]; track i) { <div class="sk-card"></div> } }
        @for (d of departments(); track d.id) {
          <div class="dept-card">
            <div class="dept-top">
              <div class="dept-icon"><i class="fas fa-building"></i></div>
              <div class="dept-actions">
                <button class="icon-btn" (click)="openEditDept(d)"><i class="fas fa-pen"></i></button>
                <button class="icon-btn del" (click)="deleteDept(d)"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="dept-name">{{ d.name }}</div>
            @if (d.code) { <div class="dept-code">{{ d.code }}</div> }
            @if (d.description) { <div class="dept-desc">{{ d.description }}</div> }
            <div class="dept-footer">
              @if (d.head) {
                <div class="dept-head">
                  <div class="ava-xs" [style.background]="avatarColor(d.head.name)">{{ d.head.name?.charAt(0) }}</div>
                  <span>{{ d.head.name }}</span>
                </div>
              } @else {
                <span class="no-head">No head assigned</span>
              }
              <span class="dept-count"><i class="fas fa-users"></i> {{ d.users_count || 0 }}</span>
            </div>
          </div>
        }
        @if (!loadingDepts() && !departments().length) {
          <div class="empty-full"><i class="fas fa-building"></i><div>No departments yet</div></div>
        }
      </div>
    }

    <!-- ══ ROLES ══ -->
    @if (activeTab()==='roles') {
      <div class="content-header">
        <div>
          <div class="content-title"><i class="fas fa-shield-halved"></i> Roles &amp; Permissions</div>
          <div class="content-sub">Manage roles and their module permissions</div>
        </div>
        <button class="btn btn-primary" (click)="openRoleForm()"><i class="fas fa-plus"></i> Add Role</button>
      </div>
      @if (loadingRoles()) {
        <div class="roles-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="role-card"><div class="sk-row"></div><div class="sk-row" style="width:60%;margin-top:8px"></div></div>
          }
        </div>
      }
      @if (!loadingRoles() && rolesError()) {
        <div class="empty-state"><i class="fas fa-circle-exclamation"></i><div>Failed to load roles — {{ rolesError() }}</div></div>
      }
      @if (!loadingRoles() && !rolesError() && !roles().length) {
        <div class="empty-state"><i class="fas fa-shield-halved"></i><div>No roles found. Run <code>php artisan db:seed --class=RoleSeeder</code></div></div>
      }
      <div class="roles-grid">
        @for (r of roles(); track r.id) {
          <div class="role-card">
            <div class="role-header">
              <div class="role-name">{{ r.name }}</div>
              <div style="display:flex;gap:6px;align-items:center">
                <span class="badge badge-blue">{{ r.users_count || 0 }} users</span>
                <button class="icon-btn" title="Edit" (click)="openEditRole(r)"><i class="fas fa-pencil"></i></button>
                <button class="icon-btn icon-btn-danger" title="Delete" (click)="deleteRole(r)" [disabled]="r.slug==='super_admin'"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            @if (r.description) { <div class="role-desc">{{ r.description }}</div> }
            <div class="role-perms">
              @if (r.permissions && (r.permissions | slice:0:1)[0] === '*') {
                <span class="perm-chip perm-all"><i class="fas fa-star"></i> Full Access</span>
              } @else {
                @for (p of $any(r.permissions | slice:0:6); track p) {
                  <span class="perm-chip">{{ p }}</span>
                }
                @if ((r.permissions?.length||0) > 6) {
                  <span class="perm-chip perm-more">+{{ r.permissions.length-6 }} more</span>
                }
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- ══ CATEGORIES ══ -->
    @if (activeTab()==='categories') {
      <div class="content-header">
        <div>
          <div class="content-title"><i class="fas fa-tags"></i> Categories</div>
          <div class="content-sub">Manage categories for all modules</div>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openCatForm()">
          <i class="fas fa-plus"></i> Add Category
        </button>
      </div>

      <!-- Category sub-tabs -->
      <div class="sub-tabs">
        @for (ct of catTypes; track ct.id) {
          <button class="sub-tab" [class.active]="activeCatType()===ct.id" (click)="switchCatType(ct.id)">
            <i [class]="ct.icon"></i> {{ ct.label }}
            <span class="sub-badge">{{ catCount(ct.id) }}</span>
          </button>
        }
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>NAME</th>
              <th>DESCRIPTION</th>
              @if (activeCatType()==='request' || activeCatType()==='complaint') { <th>SLA HOURS</th> }
              @if (activeCatType()==='nc') { <th>DEFAULT SEVERITY</th> }
              @if (activeCatType()==='document') { <th>CODE</th><th>PARENT</th> }
              <th>USAGE</th><th></th>
            </tr></thead>
            <tbody>
              @if (loadingCats()) { @for (i of [1,2,3,4]; track i) {
                <tr><td colspan="6"><div class="sk-row"></div></td></tr>
              }}
              @for (c of activeCats(); track c.id) {
                <tr>
                  <td class="cat-name">{{ c.name }}</td>
                  <td class="sm-gray">{{ c.description || '—' }}</td>
                  @if (activeCatType()==='request' || activeCatType()==='complaint') {
                    <td><span class="sla-badge">{{ c.sla_hours ? c.sla_hours+'h' : '—' }}</span></td>
                  }
                  @if (activeCatType()==='nc') {
                    <td><span class="badge" [class]="sevCls(c.severity_default)">{{ c.severity_default || '—' }}</span></td>
                  }
                  @if (activeCatType()==='document') {
                    <td><span class="mono">{{ c.code || '—' }}</span></td>
                    <td class="sm-gray">{{ c.parent?.name || '—' }}</td>
                  }
                  <td><span class="usage-badge">{{ c.usage_count || 0 }} records</span></td>
                  <td>
                    <div class="row-actions">
                      <button class="ra-btn" (click)="openEditCat(c)"><i class="fas fa-pen"></i></button>
                      <button class="ra-btn del" (click)="deleteCategory(c)"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              }
              @if (!loadingCats() && !activeCats().length) {
                <tr><td colspan="6" class="empty-cell">
                  <i class="fas fa-tags"></i>
                  <div>No {{ activeCatLabel() }} categories</div>
                  <div class="empty-sub"><button class="link-btn" (click)="openCatForm()">Add one now</button></div>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- ══ EMAIL TEMPLATES ══ -->
    @if (activeTab()==='email_templates') {
      <div class="content-header">
        <div>
          <div class="content-title"><i class="fas fa-envelope-open-text"></i> Email Templates</div>
          <div class="content-sub">Manage notification email templates for all modules</div>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openTplForm()">
          <i class="fas fa-plus"></i> New Template
        </button>
      </div>

      <!-- Module filter -->
      <div class="filter-bar">
        <div class="module-pills">
          <button class="mod-pill" [class.active]="tplModuleFilter===''" (click)="tplModuleFilter='';loadTemplates()">All</button>
          @for (m of tplModules; track m.id) {
            <button class="mod-pill" [class.active]="tplModuleFilter===m.id" (click)="tplModuleFilter=m.id;loadTemplates()">
              <i [class]="m.icon"></i> {{ m.label }}
            </button>
          }
        </div>
      </div>

      <div class="tpl-grid">
        @if (loadingTpls()) { @for (i of [1,2,3,4,5,6]; track i) { <div class="sk-card"></div> } }
        @for (t of templates(); track t.id) {
          <div class="tpl-card" [class.tpl-inactive]="!t.is_active">
            <div class="tpl-card-header">
              <div class="tpl-module-tag" [class]="'mod-'+t.module">
                <i [class]="modIcon(t.module)"></i> {{ t.module }}
              </div>
              <div class="tpl-actions">
                <button class="icon-btn sm" [title]="t.is_active?'Disable':'Enable'" (click)="toggleTemplate(t)">
                  <i [class]="t.is_active?'fas fa-toggle-on':'fas fa-toggle-off'"></i>
                </button>
                <button class="icon-btn sm" (click)="openEditTpl(t)"><i class="fas fa-pen"></i></button>
                <button class="icon-btn sm del" (click)="deleteTpl(t)"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="tpl-name">{{ t.name }}</div>
            <div class="tpl-event"><i class="fas fa-bolt"></i> {{ formatEvent(t.trigger_event) }}</div>
            <div class="tpl-subject">{{ t.subject }}</div>
            <div class="tpl-vars">
              @if (t.variables?.length) {
                @for (v of $any(t.variables | slice:0:3); track v.key) {
                  <span class="var-chip">{{ v.key }}</span>
                }
                @if (t.variables.length > 3) { <span class="var-chip">+{{ t.variables.length-3 }}</span> }
              }
            </div>
            <div class="tpl-status-row">
              <span class="badge" [class]="t.is_active?'badge-green':'badge-draft'">
                {{ t.is_active ? 'Active' : 'Disabled' }}
              </span>
              <button class="link-btn" (click)="openEditTpl(t)">Edit Template →</button>
            </div>
          </div>
        }
        @if (!loadingTpls() && !templates().length) {
          <div class="empty-full"><i class="fas fa-envelope"></i><div>No templates yet</div></div>
        }
      </div>
    }

    <!-- ══ SYSTEM SETTINGS ══ -->
    @if (activeTab()==='settings') {
      <div class="content-header">
        <div>
          <div class="content-title"><i class="fas fa-gear"></i> System Settings</div>
          <div class="content-sub">Configure system-wide preferences and behavior</div>
        </div>
        <button class="btn btn-primary btn-sm" (click)="saveAllSettings()" [disabled]="savingSettings()">
          <i class="fas fa-save"></i> {{ savingSettings() ? 'Saving…' : 'Save All' }}
        </button>
      </div>

      @if (settingsSaved()) {
        <div class="success-banner"><i class="fas fa-check-circle"></i> Settings saved successfully.</div>
      }

      <div class="settings-grid">
        @for (group of settingGroups(); track group.key) {
          <div class="card settings-section">
            <div class="sec-title"><i [class]="groupIcon(group.key)"></i> {{ group.label }}</div>
            @for (s of group.items; track s.id) {
              <div class="setting-row" [class.setting-row-full]="s.key==='theme'">
                <div class="setting-info">
                  <div class="setting-label">{{ s.label }}</div>
                  @if (s.description) { <div class="setting-desc">{{ s.description }}</div> }
                </div>
                <div class="setting-control" [class.setting-control-full]="s.key==='theme'">
                  @if (s.type === 'boolean') {
                    <label class="toggle">
                      <input type="checkbox" [(ngModel)]="settingsMap[s.key]" [ngModelOptions]="{standalone:true}">
                      <span class="toggle-slider"></span>
                    </label>
                  } @else if (s.key === 'theme') {
                    <div class="theme-picker">
                      @for (t of themeList(); track t.key) {
                        <button class="theme-swatch"
                                [class.theme-swatch-active]="settingsMap['theme']===t.key"
                                [title]="t.label"
                                (click)="pickTheme(t.key)"
                                [style.background]="t.preview.bg">
                          <div class="swatch-surface" [style.background]="t.preview.surface">
                            <div class="swatch-accent" [style.background]="t.preview.accent"></div>
                          </div>
                          <div class="swatch-label">{{ t.label }}</div>
                          @if (settingsMap['theme']===t.key) {
                            <div class="swatch-check"><i class="fas fa-check"></i></div>
                          }
                        </button>
                      }
                    </div>
                  } @else if (s.type === 'select') {
                    <select class="fc-sm" [(ngModel)]="settingsMap[s.key]" [ngModelOptions]="{standalone:true}">
                      @for (opt of s.options; track opt) { <option [value]="opt">{{ opt }}</option> }
                    </select>
                  } @else if (s.type === 'color') {
                    <div class="color-row">
                      <input type="color" [(ngModel)]="settingsMap[s.key]" [ngModelOptions]="{standalone:true}" class="color-input"
                             (input)="previewColor(s.key, $any($event.target).value)">
                      <input type="text" [(ngModel)]="settingsMap[s.key]" [ngModelOptions]="{standalone:true}" class="fc-sm color-text"
                             (change)="previewColor(s.key, settingsMap[s.key])">
                    </div>
                  } @else if (s.type === 'textarea') {
                    <textarea class="fc-sm" [(ngModel)]="settingsMap[s.key]" [ngModelOptions]="{standalone:true}" rows="3"></textarea>
                  } @else {
                    <input [type]="s.type==='number'?'number':'text'"
                           class="fc-sm"
                           [(ngModel)]="settingsMap[s.key]"
                           [ngModelOptions]="{standalone:true}">
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ══ ACTIVITY LOG ══ -->
    @if (activeTab()==='activity') {
      <div class="content-header">
        <div>
          <div class="content-title"><i class="fas fa-list-check"></i> Activity Log</div>
          <div class="content-sub">System-wide audit trail of all actions</div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>TIME</th><th>USER</th><th>MODULE</th><th>ACTION</th><th>DESCRIPTION</th></tr></thead>
            <tbody>
              @if (loadingLog()) { @for (i of [1,2,3,4,5]; track i) {
                <tr><td colspan="5"><div class="sk-row"></div></td></tr>
              }}
              @for (l of activityLog(); track l.id) {
                <tr>
                  <td class="sm-gray nowrap">{{ l.created_at | date:'dd MMM yy HH:mm' }}</td>
                  <td>
                    <div class="user-cell compact">
                      <div class="ava-xs" [style.background]="avatarColor(l.user_name||'?')">{{ (l.user_name||'?').charAt(0) }}</div>
                      <span class="sm">{{ l.user_name || 'System' }}</span>
                    </div>
                  </td>
                  <td><span class="badge badge-draft">{{ l.module }}</span></td>
                  <td><span class="action-badge">{{ l.action }}</span></td>
                  <td class="sm-gray">{{ l.description }}</td>
                </tr>
              }
              @if (!loadingLog() && !activityLog().length) {
                <tr><td colspan="5" class="empty-cell"><i class="fas fa-list-check"></i><div>No activity recorded yet</div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

  </div><!-- /adm-content -->
</div><!-- /adm-shell -->

<!-- ═══ USER MODAL ═══ -->
@if (showUserForm()) {
  <div class="overlay" (click)="showUserForm.set(false)">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-user-plus"></i> {{ editUserId() ? 'Edit User' : 'Add New User' }}</div>
        <button class="modal-close" (click)="showUserForm.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg"><label class="lbl">Full Name *</label><input class="fc" [(ngModel)]="userForm.name" placeholder="Full name"></div>
          <div class="fg"><label class="lbl">Email *</label><input class="fc" [(ngModel)]="userForm.email" type="email" placeholder="user@company.com"></div>
          <div class="fg"><label class="lbl">Employee ID</label><input class="fc" [(ngModel)]="userForm.employee_id" placeholder="EMP001"></div>
          <div class="fg"><label class="lbl">Phone</label><input class="fc" [(ngModel)]="userForm.phone" placeholder="+966 5XXXXXXXX"></div>
          <div class="fg"><label class="lbl">Role *</label>
            <select class="fc" [(ngModel)]="userForm.role_id">
              <option value="">— Select Role —</option>
              @for (r of roles(); track r.id) { <option [value]="r.id">{{ r.name }}</option> }
            </select>
          </div>
          <div class="fg"><label class="lbl">Department</label>
            <select class="fc" [(ngModel)]="userForm.department_id">
              <option value="">— Select Department —</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          @if (!editUserId()) {
            <div class="fg fg-2"><label class="lbl">Password (default: Password&#64;123)</label>
              <input class="fc" [(ngModel)]="userForm.password" type="password" placeholder="Leave blank for default">
            </div>
          }
        </div>
        @if (formError()) { <div class="form-err">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showUserForm.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="submitUser()" [disabled]="saving()">{{ saving()?'Saving…':(editUserId()?'Update':'Add User') }}</button>
      </div>
    </div>
  </div>
}

<!-- ═══ RESET PASSWORD MODAL ═══ -->
@if (showResetPw()) {
  <div class="overlay" (click)="showResetPw.set(false)">
    <div class="modal modal-sm" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-key"></i> Reset Password</div>
        <button class="modal-close" (click)="showResetPw.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <p class="modal-info">Reset password for <strong>{{ resetPwUser()?.name }}</strong></p>
        <div class="fg"><label class="lbl">New Password *</label>
          <input class="fc" [(ngModel)]="newPassword" type="password" placeholder="Min 8 characters">
        </div>
        @if (formError()) { <div class="form-err">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showResetPw.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="submitResetPw()" [disabled]="saving()">{{ saving()?'Saving…':'Reset Password' }}</button>
      </div>
    </div>
  </div>
}


<!-- ═══ ROLE MODAL ═══ -->
@if (showRoleForm()) {
  <div class="overlay" (click)="showRoleForm.set(false)">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-shield-halved"></i> {{ editRoleId() ? 'Edit Role' : 'New Role' }}</div>
        <button class="modal-close" (click)="showRoleForm.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        @if (formError()) { <div class="alert alert-danger">{{ formError() }}</div> }
        <div class="fg-row">
          <div class="fg fg-2"><label class="lbl">Role Name *</label><input class="fc" [(ngModel)]="roleForm.name" placeholder="e.g. Compliance Officer"></div>
          <div class="fg fg-2"><label class="lbl">Description</label><input class="fc" [(ngModel)]="roleForm.description" placeholder="Brief description of this role"></div>
        </div>
        <div class="fg">
          <label class="lbl">Permissions</label>
          <div class="perm-builder">
            @for (mod of permModules; track mod.key) {
              <div class="perm-module">
                <div class="perm-module-header">
                  <label class="perm-module-label">
                    <input type="checkbox" [checked]="hasWildcard(mod.key)" (change)="toggleWildcard(mod.key, $any($event.target).checked)">
                    <i [class]="mod.icon"></i> {{ mod.label }}
                  </label>
                </div>
                <div class="perm-actions">
                  @for (action of mod.actions; track action) {
                    <label class="perm-action-label">
                      <input type="checkbox"
                        [checked]="roleFormPerms().includes(mod.key+'.'+action) || roleFormPerms().includes(mod.key+'.*') || roleFormPerms().includes('*')"
                        (change)="togglePerm(mod.key+'.'+action, $any($event.target).checked)">
                      {{ action }}
                    </label>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showRoleForm.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="submitRole()" [disabled]="saving()">{{ saving()?'Saving…': (editRoleId()?'Update Role':'Create Role') }}</button>
      </div>
    </div>
  </div>
}
<!-- ═══ DEPARTMENT MODAL ═══ -->
@if (showDeptForm()) {
  <div class="overlay" (click)="showDeptForm.set(false)">
    <div class="modal modal-md" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-building"></i> {{ editDeptId() ? 'Edit Department' : 'Add Department' }}</div>
        <button class="modal-close" (click)="showDeptForm.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="fg"><label class="lbl">Department Name *</label><input class="fc" [(ngModel)]="deptForm.name" placeholder="e.g. Quality Assurance"></div>
          <div class="fg"><label class="lbl">Code</label><input class="fc" [(ngModel)]="deptForm.code" placeholder="e.g. QA"></div>
          <div class="fg fg-2"><label class="lbl">Description</label><input class="fc" [(ngModel)]="deptForm.description" placeholder="Brief description"></div>
          <div class="fg fg-2"><label class="lbl">Department Head</label>
            <select class="fc" [(ngModel)]="deptForm.head_user_id">
              <option value="">— No head assigned —</option>
              @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
            </select>
          </div>
        </div>
        @if (formError()) { <div class="form-err">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showDeptForm.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="submitDept()" [disabled]="saving()">{{ saving()?'Saving…':(editDeptId()?'Update':'Add') }}</button>
      </div>
    </div>
  </div>
}

<!-- ═══ CATEGORY MODAL ═══ -->
@if (showCatForm()) {
  <div class="overlay" (click)="showCatForm.set(false)">
    <div class="modal modal-md" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-tag"></i> {{ editCatId() ? 'Edit' : 'Add' }} {{ activeCatLabel() }} Category</div>
        <button class="modal-close" (click)="showCatForm.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <!-- Type selector when opening from header button -->
          @if (!editCatId()) {
            <div class="fg fg-2"><label class="lbl">Category Type *</label>
              <select class="fc" [(ngModel)]="catFormType">
                @for (ct of catTypes; track ct.id) { <option [value]="ct.id">{{ ct.label }}</option> }
              </select>
            </div>
          }
          <div class="fg fg-2"><label class="lbl">Name *</label><input class="fc" [(ngModel)]="catForm.name" placeholder="Category name"></div>
          <div class="fg fg-2"><label class="lbl">Description</label><textarea class="fc" [(ngModel)]="catForm.description" rows="2" placeholder="Optional description"></textarea></div>
          @if (catFormType==='request' || catFormType==='complaint') {
            <div class="fg"><label class="lbl">SLA Hours</label><input class="fc" type="number" [(ngModel)]="catForm.sla_hours" placeholder="e.g. 24"></div>
          }
          @if (catFormType==='nc') {
            <div class="fg"><label class="lbl">Default Severity</label>
              <select class="fc" [(ngModel)]="catForm.severity_default">
                <option value="">— Select —</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          }
          @if (catFormType==='document') {
            <div class="fg"><label class="lbl">Code</label><input class="fc" [(ngModel)]="catForm.code" placeholder="e.g. POL"></div>
            <div class="fg"><label class="lbl">Parent Category</label>
              <select class="fc" [(ngModel)]="catForm.parent_id">
                <option value="">— No Parent —</option>
                @for (c of allCats['document']||[]; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
              </select>
            </div>
          }
        </div>
        @if (formError()) { <div class="form-err">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showCatForm.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="submitCat()" [disabled]="saving()">{{ saving()?'Saving…':(editCatId()?'Update':'Add') }}</button>
      </div>
    </div>
  </div>
}

<!-- ═══ EMAIL TEMPLATE MODAL ═══ -->
@if (showTplForm()) {
  <div class="overlay" (click)="showTplForm.set(false)">
    <div class="modal modal-xl" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-envelope-open-text"></i> {{ editTplId() ? 'Edit Template' : 'New Template' }}</div>
        <button class="modal-close" (click)="showTplForm.set(false)"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="tpl-editor-layout">
          <div class="tpl-editor-main">
            <div class="form-grid">
              <div class="fg"><label class="lbl">Template Name *</label><input class="fc" [(ngModel)]="tplForm.name" placeholder="e.g. NC Raised Notification"></div>
              <div class="fg"><label class="lbl">Module *</label>
                <select class="fc" [(ngModel)]="tplForm.module">
                  @for (m of tplModules; track m.id) { <option [value]="m.id">{{ m.label }}</option> }
                </select>
              </div>
              <div class="fg"><label class="lbl">Trigger Event *</label>
                <input class="fc" [(ngModel)]="tplForm.trigger_event" placeholder="e.g. created, approved, overdue">
              </div>
              <div class="fg"><label class="lbl">Active</label>
                <label class="toggle mt-8">
                  <input type="checkbox" [(ngModel)]="tplForm.is_active">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="fg fg-2"><label class="lbl">Subject *</label><input class="fc" [(ngModel)]="tplForm.subject" placeholder="Email subject line — use {{'{{'}}variables{{'}}'}}"></div>
            </div>
            <div class="fg" style="margin-top:12px">
              <label class="lbl">Email Body (HTML) *</label>
              <textarea class="fc tpl-body-editor" [(ngModel)]="tplForm.body_html" rows="14" placeholder="Write HTML email body here. Use {{'{{'}}variables{{'}}'}} for dynamic content."></textarea>
            </div>
          </div>
          <div class="tpl-vars-panel">
            <div class="vars-title"><i class="fas fa-code"></i> Available Variables</div>
            @if (editTplVars().length) {
              @for (v of editTplVars(); track v.key) {
                <div class="var-row" (click)="insertVar(v.key)">
                  <span class="var-key">{{ v.key }}</span>
                  <span class="var-desc">{{ v.desc }}</span>
                </div>
              }
            } @else {
              <div class="vars-empty">Select a module to see available variables</div>
            }
            <div class="vars-note"><i class="fas fa-info-circle"></i> Click a variable to insert it at cursor position</div>
          </div>
        </div>
        @if (formError()) { <div class="form-err">{{ formError() }}</div> }
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="showTplForm.set(false)">Cancel</button>
        <button class="btn btn-primary" (click)="submitTpl()" [disabled]="saving()">{{ saving()?'Saving…':(editTplId()?'Update':'Create') }}</button>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    :host { display:block; }
    .adm-shell { display:flex; gap:0; min-height:calc(100vh - 80px); }

    /* ── Sidebar nav ── */
    .adm-nav { width:220px; flex-shrink:0; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px 10px; display:flex; flex-direction:column; gap:2px; align-self:flex-start; position:sticky; top:20px; }
    .adm-nav-title { font-family:'Syne',sans-serif; font-size:11px; font-weight:800; color:var(--text3); text-transform:uppercase; letter-spacing:.8px; padding:4px 10px 10px; border-bottom:1px solid var(--border); margin-bottom:6px; }
    .adm-nav-item { display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:8px; border:none; background:none; color:var(--text2); font-size:13px; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .13s; width:100%; text-align:left; }
    .adm-nav-item:hover { background:var(--surface2); color:var(--text); }
    .adm-nav-item.active { background:rgba(59,130,246,.1); color:var(--accent); font-weight:600; }
    .adm-nav-item i { width:16px; font-size:13px; text-align:center; }
    .nav-badge { margin-left:auto; background:var(--surface2); border:1px solid var(--border); border-radius:10px; font-size:10px; font-weight:700; padding:1px 7px; color:var(--text2); }

    /* ── Content ── */
    .adm-content { flex:1; padding-left:20px; display:flex; flex-direction:column; gap:16px; min-width:0; }
    .content-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:10px; }
    .content-title { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; display:flex; align-items:center; gap:8px; }
    .content-sub { font-size:12px; color:var(--text2); margin-top:3px; }

    /* ── Table shared ── */
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .table-wrap { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; }
    th { background:var(--surface2); padding:10px 14px; text-align:left; font-weight:700; font-size:10px; color:var(--text2); text-transform:uppercase; letter-spacing:.8px; border-bottom:1px solid var(--border); white-space:nowrap; }
    td { padding:12px 14px; border-bottom:1px solid var(--border); color:var(--text); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:rgba(59,130,246,.03); }
    .sm { font-size:11px; color:var(--text2); }
    .sm-gray { font-size:12px; color:var(--text2); }
    .nowrap { white-space:nowrap; }
    .mono { font-family:monospace; font-size:11px; color:var(--accent); }
    .sk-row { height:10px; background:var(--border); border-radius:3px; animation:shimmer 1.5s infinite; }
    .sk-card { height:120px; background:var(--border); border-radius:12px; animation:shimmer 1.5s infinite; }
    @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.9} }
    .empty-cell { text-align:center; color:var(--text3); padding:48px !important; }
    .empty-cell i { font-size:28px; display:block; margin-bottom:8px; }
    .empty-sub { font-size:11px; margin-top:6px; }
    .empty-full { grid-column:1/-1; text-align:center; color:var(--text3); padding:48px; }
    .empty-full i { font-size:36px; display:block; margin-bottom:10px; }

    /* ── User cells ── */
    .user-cell { display:flex; align-items:center; gap:10px; }
    .user-cell.compact { gap:7px; }
    .user-name { font-size:13px; font-weight:600; }
    .user-email { font-size:11px; color:var(--text2); }
    .ava { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font-size:13px; font-weight:800; color:#fff; flex-shrink:0; }
    .ava-xs { width:24px; height:24px; border-radius:50%; display:grid; place-items:center; font-size:10px; font-weight:800; color:#fff; flex-shrink:0; }

    /* ── Row actions ── */
    .row-actions { display:flex; gap:4px; opacity:0; transition:opacity .15s; }
    tr:hover .row-actions { opacity:1; }
    .ra-btn { width:27px; height:27px; border:1px solid var(--border); border-radius:6px; background:none; color:var(--text2); font-size:11px; cursor:pointer; display:grid; place-items:center; transition:all .13s; }
    .ra-btn:hover { background:var(--surface2); color:var(--text); }
    .ra-btn.del:hover { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.3); color:var(--danger); }

    /* ── Filter bar ── */
    .filter-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .search-box { display:flex; align-items:center; gap:7px; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:7px 12px; min-width:250px; }
    .search-box i { color:var(--text3); font-size:11px; }
    .search-box input { background:none; border:none; outline:none; color:var(--text); font-size:12px; font-family:'DM Sans',sans-serif; flex:1; }
    .sel { background:var(--surface); border:1px solid var(--border); border-radius:7px; color:var(--text); font-size:12px; font-family:'DM Sans',sans-serif; padding:7px 10px; outline:none; cursor:pointer; }
    .pagination { display:flex; align-items:center; gap:5px; padding:10px 14px; border-top:1px solid var(--border); }
    .pg-info { font-size:11px; color:var(--text2); margin-right:auto; }

    /* ── Departments grid ── */
    .dept-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
    .dept-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:6px; }
    .dept-top { display:flex; align-items:center; justify-content:space-between; }
    .dept-icon { width:36px; height:36px; border-radius:9px; background:rgba(59,130,246,.1); display:grid; place-items:center; font-size:16px; color:var(--accent); }
    .dept-actions { display:flex; gap:4px; }
    .dept-name { font-family:'Syne',sans-serif; font-size:14px; font-weight:800; margin-top:4px; }
    .dept-code { font-family:monospace; font-size:10px; color:var(--accent); background:rgba(59,130,246,.08); display:inline-block; padding:1px 6px; border-radius:4px; }
    .dept-desc { font-size:11px; color:var(--text2); line-height:1.4; }
    .dept-footer { display:flex; align-items:center; justify-content:space-between; margin-top:6px; padding-top:10px; border-top:1px solid var(--border); }
    .dept-head { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text2); }
    .no-head { font-size:11px; color:var(--text3); font-style:italic; }
    .dept-count { font-size:11px; color:var(--text2); display:flex; align-items:center; gap:4px; }

    /* ── Roles grid ── */
    .icon-btn { background:none; border:1px solid var(--border); border-radius:6px; padding:4px 7px; cursor:pointer; color:var(--text-2); font-size:12px; transition:.15s; }
    .icon-btn:hover { background:var(--hover); color:var(--text); }
    .icon-btn-danger:hover { background:#fee2e2; color:#dc2626; border-color:#fca5a5; }
    .perm-builder { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; margin-top:8px; }
    .perm-module { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px; }
    .perm-module-header { margin-bottom:8px; }
    .perm-module-label { display:flex; align-items:center; gap:6px; font-weight:600; font-size:13px; cursor:pointer; }
    .perm-module-label input { accent-color:var(--primary); }
    .perm-actions { display:flex; flex-wrap:wrap; gap:6px; }
    .perm-action-label { display:flex; align-items:center; gap:4px; font-size:12px; color:var(--text-2); cursor:pointer; padding:3px 6px; border:1px solid var(--border); border-radius:5px; background:var(--bg); }
    .perm-action-label input { accent-color:var(--primary); }
    .roles-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
    .role-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; }
    .role-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
    .role-name { font-family:'Syne',sans-serif; font-size:14px; font-weight:800; }
    .role-desc { font-size:12px; color:var(--text2); margin-bottom:10px; line-height:1.4; }
    .role-perms { display:flex; flex-wrap:wrap; gap:5px; }
    .perm-chip { font-size:10px; font-family:monospace; background:var(--surface2); border:1px solid var(--border); border-radius:5px; padding:2px 7px; color:var(--text2); }
    .perm-all { background:rgba(59,130,246,.1); border-color:rgba(59,130,246,.3); color:var(--accent); font-family:'DM Sans',sans-serif; font-weight:700; }
    .perm-more { background:var(--surface); color:var(--text3); }

    /* ── Sub-tabs ── */
    .sub-tabs { display:flex; gap:4px; flex-wrap:wrap; }
    .sub-tab { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text2); font-size:12px; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .13s; }
    .sub-tab:hover { background:var(--surface2); color:var(--text); }
    .sub-tab.active { background:rgba(59,130,246,.1); border-color:rgba(59,130,246,.3); color:var(--accent); font-weight:600; }
    .sub-badge { background:var(--surface2); border:1px solid var(--border); border-radius:10px; font-size:9px; font-weight:700; padding:1px 5px; }
    .sub-tab.active .sub-badge { background:rgba(59,130,246,.15); }

    /* ── Category table ── */
    .cat-name { font-weight:600; font-size:13px; }
    .sla-badge { font-size:11px; font-family:monospace; background:rgba(16,185,129,.1); color:var(--success); border-radius:5px; padding:2px 7px; }
    .usage-badge { font-size:11px; background:var(--surface2); border:1px solid var(--border); border-radius:5px; padding:2px 7px; color:var(--text2); }
    .link-btn { background:none; border:none; color:var(--accent); font-size:11px; cursor:pointer; font-family:'DM Sans',sans-serif; }

    /* ── Email templates ── */
    .module-pills { display:flex; gap:5px; flex-wrap:wrap; }
    .mod-pill { padding:5px 12px; border-radius:20px; border:1px solid var(--border); background:var(--surface); color:var(--text2); font-size:11px; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .13s; display:flex; align-items:center; gap:5px; }
    .mod-pill:hover { background:var(--surface2); }
    .mod-pill.active { background:rgba(59,130,246,.1); border-color:rgba(59,130,246,.3); color:var(--accent); font-weight:600; }
    .tpl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
    .tpl-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:7px; transition:border-color .13s; }
    .tpl-card:hover { border-color:rgba(59,130,246,.3); }
    .tpl-inactive { opacity:.6; }
    .tpl-card-header { display:flex; align-items:center; justify-content:space-between; }
    .tpl-module-tag { font-size:10px; font-weight:700; padding:2px 8px; border-radius:5px; text-transform:capitalize; display:flex; align-items:center; gap:4px; }
    .mod-requests,.mod-request { background:rgba(59,130,246,.1); color:var(--accent); }
    .mod-nc         { background:rgba(239,68,68,.1); color:var(--danger); }
    .mod-capa       { background:rgba(245,158,11,.1); color:var(--warning); }
    .mod-risk       { background:rgba(249,115,22,.1); color:#fb923c; }
    .mod-audit      { background:rgba(99,102,241,.1); color:var(--accent2); }
    .mod-complaints,.mod-complaint { background:rgba(239,68,68,.08); color:#f87171; }
    .mod-visits,.mod-visit { background:rgba(16,185,129,.1); color:var(--success); }
    .tpl-actions { display:flex; gap:4px; }
    .tpl-name { font-family:'Syne',sans-serif; font-size:13px; font-weight:800; }
    .tpl-event { font-size:11px; color:var(--text2); display:flex; align-items:center; gap:4px; }
    .tpl-subject { font-size:12px; color:var(--text); background:var(--surface2); border-radius:6px; padding:6px 8px; font-family:monospace; }
    .tpl-vars { display:flex; flex-wrap:wrap; gap:4px; }
    .var-chip { font-size:10px; font-family:monospace; background:rgba(99,102,241,.1); color:var(--accent2); border-radius:4px; padding:1px 6px; }
    .tpl-status-row { display:flex; align-items:center; justify-content:space-between; margin-top:4px; }

    /* ── Theme Picker ── */
    .setting-row-full { flex-direction:column; align-items:flex-start; gap:12px; }
    .setting-control-full { width:100%; }
    .theme-picker { display:flex; flex-wrap:wrap; gap:10px; width:100%; }
    .theme-swatch { position:relative; width:88px; border:2px solid var(--border); border-radius:12px; padding:8px; cursor:pointer; background:transparent; transition:border-color .15s,transform .12s,box-shadow .15s; display:flex; flex-direction:column; align-items:center; gap:6px; }
    .theme-swatch:hover { border-color:var(--accent); transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,.3); }
    .theme-swatch-active { border-color:var(--accent) !important; box-shadow:0 0 0 3px rgba(59,130,246,.2); }
    .swatch-surface { width:100%; height:40px; border-radius:7px; display:flex; align-items:flex-end; padding:5px; }
    .swatch-accent { width:100%; height:5px; border-radius:3px; }
    .swatch-label { font-size:10px; font-weight:700; color:var(--text2); white-space:nowrap; }
    .swatch-check { position:absolute; top:5px; right:5px; width:16px; height:16px; background:var(--accent); border-radius:50%; display:grid; place-items:center; font-size:8px; color:#fff; }

    /* ── Settings ── */
    .success-banner { background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3); color:var(--success); padding:10px 16px; border-radius:10px; font-size:13px; display:flex; align-items:center; gap:8px; }
    .settings-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:14px; align-items:start; }
    .settings-section { padding:16px 20px; }
    .sec-title { font-family:'Syne',sans-serif; font-size:13px; font-weight:800; display:flex; align-items:center; gap:7px; margin-bottom:14px; color:var(--text); }
    .setting-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid var(--border); }
    .setting-row:last-child { border-bottom:none; }
    .setting-info { flex:1; min-width:0; }
    .setting-label { font-size:13px; font-weight:600; color:var(--text); }
    .setting-desc { font-size:11px; color:var(--text3); margin-top:2px; }
    .setting-control { flex-shrink:0; }
    .fc-sm { background:var(--surface2); border:1px solid var(--border); border-radius:7px; color:var(--text); font-size:12px; font-family:'DM Sans',sans-serif; padding:6px 10px; outline:none; min-width:150px; }
    .fc-sm:focus { border-color:var(--accent); }
    select.fc-sm option { background:var(--surface); }
    .color-row { display:flex; align-items:center; gap:6px; }
    .color-input { width:36px; height:32px; border:1px solid var(--border); border-radius:6px; padding:2px; cursor:pointer; background:none; }
    .color-text { min-width:100px; }
    /* Toggle switch */
    .toggle { position:relative; display:inline-block; width:40px; height:22px; }
    .toggle input { opacity:0; width:0; height:0; }
    .toggle-slider { position:absolute; cursor:pointer; inset:0; background:var(--surface2); border:1px solid var(--border); border-radius:22px; transition:.2s; }
    .toggle-slider::before { content:''; position:absolute; height:14px; width:14px; left:3px; bottom:3px; background:var(--text3); border-radius:50%; transition:.2s; }
    input:checked + .toggle-slider { background:var(--accent); border-color:var(--accent); }
    input:checked + .toggle-slider::before { transform:translateX(18px); background:#fff; }
    .mt-8 { margin-top:8px; }

    /* ── Activity log ── */
    .action-badge { font-size:11px; font-family:monospace; background:rgba(99,102,241,.1); color:var(--accent2); border-radius:5px; padding:2px 7px; }

    /* ── Modals ── */
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(3px); display:grid; place-items:center; z-index:1000; padding:16px; }
    .modal { background:var(--surface); border:1px solid var(--border); border-radius:16px; width:100%; overflow:hidden; display:flex; flex-direction:column; max-height:90vh; }
    .modal-sm { max-width:380px; } .modal-md { max-width:540px; } .modal-lg { max-width:680px; } .modal-xl { max-width:860px; }
    .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
    .modal-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; display:flex; align-items:center; gap:8px; }
    .modal-close { width:30px; height:30px; border:1px solid var(--border); border-radius:7px; background:none; color:var(--text2); cursor:pointer; font-size:12px; }
    .modal-body { padding:20px; overflow-y:auto; flex:1; }
    .modal-footer { padding:14px 20px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:8px; }
    .modal-info { font-size:13px; color:var(--text2); margin-bottom:14px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .fg { display:flex; flex-direction:column; gap:4px; }
    .fg-2 { grid-column:span 2; }
    .lbl { font-size:11px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:.4px; }
    .fc { background:var(--surface2); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:13px; font-family:'DM Sans',sans-serif; padding:9px 12px; outline:none; width:100%; transition:border-color .13s; }
    .fc:focus { border-color:var(--accent); }
    select.fc option { background:var(--surface); }
    .form-err { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); color:var(--danger); padding:10px 14px; border-radius:8px; font-size:12px; margin-top:10px; }

    /* ── Template editor ── */
    .tpl-editor-layout { display:grid; grid-template-columns:1fr 240px; gap:16px; }
    .tpl-editor-main { display:flex; flex-direction:column; gap:12px; }
    .tpl-body-editor { font-family:monospace; font-size:12px; resize:vertical; min-height:220px; }
    .tpl-vars-panel { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px; height:fit-content; }
    .vars-title { font-family:'Syne',sans-serif; font-size:11px; font-weight:800; color:var(--text2); text-transform:uppercase; letter-spacing:.4px; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
    .var-row { padding:6px 8px; border-radius:6px; cursor:pointer; transition:background .1s; margin-bottom:3px; }
    .var-row:hover { background:var(--border); }
    .var-key { font-family:monospace; font-size:11px; color:var(--accent2); display:block; }
    .var-desc { font-size:10px; color:var(--text3); display:block; }
    .vars-empty { font-size:11px; color:var(--text3); font-style:italic; padding:8px 0; }
    .vars-note { font-size:10px; color:var(--text3); margin-top:10px; padding-top:8px; border-top:1px solid var(--border); display:flex; gap:5px; }

    /* ── Icon buttons ── */
    .icon-btn { width:28px; height:28px; border:1px solid var(--border); border-radius:6px; background:none; color:var(--text2); cursor:pointer; font-size:11px; display:grid; place-items:center; transition:all .13s; }
    .icon-btn:hover { background:var(--surface2); color:var(--text); }
    .icon-btn.sm { width:24px; height:24px; font-size:10px; }
    .icon-btn.del:hover { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.3); color:var(--danger); }

    @media(max-width:900px) {
      .adm-shell { flex-direction:column; }
      .adm-nav { width:100%; position:static; flex-direction:row; flex-wrap:wrap; }
      .tpl-editor-layout { grid-template-columns:1fr; }
      .form-grid { grid-template-columns:1fr; }
      .fg-2 { grid-column:span 1; }
    }
  `]
})
export class SettingsComponent implements OnInit {
  activeTab    = signal<MainTab>('users');
  activeCatType= signal<CatType>('request');

  users        = signal<any[]>([]);  loadingUsers = signal(true);
  userTotal    = signal(0); userPages = signal(1); userPage = signal(1);
  departments  = signal<any[]>([]);  loadingDepts = signal(true);
  roles        = signal<any[]>([]);  loadingRoles = signal(true);  rolesError = signal('');
  allCats: Record<string, any[]> = {};
  loadingCats  = signal(false);
  templates    = signal<any[]>([]);  loadingTpls  = signal(true);
  systemSettings = signal<any[]>([]); loadingSettings = signal(true);
  activityLog  = signal<any[]>([]);  loadingLog   = signal(false);
  savingSettings = signal(false);    settingsSaved  = signal(false);
  settingsMap: Record<string,any> = {};

  // Filters
  userSearch = ''; userRoleFilter = ''; userDeptFilter = '';
  tplModuleFilter = '';

  // Modals
  showUserForm = signal(false); editUserId = signal<number|null>(null);
  showDeptForm = signal(false); editDeptId = signal<number|null>(null);
  showCatForm  = signal(false); editCatId  = signal<number|null>(null);
  showTplForm  = signal(false); editTplId  = signal<number|null>(null);
  showRoleForm = signal(false); editRoleId = signal<number|null>(null);
  showResetPw  = signal(false); resetPwUser= signal<any>(null);
  saving       = signal(false); formError  = signal('');
  apiError     = signal('');
  roleForm: any = {};
  roleFormPerms = signal<string[]>([]);
  permModules = [
    { key:'request',   label:'Requests',   icon:'fas fa-inbox',         actions:['view','create','approve','close'] },
    { key:'nc',        label:'NC',         icon:'fas fa-bug',           actions:['view','create','approve'] },
    { key:'capa',      label:'CAPA',       icon:'fas fa-wrench',        actions:['view','create','approve'] },
    { key:'risk',      label:'Risk',       icon:'fas fa-triangle-exclamation', actions:['view','create','approve'] },
    { key:'document',  label:'Documents',  icon:'fas fa-file-lines',    actions:['view','create','approve'] },
    { key:'audit',     label:'Audits',     icon:'fas fa-clipboard-check', actions:['view','create','approve'] },
    { key:'complaint', label:'Complaints', icon:'fas fa-comment-dots',  actions:['view','create','approve'] },
    { key:'vendor',    label:'Vendors',    icon:'fas fa-handshake',     actions:['view','create','approve'] },
    { key:'visit',     label:'Visits',     icon:'fas fa-building-user', actions:['view','create'] },
  ];
  newPassword  = '';

  userForm: any = {};
  deptForm: any = {};
  catForm: any  = {}; catFormType: CatType = 'request';
  tplForm: any  = {};

  mainTabs = [
    { id:'users' as MainTab,          label:'Users',           icon:'fas fa-users',             badge: () => this.users().length },
    { id:'departments' as MainTab,    label:'Departments',     icon:'fas fa-building',          badge: () => this.departments().length },
    { id:'roles' as MainTab,          label:'Roles',           icon:'fas fa-shield-halved',     badge: () => this.roles().length },
    { id:'categories' as MainTab,     label:'Categories',      icon:'fas fa-tags',              badge: null },
    { id:'email_templates' as MainTab,label:'Email Templates', icon:'fas fa-envelope-open-text',badge: () => this.templates().length },
    { id:'settings' as MainTab,       label:'System Settings', icon:'fas fa-gear',              badge: null },
    { id:'activity' as MainTab,       label:'Activity Log',    icon:'fas fa-list-check',        badge: null },
  ];

  catTypes = [
    { id:'request'   as CatType, label:'Requests',   icon:'fas fa-inbox' },
    { id:'nc'        as CatType, label:'NC',          icon:'fas fa-triangle-exclamation' },
    { id:'risk'      as CatType, label:'Risk',        icon:'fas fa-fire-flame-curved' },
    { id:'document'  as CatType, label:'Documents',   icon:'fas fa-file-alt' },
    { id:'vendor'    as CatType, label:'Vendors',     icon:'fas fa-handshake' },
    { id:'complaint' as CatType, label:'Complaints',  icon:'fas fa-comment-dots' },
  ];

  tplModules = [
    { id:'requests',   label:'Requests',   icon:'fas fa-inbox' },
    { id:'nc',         label:'NC',         icon:'fas fa-triangle-exclamation' },
    { id:'capa',       label:'CAPA',       icon:'fas fa-wrench' },
    { id:'risk',       label:'Risk',       icon:'fas fa-fire-flame-curved' },
    { id:'audit',      label:'Audit',      icon:'fas fa-clipboard-check' },
    { id:'complaints', label:'Complaints', icon:'fas fa-comment-dots' },
    { id:'visits',     label:'Visits',     icon:'fas fa-calendar-check' },
  ];

  // Template variables by module
  private tplVarsMap: Record<string,any[]> = {
    requests:   [{key:'{{ref}}',desc:'Reference'},{key:'{{title}}',desc:'Title'},{key:'{{requester}}',desc:'Requester'},{key:'{{status}}',desc:'Status'},{key:'{{due_date}}',desc:'Due date'},{key:'{{link}}',desc:'Link'}],
    nc:         [{key:'{{ref}}',desc:'Reference'},{key:'{{title}}',desc:'Title'},{key:'{{severity}}',desc:'Severity'},{key:'{{assignee}}',desc:'Assignee'},{key:'{{due_date}}',desc:'Due date'},{key:'{{link}}',desc:'Link'}],
    capa:       [{key:'{{ref}}',desc:'Reference'},{key:'{{title}}',desc:'Title'},{key:'{{assignee}}',desc:'Assignee'},{key:'{{due_date}}',desc:'Due date'},{key:'{{status}}',desc:'Status'},{key:'{{link}}',desc:'Link'}],
    risk:       [{key:'{{ref}}',desc:'Reference'},{key:'{{title}}',desc:'Title'},{key:'{{level}}',desc:'Risk level'},{key:'{{score}}',desc:'Score'},{key:'{{owner}}',desc:'Owner'},{key:'{{review_date}}',desc:'Review date'}],
    audit:      [{key:'{{ref}}',desc:'Reference'},{key:'{{title}}',desc:'Title'},{key:'{{lead_auditor}}',desc:'Lead auditor'},{key:'{{start_date}}',desc:'Start date'},{key:'{{department}}',desc:'Department'}],
    complaints: [{key:'{{ref}}',desc:'Reference'},{key:'{{subject}}',desc:'Subject'},{key:'{{complainant}}',desc:'Complainant'},{key:'{{priority}}',desc:'Priority'},{key:'{{due_date}}',desc:'Due date'}],
    visits:     [{key:'{{ref}}',desc:'Reference'},{key:'{{client}}',desc:'Client'},{key:'{{date}}',desc:'Date'},{key:'{{time}}',desc:'Time'},{key:'{{host}}',desc:'Host'},{key:'{{location}}',desc:'Location'}],
  };

  editTplVars = computed(() => this.tplVarsMap[this.tplForm?.module] || []);

  constructor(private adm: AdminService, public auth: AuthService, public lang: LanguageService, private theme: ThemeService) {}

  themeList = computed(() => this.theme.themes);

  pickTheme(key: string): void {
    this.settingsMap['theme'] = key;
    this.theme.previewTheme(key);
  }

  ngOnInit() {
    this.loadUsers();
    this.loadDepts();
    this.loadRoles();
  }

  switchTab(t: MainTab) {
    this.activeTab.set(t);
    if (t === 'categories' && !Object.keys(this.allCats).length) this.loadAllCats();
    if (t === 'email_templates' && !this.templates().length) this.loadTemplates();
    if (t === 'settings' && !this.systemSettings().length) this.loadSettings();
    if (t === 'activity' && !this.activityLog().length) this.loadLog();
  }

  // ── Users ──
  loadUsers() {
    this.loadingUsers.set(true);
    const p: any = { page: this.userPage(), per_page: 20 };
    if (this.userSearch)     p.search        = this.userSearch;
    if (this.userRoleFilter) p.role_id       = this.userRoleFilter;
    if (this.userDeptFilter) p.department_id = this.userDeptFilter;
    this.adm.users(p).subscribe({
      next: r => { this.users.set(r.data||[]); this.userTotal.set(r.total||0); this.userPages.set(r.last_page||1); this.loadingUsers.set(false); },
      error: (e) => { this.loadingUsers.set(false); this.apiError.set(e?.error?.message || e?.message || 'API error: '+e?.status); }
    });
  }
  openUserForm() { this.editUserId.set(null); this.userForm={name:'',email:'',employee_id:'',role_id:'',department_id:'',phone:'',password:''}; this.formError.set(''); this.showUserForm.set(true); }
  openEditUser(u: any) { this.editUserId.set(u.id); this.userForm={name:u.name,email:u.email,employee_id:u.employee_id||'',role_id:u.role_id,department_id:u.department_id||'',phone:u.phone||''}; this.formError.set(''); this.showUserForm.set(true); }
  submitUser() {
    if (!this.userForm.name || !this.userForm.email) { this.formError.set('Name and email are required.'); return; }
    this.saving.set(true); this.formError.set('');
    const req = this.editUserId() ? this.adm.updateUser(this.editUserId()!, this.userForm) : this.adm.createUser(this.userForm);
    req.subscribe({
      next: () => { this.saving.set(false); this.showUserForm.set(false); this.loadUsers(); },
      error: e => { this.saving.set(false); this.formError.set(e?.error?.message || Object.values(e?.error?.errors||{})?.[0] as string || 'Failed.'); }
    });
  }
  toggleUser(u: any) { this.adm.toggleUser(u.id).subscribe({ next: () => this.loadUsers() }); }
  openResetPw(u: any) { this.resetPwUser.set(u); this.newPassword=''; this.formError.set(''); this.showResetPw.set(true); }
  submitResetPw() {
    if (this.newPassword.length < 8) { this.formError.set('Password must be at least 8 characters.'); return; }
    this.saving.set(true);
    this.adm.resetPassword(this.resetPwUser()!.id, this.newPassword).subscribe({
      next: () => { this.saving.set(false); this.showResetPw.set(false); },
      error: e => { this.saving.set(false); this.formError.set(e?.error?.message||'Failed.'); }
    });
  }

  // ── Departments ──
  loadDepts() {
    this.loadingDepts.set(true);
    this.adm.departments().subscribe({
      next: r => { this.departments.set(r||[]); this.loadingDepts.set(false); },
      error: () => this.loadingDepts.set(false)
    });
  }
  openDeptForm() { this.editDeptId.set(null); this.deptForm={name:'',code:'',description:'',head_user_id:''}; this.formError.set(''); this.showDeptForm.set(true); }
  openEditDept(d: any) { this.editDeptId.set(d.id); this.deptForm={name:d.name,code:d.code||'',description:d.description||'',head_user_id:d.head_user_id||''}; this.formError.set(''); this.showDeptForm.set(true); }
  submitDept() {
    if (!this.deptForm.name) { this.formError.set('Name required.'); return; }
    this.saving.set(true); this.formError.set('');
    const req = this.editDeptId() ? this.adm.updateDept(this.editDeptId()!, this.deptForm) : this.adm.createDept(this.deptForm);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDeptForm.set(false); this.loadDepts(); },
      error: e => { this.saving.set(false); this.formError.set(e?.error?.message||'Failed.'); }
    });
  }
  deleteDept(d: any) {
    if (!confirm(`Delete "${d.name}"?`)) return;
    this.adm.deleteDept(d.id).subscribe({ next: () => this.loadDepts(), error: e => alert(e?.error?.message||'Cannot delete.') });
  }

  // ── Roles ──
  openRoleForm() {
    this.editRoleId.set(null);
    this.roleForm = { name: '', description: '' };
    this.roleFormPerms.set([]);
    this.formError.set('');
    this.showRoleForm.set(true);
  }
  openEditRole(r: any) {
    this.editRoleId.set(r.id);
    this.roleForm = { name: r.name, description: r.description || '' };
    this.roleFormPerms.set(Array.isArray(r.permissions) ? [...r.permissions] : []);
    this.formError.set('');
    this.showRoleForm.set(true);
  }
  hasWildcard(mod: string): boolean {
    return this.roleFormPerms().includes(mod + '.*') || this.roleFormPerms().includes('*');
  }
  toggleWildcard(mod: string, checked: boolean) {
    const wc = mod + '.*';
    const actions = (this.permModules.find(m => m.key === mod)?.actions || []).map(a => mod + '.' + a);
    const filtered = this.roleFormPerms().filter(p => p !== wc && !actions.includes(p));
    this.roleFormPerms.set(checked ? [...filtered, wc] : filtered);
  }
  togglePerm(perm: string, checked: boolean) {
    const mod = perm.split('.')[0];
    const cur = this.roleFormPerms();
    if (cur.includes(mod + '.*') || cur.includes('*')) return;
    if (checked) { if (!cur.includes(perm)) this.roleFormPerms.set([...cur, perm]); }
    else { this.roleFormPerms.set(cur.filter(p => p !== perm)); }
  }
  submitRole() {
    if (!this.roleForm.name?.trim()) { this.formError.set('Role name is required.'); return; }
    this.saving.set(true); this.formError.set('');
    const payload = { ...this.roleForm, permissions: this.roleFormPerms() };
    const req = this.editRoleId()
      ? this.adm.updateRole(this.editRoleId()!, payload)
      : this.adm.createRole(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.showRoleForm.set(false); this.loadRoles(); },
      error: e => { this.saving.set(false); this.formError.set(e?.error?.message || 'Save failed.'); }
    });
  }
  deleteRole(r: any) {
    if ((r.users_count || 0) > 0) { alert('Cannot delete a role with assigned users.'); return; }
    if (!confirm('Delete role "' + r.name + '"?')) return;
    this.adm.deleteRole(r.id).subscribe({ next: () => this.loadRoles(), error: e => alert(e?.error?.message || 'Delete failed.') });
  }

  loadRoles() {
    this.loadingRoles.set(true); this.rolesError.set('');
    this.adm.roles().subscribe({
      next: r => { this.roles.set(Array.isArray(r) ? r : (r?.data || [])); this.loadingRoles.set(false); },
      error: e => { this.rolesError.set(e?.error?.message || e?.message || 'API error'); this.loadingRoles.set(false); }
    });
  }

  // ── Categories ──
  loadAllCats() {
    this.loadingCats.set(true);
    let done = 0;
    const types: CatType[] = ['request','nc','risk','document','vendor','complaint'];
    types.forEach(t => {
      this.adm.categories(t).subscribe({ next: r => { this.allCats[t]=r||[]; if (++done===types.length) this.loadingCats.set(false); } });
    });
  }
  switchCatType(t: CatType) { this.activeCatType.set(t); if (!this.allCats[t]) { this.loadingCats.set(true); this.adm.categories(t).subscribe(r=>{ this.allCats[t]=r||[]; this.loadingCats.set(false); }); } }
  activeCats(): any[] { return this.allCats[this.activeCatType()] || []; }
  activeCatLabel(): string { return this.catTypes.find(c=>c.id===this.activeCatType())?.label || ''; }
  catCount(t: string): number { return this.allCats[t]?.length || 0; }
  openCatForm() { this.editCatId.set(null); this.catFormType=this.activeCatType(); this.catForm={name:'',description:'',sla_hours:'',severity_default:'',code:'',parent_id:''}; this.formError.set(''); this.showCatForm.set(true); }
  openEditCat(c: any) { this.editCatId.set(c.id); this.catFormType=this.activeCatType(); this.catForm={name:c.name,description:c.description||'',sla_hours:c.sla_hours||'',severity_default:c.severity_default||'',code:c.code||'',parent_id:c.parent_id||''}; this.formError.set(''); this.showCatForm.set(true); }
  submitCat() {
    if (!this.catForm.name) { this.formError.set('Name required.'); return; }
    this.saving.set(true); this.formError.set('');
    const req = this.editCatId()
      ? this.adm.updateCategory(this.catFormType, this.editCatId()!, this.catForm)
      : this.adm.createCategory(this.catFormType, this.catForm);
    req.subscribe({
      next: () => { this.saving.set(false); this.showCatForm.set(false); this.adm.categories(this.catFormType).subscribe(r=>this.allCats[this.catFormType]=r||[]); },
      error: e => { this.saving.set(false); this.formError.set(e?.error?.message||'Failed.'); }
    });
  }
  deleteCategory(c: any) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    this.adm.deleteCategory(this.activeCatType(), c.id).subscribe({ next: () => this.adm.categories(this.activeCatType()).subscribe(r=>this.allCats[this.activeCatType()]=r||[]) });
  }

  // ── Email Templates ──
  loadTemplates() {
    this.loadingTpls.set(true);
    const p: any = {};
    if (this.tplModuleFilter) p.module = this.tplModuleFilter;
    this.adm.emailTemplates(p).subscribe({ next: r => { this.templates.set(r||[]); this.loadingTpls.set(false); }, error: () => this.loadingTpls.set(false) });
  }
  openTplForm() { this.editTplId.set(null); this.tplForm={name:'',module:'requests',trigger_event:'',subject:'',body_html:'',is_active:true}; this.formError.set(''); this.showTplForm.set(true); }
  openEditTpl(t: any) { this.editTplId.set(t.id); this.tplForm={...t}; this.formError.set(''); this.showTplForm.set(true); }
  toggleTemplate(t: any) { this.adm.updateTemplate(t.id, {is_active:!t.is_active}).subscribe({next:()=>this.loadTemplates()}); }
  deleteTpl(t: any) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    this.adm.deleteTemplate(t.id).subscribe({next:()=>this.loadTemplates()});
  }
  submitTpl() {
    if (!this.tplForm.name || !this.tplForm.subject || !this.tplForm.body_html) { this.formError.set('Name, subject and body are required.'); return; }
    this.saving.set(true); this.formError.set('');
    const req = this.editTplId() ? this.adm.updateTemplate(this.editTplId()!, this.tplForm) : this.adm.createTemplate(this.tplForm);
    req.subscribe({
      next: () => { this.saving.set(false); this.showTplForm.set(false); this.loadTemplates(); },
      error: e => { this.saving.set(false); this.formError.set(e?.error?.message||'Failed.'); }
    });
  }
  insertVar(key: string) {
    const ta = document.querySelector('.tpl-body-editor') as HTMLTextAreaElement;
    if (!ta) { this.tplForm.body_html += key; return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    this.tplForm.body_html = this.tplForm.body_html.substring(0,s) + key + this.tplForm.body_html.substring(e);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s+key.length; ta.focus(); });
  }

  // ── System Settings ──
  loadSettings() {
    this.loadingSettings.set(true);
    this.adm.settings().subscribe({ next: r => { this.systemSettings.set(r||[]); r.forEach((s:any) => this.settingsMap[s.key] = s.type==='boolean' ? (s.value==='1'||s.value===true) : s.value); this.loadingSettings.set(false); }, error: () => this.loadingSettings.set(false) });
  }
  settingGroups() {
    const groups: Record<string,any> = {};
    this.systemSettings().forEach(s => {
      if (!groups[s.group]) groups[s.group] = { key:s.group, label:this.groupLabel(s.group), items:[] };
      groups[s.group].items.push(s);
    });
    return Object.values(groups);
  }
  saveAllSettings() {
    this.savingSettings.set(true);
    const map: Record<string,string> = {};
    Object.keys(this.settingsMap).forEach(k => { map[k] = this.settingsMap[k]===true?'1':this.settingsMap[k]===false?'0':String(this.settingsMap[k]); });
    this.adm.saveSettings(map).subscribe({
      next: () => {
        this.savingSettings.set(false);
        this.settingsSaved.set(true);
        setTimeout(()=>this.settingsSaved.set(false),3000);
        // Apply theme/colour changes immediately — no page reload needed
        this.theme.applySettings(map);
      },
      error: () => this.savingSettings.set(false)
    });
  }

  // ── Activity Log ──
  loadLog() { this.loadingLog.set(true); this.adm.activityLog().subscribe({next:r=>{this.activityLog.set(r.data||r||[]); this.loadingLog.set(false);},error:()=>this.loadingLog.set(false)}); }

  // ── Live preview helpers ──
  previewColor(key: string, value: string) {
    if (key === 'primary_color') {
      document.documentElement.style.setProperty('--accent', value);
      document.documentElement.style.setProperty('--accent3', value);
    }
  }

  // ── Helpers ──
  prevPage() { this.userPage.update(p => p - 1); this.loadUsers(); }
  nextPage() { this.userPage.update(p => p + 1); this.loadUsers(); }
  formatEvent(e: string): string { return e ? e.replace(/_/g, ' ') : ''; }

  avatarColor(name: string): string {
    const c=['linear-gradient(135deg,#6366f1,#3b82f6)','linear-gradient(135deg,#10b981,#059669)','linear-gradient(135deg,#f59e0b,#d97706)','linear-gradient(135deg,#ef4444,#dc2626)','linear-gradient(135deg,#0ea5e9,#0284c7)'];
    return c[(name?.charCodeAt(0)||0)%c.length];
  }
  sevCls(s: string): string { return ({critical:'badge-red',major:'badge-orange',minor:'badge-yellow'} as any)[s]||'badge-draft'; }
  modIcon(m: string): string {
    const icons: Record<string,string> = {requests:'fas fa-inbox',nc:'fas fa-triangle-exclamation',capa:'fas fa-wrench',risk:'fas fa-fire-flame-curved',audit:'fas fa-clipboard-check',complaints:'fas fa-comment-dots',visits:'fas fa-calendar-check'};
    return icons[m]||'fas fa-envelope';
  }
  groupLabel(g: string): string { return ({general:'General',notifications:'Notifications',security:'Security',appearance:'Appearance'} as any)[g]||g; }
  groupIcon(g: string): string { return ({general:'fas fa-sliders',notifications:'fas fa-bell',security:'fas fa-lock',appearance:'fas fa-palette'} as any)[g]||'fas fa-gear'; }
}
