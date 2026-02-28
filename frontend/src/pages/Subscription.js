import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function Subscription() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [subRes, plansRes, invRes, conversionRes] = await Promise.all([
        fetch(`${API_BASE}/api/organizations/subscription/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/organizations/plans/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/organizations/invoices/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/organizations/subscription/conversion/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (subRes.ok) {
        const subData = await subRes.json();
        console.log('Subscription data:', subData);
        setSubscription(subData);
      }
      setPlans(await plansRes.json());
      setInvoices(await invRes.json());
      if (conversionRes.ok) {
        setConversion(await conversionRes.json());
      } else {
        setConversion(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    const token = localStorage.getItem('token');
    try {
      if (plan.name === 'free') {
        const downgradeRes = await fetch(`${API_BASE}/api/organizations/subscription/upgrade/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            plan_id: plan.id
          })
        });
        const downgradeData = await downgradeRes.json();
        if (!downgradeRes.ok) {
          alert('Error: ' + (downgradeData.error || 'Failed to switch plan'));
          return;
        }
        await fetchData();
        return;
      }

      const res = await fetch(`${API_BASE}/api/organizations/stripe/checkout/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: plan.name,
          success_url: `${window.location.origin}/subscription?success=true`,
          cancel_url: `${window.location.origin}/subscription?canceled=true`
        })
      });
      const data = await res.json();
      console.log('Stripe response:', data);
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        alert('Error: ' + (data.error || 'Failed to create checkout session'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating checkout session');
    }
  };

  if (loading) return <div className={`min-h-screen ${bgPrimary} p-8`}><div className={textPrimary}>Loading...</div></div>;
  if (!subscription) return <div className={`min-h-screen ${bgPrimary} p-8`}><div className={textPrimary}>No subscription found</div></div>;

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold ${textPrimary} mb-3`}>Subscription & Billing</h1>
          <p className={`text-lg ${textSecondary}`}>Choose the perfect plan for your team</p>
        </div>

        {conversion && (
          <div className={`${bgSecondary} border ${borderColor} rounded-2xl p-6 mb-8`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={`text-xs uppercase tracking-wider font-semibold ${textSecondary}`}>Launch Readiness</p>
                <h2 className={`text-xl font-bold ${textPrimary} mt-1`}>
                  {conversion.phase === 'trial'
                    ? `Trial in progress: ${conversion.trial?.days_left || 0} day(s) left`
                    : conversion.phase === 'free_or_starter'
                      ? 'Free/Starter plan in use'
                      : 'Paid plan active'}
                </h2>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  Activation milestones: {conversion.activation?.completed_milestones || 0} / {conversion.activation?.total_milestones || 5}
                </p>
              </div>
              <button
                onClick={() => navigate('/projects')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
              >
                Continue setup
              </button>
            </div>
            {(conversion.nudges || []).length > 0 && (
              <ul className={`mt-4 space-y-2 text-sm ${textSecondary}`}>
                {(conversion.nudges || []).map((nudge, idx) => (
                  <li key={`${nudge}-${idx}`}>- {nudge}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Current Plan - Modern Card */}
        {subscription && (
          <div className={`${bgSecondary} border ${borderColor} rounded-2xl p-8 mb-12 shadow-lg`}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className={`text-2xl font-bold ${textPrimary}`}>{subscription.plan.display_name}</h2>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                    subscription.status === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                    subscription.status === 'trial' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                    'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                  }`}>
                    {subscription.status === 'trial' ? `Trial - ${Math.ceil((new Date(subscription.trial_end) - new Date()) / (1000 * 60 * 60 * 24))} days left` : subscription.status.toUpperCase()}
                  </span>
                </div>
                <p className={`text-xl ${textSecondary}`}>${subscription.plan.price_per_user} per user/month</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-gradient-to-br from-stone-800 to-stone-900' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} border ${borderColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm ${textSecondary}`}>Team Members</p>
                    <p className={`text-3xl font-bold ${textPrimary}`}>
                      {subscription.user_count}
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${textSecondary}`}>of {subscription.plan.max_users || 'unlimited'} members</p>
              </div>

              <div className={`p-6 rounded-xl ${darkMode ? 'bg-gradient-to-br from-stone-800 to-stone-900' : 'bg-gradient-to-br from-purple-50 to-pink-50'} border ${borderColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm ${textSecondary}`}>Storage</p>
                    <p className={`text-3xl font-bold ${textPrimary}`}>
                      {(subscription.storage_used_mb / 1024).toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={`text-sm ${textSecondary}`}>of {subscription.plan.storage_gb} GB</p>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-stone-700' : 'bg-gray-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        subscription.storage_percentage > 90 ? 'bg-gradient-to-r from-red-500 to-pink-500' : 
                        subscription.storage_percentage > 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                        'bg-gradient-to-r from-blue-500 to-cyan-500'
                      }`}
                      style={{ width: `${Math.min(subscription.storage_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-xl ${darkMode ? 'bg-gradient-to-br from-stone-800 to-stone-900' : 'bg-gradient-to-br from-green-50 to-emerald-50'} border ${borderColor}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm ${textSecondary}`}>Monthly Cost</p>
                    <p className={`text-3xl font-bold ${textPrimary}`}>
                      ${(parseFloat(subscription.plan.price_per_user) * subscription.user_count).toFixed(0)}
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${textSecondary}`}>billed monthly</p>
              </div>
            </div>
          </div>
        )}

        {/* Plans - Modern Cards */}
        <div className="mb-12">
          <h2 className={`text-2xl font-bold ${textPrimary} mb-8 text-center`}>Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => {
              const isCurrentPlan = subscription?.plan.name === plan.name;
              const isProfessional = plan.name === 'professional';
              return (
                <div key={plan.id} className={`relative ${bgSecondary} rounded-2xl p-8 transition-all duration-300 ${
                  isProfessional ? 'border-2 border-blue-500 shadow-2xl scale-105 -mt-4' : `border ${borderColor} hover:shadow-xl hover:scale-105`
                }`}>
                  {isProfessional && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold rounded-full shadow-lg">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-6 right-6">
                      <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full">
                        CURRENT
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className={`text-2xl font-bold ${textPrimary} mb-2`}>{plan.display_name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-5xl font-bold ${textPrimary}`}>${plan.price_per_user}</span>
                      <span className={`${textSecondary} text-lg`}>/user/mo</span>
                    </div>
                  </div>

                  <ul className={`space-y-4 mb-8 ${textSecondary}`}>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                      <span>{plan.max_users ? `Up to ${plan.max_users} team members` : 'Unlimited team members'}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                      <span>{plan.storage_gb}GB cloud storage</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                      <span>{plan.is_free ? 'Core features for small teams' : 'All core features'}</span>
                    </li>
                    {plan.features_included?.includes('decision_twin') && (
                      <>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>Decision Twin scenarios</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>Decision Debt Ledger</span>
                        </li>
                      </>
                    )}
                    {plan.features_included?.includes('advanced_analytics') && (
                      <>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>Advanced analytics</span>
                        </li>
                      </>
                    )}
                    {plan.features_included?.includes('priority_support') && (
                      <>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>Priority support</span>
                        </li>
                      </>
                    )}
                    {plan.features_included?.includes('api_access') && (
                      <>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>API access</span>
                        </li>
                      </>
                    )}
                    {plan.features_included?.includes('sso_saml') && (
                      <>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>SSO/SAML</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>Dedicated support</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>Custom integrations</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-500 text-xl flex-shrink-0">âœ“</span>
                          <span>Phone support</span>
                        </li>
                      </>
                    )}
                  </ul>

                  {!isCurrentPlan ? (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      className={`w-full py-3 rounded-xl font-bold text-white transition-all duration-300 ${
                        isProfessional 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg hover:shadow-xl' 
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                      }`}
                    >
                      {plan.is_free ? 'Switch to Free' : `Upgrade to ${plan.display_name}`}
                    </button>
                  ) : (
                    <div className={`w-full py-3 rounded-xl font-bold text-center border-2 ${borderColor} ${textSecondary}`}>
                      Current Plan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing History */}
        {invoices.length > 0 && (
          <div>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>Billing History</h2>
            <div className={`${bgSecondary} border ${borderColor} rounded-2xl overflow-hidden shadow-lg`}>
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-stone-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`text-left p-4 ${textSecondary} text-sm font-semibold`}>Date</th>
                    <th className={`text-left p-4 ${textSecondary} text-sm font-semibold`}>Amount</th>
                    <th className={`text-left p-4 ${textSecondary} text-sm font-semibold`}>Status</th>
                    <th className={`text-left p-4 ${textSecondary} text-sm font-semibold`}>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className={`border-t ${borderColor} hover:${darkMode ? 'bg-stone-800' : 'bg-gray-50'} transition-colors`}>
                      <td className={`p-4 ${textPrimary}`}>{new Date(inv.period_start).toLocaleDateString()}</td>
                      <td className={`p-4 ${textPrimary} font-semibold`}>${inv.amount}</td>
                      <td className={`p-4`}>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className={`p-4`}>
                        {inv.invoice_pdf && (
                          <a href={inv.invoice_pdf} className="text-blue-500 hover:text-blue-600 font-medium text-sm">
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



