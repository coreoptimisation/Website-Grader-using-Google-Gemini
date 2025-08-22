import { URL } from 'url';
import * as tls from 'tls';
import * as https from 'https';

export interface SSLCertificate {
  valid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: Date;
  validTo?: Date;
  daysRemaining?: number;
  fingerprint?: string;
  serialNumber?: string;
  signatureAlgorithm?: string;
  subjectAltNames?: string[];
  isExpired?: boolean;
  isSelfSigned?: boolean;
  chainValid?: boolean;
  protocol?: string;
  cipher?: string;
}

export async function analyzeSSLCertificate(url: string): Promise<SSLCertificate | null> {
  try {
    const parsedUrl = new URL(url);
    
    // Only analyze HTTPS URLs
    if (parsedUrl.protocol !== 'https:') {
      return null;
    }

    const hostname = parsedUrl.hostname;
    const port = parseInt(parsedUrl.port) || 443;

    return new Promise((resolve) => {
      const options = {
        host: hostname,
        port: port,
        servername: hostname, // For SNI
        rejectUnauthorized: false, // Allow self-signed certs for analysis
        timeout: 10000
      };

      const socket = tls.connect(options, () => {
        try {
          const cert = socket.getPeerCertificate(true);
          const cipher = socket.getCipher();
          const protocol = socket.getProtocol();
          
          if (!cert || Object.keys(cert).length === 0) {
            socket.end();
            resolve(null);
            return;
          }

          // Parse certificate dates
          const validFrom = cert.valid_from ? new Date(cert.valid_from) : undefined;
          const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined;
          const now = new Date();
          
          // Calculate days remaining
          let daysRemaining = 0;
          let isExpired = false;
          if (validTo) {
            const msRemaining = validTo.getTime() - now.getTime();
            daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
            isExpired = msRemaining < 0;
          }

          // Check if self-signed
          const isSelfSigned = cert.issuer && cert.subject && 
            JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);

          // Extract subject alternative names
          const subjectAltNames: string[] = [];
          if (cert.subjectaltname) {
            const altNames = cert.subjectaltname.split(', ');
            altNames.forEach(name => {
              const parts = name.split(':');
              if (parts.length === 2) {
                subjectAltNames.push(parts[1]);
              }
            });
          }

          // Format issuer and subject
          const formatCertName = (obj: any) => {
            if (!obj) return 'Unknown';
            const parts = [];
            if (obj.CN) parts.push(`CN=${obj.CN}`);
            if (obj.O) parts.push(`O=${obj.O}`);
            if (obj.C) parts.push(`C=${obj.C}`);
            return parts.join(', ') || 'Unknown';
          };

          const certificate: SSLCertificate = {
            valid: socket.authorized || false,
            issuer: formatCertName(cert.issuer),
            subject: formatCertName(cert.subject),
            validFrom,
            validTo,
            daysRemaining,
            fingerprint: cert.fingerprint,
            serialNumber: cert.serialNumber,
            signatureAlgorithm: cert.sigalg,
            subjectAltNames,
            isExpired,
            isSelfSigned,
            chainValid: socket.authorized,
            protocol: protocol || undefined,
            cipher: cipher ? `${cipher.name} ${cipher.version}` : undefined
          };

          socket.end();
          resolve(certificate);
        } catch (error) {
          console.error('Error parsing certificate:', error);
          socket.end();
          resolve(null);
        }
      });

      socket.on('error', (error) => {
        console.error('SSL connection error:', error.message);
        resolve(null);
      });

      socket.on('timeout', () => {
        console.error('SSL connection timeout');
        socket.destroy();
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Failed to analyze SSL certificate:', error);
    return null;
  }
}

export function evaluateSSLSecurity(cert: SSLCertificate | null): {
  score: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  if (!cert) {
    return {
      score: 0,
      issues: ['No SSL certificate found (HTTP only)'],
      recommendations: ['Implement HTTPS with a valid SSL certificate']
    };
  }

  // Check certificate validity
  if (!cert.valid || !cert.chainValid) {
    issues.push('SSL certificate chain is not valid');
    recommendations.push('Fix certificate chain issues or obtain a valid certificate');
    score -= 30;
  }

  // Check if expired
  if (cert.isExpired) {
    issues.push('SSL certificate has expired');
    recommendations.push('Renew the SSL certificate immediately');
    score -= 50;
  } else if (cert.daysRemaining && cert.daysRemaining < 30) {
    issues.push(`SSL certificate expires in ${cert.daysRemaining} days`);
    recommendations.push('Plan to renew certificate before expiration');
    score -= 20;
  }

  // Check if self-signed
  if (cert.isSelfSigned) {
    issues.push('SSL certificate is self-signed');
    recommendations.push('Use a certificate from a trusted Certificate Authority');
    score -= 25;
  }

  // Check protocol version
  if (cert.protocol) {
    if (cert.protocol === 'TLSv1' || cert.protocol === 'TLSv1.1') {
      issues.push(`Using outdated TLS protocol: ${cert.protocol}`);
      recommendations.push('Upgrade to TLS 1.2 or higher');
      score -= 15;
    }
  }

  // Check signature algorithm
  if (cert.signatureAlgorithm) {
    if (cert.signatureAlgorithm.toLowerCase().includes('sha1')) {
      issues.push('Certificate uses SHA-1 signature algorithm');
      recommendations.push('Use SHA-256 or stronger signature algorithm');
      score -= 10;
    }
  }

  return {
    score: Math.max(0, score),
    issues,
    recommendations
  };
}