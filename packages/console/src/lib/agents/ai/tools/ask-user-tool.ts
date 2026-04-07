import { tool } from "ai";
import { z } from "zod";

export const askUserTool = tool({
  description: `Ask the user one or more questions for clarification before proceeding.
Use this when you need to confirm decisions, disambiguate between options, or gather input.
You can ask up to 4 questions in a single call — they will be presented to the user together.
Each question can offer multiple-choice options or accept a free-text answer.
Set multiSelect: true when the choices are not mutually exclusive.
You can include an ASCII diagram or table in the context field to illustrate your questions.`,
  inputSchema: z.object({
    questions: z
      .array(
        z.object({
          header: z
            .string()
            .describe(
              "Very short label for the question (max ~12 chars), e.g. 'Auth method', 'Scope'",
            ),
          question: z.string().describe("The full question to ask the user"),
          multiSelect: z
            .boolean()
            .optional()
            .describe("Allow selecting multiple options. Default false."),
          options: z
            .array(z.string())
            .optional()
            .describe("Multiple choice options. Omit for free-text answer."),
        }),
      )
      .min(1)
      .max(4)
      .describe("1-4 questions to ask the user in a single panel"),
    context: z
      .string()
      .optional()
      .describe("Additional context, ASCII diagram, or table to show alongside the questions"),
  }),
  // No execute — handled client-side via addToolOutput
});
