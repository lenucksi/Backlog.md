// aislop-ignore-file narrative-comment -- all narrative comments here are section separators
import { Elysia, type TSchema, t } from "elysia";
import { IdParam } from "./schemas";

// ===== Bulk Routes =====

export type BulkRouteDef = {
	path: string;
	handler: (req: Request) => Promise<Response>;
	summary: string;
	description: string;
};

export function createBulkRoutes(routes: BulkRouteDef[]) {
	const app = new Elysia({ name: "bulk-routes" });
	for (const { path, handler, summary, description } of routes) {
		app.post(path, ({ request }) => handler(request), {
			detail: {
				summary,
				description,
				tags: ["Tasks"],
				responses: {
					200: {
						description: "BulkOperationResult with succeeded/failed arrays",
					},
				},
			},
		});
	}
	return app;
}

// ===== Entity CRUD Routes =====

export type EntityCRUDHandlers = {
	list?: (() => Promise<Response>) | ((req: Request) => Promise<Response>);
	create?: (req: Request) => Promise<Response>;
	get?: (id: string) => Promise<Response>;
	update?:
		| ((req: Request, id: string) => Promise<Response>)
		| ((req: Request & { params: { name: string } }) => Promise<Response>);
	delete?: ((id: string) => Promise<Response>) | ((req: Request & { params: { name: string } }) => Promise<Response>);
};

export type RouteDetail = {
	summary: string;
	description: string;
};

export type CRUDRouteDescriptions = {
	list: RouteDetail;
	create: RouteDetail & { responseDesc: string };
	get: RouteDetail & { responseDesc: string; notFoundDesc: string };
	update: RouteDetail & { responseDesc: string; notFoundDesc: string };
	delete?: RouteDetail & { responseDesc: string; notFoundDesc: string };
};

export type EntityCRUDMeta = {
	tag: string;
	entity: string;
	descriptions: CRUDRouteDescriptions;
	listQuery?: TSchema;
	useNameParam?: boolean;
};

function getParamSchema(useNameParam: boolean | undefined, entity: string) {
	if (useNameParam) {
		return t.Object({
			name: t.String({
				description: `${entity} name (URL-encoded)`,
			}),
		});
	}
	return IdParam;
}

function handlerArity(fn: (...args: never[]) => unknown): number {
	return fn.length;
}

export function createEntityRoutes(prefix: string, handlers: EntityCRUDHandlers, opts: EntityCRUDMeta) {
	const app = new Elysia({ name: `entity-${prefix}` });
	const base = `/api/${prefix}`;
	const idKey: "id" | "name" = opts.useNameParam ? "name" : "id";
	const paramSchema = getParamSchema(opts.useNameParam, opts.entity);
	const desc = opts.descriptions;

	if (handlers.list) {
		const handler = handlers.list as (...args: unknown[]) => Promise<Response>;
		const needsRequest = handlerArity(handler) > 0;
		app.get(base, needsRequest ? ({ request }: { request: Request }) => handler(request) : () => handler(), {
			...(opts.listQuery ? { query: opts.listQuery } : {}),
			detail: desc.list,
		});
	}

	if (handlers.create) {
		app.post(
			base,
			({ request }: { request: Request }) => (handlers.create as (req: Request) => Promise<Response>)(request),
			{
				detail: {
					...desc.create,
					tags: [opts.tag],
					responses: {
						201: { description: desc.create.responseDesc },
					},
				},
			},
		);
	}

	if (handlers.get) {
		app.get(
			`${base}/:${idKey}`,
			({ params }: { params: Record<string, string> }) => {
				const paramVal = params[idKey] ?? "";
				return (handlers.get as (id: string) => Promise<Response>)(paramVal);
			},
			{
				params: paramSchema,
				detail: {
					...desc.get,
					tags: [opts.tag],
					responses: {
						200: { description: desc.get.responseDesc },
						404: { description: desc.get.notFoundDesc },
					},
				},
			},
		);
	}

	if (handlers.update) {
		const updateHandler = opts.useNameParam
			? ({ request, params }: { request: Request; params: Record<string, string> }) => {
					const paramVal = params[idKey] ?? "";
					return (handlers.update as (req: Request & { params: { name: string } }) => Promise<Response>)({
						...request,
						params: { name: paramVal },
					});
				}
			: ({ request, params }: { request: Request; params: Record<string, string> }) => {
					const paramVal = params[idKey] ?? "";
					return (handlers.update as (req: Request, id: string) => Promise<Response>)(request, paramVal);
				};

		app.put(`${base}/:${idKey}`, updateHandler, {
			params: paramSchema,
			detail: {
				...desc.update,
				tags: [opts.tag],
				responses: {
					200: { description: desc.update.responseDesc },
					404: { description: desc.update.notFoundDesc },
				},
			},
		});
	}

	if (handlers.delete && desc.delete) {
		const deleteHandler = opts.useNameParam
			? ({ request, params }: { request: Request; params: Record<string, string> }) => {
					const paramVal = params[idKey] ?? "";
					return (handlers.delete as (req: Request & { params: { name: string } }) => Promise<Response>)({
						...request,
						params: { name: paramVal },
					});
				}
			: ({ params }: { params: Record<string, string> }) => {
					const paramVal = params[idKey] ?? "";
					return (handlers.delete as (id: string) => Promise<Response>)(paramVal);
				};

		app.delete(`${base}/:${idKey}`, deleteHandler, {
			params: paramSchema,
			detail: {
				...desc.delete,
				tags: [opts.tag],
				responses: {
					200: { description: desc.delete.responseDesc },
					404: { description: desc.delete.notFoundDesc },
				},
			},
		});
	}

	return app;
}
