import React from 'react';
import { type Task } from '../../types';
import { sortByPriority } from '../../utils/task-sorting';
import type { ReorderTaskPayload } from '../lib/api';
import TaskCard from './TaskCard';
import { taskIdsEqual } from '../../utils/task-path';

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onTaskReorder?: (payload: ReorderTaskPayload) => void;
  dragSourceStatus?: string | null;
  dragSourceLane?: string | null;
  onDragStart?: (context: { status: string; laneId?: string | null }) => void;
  onDragEnd?: () => void;
  onCleanup?: () => void;
  laneId?: string;
  targetMilestone?: string | null;
  blockedStatuses?: string[];
  labelColors?: Record<string, string>;
  authorColors?: Record<string, string>;
}

const TaskColumn: React.FC<TaskColumnProps> = ({
  title,
  tasks,
  onTaskUpdate,
  onEditTask,
  onTaskReorder,
  dragSourceStatus,
  dragSourceLane,
  onDragStart,
  onDragEnd,
  onCleanup,
  laneId,
  targetMilestone,
  blockedStatuses,
  labelColors,
  authorColors,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [_draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [dropPosition, setDropPosition] = React.useState<{ index: number; position: 'before' | 'after' } | null>(null);
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const columnActionsId = React.useId();
  const canSortByPriority = Boolean(onTaskReorder) && tasks.length > 1 && tasks.every(task => !task.branch);

  React.useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleSortByPriority = () => {
    if (!onTaskReorder || !canSortByPriority) {
      setShowMenu(false);
      return;
    }

    const sortedTasks = sortByPriority(tasks);
    const orderedTaskIds = sortedTasks.map(t => t.id);

    const currentIds = tasks.map(t => t.id);
    const hasChanged = orderedTaskIds.some((id, index) => id !== currentIds[index]);
    const leadTaskId = orderedTaskIds[0];

    if (hasChanged && leadTaskId) {
      onTaskReorder({
        taskId: leadTaskId,
        targetStatus: title,
        orderedTaskIds,
        ...(targetMilestone !== undefined ? { targetMilestone } : {}),
      });
    }

    setShowMenu(false);
  };

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('complete')) {
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 transition-colors duration-200';
    }
    if (statusLower.includes('progress') || statusLower.includes('doing')) {
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 transition-colors duration-200';
    }
    const isBlocked =
      blockedStatuses && blockedStatuses.length > 0
        ? blockedStatuses.some((bs) => bs.toLowerCase() === statusLower)
        : statusLower.includes('blocked') || statusLower.includes('stuck');
    if (isBlocked) {
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 transition-colors duration-200';
    }
    return 'bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200 transition-colors duration-200';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropPosition(null);

    const droppedTaskId = e.dataTransfer.getData('text/plain');
    const sourceStatus = e.dataTransfer.getData('text/status');

    if (!droppedTaskId) return;

    if (!onTaskReorder) {
      return;
    }

    const columnWithoutDropped = tasks.filter((task) => task.id !== droppedTaskId);

    let insertIndex = columnWithoutDropped.length;
    if (dropPosition) {
      const { index, position } = dropPosition;
      const baseIndex = position === 'before' ? index : index + 1;
      let count = 0;
      for (let i = 0; i < Math.min(baseIndex, tasks.length); i += 1) {
        if (tasks[i]?.id === droppedTaskId) {
          continue;
        }
        count += 1;
      }
      insertIndex = count;
    }

    const orderedTaskIds = columnWithoutDropped.map((task) => task.id);
    orderedTaskIds.splice(insertIndex, 0, droppedTaskId);

    const isSameColumn = sourceStatus === title;
    const isOrderUnchanged =
      isSameColumn &&
      orderedTaskIds.length === tasks.length &&
      orderedTaskIds.every((taskId, idx) => taskId === tasks[idx]?.id);

    if (isOrderUnchanged) {
      return;
    }

    onTaskReorder({
      taskId: droppedTaskId,
      targetStatus: title,
      orderedTaskIds,
      ...(targetMilestone !== undefined ? { targetMilestone } : {}),
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set to false if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDropPosition(null);
    }
  };

  const handleDragOverColumn = (e: React.DragEvent) => {
    e.preventDefault();
    // Clear drop position if dragging in empty space
    const target = e.target as HTMLElement;
    if (target === e.currentTarget || target.classList.contains('space-y-3')) {
      setDropPosition(null);
    }
  };

  const [collapsedParents, setCollapsedParents] = React.useState<Record<string, boolean>>({});

  const isEmpty = tasks.length === 0;

  // Group subtasks under their parents within this column
  const { parentTasks, childTasksByParent, orphanChildren } = React.useMemo(() => {
    const childrenByParent = new Map<string, Task[]>();
    const childIds = new Set<string>();

    for (const t of tasks) {
      if (t.parentTaskId) {
        childIds.add(t.id);
        const existing = childrenByParent.get(t.parentTaskId) || [];
        existing.push(t);
        childrenByParent.set(t.parentTaskId, existing);
      }
    }

    const parents: Task[] = [];
    const orphans: Task[] = [];

    for (const t of tasks) {
      if (t.parentTaskId && tasks.some((p) => taskIdsEqual(p.id, t.parentTaskId ?? ""))) {
        continue; // skip children whose parent is in this column
      }
      if (t.parentTaskId && !tasks.some((p) => taskIdsEqual(p.id, t.parentTaskId ?? ""))) {
        orphans.push(t); // child without parent in this column
        continue;
      }
      parents.push(t);
    }

    return { parentTasks: parents, childTasksByParent: childrenByParent, orphanChildren: orphans };
  }, [tasks]);

  return (
    <div
      className={`rounded-lg p-4 transition-colors duration-200 h-full ${
        isEmpty ? 'min-h-24' : 'min-h-96'
      } ${
        isDragOver && (dragSourceStatus !== title || (dragSourceLane ?? null) !== (laneId ?? null))
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 border-dashed'
          : isEmpty
            ? 'bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50'
            : 'bg-white border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOverColumn}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-200">{title}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-circle ${getStatusBadgeClass(title)}`}>
            {tasks.length}
          </span>
        </div>

        {canSortByPriority && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none"
              title="Column actions"
              aria-label="Column actions"
              aria-haspopup="menu"
              aria-expanded={showMenu}
              aria-controls={columnActionsId}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div
                id={columnActionsId}
                role="menu"
                className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 py-1 ring-1 ring-black ring-opacity-5"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSortByPriority}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors duration-150"
                >
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Sort by Priority
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {parentTasks.map((parentTask) => {
          const children = childTasksByParent.get(parentTask.id) || [];
          const isCollapsed = collapsedParents[parentTask.id] || false;

          return (
            <div key={parentTask.id} className="relative">
              {/* Parent card */}
              <div className="relative">
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCollapsedParents((prev) => ({ ...prev, [parentTask.id]: !isCollapsed }))}
                    className="absolute -left-1 top-3 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-xs"
                    title={isCollapsed ? "Show subtasks" : "Hide subtasks"}
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <TaskCard
                  task={parentTask}
                  onUpdate={onTaskUpdate}
                  onEdit={onEditTask}
                  onDragStart={() => {
                    setDraggedTaskId(parentTask.id);
                    onDragStart?.({ status: title, laneId: laneId ?? null });
                  }}
                  onDragEnd={() => {
                    setDraggedTaskId(null);
                    setDropPosition(null);
                    onDragEnd?.();
                  }}
                  status={title}
                  laneId={laneId}
                  labelColors={labelColors}
                  authorColors={authorColors}
                />
                {children.length > 0 && (
                  <div className="mt-1 ml-1">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      {children.length} subtask{children.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Children (indented under parent) */}
              {!isCollapsed && children.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                  {children.map((child) => (
                    <div key={child.id} className="relative">
                      <TaskCard
                        task={child}
                        onUpdate={onTaskUpdate}
                        onEdit={onEditTask}
                        onDragStart={() => {
                          setDraggedTaskId(child.id);
                          onDragStart?.({ status: title, laneId: laneId ?? null });
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDropPosition(null);
                          onDragEnd?.();
                        }}
                        status={title}
                        laneId={laneId}
                        labelColors={labelColors}
                        authorColors={authorColors}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Orphan children (subtasks whose parent is not in this column) */}
        {orphanChildren.map((orphan) => (
          <div key={orphan.id} className="relative">
            <TaskCard
              task={orphan}
              onUpdate={onTaskUpdate}
              onEdit={onEditTask}
              onDragStart={() => {
                setDraggedTaskId(orphan.id);
                onDragStart?.({ status: title, laneId: laneId ?? null });
              }}
              onDragEnd={() => {
                setDraggedTaskId(null);
                setDropPosition(null);
                onDragEnd?.();
              }}
              status={title}
              laneId={laneId}
              labelColors={labelColors}
              authorColors={authorColors}
            />
          </div>
        ))}

        {/* Drop zone indicator - only show in different columns */}
        {isDragOver && dragSourceStatus !== title && (
          <div className="border-2 border-green-400 dark:border-green-500 border-dashed rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-center transition-colors duration-200">
            <div className="text-green-600 dark:text-green-400 text-sm font-medium transition-colors duration-200">
              Drop task here to change status
            </div>
          </div>
        )}

        {isEmpty && !isDragOver && (
          <div className="text-center py-2 text-gray-400 dark:text-gray-500 text-xs transition-colors duration-200">
            {dragSourceStatus && dragSourceStatus !== title
              ? `Drop to move`
              : `Empty`}
          </div>
        )}

        {/* Cleanup button for the configured terminal column */}
        {onCleanup && tasks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
	            <button
	              onClick={onCleanup}
	              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
	              title="Clean up old completed tasks"
	            >
	              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
	                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clean Up Old Tasks
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskColumn;
