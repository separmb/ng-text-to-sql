import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LambdaService, ChatResponse } from '../../lambda.service';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  sql?: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent  {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;

  constructor(
    private lambdaService: LambdaService,
    private snackBar: MatSnackBar
  ) {
    // Add welcome message
    this.messages.push({
      id: this.generateId(),
      type: 'assistant',
      content: 'Hello! I can convert your text to SQL, execute the query, and return the results. What would you like to ask?',
      timestamp: new Date()
    });
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: this.currentMessage.trim(),
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const prompt = this.currentMessage.trim();
    this.currentMessage = '';
    this.isLoading = true;

    this.lambdaService.sendChatMessage(prompt).subscribe({
      next: (response: ChatResponse) => {
        this.handleSuccessResponse(response);
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.handleErrorResponse(error.message);
        this.isLoading = false;
      }
    });
  }

  private handleSuccessResponse(response: ChatResponse): void {
    if (response.error) {
      this.handleErrorResponse(response.error);
      return;
    }

    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: response.explanation || 'Here are your results:',
      sql: response.sql,
      timestamp: new Date()
    };

    this.messages.push(assistantMessage);
  }

  private handleErrorResponse(errorMessage: string): void {
    const errorMsg: ChatMessage = {
      id: this.generateId(),
      type: 'error',
      content: `Sorry, I encountered an error: ${errorMessage}`,
      timestamp: new Date()
    };

    this.messages.push(errorMsg);
    this.snackBar.open('Error processing your request', 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Results copied to clipboard!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }).catch(() => {
      this.snackBar.open('Failed to copy to clipboard', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    });
  }

  clearChat(): void {
    this.messages = [{
      id: this.generateId(),
      type: 'assistant',
      content: 'Chat cleared. I can convert your text to SQL, execute the query, and return the results. What would you like to ask?',
      timestamp: new Date()
    }];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}