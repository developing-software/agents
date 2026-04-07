import { tool } from "ai";
import { z } from "zod";

export const askUserTool = tool({
  description: `Ask the user a question for clarification before proceeding.
Use this when you need to confirm a decision, disambiguate between options, or gather input.
You can provide multiple-choice options or let the user type a free-text answer.
You can include an ASCII diagram or table in the context field to illustrate your question.`,
  inputSchema: z.object({
    question: z.string().describe("The question to ask the user"),
    options: z
      .array(z.string())
      .optional()
      .describe("Multiple choice options. Omit for free-text answer."),
    context: z
      .string()
      .optional()
      .describe("Additional context, ASCII diagram, or table to show alongside the question"),
  }),
  // No execute — handled client-side via addToolOutput
});
