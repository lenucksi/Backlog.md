import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { sanitizeUrlTitle } from './utils/urlHelpers';
import Layout from './components/Layout';
import BoardPage from './components/BoardPage';
import DocumentationDetail from './components/DocumentationDetail';
import DecisionDetail from './components/DecisionDetail';
import TaskList from './components/TaskList';
import DraftsList from './components/DraftsList';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import MilestonesPage from './components/MilestonesPage';
import TaskDetailsModal from './components/TaskDetailsModal';
import InitializationScreen from './components/InitializationScreen';
import { SuccessToast } from './components/SuccessToast';
import { ThemeProvider } from './contexts/ThemeContext';
import {
	type Decision,
	type DecisionSearchResult,
	type Document,
	type DocumentSearchResult,
	type BacklogConfig,
	type Milestone,
	type SearchResult,
	type Task,
	type TaskSearchResult,
} from '../types';
import { apiClient } from './lib/api';
import { useHealthCheckContext } from './contexts/HealthCheckContext';
import { getWebVersion } from './utils/version';
import { collectArchivedMilestoneKeys, collectMilestoneIds, milestoneKey } from './utils/milestones';

const buildMilestoneAliasMap = (milestones: Milestone[], archivedMilestones: Milestone[]): Map<string, string> => {
  const aliasMap = new Map<string, string>();
  const collectIdAliasKeys = (value: string): string[] => {
    const normalized = value.trim();
    const normalizedKey = normalized.toLowerCase();
    if (!normalizedKey) return [];
    const keys = new Set<string>([normalizedKey]);
    if (/^\d+$/.test(normalized)) {
      const numericAlias = String(Number.parseInt(normalized, 10));
      keys.add(numericAlias);
      keys.add(`m-${numericAlias}`);
      return Array.from(keys);
    }
    const idMatch = normalized.match(/^m-(\d+)$/i);
    if (idMatch?.[1]) {
      const numericAlias = String(Number.parseInt(idMatch[1], 10));
      keys.add(`m-${numericAlias}`);
      keys.add(numericAlias);
    }
    return Array.from(keys);
  };
  const reservedIdKeys = new Set<string>();
  for (const milestone of [...milestones, ...archivedMilestones]) {
    for (const key of collectIdAliasKeys(milestone.id)) {
      reservedIdKeys.add(key);
    }
  }
  const setAlias = (aliasKey: string, id: string, allowOverwrite: boolean) => {
    const existing = aliasMap.get(aliasKey);
    if (!existing) {
      aliasMap.set(aliasKey, id);
      return;
    }
    if (!allowOverwrite) {
      return;
    }
    const existingKey = existing.toLowerCase();
    const nextKey = id.toLowerCase();
    const preferredRawId = /^\d+$/.test(aliasKey) ? `m-${aliasKey}` : /^m-\d+$/.test(aliasKey) ? aliasKey : null;
    if (preferredRawId) {
      const existingIsPreferred = existingKey === preferredRawId;
      const nextIsPreferred = nextKey === preferredRawId;
      if (existingIsPreferred && !nextIsPreferred) {
        return;
      }
      if (nextIsPreferred && !existingIsPreferred) {
        aliasMap.set(aliasKey, id);
      }
      return;
    }
    aliasMap.set(aliasKey, id);
  };
  const addIdAliases = (id: string, allowOverwrite = true) => {
    const idKey = id.toLowerCase();
    setAlias(idKey, id, allowOverwrite);
    const idMatch = id.match(/^m-(\d+)$/i);
    if (!idMatch?.[1]) return;
    const numericAlias = String(Number.parseInt(idMatch[1], 10));
    const canonicalId = `m-${numericAlias}`;
    setAlias(canonicalId, id, allowOverwrite);
    setAlias(numericAlias, id, allowOverwrite);
  };
  const activeTitleCounts = new Map<string, number>();
  for (const milestone of milestones) {
    const title = milestone.title.trim();
    if (!title) continue;
    const titleKey = title.toLowerCase();
    activeTitleCounts.set(titleKey, (activeTitleCounts.get(titleKey) ?? 0) + 1);
  }
  const activeTitleKeys = new Set(activeTitleCounts.keys());

  for (const milestone of milestones) {
    const id = milestone.id.trim();
    const title = milestone.title.trim();
    if (!id) continue;
    addIdAliases(id);
    if (title && !reservedIdKeys.has(title.toLowerCase()) && activeTitleCounts.get(title.toLowerCase()) === 1) {
      const titleKey = title.toLowerCase();
      if (!aliasMap.has(titleKey)) {
        aliasMap.set(titleKey, id);
      }
    }
  }

  const archivedTitleCounts = new Map<string, number>();
  for (const milestone of archivedMilestones) {
    const title = milestone.title.trim();
    if (!title) continue;
    const titleKey = title.toLowerCase();
    if (activeTitleKeys.has(titleKey)) continue;
    archivedTitleCounts.set(titleKey, (archivedTitleCounts.get(titleKey) ?? 0) + 1);
  }
  for (const milestone of archivedMilestones) {
    const id = milestone.id.trim();
    const title = milestone.title.trim();
    if (!id) continue;
    addIdAliases(id, false);
    const titleKey = title.toLowerCase();
    if (
      title &&
      !activeTitleKeys.has(titleKey) &&
      !reservedIdKeys.has(titleKey) &&
      archivedTitleCounts.get(titleKey) === 1
    ) {
      if (!aliasMap.has(titleKey)) {
        aliasMap.set(titleKey, id);
      }
    }
  }
  return aliasMap;
};

