import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function SampleDecision() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <Link 
          to="/" 
          className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Link>

        <div className="bg-blue-50 border-2 border-blue-600 p-6 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 mb-1">This is a sample decision</h3>
              <p className="text-sm text-blue-800">
                This example shows how teams use Recall to document important choices. Your real decisions will look like this.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold uppercase tracking-wider">
              APPROVED
            </span>
            <span className="px-4 py-1.5 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider">
              HIGH IMPACT
            </span>
            <span className="text-base text-gray-500">
              March 15, 2024
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
            Switch from REST to GraphQL for mobile API
          </h1>
          
          <div className="flex items-center justify-between pb-8 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                <span className="text-white font-bold">SK</span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">Sarah Kim</div>
                <div className="text-sm text-gray-500">Decision Maker</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why this matters</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our mobile app makes 40+ API calls per screen. Users on slow connections experience 3-5 second load times. 
              This is hurting retention and app store ratings.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">The decision</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              We're migrating the mobile API from REST to GraphQL. This will reduce network requests by 80% and 
              improve load times to under 1 second on 3G connections.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What we considered</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-gray-900 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">Option 1: Optimize existing REST endpoints</h3>
                <p className="text-gray-700">Faster to implement but only reduces calls by 30%. Doesn't solve the core problem.</p>
              </div>
              <div className="border-l-4 border-gray-900 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">Option 2: GraphQL (chosen)</h3>
                <p className="text-gray-700">Requires 2 weeks of migration work but solves the problem completely. Better long-term solution.</p>
              </div>
              <div className="border-l-4 border-gray-200 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">Option 3: gRPC</h3>
                <p className="text-gray-700">Most performant but requires native code changes. Too complex for our team size.</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tradeoffs</h2>
            <ul className="space-y-2 text-lg text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold">+</span>
                <span>80% reduction in network requests</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold">+</span>
                <span>Better developer experience with typed queries</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">−</span>
                <span>2 weeks of migration work</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">−</span>
                <span>Team needs to learn GraphQL</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">If this fails</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              We can roll back to REST in 1 day. We're keeping both APIs running in parallel for 2 weeks. 
              Worst case: we lose 2 weeks of development time.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Next steps</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 font-medium">Alex implements GraphQL schema (Week 1)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 font-medium">Mobile team migrates screens (Week 2)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 font-medium">Monitor performance metrics (Week 3)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <div className="bg-gray-50 border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-3">This is how Recall works</h3>
            <p className="text-base text-gray-700 mb-4">
              Every important decision gets documented with context, alternatives, and tradeoffs. 
              This prevents your team from repeating the same conversations.
            </p>
            <Link
              to="/conversations"
              className="recall-btn-primary inline-block"
            >
              Document your first decision
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SampleDecision;
