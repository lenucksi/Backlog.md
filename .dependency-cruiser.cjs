/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: "no-utils-depends-on-core-or-higher",
			comment: "src/utils/ must not depend on src/core/, src/server/, src/mcp/, src/ui/, or src/web/",
			severity: "error",
			from: { path: "^src/utils/" },
			to: { path: "^src/(core|server|mcp|ui|web)/" },
		},
		{
			name: "no-core-depends-on-server-mcp-ui-web",
			comment: "src/core/ must not depend on src/server/, src/mcp/, src/ui/, or src/web/",
			severity: "error",
			from: { path: "^src/core/" },
			to: { path: "^src/(server|mcp|ui|web)/" },
		},
		{
			name: "no-ui-depends-on-web",
			comment: "src/ui/ (TUI) must not depend on src/web/",
			severity: "error",
			from: { path: "^src/ui/" },
			to: { path: "^src/web/" },
		},
		{
			name: "no-web-depends-on-server",
			comment: "src/web/ must not depend on src/server/",
			severity: "error",
			from: { path: "^src/web/" },
			to: { path: "^src/server/" },
		},
		{
			name: "no-server-depends-on-web",
			comment: "src/server/ must not depend on src/web/ (except static assets: index.html, favicon)",
			severity: "error",
			from: { path: "^src/server/" },
			to: { path: "^src/web/(?!(index\\.html|favicon\\.png$))" },
		},
		{
			name: "no-mcp-depends-on-web",
			comment: "src/mcp/ must not depend on src/web/",
			severity: "error",
			from: { path: "^src/mcp/" },
			to: { path: "^src/web/" },
		},
	],
};
