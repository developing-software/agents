import * as core from "@actions/core";
import type { ExtractorInputs } from "./types";
import { getExtractor } from "./extractors/index";
import { enrichWithPricing } from "./pricing";
import { writeResults, writeEmptyResults, uploadArtifact } from "./output";

function parseInputs(): ExtractorInputs {
  return {
    agent: core.getInput("agent", { required: true }),
    executionFile: core.getInput("execution_file"),
    sessionId: core.getInput("session_id"),
    finalMessage: core.getInput("final_message"),
    model: core.getInput("model"),
    provider: core.getInput("provider"),
    status: core.getInput("status"),
  };
}

function exportEnvVars(model: string | null): void {
  if (!model && process.env.MODEL) {
    model = process.env.MODEL;
  }
  if (!model && process.env.AGENT_MODEL) {
    model = process.env.AGENT_MODEL;
  }
  if (model) {
    core.exportVariable("AGENT_MODEL", model);
  }
}

async function run() {
  let agent: string | undefined;
  try {
    const inputs = parseInputs();
    agent = inputs.agent;

    const extractor = getExtractor(inputs.agent);
    const result = await extractor(inputs);

    // Model override: prefer input, then extracted
    if (inputs.model && result.metrics) {
      result.metrics.model = inputs.model;
    }

    const pricing = await enrichWithPricing(result.metrics, inputs.provider);
    await writeResults(result, pricing);
    await uploadArtifact(result);
    exportEnvVars(result.metrics?.model ?? null);

    core.info(`Agent metrics collected for ${inputs.agent}`);
  } catch (error) {
    core.warning(`Agent metrics collection failed: ${error}`);
    await writeEmptyResults(agent);
  }
}

run().catch(core.setFailed);
