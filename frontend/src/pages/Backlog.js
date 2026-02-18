import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, Bars3Icon, ChevronRightIcon, ChevronDownIcon, ArrowLeftIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useTheme } from '../utils/ThemeAndAccessibility';

function Backlog() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [backlogIssues, setBacklogIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEpics, setExpandedEpics] = useState(new Set());
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [dragOverIssue, setDragOverIssue] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [parentIssueId, setParentIssueId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [backlogRes, sprintsRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/backlog/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`)
      ]);
      // Only show issues NOT in any sprint (backlog = future work)
      const issues = (backlogRes.data.issues || []).filter(i => !i.sprint_id);
      setBacklogIssues(issues);
      setSprints(sprintsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEpic = (epicId) => {
    const newExpanded = new Set(expandedEpics);
    newExpanded.has(epicId) ? newExpanded.delete(epicId) : newExpanded.add(epicId);
    setExpandedEpics(newExpanded);
  };

  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverIssue = (e, targetIssue) => {
    e.preventDefault();
    if (draggedIssue && draggedIssue.id !== targetIssue.id) {
      setDragOverIssue(targetIssue.id);
    }
  };

  const handleDropOnIssue = async (e, targetIssue) => {
    e.preventDefault();
    if (!draggedIssue || draggedIssue.id === targetIssue.id) return;

    // Reorder: move draggedIssue to position of targetIssue
    const newOrder = [...backlogIssues];
    const dragIndex = newOrder.findIndex(i => i.id === draggedIssue.id);
    const dropIndex = newOrder.findIndex(i => i.id === targetIssue.id);
    
    newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggedIssue);
    
    setBacklogIssues(newOrder);
    setDraggedIssue(null);
    setDragOverIssue(null);

    // TODO: Send new order to backend
    // await api.post(`/api/agile/projects/${projectId}/backlog/reorder/`, { order: newOrder.map(i => i.id) });
  };

  const handleDragOverSprint = (e, sprintId) => {
    e.preventDefault();
    setDropTarget(sprintId);
  };

  const handleDropOnSprint = async (e, sprintId) => {
    e.preventDefault();
    if (!draggedIssue) return;

    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, { sprint_id: sprintId });
      fetchData();
    } catch (error) {
      console.error('Failed to move issue:', error);
    } finally {
      setDraggedIssue(null);
      setDropTarget(null);
    }
  };

  const buildHierarchy = () => {
    const epics = backlogIssues.filter(i => i.issue_type === 'epic');
    const stories = backlogIssues.filter(i => i.issue_type === 'story');
    const tasks = backlogIssues.filter(i => i.issue_type === 'task' || i.issue_type === 'bug');

    return epics.map(epic => ({
      ...epic,
      children: stories.filter(s => s.parent_issue_id === epic.id).map(story => ({
        ...story,
        children: tasks.filter(t => t.parent_issue_id === story.id)
      })).concat(tasks.filter(t => t.parent_issue_id === epic.id))
    })).concat(
      stories.filter(s => !s.parent_issue_id).map(story => ({
        ...story,
        children: tasks.filter(t => t.parent_issue_id === story.id)
      }))
    ).concat(tasks.filter(t => !t.parent_issue_id));
  };

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-white';
  const cardBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textColor = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';
  const textTertiary = darkMode ? 'text-stone-500' : 'text-gray-500';
  const hoverBg = darkMode ? 'hover:bg-stone-900' : 'hover:bg-gray-50';
  const inputBg = darkMode ? 'bg-stone-800' : 'bg-gray-50';
  const inputBorder = darkMode ? 'border-stone-700' : 'border-gray-300';
  const inputText = darkMode ? 'text-stone-200' : 'text-gray-900';
  const buttonBg = darkMode ? 'bg-stone-800' : 'bg-gray-100';
  const buttonText = darkMode ? 'text-stone-200' : 'text-gray-700';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${darkMode ? 'border-stone-700 border-t-stone-400' : 'border-gray-300 border-t-gray-600'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  const hierarchy = buildHierarchy();

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className={`mb-4 px-3 py-2 ${hoverBg} rounded transition-all border ${borderColor} ${darkMode ? 'bg-stone-900/50' : 'bg-gray-50'} inline-flex items-center gap-2 ${textSecondary} ${darkMode ? 'hover:text-stone-200' : 'hover:text-gray-900'}`}>
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
            <h1 className={`text-2xl font-bold ${textColor} mb-1`}>Backlog</h1>
            <p className={`text-sm ${textTertiary}`}>Prioritize future work • {backlogIssues.length} unstarted issues</p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Backlog List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className={`text-xs font-semibold ${textTertiary} uppercase`}>
                Priority Order (Top = Most Important)
              </div>
              <button
                onClick={() => {
                  setParentIssueId(null);
                  setShowCreateModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 ${buttonBg} ${buttonText} rounded ${darkMode ? 'hover:bg-stone-700' : 'hover:bg-gray-200'} font-medium text-sm transition-all border ${borderColor}`}
              >
                <PlusIcon className="w-4 h-4" />
                New Issue
              </button>
            </div>

            <div className={`${cardBg} border ${borderColor} rounded-lg overflow-hidden`}>
              {/* Table Header */}
              <div className={`grid grid-cols-[32px_40px_1fr_90px_80px_110px_120px] gap-3 px-4 py-3 border-b ${borderColor} ${darkMode ? 'bg-stone-900/80' : 'bg-gray-50'}`}>
                <div></div>
                <div></div>
                <div className={`text-xs font-semibold ${textTertiary} uppercase`}>Issue</div>
                <div className={`text-xs font-semibold ${textTertiary} uppercase`}>Type</div>
                <div className={`text-xs font-semibold ${textTertiary} uppercase`}>Priority</div>
                <div className={`text-xs font-semibold ${textTertiary} uppercase`}>Assignee</div>
                <div className={`text-xs font-semibold ${textTertiary} uppercase text-right`}>Actions</div>
              </div>

              {/* Issues */}
              {backlogIssues.length === 0 ? (
                <div className="p-12 text-center">
                  <p className={`text-sm ${textTertiary} mb-4`}>Backlog is empty</p>
                  <button
                    onClick={() => {
                      setParentIssueId(null);
                      setShowCreateModal(true);
                    }}
                    className={`px-5 py-2 ${buttonBg} ${buttonText} rounded ${darkMode ? 'hover:bg-stone-700' : 'hover:bg-gray-200'} font-medium text-sm transition-all border ${borderColor}`}
                  >
                    Create First Issue
                  </button>
                </div>
              ) : (
                <div>
                  {hierarchy.map((item, index) => (
                    <IssueRow
                      key={item.id}
                      issue={item}
                      index={index}
                      level={0}
                      expanded={expandedEpics.has(item.id)}
                      onToggle={() => toggleEpic(item.id)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOverIssue}
                      onDrop={handleDropOnIssue}
                      isDragging={draggedIssue?.id === item.id}
                      isDragOver={dragOverIssue === item.id}
                      navigate={navigate}
                      onAddChild={(parentId) => {
                        setParentIssueId(parentId);
                        setShowCreateModal(true);
                      }}
                      darkMode={darkMode}
                      borderColor={borderColor}
                      textColor={textColor}
                      textSecondary={textSecondary}
                      textTertiary={textTertiary}
                      inputBg={inputBg}
                      inputBorder={inputBorder}
                      buttonBg={buttonBg}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sprint Planning Sidebar */}
          <div>
            <h3 className={`text-xs font-semibold ${textTertiary} uppercase mb-4`}>
              Move to Sprint
            </h3>
            
            {sprints.length === 0 ? (
              <div className={`p-6 ${cardBg} border ${borderColor} rounded-lg text-center`}>
                <p className={`text-xs ${darkMode ? 'text-stone-600' : 'text-gray-400'}`}>No active sprints</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sprints.map(sprint => (
                  <div
                    key={sprint.id}
                    onDragOver={(e) => handleDragOverSprint(e, sprint.id)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(e) => handleDropOnSprint(e, sprint.id)}
                    className={`p-4 rounded-lg transition-all ${
                      dropTarget === sprint.id
                        ? `${inputBg} border-2 ${darkMode ? 'border-stone-600' : 'border-gray-400'}`
                        : `${cardBg} border ${borderColor} ${darkMode ? 'hover:border-stone-700' : 'hover:border-gray-300'}`
                    } ${draggedIssue ? 'cursor-pointer' : ''}`}
                  >
                    <div className={`text-sm font-semibold ${darkMode ? 'text-stone-200' : 'text-gray-900'} mb-1`}>{sprint.name}</div>
                    <div className={`text-xs ${darkMode ? 'text-stone-600' : 'text-gray-400'} mb-2`}>
                      {sprint.start_date} - {sprint.end_date}
                    </div>
                    {sprint.issue_count > 0 && (
                      <div className={`text-xs ${textTertiary} font-medium`}>
                        {sprint.issue_count} issues
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {draggedIssue && (
              <div className={`mt-4 p-3 ${cardBg} border ${borderColor} rounded-lg`}>
                <p className={`text-xs ${textTertiary} leading-relaxed`}>
                  ↑ Drop on sprint to plan<br/>
                  ↑ Drop on issue to reorder
                </p>
              </div>
            )}

            {/* Backlog Tips */}
            <div className={`mt-6 p-4 ${cardBg} border ${borderColor} rounded-lg`}>
              <div className="flex items-center gap-2 mb-3">
                <LightBulbIcon className={`w-4 h-4 ${textTertiary}`} />
                <h4 className={`text-xs font-semibold ${textTertiary} uppercase`}>Tips</h4>
              </div>
              <ul className={`text-xs ${darkMode ? 'text-stone-600' : 'text-gray-500'} leading-relaxed space-y-1 pl-4 list-disc`}>
                <li>Top = highest priority</li>
                <li>Drag to reorder</li>
                <li>Drag to sprint to plan</li>
                <li>Groom regularly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateIssueModal
          projectId={projectId}
          parentIssueId={parentIssueId}
          onClose={() => {
            setShowCreateModal(false);
            setParentIssueId(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setParentIssueId(null);
            fetchData();
          }}
          darkMode={darkMode}
          cardBg={cardBg}
          borderColor={borderColor}
          textColor={textColor}
          textSecondary={textSecondary}
          inputBg={inputBg}
          inputText={inputText}
          inputBorder={inputBorder}
          buttonBg={buttonBg}
        />
      )}
    </div>
  );
}

function IssueRow({ issue, index, level, expanded, onToggle, onDragStart, onDragOver, onDrop, isDragging, isDragOver, navigate, onAddChild, darkMode, borderColor, textColor, textSecondary, textTertiary, inputBg, inputBorder, buttonBg }) {
  const hasChildren = issue.children && issue.children.length > 0;
  const canHaveChildren = issue.issue_type === 'epic' || issue.issue_type === 'story';
  const indent = level * 20;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, issue)}
        onDragOver={(e) => onDragOver(e, issue)}
        onDrop={(e) => onDrop(e, issue)}
        onClick={() => navigate(`/issues/${issue.id}`)}
        className={`grid grid-cols-[32px_40px_1fr_90px_80px_110px_120px] gap-3 px-4 py-3 border-b ${borderColor} transition-all ${
          isDragging ? 'opacity-40 cursor-grabbing' : `cursor-grab ${darkMode ? 'hover:bg-stone-900/50' : 'hover:bg-gray-50'}`
        } ${isDragOver ? `border-t-2 ${darkMode ? 'border-t-stone-600 bg-stone-900' : 'border-t-gray-400 bg-gray-100'}` : ''}`}
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        {/* Rank */}
        <div className="flex items-center justify-center">
          <span className={`text-xs font-bold ${textTertiary}`}>{index + 1}</span>
        </div>

        {/* Expand/Drag Handle */}
        <div className="flex items-center gap-1">
          <Bars3Icon className={`w-4 h-4 ${textTertiary}`} />
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`p-0.5 bg-transparent border-none cursor-pointer ${textSecondary} hover:text-amber-400 transition-colors`}
            >
              {expanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Issue */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold ${textTertiary} font-mono`}>{issue.key}</span>
          <span className={`text-sm font-semibold ${darkMode ? 'text-stone-200' : 'text-gray-900'} overflow-hidden text-ellipsis whitespace-nowrap`}>{issue.title}</span>
        </div>

        {/* Type */}
        <div className="flex items-center">
          <span className={`text-xs font-bold ${textSecondary} uppercase px-2 py-1 ${darkMode ? 'bg-stone-800/60' : 'bg-gray-100'} rounded`}>{issue.issue_type}</span>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(issue.priority) }}></span>
          <span className={`text-xs ${textSecondary} capitalize`}>{issue.priority}</span>
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2">
          {issue.assignee_name ? (
            <>
              <div className={`w-6 h-6 rounded-full ${darkMode ? 'bg-stone-700' : 'bg-gray-300'} flex items-center justify-center text-xs font-semibold ${darkMode ? 'text-stone-200' : 'text-gray-700'}`}>
                {issue.assignee_name.charAt(0).toUpperCase()}
              </div>
              <span className={`text-xs ${textSecondary} overflow-hidden text-ellipsis whitespace-nowrap`}>{issue.assignee_name.split(' ')[0]}</span>
            </>
          ) : (
            <span className={`text-xs ${darkMode ? 'text-stone-600' : 'text-gray-400'}`}>-</span>
          )}
        </div>

        {/* Story Points / Add Child Button */}
        <div className="flex items-center justify-end gap-2">
          {canHaveChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(issue.id);
              }}
              className={`px-2 py-1 ${buttonBg} ${darkMode ? 'text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-stone-200' : 'text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-gray-900'} border rounded text-xs font-medium cursor-pointer transition-all`}
            >
              + Child
            </button>
          )}
          {issue.story_points ? (
            <span className={`text-xs font-semibold ${textSecondary} ${inputBg} border ${inputBorder} px-2 py-1 rounded`}>{issue.story_points}</span>
          ) : (
            <span className={`text-xs ${darkMode ? 'text-stone-600' : 'text-gray-400'}`}>-</span>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && issue.children.map((child, childIndex) => (
        <IssueRow
          key={child.id}
          issue={child}
          index={index}
          level={level + 1}
          expanded={false}
          onToggle={() => {}}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          isDragging={isDragging}
          isDragOver={isDragOver}
          navigate={navigate}
          onAddChild={onAddChild}
          darkMode={darkMode}
          borderColor={borderColor}
          textColor={textColor}
          textSecondary={textSecondary}
          textTertiary={textTertiary}
          inputBg={inputBg}
          inputBorder={inputBorder}
          buttonBg={buttonBg}
        />
      ))}
    </>
  );
}

function CreateIssueModal({ projectId, parentIssueId, onClose, onSuccess, darkMode, cardBg, borderColor, textColor, textSecondary, inputBg, inputText, inputBorder, buttonBg }) {
  const [title, setTitle] = useState('');
  const [issueType, setIssueType] = useState(parentIssueId ? 'story' : 'story');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/issues/`, {
        title,
        issue_type: issueType,
        priority,
        parent_issue_id: parentIssueId
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create issue:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className={`${cardBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
        <h2 className={`text-xl font-bold ${textColor} mb-5`}>{parentIssueId ? 'Create Child Issue' : 'Create Issue'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. User can reset password"
              className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
              >
                <option value="epic">Epic</option>
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none ${darkMode ? 'focus:border-stone-600' : 'focus:border-gray-400'} transition-all`}
              >
                <option value="highest">Highest</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="lowest">Lowest</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${buttonBg} ${darkMode ? 'text-stone-300 border-stone-700 hover:bg-stone-700' : 'text-gray-700 border-gray-300 hover:bg-gray-200'} border rounded font-medium text-sm transition-all`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 ${darkMode ? 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600' : 'bg-gray-200 text-gray-900 border-gray-300 hover:bg-gray-300'} rounded font-medium text-sm transition-all disabled:opacity-50 border`}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'highest': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return '#6b7280';
  }
}

export default Backlog;
