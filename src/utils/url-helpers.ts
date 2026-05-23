export function sanitizeUrlTitle(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9\-_]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function stripIdPrefix(id: string): string {
	return id.replace(/^[a-z]+-/i, "");
}

export function createUrlPath(basePath: string, id: string, title: string): string {
	const sanitizedTitle = sanitizeUrlTitle(title);
	const cleanId = stripIdPrefix(id);
	return `${basePath}/${cleanId}/${sanitizedTitle}`;
}
