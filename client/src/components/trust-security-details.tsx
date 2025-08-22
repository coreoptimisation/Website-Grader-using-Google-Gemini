import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, Shield, Lock, Key, Globe } from "lucide-react";

interface TrustSecurityDetailsProps {
  rawData?: any;
}

export default function TrustSecurityDetails({ rawData }: TrustSecurityDetailsProps) {
  if (!rawData) return null;
  
  const { headers = {}, ssl = {}, privacy = {}, security = {} } = rawData;
  
  const renderHeader = (name: string, present: boolean, value?: string, recommendation?: string) => {
    return (
      <div className={`p-3 rounded-lg ${present ? 'bg-green-50' : 'bg-red-50'} border border-slate-200`}>
        <div className="flex items-start gap-2">
          {present ? (
            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 mt-0.5 text-red-600" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{name}</p>
            {value && (
              <p className="text-xs text-slate-600 mt-1 font-mono">{value}</p>
            )}
            {!present && recommendation && (
              <p className="text-xs text-red-600 mt-1">{recommendation}</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderCheck = (label: string, status: boolean | null, details?: string) => {
    const statusConfig = {
      true: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
      false: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
      null: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' }
    };
    
    const config = statusConfig[String(status) as keyof typeof statusConfig] || statusConfig.null;
    const Icon = config.icon;
    
    return (
      <div className={`p-3 rounded-lg ${config.bg} border border-slate-200`}>
        <div className="flex items-start gap-2">
          <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{label}</p>
            {details && (
              <p className="text-xs text-slate-600 mt-1">{details}</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="p-6" data-testid="trust-security-details">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Trust & Security Analysis</h3>
      
      <div className="space-y-4">
        {/* Security Headers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-slate-800">Security Headers</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderHeader(
              'Strict-Transport-Security',
              headers.present?.includes('strict-transport-security'),
              headers.values?.['strict-transport-security'],
              'Add HSTS header to enforce HTTPS'
            )}
            {renderHeader(
              'Content-Security-Policy',
              headers.present?.includes('content-security-policy'),
              headers.values?.['content-security-policy']?.substring(0, 50) + '...',
              'Add CSP to prevent XSS attacks'
            )}
            {renderHeader(
              'X-Content-Type-Options',
              headers.present?.includes('x-content-type-options'),
              headers.values?.['x-content-type-options'],
              'Add to prevent MIME sniffing'
            )}
            {renderHeader(
              'X-Frame-Options',
              headers.present?.includes('x-frame-options'),
              headers.values?.['x-frame-options'],
              'Protect against clickjacking'
            )}
            {renderHeader(
              'Referrer-Policy',
              headers.present?.includes('referrer-policy'),
              headers.values?.['referrer-policy'],
              'Control referrer information'
            )}
            {renderHeader(
              'Permissions-Policy',
              headers.present?.includes('permissions-policy'),
              headers.values?.['permissions-policy']?.substring(0, 50) + '...',
              'Control browser features'
            )}
          </div>
        </div>
        
        {/* SSL/TLS Configuration */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-slate-800">SSL/TLS Configuration</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderCheck(
              'SSL Certificate',
              ssl.valid,
              ssl.issuer ? `Issued by: ${ssl.issuer}` : 'Certificate validation status'
            )}
            {renderCheck(
              'Certificate Expiry',
              ssl.daysUntilExpiry > 30,
              ssl.daysUntilExpiry ? `Expires in ${ssl.daysUntilExpiry} days` : 'Check certificate expiration'
            )}
            {renderCheck(
              'Protocol Version',
              ssl.protocol?.includes('TLS') && !ssl.protocol?.includes('1.0'),
              ssl.protocol || 'TLS version in use'
            )}
            {renderCheck(
              'HTTPS Redirect',
              ssl.httpsRedirect,
              ssl.httpsRedirect ? 'HTTP redirects to HTTPS' : 'No automatic HTTPS redirect'
            )}
          </div>
        </div>
        
        {/* Privacy & Compliance */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-purple-600" />
            <h4 className="font-medium text-slate-800">Privacy & Compliance</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderCheck(
              'Privacy Policy',
              privacy.hasPrivacyPolicy,
              privacy.hasPrivacyPolicy ? 'Privacy policy found' : 'No privacy policy detected'
            )}
            {renderCheck(
              'Cookie Notice',
              privacy.hasCookieNotice,
              privacy.hasCookieNotice ? 'Cookie notice present' : 'No cookie notice found'
            )}
            {renderCheck(
              'Terms of Service',
              privacy.hasTerms,
              privacy.hasTerms ? 'Terms found' : 'Terms of service not found'
            )}
            {renderCheck(
              'GDPR Compliance',
              privacy.gdprCompliant,
              privacy.gdprCompliant ? 'GDPR features detected' : 'No GDPR compliance indicators'
            )}
          </div>
        </div>
        
        {/* Additional Security Checks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-indigo-600" />
            <h4 className="font-medium text-slate-800">Additional Security</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderCheck(
              'Mixed Content',
              !security.hasMixedContent,
              security.hasMixedContent ? 'Mixed HTTP/HTTPS content detected' : 'No mixed content issues'
            )}
            {renderCheck(
              'Subresource Integrity',
              security.hasSRI,
              security.hasSRI ? 'SRI tags found' : 'No SRI protection for external resources'
            )}
            {renderCheck(
              'DNS CAA Record',
              security.hasCAARecord,
              security.hasCAARecord ? 'CAA record configured' : 'No CAA DNS record'
            )}
            {renderCheck(
              'Security.txt',
              security.hasSecurityTxt,
              security.hasSecurityTxt ? 'Security disclosure file present' : 'No security.txt file'
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-600">
          Security assessment based on OWASP guidelines and industry best practices. Implements defense-in-depth strategy.
        </p>
      </div>
    </Card>
  );
}