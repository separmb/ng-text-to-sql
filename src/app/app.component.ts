import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule, MatIconModule],
  template: `
    <mat-toolbar color="primary" class="app-header">
      <mat-icon class="header-icon">storage</mat-icon>
      <span class="app-title">Text2SQL Assistant</span>
    </mat-toolbar>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-icon {
      margin-right: 12px;
    }

    .app-title {
      font-weight: 500;
      font-size: 1.25rem;
    }

    .main-content {
      height: calc(100vh - 64px);
      overflow: hidden;
    }
  `]
})
export class AppComponent {
  title = 'ng-text-to-sql';
}