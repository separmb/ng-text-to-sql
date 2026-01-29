import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface ChatRequest {
  prompt: string;
  timestamp?: string;
}

export interface ChatResponse {
  sql?: string;
  explanation?: string;
  error?: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LambdaService {
  private readonly lambdaUrl = 'https://bmxes1ep8a.execute-api.us-east-1.amazonaws.com/prod/api/text2sql'; 
  private readonly requestTimeout = 30000; // 30 seconds

  constructor(private http: HttpClient) {}

  sendChatMessage(prompt: string): Observable<ChatResponse> {
    const request: ChatRequest = {
      prompt: prompt.trim(),
      timestamp: new Date().toISOString()
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<ChatResponse>(this.lambdaUrl, request, { headers })
      .pipe(
        timeout(this.requestTimeout),
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.name === 'TimeoutError') {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}