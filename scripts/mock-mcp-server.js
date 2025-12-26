const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const z = require("zod/v4-mini");

const server = new McpServer({ name: "MockMcpServer", version: "1.0.0" });

server.registerTool(
  "mock.search",
  {
    description: "Return a mock search result",
    inputSchema: {
      query: z.optional(z.string()),
    },
  },
  async (args) => {
    const query = args?.query ? String(args.query) : "";
    return {
      content: [{ type: "text", text: `mock:${query}` }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
