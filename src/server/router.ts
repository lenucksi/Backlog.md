export type RouteHandlers = {
	tasks: {
		handleListTasks: (req: Request) => Promise<Response>;
		handleSearch: (req: Request) => Promise<Response>;
		handleCreateTask: (req: Request) => Promise<Response>;
		handleGetTask: (taskId: string) => Promise<Response>;
		handleUpdateTask: (req: Request, taskId: string) => Promise<Response>;
		handleDeleteTask: (taskId: string) => Promise<Response>;
		handleCompleteTask: (taskId: string) => Promise<Response>;
		handleDemoteTask: (taskId: string) => Promise<Response>;
		handleReorderTask: (req: Request) => Promise<Response>;
		handleCleanupPreview: (req: Request) => Promise<Response>;
		handleCleanupExecute: (req: Request) => Promise<Response>;
		handleGetSequences: () => Promise<Response>;
		handleMoveSequence: (req: Request) => Promise<Response>;
	};
	documents: {
		handleListDocs: () => Promise<Response>;
		handleGetDoc: (docId: string) => Promise<Response>;
		handleCreateDoc: (req: Request) => Promise<Response>;
		handleUpdateDoc: (req: Request, docId: string) => Promise<Response>;
		handleDocumentArchive: (docId: string) => Promise<Response>;
		handleDocumentDelete: (docId: string) => Promise<Response>;
	};
	decisions: {
		handleListDecisions: () => Promise<Response>;
		handleGetDecision: (decisionId: string) => Promise<Response>;
		handleCreateDecision: (req: Request) => Promise<Response>;
		handleUpdateDecision: (req: Request, decisionId: string) => Promise<Response>;
	};
	drafts: {
		handleListDrafts: () => Promise<Response>;
		handlePromoteDraft: (draftId: string) => Promise<Response>;
	};
	milestones: {
		handleListMilestones: () => Promise<Response>;
		handleListArchivedMilestones: () => Promise<Response>;
		handleGetMilestone: (milestoneId: string) => Promise<Response>;
		handleCreateMilestone: (req: Request) => Promise<Response>;
		handleUpdateMilestone: (req: Request, milestoneId: string) => Promise<Response>;
		handleRemoveMilestone: (req: Request, milestoneId: string) => Promise<Response>;
		handleArchiveMilestone: (milestoneId: string) => Promise<Response>;
	};
	config: {
		handleGetStatuses: () => Promise<Response>;
		handleGetConfig: () => Promise<Response>;
		handleUpdateConfig: (req: Request) => Promise<Response>;
	};
	system: {
		handleGetVersion: () => Promise<Response>;
		handleGetStatistics: () => Promise<Response>;
		handleGetStatus: () => Promise<Response>;
		handleInit: (req: Request) => Promise<Response>;
		handleAssetRequest: (req: Request) => Promise<Response>;
	};
};

