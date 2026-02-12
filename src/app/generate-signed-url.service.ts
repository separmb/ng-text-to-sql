import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface WebSocketSignedUrlConfig {
  region: string;
  apiId: string;
  stage: string;
  credentials: AWSCredentials;
  expiresInSeconds?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AwsWebsocketService {

  constructor() { }

  /**
   * Generate a signed WebSocket URL for API Gateway
   */
  generateSignedWebSocketUrl(config: WebSocketSignedUrlConfig): string {
    const {
      region,
      apiId,
      stage,
      credentials,
      expiresInSeconds = 3600 // Default 1 hour
    } = config;

    // Step 1: Create timestamp and date
    const now = new Date();
    const amzDate = this.getAmzDate(now);
    const dateStamp = this.getDateStamp(now);

    // Step 2: Define request parameters
    const method = 'GET';
    const service = 'execute-api';
    const host = `${apiId}.execute-api.${region}.amazonaws.com`;
    const canonicalUri = `/${stage}`;
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    // Step 3: Create canonical headers
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    // Step 4: Create canonical query string
    let canonicalQueryString = this.createCanonicalQueryString({
      algorithm,
      credential: `${credentials.accessKeyId}/${credentialScope}`,
      date: amzDate,
      expires: expiresInSeconds.toString(),
      signedHeaders,
      sessionToken: credentials.sessionToken
    });

    // Step 5: Create canonical request
    const payloadHash = CryptoJS.SHA256('').toString(CryptoJS.enc.Hex);
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // Step 6: Create string to sign
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex)
    ].join('\n');

    // Step 7: Calculate signature
    const signingKey = this.getSignatureKey(
      credentials.secretAccessKey,
      dateStamp,
      region,
      service
    );
    const signature = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(CryptoJS.enc.Hex);

    // Step 8: Add signature to query string
    canonicalQueryString += `&X-Amz-Signature=${signature}`;

    // Step 9: Create the final WebSocket URL
    const websocketUrl = `wss://${host}${canonicalUri}?${canonicalQueryString}`;

    return websocketUrl;
  }

  /**
   * Create canonical query string with proper encoding
   */
  private createCanonicalQueryString(params: {
    algorithm: string;
    credential: string;
    date: string;
    expires: string;
    signedHeaders: string;
    sessionToken?: string;
  }): string {
    const queryParams: string[] = [
      `X-Amz-Algorithm=${encodeURIComponent(params.algorithm)}`,
      `X-Amz-Credential=${encodeURIComponent(params.credential)}`,
      `X-Amz-Date=${encodeURIComponent(params.date)}`,
      `X-Amz-Expires=${encodeURIComponent(params.expires)}`,
      `X-Amz-SignedHeaders=${encodeURIComponent(params.signedHeaders)}`
    ];

    // Add session token if present (for temporary credentials)
    if (params.sessionToken) {
      queryParams.push(`X-Amz-Security-Token=${encodeURIComponent(params.sessionToken)}`);
    }

    // Sort query parameters alphabetically
    queryParams.sort();

    return queryParams.join('&');
  }

  /**
   * Generate signing key using AWS Signature Version 4 algorithm
   */
  private getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): CryptoJS.lib.WordArray {
    const kDate = CryptoJS.HmacSHA256(dateStamp, `AWS4${key}`);
    const kRegion = CryptoJS.HmacSHA256(regionName, kDate);
    const kService = CryptoJS.HmacSHA256(serviceName, kRegion);
    const kSigning = CryptoJS.HmacSHA256('aws4_request', kService);
    return kSigning;
  }

  /**
   * Get AMZ date format (YYYYMMDDTHHMMSSZ)
   */
  private getAmzDate(date: Date): string {
    return date.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  }

  /**
   * Get date stamp format (YYYYMMDD)
   */
  private getDateStamp(date: Date): string {
    return date.toISOString().substring(0, 10).replace(/-/g, '');
  }
}

