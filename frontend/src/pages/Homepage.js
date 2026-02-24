import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Homepage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navigation */}
      <nav style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', borderBottom: '1px solid #DFE1E6', padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/recalljpg.jpg" alt="Knowledgr" style={{ height: '28px' }} />
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#0052CC' }}>Knowledgr</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', color: '#6B778C', backgroundColor: 'transparent', border: 'none', fontSize: '15px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>
            Sign in
          </button>
          <button onClick={() => navigate('/signup')} style={{ padding: '9px 20px', backgroundColor: '#0052CC', color: '#ffffff', border: 'none', borderRadius: '20px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0747A6'; e.currentTarget.style.transform = 'scale(1.02)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0052CC'; e.currentTarget.style.transform = 'scale(1)'; }}>
            Get it free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '120px 48px', backgroundColor: '#ffffff', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B778C', marginBottom: '24px' }}>
            TRUSTED BY 300,000+ TEAMS
          </div>
          <h1 style={{ fontSize: '60px', fontWeight: 700, color: '#172B4D', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-0.02em' }}>
            Never lose a decision again
          </h1>
          <p style={{ fontSize: '20px', color: '#6B778C', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 40px' }}>
            Capture conversations, track decisions, and build institutional memory that preserves your team's knowledge forever.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '16px' }}>
            <button onClick={() => navigate('/signup')} style={{ padding: '12px 32px', backgroundColor: '#0052CC', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,82,204,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0747A6'; e.currentTarget.style.transform = 'scale(1.02)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0052CC'; e.currentTarget.style.transform = 'scale(1)'; }}>
              Get started free
            </button>
            <button onClick={() => navigate('/login')} style={{ padding: '12px 32px', backgroundColor: 'transparent', color: '#0052CC', border: '2px solid #0052CC', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DEEBFF'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
              View demo
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#6B778C' }}>Free forever. No credit card needed.</p>
        </div>
        <div style={{ maxWidth: '1100px', margin: '60px auto 0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <img src="/hero.png" alt="Product Dashboard" style={{ width: '100%', display: 'block' }} />
        </div>
      </section>

      {/* Trust Bar */}
      <section style={{ padding: '60px 48px', backgroundColor: '#F4F5F7', textAlign: 'center', overflow: 'hidden' }}>
        <p style={{ fontSize: '14px', color: '#6B778C', marginBottom: '32px', fontWeight: 500 }}>
          Used by 300,000+ companies worldwide
        </p>
        <style>
          {`
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}
        </style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '64px', animation: 'scroll 20s linear infinite', width: 'max-content' }}>
          {[
            'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
            'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/6/6e/Adobe_Corporate_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
            'https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg',
            'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
            'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/6/6e/Adobe_Corporate_logo.svg',
            'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
            'https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg'
          ].map((logo, i) => (
            <img key={i} src={logo} alt="Company logo" style={{ height: '40px', opacity: 0.5, filter: 'grayscale(100%)' }} onError={(e) => e.target.style.display = 'none'} />
          ))}
        </div>
      </section>

      {/* Feature Section 1 */}
      <section style={{ padding: '80px 48px', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0052CC', marginBottom: '12px', letterSpacing: '0.05em' }}>CONVERSATIONS</div>
            <h2 style={{ fontSize: '40px', fontWeight: 700, color: '#172B4D', marginBottom: '20px', lineHeight: '1.2' }}>
              Capture every discussion with full context
            </h2>
            <p style={{ fontSize: '18px', color: '#6B778C', lineHeight: '1.6', marginBottom: '24px' }}>
              Knowledgr preserves team discussions with complete context, making it easy to reference decisions and reasoning months later.
            </p>
            <a href="#" style={{ color: '#0052CC', fontSize: '16px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Learn more <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
            </a>
          </div>
          <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ backgroundColor: '#F4F5F7', padding: '40px', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6B778C' }}>Feature Screenshot</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2 */}
      <section style={{ padding: '80px 48px', backgroundColor: '#F4F5F7' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '40px', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6B778C' }}>Feature Screenshot</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0052CC', marginBottom: '12px', letterSpacing: '0.05em' }}>DECISIONS</div>
            <h2 style={{ fontSize: '40px', fontWeight: 700, color: '#172B4D', marginBottom: '20px', lineHeight: '1.2' }}>
              Track decisions with confidence
            </h2>
            <p style={{ fontSize: '18px', color: '#6B778C', lineHeight: '1.6', marginBottom: '24px' }}>
              Formalize decisions with clear rationale and track implementation progress. Build team alignment with confidence voting and transparent decision-making.
            </p>
            <a href="#" style={{ color: '#0052CC', fontSize: '16px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Learn more <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
            </a>
          </div>
        </div>
      </section>

      {/* Product Cards */}
      <section style={{ padding: '80px 48px', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 700, color: '#172B4D', marginBottom: '16px' }}>Everything you need</h2>
            <p style={{ fontSize: '18px', color: '#6B778C', maxWidth: '600px', margin: '0 auto' }}>
              Powerful features to capture, organize, and leverage organizational knowledge
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', backgroundColor: '#DFE1E6' }}>
            {[
              { name: 'Knowledge Search', desc: 'Semantic search across all content' },
              { name: 'Sprint Management', desc: 'Link decisions to execution' },
              { name: 'Team Collaboration', desc: 'Real-time discussions and voting' },
              { name: 'Analytics', desc: 'Track decision quality over time' },
              { name: 'Integrations', desc: 'Connect with Slack, Jira, GitHub' },
              { name: 'API Access', desc: 'Build custom workflows' }
            ].map((product) => (
              <div key={product.name} style={{ padding: '40px 32px', backgroundColor: '#ffffff', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F4F5F7'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#172B4D', marginBottom: '12px' }}>{product.name}</h3>
                <p style={{ fontSize: '15px', color: '#6B778C', lineHeight: '1.6' }}>{product.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '100px 48px', backgroundColor: '#F4F5F7', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 700, color: '#172B4D', marginBottom: '20px', lineHeight: '1.2' }}>
            Ready to transform your team's memory?
          </h2>
          <p style={{ fontSize: '20px', color: '#6B778C', marginBottom: '40px' }}>
            Join 300,000+ teams building better organizational knowledge
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/signup')} style={{ padding: '14px 32px', backgroundColor: '#0052CC', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0747A6'; e.currentTarget.style.transform = 'scale(1.02)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0052CC'; e.currentTarget.style.transform = 'scale(1)'; }}>
              Start free trial
            </button>
            <button style={{ padding: '14px 32px', backgroundColor: 'transparent', color: '#0052CC', border: '2px solid #0052CC', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DEEBFF'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
              Contact sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 48px 40px', backgroundColor: '#ffffff', borderTop: '1px solid #DFE1E6' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '40px', marginBottom: '40px' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '16px' }}>Products</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Conversations</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Decisions</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Knowledge</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '16px' }}>Solutions</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>For Teams</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>For Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '16px' }}>Resources</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Documentation</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Blog</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Support</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '16px' }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>About</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Careers</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '16px' }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Privacy</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Terms</a></li>
                <li><a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'} onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}>Security</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #DFE1E6', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6B778C' }}>&copy; 2026 Knowledgr. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none' }}>Twitter</a>
              <a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none' }}>LinkedIn</a>
              <a href="#" style={{ fontSize: '14px', color: '#6B778C', textDecoration: 'none' }}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