const canonicalizeMilestone = (value: string | null | undefined, aliasMap?: Map<string, string>): string => {
  const normalized = (value ?? '').trim();
  if (!normalized) return '';
  const direct = aliasMap?.get(milestoneKey(normalized));
  if (direct) {
    return direct;
  }
  const idMatch = normalized.match(/^m-(\d+)$/i);
  if (idMatch?.[1]) {
    const numericAlias = String(Number.parseInt(idMatch[1], 10));
    return aliasMap?.get(`m-${numericAlias}`) ?? aliasMap?.get(numericAlias) ?? normalized;
  }
  if (/^\d+$/.test(normalized)) {
    const numericAlias = String(Number.parseInt(normalized, 10));
    return aliasMap?.get(`m-${numericAlias}`) ?? aliasMap?.get(numericAlias) ?? normalized;
  }
  return normalized;
};

function App() {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [availableAuthors, setAvailableAuthors] = useState<Array<{name: string; color: string | null}>>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [config, setConfig] = useState<BacklogConfig | null>(null);

  const labelColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of config?.labels ?? []) {
      if (typeof l !== "string" && l.color) map[l.name] = l.color;
    }
    return map;
  }, [config?.labels]);

  const authorColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of availableAuthors) {
      if (a.color) {
        map[a.name] = a.color;
        map[a.name.replace("@", "")] = a.color;
      }
    }
    return map;
  }, [availableAuthors]);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [milestoneEntities, setMilestoneEntities] = useState<Milestone[]>([]);
  const [archivedMilestones, setArchivedMilestones] = useState<Milestone[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [taskConfirmation, setTaskConfirmation] = useState<{task: Task, isDraft: boolean} | null>(null);

  // Initialization state
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // Centralized data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [archivedDocs, setArchivedDocs] = useState<Array<{ id: string; title: string; path: string }>>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useHealthCheckContext();
  const previousOnlineRef = useRef<boolean | null>(null);
  const hasBeenRunningRef = useRef(false);

  // Set version data attribute on body
  React.useEffect(() => {
    getWebVersion().then(version => {
      if (version) {
        document.body.setAttribute('data-version', `Backlog.md - v${version}`);
      }
    });
  }, []);

  // Check initialization status on mount
  React.useEffect(() => {
    const checkInitStatus = async () => {
      try {
        const status = await apiClient.checkStatus();
        setIsInitialized(status.initialized);
      } catch (error) {
        // If we can't check status, assume not initialized
        console.error('Failed to check initialization status:', error);
        setIsInitialized(false);
      }
    };
    checkInitStatus();
  }, []);

  const handleInitialized = useCallback(() => {
    setIsInitialized(true);
  }, []);

  const applySearchResults = useCallback((
    results: SearchResult[],
    archivedMilestoneKeys?: Set<string>,
    milestoneAliases?: Map<string, string>,
  ) => {
    const taskResults = results.filter((result): result is TaskSearchResult => result.type === 'task');
    const documentResults = results.filter((result): result is DocumentSearchResult => result.type === 'document');
    const decisionResults = results.filter((result): result is DecisionSearchResult => result.type === 'decision');

    const tasksList = taskResults.map((result) => result.task);
    const normalizedTasks =
      archivedMilestoneKeys && archivedMilestoneKeys.size > 0
        ? tasksList.map((task) => {
            const canonicalMilestone = canonicalizeMilestone(task.milestone, milestoneAliases);
            const key = milestoneKey(canonicalMilestone);
            if (!key || !archivedMilestoneKeys.has(key)) {
              if (task.milestone === canonicalMilestone) {
                return task;
              }
              return { ...task, milestone: canonicalMilestone || undefined };
            }
            return { ...task, milestone: undefined };
          })
        : tasksList.map((task) => {
            const canonicalMilestone = canonicalizeMilestone(task.milestone, milestoneAliases);
            if (task.milestone === canonicalMilestone) {
              return task;
            }
            return { ...task, milestone: canonicalMilestone || undefined };
          });
    const docsList = documentResults.map((result) => result.document);
    const decisionsList = decisionResults.map((result) => result.decision);

    setTasks(normalizedTasks);
    setDocs(docsList);
    setDecisions(decisionsList);

    return { tasks: normalizedTasks, docs: docsList, decisions: decisionsList };
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statusesData, configData, searchResults, milestonesData, archivedMilestonesData, archivedDocsData, completedTasksData, authorsData] = await Promise.all([
        apiClient.fetchStatuses(),
        apiClient.fetchConfig(),
        apiClient.search(),
        apiClient.fetchMilestones(),
        apiClient.fetchArchivedMilestones(),
        apiClient.fetchArchivedDocs(),
        apiClient.fetchCompletedTasks(),
        apiClient.fetchAuthors(),
      ]);

      const archivedKeys = new Set(collectArchivedMilestoneKeys(archivedMilestonesData, milestonesData));
      const milestoneAliases = buildMilestoneAliasMap(milestonesData, archivedMilestonesData);
      const { tasks: tasksList } = applySearchResults(searchResults, archivedKeys, milestoneAliases);

      setStatuses(statusesData);
      setProjectName(configData.projectName);
      setAvailableLabels((configData.labels || []).map((l) => (typeof l === "string" ? l : l.name)));
      setAvailableAuthors(authorsData.map((a) => ({ name: a.name, color: a.color ?? null })));
      setConfig(configData);
      setMilestoneEntities(milestonesData);
      setArchivedMilestones(archivedMilestonesData);
      setArchivedDocs(archivedDocsData);
      setCompletedTasks(completedTasksData);
      setMilestones(
        collectMilestoneIds(tasksList, milestonesData, archivedMilestonesData).filter(
          (milestone) => !archivedKeys.has(milestoneKey(milestone)),
        ),
      );
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applySearchResults]);

  const refreshAllData = useCallback(async () => {
    try {
      const [statusesData, configData, searchResults, milestonesData, archivedMilestonesData, archivedDocsData, completedTasksData, authorsData] = await Promise.all([
        apiClient.fetchStatuses(),
        apiClient.fetchConfig(),
        apiClient.search(),
        apiClient.fetchMilestones(),
        apiClient.fetchArchivedMilestones(),
        apiClient.fetchArchivedDocs(),
        apiClient.fetchCompletedTasks(),
        apiClient.fetchAuthors(),
      ]);

      const archivedKeys = new Set(collectArchivedMilestoneKeys(archivedMilestonesData, milestonesData));
      const milestoneAliases = buildMilestoneAliasMap(milestonesData, archivedMilestonesData);
      const { tasks: tasksList } = applySearchResults(searchResults, archivedKeys, milestoneAliases);

      setStatuses(statusesData);
      setProjectName(configData.projectName);
      setAvailableLabels((configData.labels || []).map((l) => (typeof l === "string" ? l : l.name)));
      setAvailableAuthors(authorsData.map((a) => ({ name: a.name, color: a.color ?? null })));
      setConfig(configData);
      setMilestoneEntities(milestonesData);
      setArchivedMilestones(archivedMilestonesData);
      setArchivedDocs(archivedDocsData);
      setCompletedTasks(completedTasksData);
      setMilestones(
        collectMilestoneIds(tasksList, milestonesData, archivedMilestonesData).filter(
          (milestone) => !archivedKeys.has(milestoneKey(milestone)),
        ),
      );
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }, [applySearchResults]);

  React.useEffect(() => {
    // Only load data when initialized
    if (isInitialized === true) {
      loadAllData();
    }
  }, [loadAllData, isInitialized]);

  // Reload data when connection is restored
  React.useEffect(() => {
    if (isOnline && previousOnlineRef.current === false) {
      refreshAllData();
    }
  }, [refreshAllData, isOnline]);

  // Update document title when project name changes
  React.useEffect(() => {
    if (projectName) {
      document.title = `${projectName} - Task Management`;
    }
  }, [projectName]);

  // Mark that we've been running after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      hasBeenRunningRef.current = true;
    }, 2000); // Wait 2 seconds after page load
    return () => clearTimeout(timer);
  }, []);

  // Show success toast when connection is restored
  useEffect(() => {
    // Only show toast if:
    // 1. We went from offline to online AND
    // 2. We've been running for a while (not initial page load)
    if (isOnline && previousOnlineRef.current === false && hasBeenRunningRef.current) {
      setShowSuccessToast(true);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }

    // Update the ref for next time
    previousOnlineRef.current = isOnline;
  }, [isOnline]);

  const handleNewTask = () => {
    setEditingTask(null);
    setIsDraftMode(false);
    setShowModal(true);
  };

  const handleNewDraft = () => {
    // Create a draft task (same as new task but with status 'Draft')
    setEditingTask(null);
    setIsDraftMode(true);
    setShowModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleNavigateToTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setIsDraftMode(false);
    const pathname = window.location.pathname;
    if (pathname.startsWith("/board/") || ((pathname.startsWith("/tasks/") && pathname !== "/tasks"))) {
      navigate(-1);
    }
  };

  const refreshData = useCallback(async () => {
    await refreshAllData();
  }, [refreshAllData]);

  // Sync editingTask with refreshed tasks data to prevent stale state
  // This fixes the bug where acceptance criteria disappears after save (GitHub #467)
  // Deep compare to avoid resetting form when a different task file changed on disk
  useEffect(() => {
    if (editingTask && showModal) {
      const updatedTask = tasks.find(t => t.id === editingTask.id);
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(editingTask)) {
        setEditingTask(updatedTask);
      }
    }
  }, [tasks, editingTask, showModal]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    ws.onmessage = (event) => {
      if (event.data === "tasks-updated") {
        refreshData();
      } else if (event.data === "config-updated") {
        refreshAllData();
      }
    };
    return () => ws.close();
  }, [refreshData, refreshAllData]);

  // Deep link support: open modal when URL matches /board/:id/:title or /tasks/:id/:title
  useEffect(() => {
    const match = location.pathname.match(/^\/(board|tasks)\/([^/]+)/);
    if (!match) return;

    const id = match[2];
    if (!id) return;

    const taskId = id.replace(/^task-/, "");
    const existingTask = tasks.find((t) => t.id === taskId);

    if (existingTask) {
      setEditingTask(existingTask);
      setShowModal(true);
      return;
    }

    apiClient.fetchTask(taskId).then((t) => {
      if (t) {
        setEditingTask(t);
        setShowModal(true);
      }
    }).catch(() => {
      // Graceful handling for invalid IDs - no crash, no popup
    });
  }, [location.pathname, tasks]);

  const handleDeepLinkEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowModal(true);

    const pathname = window.location.pathname;
    if (pathname === "/" || pathname.startsWith("/board")) {
      const cleanId = task.id.replace("task-", "");
      navigate(`/board/${cleanId}/${sanitizeUrlTitle(task.title)}${window.location.search}`, { state: { fromNavigation: true } });
    } else if (pathname.startsWith("/tasks")) {
      const cleanId = task.id.replace("task-", "");
      navigate(`/tasks/${cleanId}/${sanitizeUrlTitle(task.title)}${window.location.search}`, { state: { fromNavigation: true } });
    }
  }, [navigate]);

  const handleSubmitTask = async (taskData: Partial<Task>) => {
    // Don't catch errors here - let TaskDetailsModal handle them
    if (editingTask) {
      await apiClient.updateTask(editingTask.id, taskData);
    } else {
      // Set status to 'Draft' if in draft mode
      const finalTaskData = isDraftMode
        ? { ...taskData, status: 'Draft' }
        : taskData;
      const createdTask = await apiClient.createTask(finalTaskData as Omit<Task, "id" | "createdDate">);

      // Show task creation confirmation
      setTaskConfirmation({ task: createdTask, isDraft: isDraftMode });

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setTaskConfirmation(null);
      }, 4000);
    }
    handleCloseModal();
    await refreshData();

    // If we're on the drafts page and created a draft, trigger a refresh
    if (isDraftMode && window.location.pathname === '/drafts') {
      // Trigger refresh by updating a timestamp that DraftsList can watch
      window.dispatchEvent(new Event('drafts-updated'));
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      await apiClient.archiveTask(taskId);
      handleCloseModal();
      await refreshData();
    } catch (error) {
      console.error('Failed to archive task:', error);
    }
  };

  // Show loading state while checking initialization
  if (isInitialized === null) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  // Show initialization screen if not initialized
  if (isInitialized === false) {
    return (
      <ThemeProvider>
        <InitializationScreen onInitialized={handleInitialized} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
        <Routes>
            <Route
            path="/"
            element={
              <Layout
                projectName={projectName}
                showSuccessToast={showSuccessToast}
                onDismissToast={() => setShowSuccessToast(false)}
                tasks={tasks}
                docs={docs}
                decisions={decisions}
                archivedDocs={archivedDocs}
                completedTasks={completedTasks}
                isLoading={isLoading}
                onRefreshData={refreshData}
              />
            }
          >
            <Route
              index
              element={
                <BoardPage
                  onEditTask={handleDeepLinkEditTask}
                  onNewTask={handleNewTask}
                tasks={tasks}
                onRefreshData={refreshData}
                statuses={statuses}
                terminalStatuses={config?.terminalStatuses}
                blockedStatuses={config?.blockedStatuses}
                milestones={milestones}
                availableLabels={availableLabels}
                milestoneEntities={milestoneEntities}
                archivedMilestones={archivedMilestones}
                isLoading={isLoading}
                labelColors={labelColors}
                authorColors={authorColors}
                autoCollapseMilestones={config?.autoCollapseMilestones}
              />
            }
          />
            <Route
              path="board/:id/:title"
              element={
                <BoardPage
                  onEditTask={handleDeepLinkEditTask}
                  onNewTask={handleNewTask}
                tasks={tasks}
                onRefreshData={refreshData}
                statuses={statuses}
                terminalStatuses={config?.terminalStatuses}
                blockedStatuses={config?.blockedStatuses}
                milestones={milestones}
                availableLabels={availableLabels}
                milestoneEntities={milestoneEntities}
                archivedMilestones={archivedMilestones}
                isLoading={isLoading}
                labelColors={labelColors}
                authorColors={authorColors}
                autoCollapseMilestones={config?.autoCollapseMilestones}
              />
            }
          />
            <Route
              path="tasks"
              element={
	                <TaskList
	                  onEditTask={handleDeepLinkEditTask}
	                  onNewTask={handleNewTask}
	                  tasks={tasks}
	                  availableStatuses={statuses}
	                  availableLabels={availableLabels}
	                  availableMilestones={milestones}
	                  milestoneEntities={milestoneEntities}
	                  archivedMilestones={archivedMilestones}
	                  onRefreshData={refreshData}
	                  labelColors={labelColors}
	                  authorColors={authorColors}
	                />
	              }
	            />
            <Route
              path="tasks/:id"
              element={
	                <TaskList
	                  onEditTask={handleDeepLinkEditTask}
	                  onNewTask={handleNewTask}
	                  tasks={tasks}
	                  availableStatuses={statuses}
	                  availableLabels={availableLabels}
	                  availableMilestones={milestones}
	                  milestoneEntities={milestoneEntities}
	                  archivedMilestones={archivedMilestones}
	                  onRefreshData={refreshData}
	                  labelColors={labelColors}
	                  authorColors={authorColors}
	                />
	              }
	            />
            <Route
              path="tasks/:id/:title"
              element={
	                <TaskList
	                  onEditTask={handleDeepLinkEditTask}
	                  onNewTask={handleNewTask}
	                  tasks={tasks}
	                  availableStatuses={statuses}
	                  availableLabels={availableLabels}
	                  availableMilestones={milestones}
	                  milestoneEntities={milestoneEntities}
	                  archivedMilestones={archivedMilestones}
	                  onRefreshData={refreshData}
	                  labelColors={labelColors}
	                  authorColors={authorColors}
	                />
	              }
	            />
            <Route
              path="milestones"
              element={
              <MilestonesPage
                tasks={tasks}
                statuses={statuses}
                milestoneEntities={milestoneEntities}
                archivedMilestones={archivedMilestones}
                onEditTask={handleEditTask}
                onRefreshData={refreshData}
              />
            }
          />
            <Route path="drafts" element={<DraftsList onEditTask={handleEditTask} onNewDraft={handleNewDraft} />} />
            {[
              { path: "documentation", Component: DocumentationDetail, props: { docs } },
              { path: "documentation/:id", Component: DocumentationDetail, props: { docs } },
              { path: "documentation/:id/:title", Component: DocumentationDetail, props: { docs } },
              { path: "decisions", Component: DecisionDetail, props: { decisions } },
              { path: "decisions/:id", Component: DecisionDetail, props: { decisions } },
              { path: "decisions/:id/:title", Component: DecisionDetail, props: { decisions } },
            ].map(({ path, Component, props }) => (
              <Route key={path} path={path} element={<Component {...props as any} onRefreshData={refreshData} />} />
            ))}
            <Route path="statistics" element={<Statistics tasks={tasks} isLoading={isLoading} onEditTask={handleEditTask} projectName={projectName} />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>

        <TaskDetailsModal
          task={editingTask || undefined}
          isOpen={showModal}
          onClose={handleCloseModal}
          onSaved={refreshData}
          onSubmit={handleSubmitTask}
          onArchive={editingTask ? () => handleArchiveTask(editingTask.id) : undefined}
          availableStatuses={isDraftMode ? ['Draft', ...statuses] : statuses}
          terminalStatuses={config?.terminalStatuses}
          blockedStatuses={config?.blockedStatuses}
          availableMilestones={milestones}
          milestoneEntities={milestoneEntities}
          archivedMilestoneEntities={archivedMilestones}
          isDraftMode={isDraftMode}
          definitionOfDoneDefaults={config?.definitionOfDone ?? []}
          onNavigateToTask={handleNavigateToTask}
          availableLabels={availableLabels}
          labelColorMap={labelColors}
          availableAuthors={availableAuthors}
        />

        {/* Task Creation Confirmation Toast */}
        {taskConfirmation && (
          <SuccessToast
            message={`${taskConfirmation.isDraft ? 'Draft' : 'Task'} "${taskConfirmation.task.title}" created successfully! (${taskConfirmation.task.id.replace('task-', '')})`}
            onDismiss={() => setTaskConfirmation(null)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        )}
    </ThemeProvider>
  );
}

export default App;
