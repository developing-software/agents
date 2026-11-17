import type { McpServer } from "@modelcontextprotocol/server";
import { Issue } from "@agents/core/issue";
import { tools } from "../common";

export function issue(server: McpServer) {
  const tool = tools(server);
  const read = tools(server, { readOnlyHint: true });

  read("issue_list", Issue.list);
  read.id("issue_get", Issue.fromID);
  read("issue_stages", Issue.stages);
  tool("issue_create", Issue.create);

  tool("issue_update", Issue.update, async (input) => {
    await Issue.update(input);
    return Issue.fromID(input.id);
  });

  tool("issue_move", Issue.move, async (input) => {
    await Issue.move(input);
    return Issue.fromID(input.id);
  });

  tool("issue_rename_stage", Issue.rename, async (input) => {
    await Issue.rename(input);
    return Issue.stages(input);
  });

  tool("issue_annotate", Issue.annotate);

  tool.id("issue_remove", Issue.remove, async (id) => {
    await Issue.remove(id);
    return "ok";
  });
}
