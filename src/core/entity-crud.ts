import type { Core } from "../index.ts";
import type { Decision, Document, DocumentCreateInput, DocumentUpdateInput } from "../types/index.ts";
import { normalizeDocumentId } from "../utils/document-id.ts";
import { getDocumentSubPathFromRelativePath, normalizeDocumentSubPath } from "../utils/document-path.ts";
import { generateNextDocId } from "../utils/id-generators.ts";
import { normalizeStringList } from "../utils/task-builders.ts";
import { normalizeDocumentTypeInput } from "./task-input-resolvers.ts";
import { formatDateStamp } from "./task-operations.ts";

export interface EntityCrudDeps {
	filesystem: {
		saveDecision(decision: Decision): Promise<void>;
		loadDecision(id: string): Promise<Decision | null>;
		saveDocument(doc: Document, subPath?: string): Promise<string>;
		loadDocument(id: string): Promise<Document | null>;
	};
	stageAndCommit: (message: string, autoCommit?: boolean) => Promise<void>;
	withCreateLock: <T>(fn: () => Promise<T>) => Promise<T>;
	getDocument: (id: string) => Promise<Document | null>;
	/** Known code smell: Core needed for dynamic import in createDecisionWithTitle. Will be fixed in a follow-up. */
	core: Core;
}

export async function createDecision(deps: EntityCrudDeps, decision: Decision, autoCommit?: boolean): Promise<void> {
	await deps.filesystem.saveDecision(decision);
	await deps.stageAndCommit(`backlog: Add decision ${decision.id}`, autoCommit);
}

export async function editDecision(deps: EntityCrudDeps, id: string, updates: { labels?: string[] }): Promise<void> {
	const existingDecision = await deps.filesystem.loadDecision(id);
	if (!existingDecision) {
		throw new Error(`Decision ${id} not found`);
	}

	const updatedDecision: Decision = {
		...existingDecision,
		...(updates.labels !== undefined && { labels: updates.labels }),
	};

	await createDecision(deps, updatedDecision);
}

export async function resolveDecision(
	deps: EntityCrudDeps,
	decisionId: string,
	autoCommit?: boolean,
): Promise<Decision> {
	const existingDecision = await deps.filesystem.loadDecision(decisionId);
	if (!existingDecision) {
		throw new Error(`Decision ${decisionId} not found`);
	}
	if (existingDecision.status === "superseded") {
		throw new Error(`Decision ${decisionId} is already superseded`);
	}

	existingDecision.status = "superseded";
	await createDecision(deps, existingDecision, autoCommit);
	return existingDecision;
}

export async function updateDecisionFromContent(
	deps: EntityCrudDeps,
	decisionId: string,
	content: string,
	autoCommit?: boolean,
): Promise<void> {
	const existingDecision = await deps.filesystem.loadDecision(decisionId);
	if (!existingDecision) {
		throw new Error(`Decision ${decisionId} not found`);
	}

	const { parseFrontmatter: parseFm } = await import("../utils/frontmatter.ts");
	const { data } = parseFm(content);

	const extractSection = (content: string, sectionName: string): string | undefined => {
		const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=## |$)`, "i");
		const match = content.match(regex);
		return match ? match[1]?.trim() : undefined;
	};

	const updatedDecision = {
		...existingDecision,
		title: typeof data.title === "string" ? data.title : existingDecision.title,
		status: typeof data.status === "string" ? data.status : existingDecision.status,
		date: typeof data.date === "string" ? data.date : existingDecision.date,
		context: extractSection(content, "Context") || existingDecision.context,
		decision: extractSection(content, "Decision") || existingDecision.decision,
		consequences: extractSection(content, "Consequences") || existingDecision.consequences,
		alternatives: extractSection(content, "Alternatives") || existingDecision.alternatives,
		supersedes: typeof data.supersedes === "string" ? data.supersedes : existingDecision.supersedes,
		supersededBy: typeof data.supersededBy === "string" ? data.supersededBy : existingDecision.supersededBy,
	};

	await createDecision(deps, updatedDecision as Decision, autoCommit);
}

