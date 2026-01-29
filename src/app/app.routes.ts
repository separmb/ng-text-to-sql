import { Routes } from '@angular/router';
import { ChatComponent } from './component/chat/chat.component';

export const routes: Routes = [
  { path: '', component: ChatComponent },
  { path: '**', redirectTo: '' }
];