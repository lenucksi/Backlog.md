import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Document } from "../../types";
import ErrorBoundary from "../components/ErrorBoundary";
import { Icons } from "../components/icons";
import { useTheme } from "../contexts/ThemeContext";
import { apiClient } from "../lib/api";
import { sanitizeUrlTitle } from "../utils/urlHelpers";
import MermaidMarkdown from "./MermaidMarkdown";
import PasteAwareMDEditor from "./PasteAwareMDEditor";
import { SuccessToast } from "./SuccessToast";

function optionalUpdateValue<T>(changed: boolean, value: T): T | undefined {
	return changed ? value : undefined;
}

// Custom MDEditor wrapper for proper height handling
const MarkdownEditor = memo(function MarkdownEditor({
	value,
	onChange,
	isEditing,
}: {
	value: string;
	onChange?: (val: string | undefined) => void;
	isEditing: boolean;
	isReadonly?: boolean;
}) {
	const { theme } = useTheme();
	if (!isEditing) {
		// Preview mode - just show the rendered markdown without editor UI
		return (
			<div
				className="prose prose-sm !max-w-none w-full p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
				data-color-mode={theme}
			>
				<MermaidMarkdown source={value} />
			</div>
		);
	}

	// Edit mode - show full editor that fills the available space
	return (
		<div className="h-full w-full flex flex-col">
			<div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
				<PasteAwareMDEditor
					value={value}
					onChange={onChange}
					preview="edit"
					height="100%"
					hideToolbar={false}
					data-color-mode={theme}
					textareaProps={{
						placeholder: "Write your documentation here...",
						style: {
							fontSize: "14px",
							resize: "none",
						},
					}}
				/>
			</div>
		</div>
	);
});

// Utility function to add doc prefix for API calls
const addDocPrefix = (id: string): string => {
	return id.startsWith("doc-") ? id : `doc-${id}`;
};

const getDocumentDirectory = (path?: string): string => {
	if (!path) return "";
	return path
		.split(/[\\/]+/)
		.slice(0, -1)
		.join("/");
};

interface ActionButtonProps {
	variant?: "default" | "danger" | "primary";
	onClick: () => void;
	children: ReactNode;
	icon?: ReactNode;
	disabled?: boolean;
}

const btnBase =
	"inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200";
const variantClasses: Record<NonNullable<ActionButtonProps["variant"]>, string> = {
	default:
		"border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400",
	danger:
		"border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-500 dark:focus:ring-red-400",
	primary:
		"bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-blue-400",
};

function ActionButton({ variant = "default", onClick, children, icon, disabled }: ActionButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`${btnBase} ${variantClasses[variant]} ${disabled ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : ""}`}
		>
			{icon && <span className="mr-2">{icon}</span>}
			{children}
		</button>
	);
}

interface DocumentationDetailProps {
	docs: Document[];
	onRefreshData: () => Promise<void>;
}