export async function createDecisionWithTitle(
	deps: EntityCrudDeps,
	title: string,
	autoCommit?: boolean,
): Promise<Decision> {
	const { generateNextDecisionId } = await import("../commands/decision.ts");
	const id = await generateNextDecisionId(deps.core);

	const decision: Decision = {
		id,
		title,
		date: formatDateStamp(),
		status: "proposed",
		context: "[Describe the context and problem that needs to be addressed]",
		decision: "[Describe the decision that was made]",
		consequences: "[Describe the consequences of this decision]",
		rawContent: "",
	};

	await createDecision(deps, decision, autoCommit);
	return decision;
}

export async function createDocument(
	deps: EntityCrudDeps,
	doc: Document,
	autoCommit?: boolean,
	subPath = "",
): Promise<void> {
	const relativePath = await deps.filesystem.saveDocument(doc, normalizeDocumentSubPath(subPath));
	doc.path = relativePath;

	await deps.stageAndCommit(`backlog: Add document ${doc.id}`, autoCommit);
}

export async function updateDocument(
	deps: EntityCrudDeps,
	existingDoc: Document,
	content: string,
	autoCommit?: boolean,
): Promise<void> {
	await updateDocumentFromInput(
		deps,
		{
			id: existingDoc.id,
			title: existingDoc.title,
			type: existingDoc.type,
			tags: existingDoc.tags,
			labels: existingDoc.labels,
			content,
			...(existingDoc.path !== undefined && { path: getDocumentSubPathFromRelativePath(existingDoc.path) }),
		},
		autoCommit,
	);
}

export async function createDocumentWithId(
	deps: EntityCrudDeps,
	title: string,
	content: string,
	autoCommit?: boolean,
): Promise<Document> {
	return await createDocumentFromInput(deps, { title, content }, autoCommit);
}

export async function createDocumentFromInput(
	deps: EntityCrudDeps,
	input: DocumentCreateInput,
	autoCommit?: boolean,
): Promise<Document> {
	const title = input.title.trim();
	if (!title) {
		throw new Error("Title is required to create a document.");
	}

	const subPath = normalizeDocumentSubPath(input.path);
	const labels = normalizeStringList(input.labels);
	const tags = normalizeStringList(input.tags);
	const type = normalizeDocumentTypeInput(input.type) ?? "other";
	const document = await deps.withCreateLock(async () => {
		const id = normalizeDocumentId(await generateNextDocId(deps.core));
		const document: Document = {
			id,
			title,
			type,
			createdDate: formatDateStamp(),
			rawContent: input.content ?? "",
			...(labels && labels.length > 0 && { labels }),
			...(tags && tags.length > 0 && { tags }),
		};

		await createDocument(deps, document, autoCommit, subPath);
		return document;
	});

	return (await deps.getDocument(document.id)) ?? document;
}

export async function updateDocumentFromInput(
	deps: EntityCrudDeps,
	input: DocumentUpdateInput,
	autoCommit?: boolean,
): Promise<Document> {
	const existingDoc = await deps.getDocument(input.id);
	if (!existingDoc) {
		throw new Error(`Document not found: ${input.id}`);
	}

	const normalizedTitle = input.title?.trim();
	if (input.title !== undefined && !normalizedTitle) {
		throw new Error("Document title cannot be empty.");
	}

	const labels = input.labels !== undefined ? normalizeStringList(input.labels) : existingDoc.labels;
	const tags = input.tags !== undefined ? normalizeStringList(input.tags) : existingDoc.tags;
	const type = normalizeDocumentTypeInput(input.type) ?? existingDoc.type;
	const subPath =
		input.path === undefined
			? getDocumentSubPathFromRelativePath(existingDoc.path)
			: normalizeDocumentSubPath(input.path);
	const updatedDoc: Document = {
		...existingDoc,
		id: normalizeDocumentId(existingDoc.id),
		title: normalizedTitle ?? existingDoc.title,
		type,
		rawContent: input.content ?? existingDoc.rawContent,
		updatedDate: formatDateStamp(),
		labels: labels && labels.length > 0 ? labels : undefined,
		tags: tags && tags.length > 0 ? tags : undefined,
	};

	await createDocument(deps, updatedDoc, autoCommit, subPath);
	return (await deps.getDocument(existingDoc.id)) ?? updatedDoc;
}
