import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, GlassButton } from '../components/Buttons';
import './Homepage.css';

export default function Homepage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen homepage-gradient">
      {/* Navigation */}
      <nav className="border-b border-amber-700 px-6 lg:px-12 py-4 flex justify-between items-center bg-stone-950 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/recalljpg.jpg" alt="RECALL" className="h-10" />
          <span className="text-2xl font-bold text-white">RECALL</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/login')} className="px-6 py-2 text-amber-100 hover:text-white font-medium">
            Sign In
          </button>
          <button onClick={() => navigate('/signup')} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-full font-semibold transition">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-12 py-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Organizational Memory & Decision Management
            </h1>
            <p className="text-xl text-amber-100 mb-8 max-w-2xl">
              Retain conversations. Establish decisions. Capture context. Link knowledge. Learn from experience.
            </p>
            <div className="flex gap-4">
              <button onClick={() => navigate('/signup')} className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-full font-semibold transition">
                Get Started Free
              </button>
              <button onClick={() => navigate('/login')} className="px-8 py-3 border border-amber-600 text-white rounded-full font-semibold hover:bg-amber-800 transition">
                Learn More
              </button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl border border-amber-600 h-96 image-card-glow">
            <img src="/hero.png" alt="Dashboard Preview" className="w-full h-full object-contain" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-20 bg-stone-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-4">Powerful features</h2>
            <p className="text-xl text-amber-100 max-w-2xl mx-auto">Everything you need to capture, organize, and leverage organizational knowledge</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {[
              { title: 'Conversations', desc: 'Capture team discussions with full context and reasoning', features: ['Full context preservation', 'Emotional tracking', 'Team mentions'] },
              { title: 'Decisions', desc: 'Formalize decisions with rationale and track implementation', features: ['Decision rationale', 'Implementation tracking', 'Confidence voting'] },
              { title: 'Knowledge Search', desc: 'Semantic search across all organizational content', features: ['Semantic search', 'Trending topics', 'FAQ generation'] },
              { title: 'Action Items', desc: 'Track and execute decisions through actionable tasks', features: ['Task assignment', 'Due dates', 'Status tracking'] }
            ].map((feature, i) => (
              <div key={i} className="feature-card rounded-2xl p-10 border border-amber-700 hover:border-amber-600 transition duration-300 h-full flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white mb-6 flex-grow">{feature.desc}</p>
                <ul className="space-y-2">
                  {feature.features.map((f, j) => (
                    <li key={j} className="text-sm text-white flex items-center gap-2">
                      <span className="text-amber-300">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 lg:px-12 py-20 bg-stone-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-16">Why RECALL?</h2>
          <div className="space-y-12">
            {[
              { title: 'Preserve Institutional Memory', desc: 'Never lose the reasoning behind decisions. Enable team members to understand context even after team changes.' },
              { title: 'Make Better Decisions', desc: 'Learn from past experiences. Avoid repeating mistakes. Make informed decisions based on organizational history.' },
              { title: 'Accelerate Execution', desc: 'Link decisions to sprints and action items. Ensure accountability and track implementation progress.' },
              { title: 'Measure Consensus', desc: 'Use reactions and voting to gauge team alignment. Surface concerns early and build shared understanding.' }
            ].map((benefit, i) => (
              <div key={i}>
                <h3 className="text-2xl font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-lg text-amber-100">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 lg:px-12 py-20 bg-stone-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-4">Simple pricing</h2>
            <p className="text-xl text-amber-100 max-w-2xl mx-auto">Choose the plan that fits your team</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Starter', price: '$29', period: '/month', desc: 'Perfect for small teams', features: ['Up to 10 team members', 'Basic conversations', 'Decision tracking', 'Search'] },
              { name: 'Professional', price: '$99', period: '/month', desc: 'For growing organizations', features: ['Up to 50 team members', 'All Starter features', 'Sprint management', 'Advanced analytics', 'API access'], popular: true },
              { name: 'Enterprise', price: 'Custom', period: '', desc: 'For large organizations', features: ['Unlimited team members', 'All Professional features', 'Custom integrations', 'Dedicated support', 'SSO'] }
            ].map((plan, i) => (
              <div key={i} className={`feature-card rounded-2xl p-10 border transition duration-300 h-full flex flex-col ${plan.popular ? 'border-amber-600 ring-2 ring-amber-600' : 'border-amber-700 hover:border-amber-600'}`}>
                {plan.popular && <div className="text-xs font-bold mb-4 text-amber-300 uppercase tracking-wider">Most Popular</div>}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white mb-6 text-sm">{plan.desc}</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-amber-300 text-sm">{plan.period}</span>
                </div>
                <button className="w-full mb-8 px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-full font-semibold transition">
                  Get Started
                </button>
                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="text-sm text-white flex items-center gap-2">
                      <span className="text-amber-300">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 lg:px-12 py-20 bg-stone-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-4">Frequently asked questions</h2>
            <p className="text-xl text-amber-100 max-w-2xl mx-auto">Find answers to common questions about RECALL</p>
          </div>
          <div className="space-y-4">
            {[
              { q: 'How does RECALL help preserve institutional memory?', a: 'RECALL captures conversations, decisions, and context automatically, making it easy to search and reference past discussions even after team changes.' },
              { q: 'Can I integrate RECALL with my existing tools?', a: 'Yes, RECALL integrates with Slack, GitHub, Jira, and other popular tools. Enterprise plans include custom integrations.' },
              { q: 'Is my data secure?', a: 'We use enterprise-grade encryption, regular security audits, and comply with SOC 2 and GDPR standards.' },
              { q: 'How do I get started?', a: 'Sign up for free, create your organization, and invite your team. You can start capturing conversations immediately.' },
              { q: 'What happens to my data if I cancel?', a: 'You can export all your data at any time. We provide a 30-day grace period to download everything.' }
            ].map((faq, i) => (
              <details key={i} className="feature-card rounded-2xl p-6 cursor-pointer group border border-amber-700 hover:border-amber-600 transition">
                <summary className="font-semibold text-white flex justify-between items-center">
                  {faq.q}
                  <span className="text-amber-300 group-open:rotate-180 transition">▼</span>
                </summary>
                <p className="text-white mt-4">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-20 bg-stone-950 text-white text-center shadow-lg rounded-2xl mx-6 lg:mx-12 my-8">
        <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
        <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
          Start capturing conversations and building organizational memory today.
        </p>
        <button onClick={() => navigate('/signup')} className="px-10 py-4 rounded-full font-semibold text-lg bg-white text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:shadow-lg">
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-700 px-6 lg:px-12 py-12 bg-stone-950 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 mb-8">
        <div className="flex items-center gap-3">
          <img src="/recalljpg.jpg" alt="RECALL" className="h-12" />
          <div>
            <h4 className="font-bold text-white">RECALL</h4>
            <p className="text-amber-300 text-xs">Organizational memory & decision management</p>
          </div>
        </div>
          <div>
            <h4 className="font-bold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-amber-300 text-sm">
              <li><a href="#" className="hover:text-white">Features</a></li>
              <li><a href="#" className="hover:text-white">Pricing</a></li>
              <li><a href="#" className="hover:text-white">Security</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-amber-300 text-sm">
              <li><a href="#" className="hover:text-white">About</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-amber-300 text-sm">
              <li><a href="#" className="hover:text-white">Privacy</a></li>
              <li><a href="#" className="hover:text-white">Terms</a></li>
              <li><a href="#" className="hover:text-white">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-amber-700 pt-8 text-center text-amber-300 text-sm">
          <p>&copy; 2026 RECALL. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