export function buildRoutes(handlers: RouteHandlers, spaIndexHtml: unknown): Record<string, unknown> {
	const { tasks, documents, decisions, drafts, milestones, config, system } = handlers;

	return {
		"/": spaIndexHtml,
		"/tasks": spaIndexHtml,
		"/milestones": spaIndexHtml,
		"/drafts": spaIndexHtml,
		"/documentation": spaIndexHtml,
		"/documentation/*": spaIndexHtml,
		"/decisions": spaIndexHtml,
		"/decisions/*": spaIndexHtml,
		"/statistics": spaIndexHtml,
		"/settings": spaIndexHtml,

		"/api/tasks": {
			GET: async (req: Request) => await tasks.handleListTasks(req),
			POST: async (req: Request) => await tasks.handleCreateTask(req),
		},
		"/api/tasks/:id": {
			GET: async (req: Request & { params: { id: string } }) => await tasks.handleGetTask(req.params.id),
			PUT: async (req: Request & { params: { id: string } }) => await tasks.handleUpdateTask(req, req.params.id),
			DELETE: async (req: Request & { params: { id: string } }) => await tasks.handleDeleteTask(req.params.id),
		},
		"/api/tasks/:id/complete": {
			POST: async (req: Request & { params: { id: string } }) => await tasks.handleCompleteTask(req.params.id),
		},
		"/api/tasks/:id/demote": {
			POST: async (req: Request & { params: { id: string } }) => await tasks.handleDemoteTask(req.params.id),
		},
		"/api/statuses": {
			GET: async () => await config.handleGetStatuses(),
		},
		"/api/config": {
			GET: async () => await config.handleGetConfig(),
			PUT: async (req: Request) => await config.handleUpdateConfig(req),
		},
		"/api/docs": {
			GET: async () => await documents.handleListDocs(),
			POST: async (req: Request) => await documents.handleCreateDoc(req),
		},
		"/api/docs/:id": {
			GET: async (req: Request & { params: { id: string } }) => await documents.handleGetDoc(req.params.id),
			PUT: async (req: Request & { params: { id: string } }) => await documents.handleUpdateDoc(req, req.params.id),
			DELETE: async (req: Request & { params: { id: string } }) => await documents.handleDocumentDelete(req.params.id),
		},
		"/api/docs/:id/archive": {
			POST: async (req: Request & { params: { id: string } }) => await documents.handleDocumentArchive(req.params.id),
		},
		"/api/decisions": {
			GET: async () => await decisions.handleListDecisions(),
			POST: async (req: Request) => await decisions.handleCreateDecision(req),
		},
		"/api/decisions/:id": {
			GET: async (req: Request & { params: { id: string } }) => await decisions.handleGetDecision(req.params.id),
			PUT: async (req: Request & { params: { id: string } }) =>
				await decisions.handleUpdateDecision(req, req.params.id),
		},
		"/api/drafts": {
			GET: async () => await drafts.handleListDrafts(),
		},
		"/api/drafts/:id/promote": {
			POST: async (req: Request & { params: { id: string } }) => await drafts.handlePromoteDraft(req.params.id),
		},
		"/api/milestones": {
			GET: async () => await milestones.handleListMilestones(),
			POST: async (req: Request) => await milestones.handleCreateMilestone(req),
		},
		"/api/milestones/archived": {
			GET: async () => await milestones.handleListArchivedMilestones(),
		},
		"/api/milestones/:id": {
			GET: async (req: Request & { params: { id: string } }) => await milestones.handleGetMilestone(req.params.id),
			PUT: async (req: Request & { params: { id: string } }) =>
				await milestones.handleUpdateMilestone(req, req.params.id),
			DELETE: async (req: Request & { params: { id: string } }) =>
				await milestones.handleRemoveMilestone(req, req.params.id),
		},
		"/api/milestones/:id/archive": {
			POST: async (req: Request & { params: { id: string } }) => await milestones.handleArchiveMilestone(req.params.id),
		},
		"/api/tasks/reorder": {
			POST: async (req: Request) => await tasks.handleReorderTask(req),
		},
		"/api/tasks/cleanup": {
			GET: async (req: Request) => await tasks.handleCleanupPreview(req),
		},
		"/api/tasks/cleanup/execute": {
			POST: async (req: Request) => await tasks.handleCleanupExecute(req),
		},
		"/api/version": {
			GET: async () => await system.handleGetVersion(),
		},
		"/api/statistics": {
			GET: async () => await system.handleGetStatistics(),
		},
		"/api/status": {
			GET: async () => await system.handleGetStatus(),
		},
		"/api/init": {
			POST: async (req: Request) => await system.handleInit(req),
		},
		"/api/search": {
			GET: async (req: Request) => await tasks.handleSearch(req),
		},
		"/api/sequences": {
			GET: async () => await tasks.handleGetSequences(),
		},
		"/api/sequences/move": {
			POST: async (req: Request) => await tasks.handleMoveSequence(req),
		},
		"/assets/*": {
			GET: async (req: Request) => await system.handleAssetRequest(req),
		},
	};
}
