import React from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function Security() {
  const { darkMode } = useTheme();

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold ${textPrimary} mb-3`}>Security & Compliance</h1>
          <p className={`text-lg ${textSecondary}`}>Enterprise-grade security you can trust</p>
        </div>

        {/* Security Badges */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: '🔒', title: 'SOC 2 Type II', desc: 'Certified' },
            { icon: '🛡️', title: 'GDPR', desc: 'Compliant' },
            { icon: '⚡', title: '99.9%', desc: 'Uptime SLA' },
            { icon: '🔐', title: 'E2E', desc: 'Encrypted' }
          ].map((item, i) => (
            <div key={i} className={`${bgSecondary} border ${borderColor} rounded-xl p-6 text-center`}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className={`text-lg font-bold ${textPrimary} mb-1`}>{item.title}</h3>
              <p className={`text-sm ${textSecondary}`}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Security Features */}
        <div className={`${bgSecondary} border ${borderColor} rounded-2xl p-8 mb-8`}>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Security Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'End-to-End Encryption', desc: 'All data encrypted in transit (TLS 1.3) and at rest (AES-256)' },
              { title: 'Regular Security Audits', desc: 'Quarterly penetration testing and vulnerability assessments' },
              { title: 'Daily Backups', desc: 'Automated daily backups with 30-day retention and point-in-time recovery' },
              { title: 'Global CDN', desc: 'Content delivered via CloudFront for fast, secure access worldwide' },
              { title: 'Access Controls', desc: 'Role-based permissions with SSO/SAML support (Enterprise)' },
              { title: 'Audit Logs', desc: 'Complete activity logging for compliance and security monitoring' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-500 text-xl">✓</span>
                </div>
                <div>
                  <h3 className={`font-semibold ${textPrimary} mb-1`}>{item.title}</h3>
                  <p className={`text-sm ${textSecondary}`}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance */}
        <div className={`${bgSecondary} border ${borderColor} rounded-2xl p-8 mb-8`}>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Compliance Certifications</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>SOC 2 Type II</h3>
              <p className={`${textSecondary} mb-2`}>
                Recall has successfully completed SOC 2 Type II audit, demonstrating our commitment to security, availability, and confidentiality.
              </p>
              <a href="#" className="text-blue-500 hover:underline text-sm">View Certificate →</a>
            </div>

            <div>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>GDPR Compliance</h3>
              <p className={`${textSecondary} mb-2`}>
                We are fully compliant with GDPR requirements, including data portability, right to erasure, and privacy by design.
              </p>
              <a href="#" className="text-blue-500 hover:underline text-sm">Read Privacy Policy →</a>
            </div>

            <div>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>ISO 27001</h3>
              <p className={`${textSecondary}`}>
                Our information security management system follows ISO 27001 standards (certification in progress).
              </p>
            </div>
          </div>
        </div>

        {/* Infrastructure */}
        <div className={`${bgSecondary} border ${borderColor} rounded-2xl p-8 mb-8`}>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Infrastructure & Reliability</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className={`font-semibold ${textPrimary} mb-2`}>99.9% Uptime SLA</h3>
              <p className={`text-sm ${textSecondary}`}>
                Guaranteed uptime with automatic failover and redundancy across multiple availability zones.
              </p>
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary} mb-2`}>Daily Backups</h3>
              <p className={`text-sm ${textSecondary}`}>
                Automated backups every 24 hours with 30-day retention and instant recovery options.
              </p>
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary} mb-2`}>Global CDN</h3>
              <p className={`text-sm ${textSecondary}`}>
                AWS CloudFront CDN with 200+ edge locations for fast content delivery worldwide.
              </p>
            </div>
          </div>
        </div>

        {/* Data Protection */}
        <div className={`${bgSecondary} border ${borderColor} rounded-2xl p-8`}>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Data Protection</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className={`font-semibold ${textPrimary}`}>Your Data is Yours</h4>
                <p className={`text-sm ${textSecondary}`}>Export all your data anytime in standard formats (JSON, CSV, PDF)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className={`font-semibold ${textPrimary}`}>No Vendor Lock-in</h4>
                <p className={`text-sm ${textSecondary}`}>Cancel anytime and take your data with you</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className={`font-semibold ${textPrimary}`}>Right to Deletion</h4>
                <p className={`text-sm ${textSecondary}`}>Request complete data deletion at any time</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className={`font-semibold ${textPrimary}`}>Data Residency</h4>
                <p className={`text-sm ${textSecondary}`}>Choose where your data is stored (Enterprise plan)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center mt-12">
          <p className={`${textSecondary} mb-4`}>Questions about security?</p>
          <a href="mailto:security@recall.app" className="text-blue-500 hover:underline font-medium">
            Contact our security team →
          </a>
        </div>
      </div>
    </div>
  );
}
