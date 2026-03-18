import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";

function formatLinkStrength(value) {
  if (typeof value !== "number") return null;
  return `${Math.round(value * 100)}% relevant`;
}

function EmptyPanel({ bgSecondary, borderColor, textPrimary, textSecondary }) {
  return (
    <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
      <h3 className={`font-semibold ${textPrimary} mb-2`}>Context Panel</h3>
      <p className={`text-sm ${textSecondary}`}>
        Related content will appear here as you create more conversations, decisions, and linked work.
      </p>
    </div>
  );
}

export default function ContextPanel({ contentType, objectId, refreshKey = 0 }) {
  const { darkMode } = useTheme();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const bgSecondary = darkMode ? "bg-stone-900" : "bg-white";
  const borderColor = darkMode ? "border-stone-800" : "border-gray-200";
  const textPrimary = darkMode ? "text-stone-100" : "text-gray-900";
  const textSecondary = darkMode ? "text-stone-400" : "text-gray-600";
  const hoverBg = darkMode ? "hover:bg-stone-800" : "hover:bg-gray-50";

  useEffect(() => {
    let active = true;

    const fetchContext = async () => {
      const cacheKey = `context_${contentType}_${objectId}`;
      setLoading(true);

      if (refreshKey > 0) {
        sessionStorage.removeItem(cacheKey);
      } else {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 3600000) {
              if (active) {
                setContext(parsed.data);
                setLoading(false);
              }
              return;
            }
          } catch (error) {
            sessionStorage.removeItem(cacheKey);
          }
        }
      }

      try {
        const response = await api.get(`/api/knowledge/context/${contentType}/${objectId}/`);
        if (!active) return;
        setContext(response.data);
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        if (!active) return;
        console.error("Error fetching context:", error);
        setContext({ error: true });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchContext();
    return () => {
      active = false;
    };
  }, [contentType, objectId, refreshKey]);

  if (loading) {
    return (
      <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-4 ${darkMode ? "bg-stone-800" : "bg-gray-200"} rounded w-3/4`} />
          <div className={`h-4 ${darkMode ? "bg-stone-800" : "bg-gray-200"} rounded w-1/2`} />
        </div>
      </div>
    );
  }

  if (!context || context.error) {
    return (
      <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
        <h3 className={`font-semibold ${textPrimary} mb-2`}>Context</h3>
        <p className={`text-sm ${textSecondary}`}>
          {context?.error ? "Unable to load context" : "No related content yet"}
        </p>
      </div>
    );
  }

  const hasContent =
    context.related_conversations?.length ||
    context.related_decisions?.length ||
    context.related_tasks?.length ||
    context.related_documents?.length ||
    context.expert_users?.length ||
    context.similar_past_items?.length;

  return (
    <>
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="lg:hidden fixed bottom-4 right-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen ? (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsOpen(false)} />
      ) : null}

      <div
        className={`
          lg:relative lg:block
          fixed bottom-0 left-0 right-0 z-50
          lg:transform-none
          transition-transform duration-300
          ${isOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"}
          max-h-[80vh] lg:max-h-none overflow-y-auto
          ${bgSecondary} lg:bg-transparent
          rounded-t-2xl lg:rounded-none
          shadow-2xl lg:shadow-none
        `}
      >
        <div className="space-y-4 p-4 lg:p-0">
          {!hasContent ? (
            <EmptyPanel
              bgSecondary={bgSecondary}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          ) : null}

          {context.related_conversations?.length > 0 ? (
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <ChatBubbleLeftIcon className="w-5 h-5 text-blue-500" />
                <h3 className={`font-semibold ${textPrimary}`}>Related Conversations</h3>
              </div>
              <div className="space-y-2">
                {context.related_conversations.map((conversation) => (
                  <Link key={conversation.id} to={`/conversations/${conversation.id}`} className={`block p-2 rounded ${hoverBg} transition`}>
                    <div className={`text-sm font-medium ${textPrimary}`}>{conversation.title}</div>
                    <div className={`text-xs ${textSecondary}`}>
                      {[conversation.link_type, formatLinkStrength(conversation.strength)].filter(Boolean).join(" | ")}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {context.related_decisions?.length > 0 ? (
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <DocumentCheckIcon className="w-5 h-5 text-purple-500" />
                <h3 className={`font-semibold ${textPrimary}`}>Related Decisions</h3>
              </div>
              <div className="space-y-2">
                {context.related_decisions.map((decision) => (
                  <Link key={decision.id} to={`/decisions/${decision.id}`} className={`block p-2 rounded ${hoverBg} transition`}>
                    <div className={`text-sm font-medium ${textPrimary}`}>{decision.title}</div>
                    <div className={`text-xs ${textSecondary}`}>{decision.link_type}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {context.related_tasks?.length > 0 ? (
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardDocumentListIcon className="w-5 h-5 text-amber-500" />
                <h3 className={`font-semibold ${textPrimary}`}>Linked Tasks</h3>
              </div>
              <div className="space-y-2">
                {context.related_tasks.map((task) => (
                  <Link key={task.id} to="/business/tasks" className={`block p-2 rounded ${hoverBg} transition`}>
                    <div className={`text-sm font-medium ${textPrimary}`}>{task.title}</div>
                    <div className={`text-xs ${textSecondary}`}>{task.link_type}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {context.related_documents?.length > 0 ? (
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="w-5 h-5 text-sky-500" />
                <h3 className={`font-semibold ${textPrimary}`}>Linked Documents</h3>
              </div>
              <div className="space-y-2">
                {context.related_documents.map((document) => (
                  <Link key={document.id} to={`/business/documents/${document.id}`} className={`block p-2 rounded ${hoverBg} transition`}>
                    <div className={`text-sm font-medium ${textPrimary}`}>{document.title}</div>
                    <div className={`text-xs ${textSecondary}`}>{document.link_type}</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {context.expert_users?.length > 0 ? (
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <UserGroupIcon className="w-5 h-5 text-green-500" />
                <h3 className={`font-semibold ${textPrimary}`}>Who Knows About This</h3>
              </div>
              <div className="space-y-2">
                {context.expert_users.map((expert, index) => (
                  <div key={`${expert.user_id || expert.name}-${index}`} className="flex items-center gap-2 p-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                      {expert.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${textPrimary}`}>{expert.name}</div>
                      <div className={`text-xs ${textSecondary}`}>{expert.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {context.similar_past_items?.length > 0 ? (
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5 text-amber-500" />
                <h3 className={`font-semibold ${textPrimary}`}>Historical Context</h3>
              </div>
              <div className="space-y-3">
                {context.similar_past_items.map((item, index) => (
                  <div key={`${item.id || item.title}-${index}`} className={`p-2 rounded ${darkMode ? "bg-stone-800" : "bg-gray-50"}`}>
                    <div className={`text-sm font-medium ${textPrimary} mb-1`}>{item.title}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          item.was_successful
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {item.outcome}
                      </span>
                      <span className={textSecondary}>{Math.round((item.similarity || 0) * 100)}% similar</span>
                    </div>
                    {item.lessons ? (
                      <div className={`mt-2 text-xs ${textSecondary}`}>Insight: {item.lessons}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {context.outcome_patterns?.reviewed_count > 0 ? (
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="w-5 h-5 text-emerald-500" />
                <h3 className={`font-semibold ${textPrimary}`}>Similar Outcomes</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2 rounded ${darkMode ? "bg-stone-800" : "bg-gray-50"}`}>
                  <div className={textSecondary}>Reviewed</div>
                  <div className={`font-semibold ${textPrimary}`}>{context.outcome_patterns.reviewed_count}</div>
                </div>
                <div className={`p-2 rounded ${darkMode ? "bg-stone-800" : "bg-gray-50"}`}>
                  <div className={textSecondary}>Failure Rate</div>
                  <div className={`font-semibold ${textPrimary}`}>
                    {context.outcome_patterns.failure_rate != null ? `${context.outcome_patterns.failure_rate}%` : "-"}
                  </div>
                </div>
                <div className={`p-2 rounded ${darkMode ? "bg-stone-800" : "bg-gray-50"}`}>
                  <div className={textSecondary}>Successful</div>
                  <div className="font-semibold text-green-600">{context.outcome_patterns.successful_count}</div>
                </div>
                <div className={`p-2 rounded ${darkMode ? "bg-stone-800" : "bg-gray-50"}`}>
                  <div className={textSecondary}>Failed</div>
                  <div className="font-semibold text-red-600">{context.outcome_patterns.failed_count}</div>
                </div>
              </div>
            </div>
          ) : null}

          {context.risk_indicators?.length > 0 ? (
            <div
              className={`rounded-lg border-2 p-4 ${
                darkMode ? "bg-amber-900/20 border-amber-700" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className={`font-bold ${darkMode ? "text-amber-200" : "text-amber-900"}`}>Risk Indicators</h3>
              </div>
              <ul className="space-y-2">
                {context.risk_indicators.map((risk, index) => (
                  <li key={`${risk}-${index}`} className={`flex items-start gap-2 text-sm ${darkMode ? "text-amber-200" : "text-amber-900"}`}>
                    <span className={`font-bold mt-0.5 ${darkMode ? "text-amber-400" : "text-amber-600"}`}>!</span>
                    <span className="flex-1">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
