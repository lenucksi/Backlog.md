import { Outlet } from 'react-router-dom';
import SideNavigation from './SideNavigation';
import Navigation from './Navigation';
import DuplicateIdWarning from './DuplicateIdWarning';
import { HealthIndicator, HealthSuccessToast } from './HealthIndicator';
import { type Task, type Document, type Decision } from '../../types';

interface LayoutProps {
	projectName: string;
	showSuccessToast: boolean;
	onDismissToast: () => void;
	tasks: Task[];
	docs: Document[];
	decisions: Decision[];
	archivedDocs: Array<{ id: string; title: string; path: string }>;
	completedTasks: Task[];
	isLoading: boolean;
	onRefreshData: () => Promise<void>;
}

export default function Layout({
	projectName,
	showSuccessToast,
	onDismissToast,
	tasks,
	docs,
	decisions,
	archivedDocs,
	completedTasks,
	isLoading,
	onRefreshData
}: LayoutProps) {
	return (
		<div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden transition-colors duration-200">
			<DuplicateIdWarning />
			<HealthIndicator />
			<SideNavigation
				tasks={tasks}
				docs={docs}
				decisions={decisions}
				archivedDocs={archivedDocs}
				completedTasks={completedTasks}
				isLoading={isLoading}
				onRefreshData={onRefreshData}
			/>
			<div className="flex-1 flex flex-col min-h-0 min-w-0">
				<Navigation projectName={projectName} />
				<main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
					<Outlet context={{ tasks, docs, decisions, isLoading, onRefreshData }} />
				</main>
			</div>
			{showSuccessToast && (
				<HealthSuccessToast onDismiss={onDismissToast} />
			)}
		</div>
	);
}