export default function DocumentationDetail({ docs, onRefreshData }: DocumentationDetailProps) {
	const { id, title } = useParams<{ id: string; title: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [document, setDocument] = useState<Document | null>(null);
	const [content, setContent] = useState<string>("");
	const [originalContent, setOriginalContent] = useState<string>("");
	const [docTitle, setDocTitle] = useState<string>("");
	const [originalDocTitle, setOriginalDocTitle] = useState<string>("");
	const [docPath, setDocPath] = useState<string>("");
	const [originalDocPath, setOriginalDocPath] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [, setError] = useState<Error | null>(null);
	const [saveError, setSaveError] = useState<Error | null>(null);
	const [isNewDocument, setIsNewDocument] = useState(false);
	const [showSaveSuccess, setShowSaveSuccess] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
	const [backlinks, setBacklinks] = useState<Array<{
		type: "task" | "document" | "decision";
		id: string;
		title: string;
		snippet: string;
	}> | null>(null);

	useEffect(() => {
		if (id && id !== "new") {
			const prefixedId = id.startsWith("doc-") ? id : `doc-${id}`;
			apiClient
				.fetchBacklinks(prefixedId)
				.then(setBacklinks)
				.catch(() => setBacklinks([]));
		}
	}, [id]);

	const loadDocContent = useCallback(async () => {
		if (!id) return;

		try {
			setIsLoading(true);
			setError(null);
			// Find document from props
			const prefixedId = addDocPrefix(id);
			const doc = docs.find((d) => d.id === prefixedId);

			// Always try to fetch the document from API, whether we found it in docs or not
			// This ensures deep linking works even before the parent component loads the docs array
			try {
				const fullDoc = await apiClient.fetchDoc(prefixedId);
				setContent(fullDoc.rawContent || "");
				setOriginalContent(fullDoc.rawContent || "");
				setDocTitle(fullDoc.title || "");
				setOriginalDocTitle(fullDoc.title || "");
				setDocPath(getDocumentDirectory(fullDoc.path));
				setOriginalDocPath(getDocumentDirectory(fullDoc.path));
				// Update document state with full data
				setDocument(fullDoc);
			} catch (fetchError) {
				// If fetch fails and we don't have the doc in props, show error
				if (!doc) {
					setError(new Error(`Document with ID "${prefixedId}" not found`));
					console.error("Failed to load document:", fetchError);
				} else {
					// We have basic info from props even if fetch failed
					setDocument(doc);
					setDocTitle(doc.title || "");
					setOriginalDocTitle(doc.title || "");
					setDocPath(getDocumentDirectory(doc.path));
					setOriginalDocPath(getDocumentDirectory(doc.path));
				}
			}
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Failed to load document");
			setError(error);
			console.error("Failed to load document:", error);
		} finally {
			setIsLoading(false);
		}
	}, [id, docs]);

	useEffect(() => {
		if (id === "new") {
			// Handle new document creation
			setIsNewDocument(true);
			setIsEditing(true);
			setIsLoading(false);
			setDocTitle("");
			setOriginalDocTitle("");
			setDocPath("");
			setOriginalDocPath("");
			setContent("");
			setOriginalContent("");
		} else if (id) {
			setIsNewDocument(false);
			setIsEditing(false); // Ensure we start in preview mode for existing documents
			loadDocContent();
		}
	}, [id, loadDocContent]);

	// Check for edit query parameter to start in edit mode
	useEffect(() => {
		if (searchParams.get("edit") === "true") {
			setIsEditing(true);
			// Remove the edit parameter from URL
			setSearchParams((params) => {
				params.delete("edit");
				return params;
			});
		}
	}, [searchParams, setSearchParams]);

	const handleSave = useCallback(async () => {
		if (!docTitle.trim()) {
			setSaveError(new Error("Document title is required"));
			return;
		}

		try {
			setIsSaving(true);
			setSaveError(null);
			const normalizedTitle = docTitle.trim();
			const normalizedPath = docPath.trim();

			if (isNewDocument) {
				// Create new document
				const result = await apiClient.createDoc(normalizedTitle, content, normalizedPath);
				// Refresh data and navigate to the new document
				await onRefreshData();
				// Show success toast
				setShowSaveSuccess(true);
				setTimeout(() => setShowSaveSuccess(false), 4000);
				// Exit edit mode and navigate to the new document
				setIsEditing(false);
				setIsNewDocument(false);
				setDocTitle(normalizedTitle);
				setOriginalDocTitle(normalizedTitle);
				setDocPath(getDocumentDirectory(result.path) || normalizedPath);
				setOriginalDocPath(getDocumentDirectory(result.path) || normalizedPath);
				// Use the returned document ID for navigation
				const documentId = result.id.replace("doc-", ""); // Remove prefix for URL
				navigate(`/documentation/${documentId}/${sanitizeUrlTitle(normalizedTitle)}`);
			} else {
				// Update existing document
				if (!id) return;

				// Check if title has changed
				const titleChanged = normalizedTitle !== originalDocTitle;
				const pathChanged = normalizedPath !== originalDocPath;

				const updatedDocument = await apiClient.updateDoc(
					addDocPrefix(id),
					content,
					optionalUpdateValue(titleChanged, normalizedTitle),
					optionalUpdateValue(pathChanged, normalizedPath),
				);

				// Update original title to the new value
				if (titleChanged) {
					setDocTitle(normalizedTitle);
					setOriginalDocTitle(normalizedTitle);
				}
				if (pathChanged) {
					const updatedPath = getDocumentDirectory(updatedDocument.path) || normalizedPath;
					setDocPath(updatedPath);
					setOriginalDocPath(updatedPath);
				}

				// Refresh data from parent
				await onRefreshData();
				// Show success toast
				setShowSaveSuccess(true);
				setTimeout(() => setShowSaveSuccess(false), 4000);
				// Exit edit mode and navigate to document detail page (this will load in preview mode)
				setIsEditing(false);
				navigate(`/documentation/${id}/${sanitizeUrlTitle(normalizedTitle)}`);
			}
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Failed to save document");
			setSaveError(error);
			console.error("Failed to save document:", error);
		} finally {
			setIsSaving(false);
		}
	}, [id, docTitle, docPath, originalDocPath, content, isNewDocument, onRefreshData, navigate, originalDocTitle]);

	const handleEdit = () => {
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		if (isNewDocument) {
			// Navigate back for new documents
			navigate("/documentation");
		} else {
			// Revert changes for existing documents
			setContent(originalContent);
			setDocTitle(originalDocTitle);
			setDocPath(originalDocPath);
			setIsEditing(false);
		}
	};

	const handleArchive = useCallback(async () => {
		if (!id) return;
		try {
			await apiClient.archiveDoc(addDocPrefix(id));
			await onRefreshData();
			navigate("/documentation");
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Failed to archive document");
			setError(error);
			console.error("Failed to archive document:", error);
		}
		setConfirmAction(null);
	}, [id, onRefreshData, navigate]);

	const handleDelete = useCallback(async () => {
		if (!id) return;
		try {
			await apiClient.deleteDoc(addDocPrefix(id));
			await onRefreshData();
			navigate("/documentation");
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Failed to delete document");
			setError(error);
			console.error("Failed to delete document:", error);
		}
		setConfirmAction(null);
	}, [id, onRefreshData, navigate]);

	const hasChanges = content !== originalContent || docTitle !== originalDocTitle || docPath !== originalDocPath;

	if (!id) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="text-center">
					<span className="mx-auto h-12 w-12 text-gray-400">
						<Icons.DocumentPage />
					</span>
					<h3 className="mt-2 text-sm font-medium text-gray-900">No document selected</h3>
					<p className="mt-1 text-sm text-gray-500">Select a document from the sidebar to view its content.</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-gray-500">Loading...</div>
			</div>
		);
	}

	return (
		<ErrorBoundary>
			<div className="h-full bg-white dark:bg-gray-900 flex flex-col transition-colors duration-200">
				{/* Header Section - Confluence/Linear Style */}
				<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
					<div className="max-w-4xl mx-auto px-8 py-6">
						<div className="flex items-start justify-between mb-6">
							<div className="flex-1">
								{isEditing ? (
									<div className="space-y-3 mb-2">
										<input
											type="text"
											value={docTitle}
											onChange={(e) => setDocTitle(e.target.value)}
											className="text-3xl font-bold text-gray-900 dark:text-gray-100 w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-200"
											placeholder="Document title"
										/>
										<input
											type="text"
											value={docPath}
											onChange={(e) => setDocPath(e.target.value)}
											className="w-full max-w-md bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-200"
											placeholder="guides/setup"
										/>
									</div>
								) : (
									<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-200">
										{docTitle || document?.title || (title ? decodeURIComponent(title) : `Document ${id}`)}
									</h1>
								)}
								<div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
									<div className="flex items-center gap-2">
										<Icons.Tag />
										<span>ID: {document?.id || `doc-${id}`}</span>
									</div>
									<div className="flex items-center gap-2">
										<Icons.Document />
										<span>Documentation</span>
									</div>
									{document?.path && (
										<div className="flex items-center gap-2">
											<Icons.Folder />
											<span>{document.path}</span>
										</div>
									)}
									{document?.createdDate && (
										<div className="flex items-center gap-2">
											<Icons.Calendar />
											<span>Created: {document.createdDate}</span>
										</div>
									)}
								</div>
							</div>
							<div className="flex items-center gap-3 ml-6">
								{!isEditing ? (
									<>
										{!isNewDocument && (
											<>
												<ActionButton onClick={() => setConfirmAction("archive")} icon={<Icons.Archive />}>
													Archive
												</ActionButton>
												<ActionButton
													variant="danger"
													onClick={() => setConfirmAction("delete")}
													icon={<Icons.Trash />}
												>
													Delete
												</ActionButton>
											</>
										)}
										<ActionButton onClick={handleEdit} icon={<Icons.Edit />}>
											Edit
										</ActionButton>
									</>
								) : (
									<div className="flex items-center gap-2">
										<ActionButton onClick={handleCancelEdit}>Cancel</ActionButton>
										<ActionButton
											variant="primary"
											onClick={handleSave}
											disabled={!hasChanges || isSaving}
											icon={<Icons.Checkmark />}
										>
											{isSaving ? "Saving..." : "Save"}
										</ActionButton>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Content Section */}
				<div className="flex-1 bg-gray-50 dark:bg-gray-800 transition-colors duration-200 flex flex-col">
					<div className="flex-1 p-8 flex flex-col min-h-0">
						<MarkdownEditor value={content} onChange={(val) => setContent(val || "")} isEditing={isEditing} />
					</div>
				</div>

				{/* Referenced By Section */}
				{!isEditing && backlinks && backlinks.length > 0 && (
					<div className="border-t border-gray-200 dark:border-gray-700">
						<div className="max-w-4xl mx-auto px-8 py-4">
							<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Referenced by</h3>
							<div className="space-y-2">
								{backlinks.map((bl) => (
									<div key={`${bl.type}-${bl.id}`} className="text-sm">
										<Link
											to={`/${bl.type === "task" ? "tasks" : bl.type === "document" ? "documentation" : "decisions"}/${bl.id.replace(/^(task-|doc-|decision-)/, "")}`}
											className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
										>
											{bl.id}
										</Link>
										<span className="text-gray-500 dark:text-gray-400"> — {bl.title}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Save Error Alert */}
				{saveError && (
					<div className="border-t border-red-200 bg-red-50 px-8 py-3">
						<div className="flex items-center gap-3">
							<span className="text-red-500">
								<Icons.Warning />
							</span>
							<span className="text-sm text-red-700">Failed to save: {saveError.message}</span>
							<button
								type="button"
								onClick={() => setSaveError(null)}
								className="ml-auto text-red-700 hover:text-red-900"
							>
								<Icons.Close />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Archive/Delete Confirmation Modal */}
			{confirmAction && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
						<div className="flex items-start gap-4">
							<div
								className={`p-2 rounded-circle ${confirmAction === "delete" ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}
							>
								{confirmAction === "delete" ? (
									<span className="size-6 text-red-600 dark:text-red-400">
										<Icons.Warning />
									</span>
								) : (
									<span className="size-6 text-blue-600 dark:text-blue-400">
										<Icons.Archive />
									</span>
								)}
							</div>
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									{confirmAction === "delete" ? "Delete Document" : "Archive Document"}
								</h3>
								<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
									{confirmAction === "delete"
										? `Are you sure you want to permanently delete "${docTitle || document?.title || id}"? This action cannot be undone.`
										: `Archive "${docTitle || document?.title || id}"? It will be moved to the archive directory.`}
								</p>
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-3">
							<ActionButton onClick={() => setConfirmAction(null)}>Cancel</ActionButton>
							<ActionButton
								variant={confirmAction === "delete" ? "danger" : "primary"}
								onClick={confirmAction === "delete" ? handleDelete : handleArchive}
							>
								{confirmAction === "delete" ? "Delete" : "Archive"}
							</ActionButton>
						</div>
					</div>
				</div>
			)}

			{/* Save Success Toast */}
			{showSaveSuccess && (
				<SuccessToast
					message={`Document "${docTitle}" saved successfully!`}
					onDismiss={() => setShowSaveSuccess(false)}
					icon={
						<span className="size-5">
							<Icons.CheckmarkCircle />
						</span>
					}
				/>
			)}
		</ErrorBoundary>
	);
}
