import { type Elysia, type TSchema, t } from "elysia";
import { IdParam } from "./schemas";

// biome-ignore lint/suspicious/noExplicitAny: Elysia requires <any> for its generic builder pattern
export type ElysiaApp = Elysia<any>;

// ===== Bulk Routes =====

export type BulkRouteDef = {
	path: string;
	handler: (req: Request) => Promise<Response>;
	summary: string;
	description: string;
};

export function registerBulkRoutes(app: ElysiaApp, routes: BulkRouteDef[]): ElysiaApp {
	let current = app;
	for (const { path, handler, summary, description } of routes) {
		current = current.post(path, ({ request }) => handler(request), {
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
	return current;
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

export function registerEntityRoutes(
	app: ElysiaApp,
	prefix: string,
	handlers: EntityCRUDHandlers,
	opts: EntityCRUDMeta,
): ElysiaApp {
	const base = `/api/${prefix}`;
	const idKey: "id" | "name" = opts.useNameParam ? "name" : "id";
	const paramSchema = getParamSchema(opts.useNameParam, opts.entity);
	const desc = opts.descriptions;
	let current = app;

	if (handlers.list) {
		const handler = handlers.list as (...args: unknown[]) => Promise<Response>;
		const needsRequest = handlerArity(handler) > 0;
		current = current.get(
			base,
			needsRequest ? ({ request }: { request: Request }) => handler(request) : () => handler(),
			{
				...(opts.listQuery ? { query: opts.listQuery } : {}),
				detail: desc.list,
			},
		);
	}

	if (handlers.create) {
		current = current.post(
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
		current = current.get(
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

		current = current.put(`${base}/:${idKey}`, updateHandler, {
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

		current = current.delete(`${base}/:${idKey}`, deleteHandler, {
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

	return current;
}
