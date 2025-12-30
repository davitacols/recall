import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/Button';

function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const res = await api.get('/api/decisions/proposals/');
      setProposals(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const openProposals = proposals.filter(p => p.status === 'open');
  const acceptedProposals = proposals.filter(p => p.status === 'accepted');
  const rejectedProposals = proposals.filter(p => p.status === 'rejected');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-600 mt-1">Structured decisions for your team</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create Proposal</Button>
      </div>

      {/* Open Proposals */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Open for Discussion</h2>
        {openProposals.length > 0 ? (
          <div className="space-y-3">
            {openProposals.map(proposal => (
              <ProposalCard key={proposal.id} proposal={proposal} onRefresh={fetchProposals} />
            ))}
          </div>
        ) : (
          <div className="border border-gray-200 p-8 text-center text-gray-600">
            No open proposals
          </div>
        )}
      </section>

      {/* Accepted Proposals */}
      {acceptedProposals.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Accepted</h2>
          <div className="space-y-3">
            {acceptedProposals.map(proposal => (
              <div key={proposal.id} className="border border-green-200 bg-green-50 p-4">
                <div className="font-medium text-gray-900">{proposal.title}</div>
                <div className="text-sm text-gray-600 mt-1">Accepted on {new Date(proposal.accepted_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rejected Proposals */}
      {rejectedProposals.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Rejected</h2>
          <div className="space-y-3">
            {rejectedProposals.map(proposal => (
              <div key={proposal.id} className="border border-gray-200 p-4 opacity-60">
                <div className="font-medium text-gray-900">{proposal.title}</div>
                <div className="text-sm text-gray-600 mt-1">Rejected on {new Date(proposal.accepted_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showCreateModal && <CreateProposalModal onClose={() => setShowCreateModal(false)} onSuccess={fetchProposals} />}
    </div>
  );
}

function ProposalCard({ proposal, onRefresh }) {
  const [showDetails, setShowDetails] = useState(false);
  const [impactLevel, setImpactLevel] = useState('medium');
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.post(`/api/decisions/proposals/${proposal.id}/accept/`, {
        impact_level: impactLevel
      });
      alert('Proposal accepted and converted to decision');
      onRefresh();
    } catch (error) {
      alert('Failed to accept proposal');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this proposal?')) return;
    setRejecting(true);
    try {
      await api.post(`/api/decisions/proposals/${proposal.id}/reject/`);
      alert('Proposal rejected');
      onRefresh();
    } catch (error) {
      alert('Failed to reject proposal');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{proposal.title}</h3>
          <div className="text-sm text-gray-600 mt-1">
            Proposed by {proposal.proposed_by} on {new Date(proposal.created_at).toLocaleDateString()}
          </div>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium">Open</span>
      </div>

      <p className="text-gray-700 mb-4">{proposal.description}</p>

      {showDetails && (
        <div className="bg-gray-50 p-4 mb-4 space-y-3 text-sm">
          {proposal.rationale && (
            <div>
              <div className="font-medium text-gray-900">Rationale</div>
              <div className="text-gray-700">{proposal.rationale}</div>
            </div>
          )}
          {proposal.alternatives_considered && (
            <div>
              <div className="font-medium text-gray-900">Alternatives</div>
              <div className="text-gray-700">{proposal.alternatives_considered}</div>
            </div>
          )}
          {proposal.risks && (
            <div>
              <div className="font-medium text-gray-900">Risks</div>
              <div className="text-gray-700">{proposal.risks}</div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        {showDetails ? '− Hide' : '+ Show'} details
      </button>

      {/* Accept/Reject Actions */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Impact Level</label>
          <div className="flex gap-2">
            {['low', 'medium', 'high', 'critical'].map(level => (
              <button
                key={level}
                onClick={() => setImpactLevel(level)}
                className={`px-2 py-1 text-xs font-medium border transition-colors ${
                  impactLevel === level
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-900 text-gray-900 hover:bg-gray-50'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleAccept} loading={accepting} className="flex-1">
            Accept & Create Decision
          </Button>
          <button
            onClick={handleReject}
            disabled={rejecting}
            className="px-4 py-2 border border-red-600 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {rejecting ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateProposalModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rationale, setRationale] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [risks, setRisks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/decisions/proposals/', {
        title,
        description,
        rationale,
        alternatives_considered: alternatives,
        risks
      });
      alert('Proposal created');
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Proposal</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Rationale</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none resize-none"
              placeholder="Why are we considering this?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Alternatives Considered</label>
            <textarea
              value={alternatives}
              onChange={(e) => setAlternatives(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none resize-none"
              placeholder="What other options did we consider?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Risks</label>
            <textarea
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-900 focus:outline-none resize-none"
              placeholder="What could go wrong?"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Proposal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Proposals;
