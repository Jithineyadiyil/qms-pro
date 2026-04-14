import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  constructor(private theme: ThemeService, private auth: AuthService) {}

  ngOnInit(): void {
    // Only load theme if user already has a valid stored session (not on login page)
    if (this.auth.isAuthenticated()) {
      this.theme.loadAndApply();
    }
    // After every login, reload and apply theme
    this.auth.loginSuccess$.subscribe(() => this.theme.loadAndApply());
  }
}
