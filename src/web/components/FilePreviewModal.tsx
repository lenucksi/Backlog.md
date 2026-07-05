import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import Modal from "./Modal";

interface Props {
	path: string | null;
	onClose: () => void;
}

export default function FilePreviewModal({ path, onClose }: Props) {
	const [content, setContent] = useState<string | null>(null);
	const [language, setLanguage] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!path) {
			setContent(null);
			setLanguage("");
			setError(null);
			return;
		}

		setLoading(true);
		setError(null);
		setContent(null);

		apiClient
			.fetchFileContent(path)
			.then((result) => {
				setContent(result.content);
				setLanguage(result.language);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Failed to load file");
			})
			.finally(() => setLoading(false));
	}, [path]);

	const filename = path ? path.split("/").pop() || path : "";

	return (
		<Modal isOpen={!!path} onClose={onClose} title={filename} maxWidthClass="max-w-4xl">
			{loading && (
				<div className="flex items-center justify-center py-12">
					<div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
				</div>
			)}
			{error && <div className="text-sm text-red-600 dark:text-red-400 py-4">{error}</div>}
			{content !== null && (
				<pre className="overflow-auto max-h-[70vh] rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4">
					<code className={`text-sm font-mono leading-relaxed${language ? ` language-${language}` : ""}`}>
						{content}
					</code>
				</pre>
			)}
		</Modal>
	);
}
