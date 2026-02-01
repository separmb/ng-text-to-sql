import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
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
export class ChatComponent implements OnInit  {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;
  private readonly webSocketUrl = 'wss://as1ulfbcx3.execute-api.us-east-1.amazonaws.com/dev/'; 
  private socket!: WebSocket;

  constructor(
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

  ngOnInit(): void {
    // deal with websocket setup
    this.socket = new WebSocket(this.webSocketUrl);
    this.socket.onopen = () => console.log('WebSocket connection established.');
    this.socket.onmessage = (event) =>  {
      this.handleSuccessResponse(event);
    } ;
    this.socket.onclose = () => console.log('WebSocket connection closed.');
    this.socket.onerror = (error) => { 
      this.handleErrorResponse(error);
    }
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
    let prompt = this.currentMessage.trim();
    this.currentMessage = '';
    this.isLoading = true;
    
    this.sendChatMessage(prompt);
  }

  private handleSuccessResponse(response: MessageEvent): void {
    console.log("Response is: " + response.data); 

    let responseObj = JSON.parse(response.data);

    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: 'Here are your results:',
      sql: responseObj.sql,
      timestamp: new Date()
    };

    this.messages.push(assistantMessage);
    this.isLoading = false;
  }

  private handleErrorResponse(error: Event): void {
    const errorMsg: ChatMessage = {
      id: this.generateId(),
      type: 'error',
      content: `Sorry, I encountered an error: ${error}`,
      timestamp: new Date()
    };

    this.messages.push(errorMsg);
    this.snackBar.open('Error processing your request', 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
    this.isLoading = false;
  }

  sendChatMessage(prompt: string) {
    let jsonMessage = {
      prompt: prompt
    }

    if (this.socket.readyState === WebSocket.OPEN) {
     this.socket.send(JSON.stringify(jsonMessage));
    } else {
      console.warn('WebSocket is not open.');
    }
  }

  closeConnection(): void {
    this.socket.close();
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