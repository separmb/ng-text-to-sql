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
import { AwsWebsocketService, AWSCredentials, WebSocketSignedUrlConfig } from '../../generate-signed-url.service';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  result?: string;
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
export class ChatComponent {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;
  //private readonly webSocketUrl = 'wss://wei9prw2f2.execute-api.us-east-1.amazonaws.com/dev?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAYSQVGRE2F5C4AK46%2F20260212%2Fus-east-1%2Fexecute-api%2Faws4_request&X-Amz-Date=20260212T141246Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEA4aCXVzLWVhc3QtMSJHMEUCIQCZkNnRm%2FSJJnzFJvIrybbcxkwuADNH18ibl4dehMILxgIgRJNUNsDL6TZz4ySMRXJMzmQIt%2Fn%2BeKcrVC5nZFtrhLoqmgMI1%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw1ODk1Mjg3Mjk5MDgiDJVfNilbfwqjNDNLqiruAv2X8Ew1T5w1CX3BzAvC3DITPYl4%2BKBYbvZ4w6XRnSfrhnfNt0fF2UcAWS%2FMAKBzyXInIafprd0kuIghP%2FzIcrwkB5F9sstwINNEoiMPf3rkKRJPjidOnjtvVDte9tOsgTvQpmdrxwpRH7GJnw1HPqupdgvUOYhzaOVFzcpzw8H79IBDI0RGl47cjPrk%2B7D%2BaDyMVwZjsQICyp0WYe95cdojeVcP%2FHvqfjaNSbg3Fd%2BYX0ojdcBUk%2BcqleF1H%2F%2Bzj8oK%2BoY5viYR3QkjaQdd2lkADrXNUU%2FZVF6FSKo%2BZIux5BMei2Xr%2FXmjbs2n3VoJpnxSmSL1ya0PsApwEVXlor4OcVx6g2FxFiQLD9mFNXwRtisEgrvy3xRWUcuFQxoOv7LGHUG0%2B%2BFgbT%2BL648sJIGd1iOhcDWtYiG1i2dsi6UVF3yHcRI2tmnKn8lP2McmRm8NnKUEBS1xRgM7tK7FDaaUbapQEHdMf5Pw6OuxXTDCu7fMBjqkAUlt2BHg5TS67dZT19h2KehaRiNTJxXZrJ89%2Brj%2FiXjJLrJFaBlk6zhbQtbYKyJGi1JRUHZi1S0BPeGMJbe4U7LemjiXbO2SrOss4jgrbBF28J5TIIgMImK52JruD%2BMe0rSBGQTkyW6RBAsOxPej25iRPOUlBswDJAWZd7MA9PkExUisbKKiSHVuKjWsbMuEMF7RM8s3YitIxfciJul7a9LOn3Qq&X-Amz-Signature=d5af2d21daa479429dbd6d9a2b6535131ee14b1552dd63341cfdf06319d3d15c'; 
  private socket!: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(
    private snackBar: MatSnackBar,
    private signedUrlService: AwsWebsocketService
  ) {
    // Add welcome message
    this.messages.push({
      id: this.generateId(),
      type: 'assistant',
      content: 'Hello! I can convert your text to SQL, execute the query, and return the results. What would you like to ask?',
      timestamp: new Date()
    });
    this.connect();
  }

    /** Connect to WebSocket server */
  private connect(): void {
    try {
      const credentials: AWSCredentials = {
        accessKeyId: (window as any).appConfig.AWS_ACCESS_KEY_ID,     
        secretAccessKey:(window as any).appConfig.AWS_SECRET_ACCESS_KEY,
        sessionToken: (window as any).appConfig.AWS_SESSION_TOKEN
      }

      const urlConfig: WebSocketSignedUrlConfig = {
        region: 'us-east-1',
        stage: 'dev',
        apiId: 'wei9prw2f2',
        credentials,
        expiresInSeconds: 43200 // 12 hours
      }

      const signedUrl = this.signedUrlService.generateSignedWebSocketUrl(urlConfig);
      console.log(signedUrl)
      this.socket = new WebSocket(signedUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0; // Reset attempts on success
      };

      this.socket.onmessage = (event) => {
        this.handleSuccessResponse(event);
      };

      this.socket.onclose = () => {
        console.warn('WebSocket closed. Attempting to reconnect...');
        this.tryReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleErrorResponse(error);
        this.socket.close(); // Force close to trigger reconnect
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      this.tryReconnect();
    }
  }
  /** Attempt to reconnect with exponential backoff */
  private tryReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30s
      this.reconnectAttempts++;
      console.log(`Reconnecting in ${delay / 1000}s...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnect attempts reached. Giving up.');
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

    // ignore websocket timeouts
    if (responseObj.message === undefined) {
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        content: '',
        result: responseObj.result,
        timestamp: new Date()
      };

      this.messages.push(assistantMessage);
      this.isLoading = false;
    } 
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