import { sparqlEscapeUri, uuid } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import {
  STATUS_BUSY,
  STATUS_SUCCESS,
  STATUS_FAILED,
  BATCH_SIZE,
  SLEEP_BETWEEN_BATCHES,
  DIRECT_SPARQL_ENDPOINT,
  BYPASS_MU_SPARQL_ENDPOINT,
} from "../constant";
import { transformationQueriesByTypeFn } from "../config/queries.js";
import { loadTask, updateTaskStatus, appendTaskResultGraph, appendTaskError } from "./task";
import { OUTPUT_GRAPH_BY_BESTUURSEENHEID } from "../config/output-graph-mapping.js";

const defaultConnectionOptions = BYPASS_MU_SPARQL_ENDPOINT
  ? {
      sparqlEndpoint: DIRECT_SPARQL_ENDPOINT,
      mayRetry: true,
    }
  : {};

export async function run(deltaEntry) {
  const task = await loadTask(deltaEntry);
  if (!task) return;

  try {
    const resourceGraph = task.inputGraph;
    if (!resourceGraph) {
      throw new Error("Task does not have input graph, defining the resources to be transformed.");
    }

    const bestuurseenheid = task.bestuurseenheid;
    if (!bestuurseenheid) {
      throw new Error(
        "Task does not have ext:hasResource, defining the bestuurseenheid for which to resolve the output graph.",
      );
    }

    const normalizedBestuurseenheid = bestuurseenheid.replace(/^https:\/\//, "http://");
    const outputGraph = OUTPUT_GRAPH_BY_BESTUURSEENHEID.get(normalizedBestuurseenheid);
    if (!outputGraph) {
      throw new Error(
        `No output graph configured for bestuurseenheid <${normalizedBestuurseenheid}>. Add it to config/output-graph-mapping.js.`,
      );
    }

    await updateTaskStatus(task, STATUS_BUSY);
    const graphContainer = { id: uuid() };
    graphContainer.uri = `http://redpencil.data.gift/id/dataContainers/${graphContainer.id}`;

    await transformResources(resourceGraph, outputGraph);

    await appendTaskResultGraph(task, graphContainer, outputGraph);
    await updateTaskStatus(task, STATUS_SUCCESS);
    await dropGraph(resourceGraph);
  } catch (e) {
    console.error(e);
    if (task) {
      await appendTaskError(task, e.message);
      await updateTaskStatus(task, STATUS_FAILED);
    }
  }
}

async function transformResources(resourceGraph, outputGraph) {
  const transformationQueriesByType = transformationQueriesByTypeFn(resourceGraph, outputGraph);

  for (const [type, transformationQueriesByProperty] of Object.entries(
    transformationQueriesByType,
  )) {
    for (const property of Object.keys(transformationQueriesByProperty)) {
      const { count: countQuery, insert: insertQueryFn } =
        transformationQueriesByProperty[property];

      console.info(`[${type}:${property}] Counting properties to transform.`);
      const total = await countProperties(countQuery);

      if (!total) {
        console.info(`[${type}:${property}] Skipping transformation, nothing to insert.`);
        continue;
      }

      console.info(`[${type}:${property}] Executing transformation batches.`);
      await transformAndInsertTriples(insertQueryFn, total);
    }
  }
}

async function countProperties(countQuery) {
  const response = await query(countQuery, {}, defaultConnectionOptions);
  await sleep();

  const bindings = response?.results?.bindings ?? [];
  if (!bindings.length) return 0;

  const countValue = bindings[0]?.count?.value;
  const parsed = parseInt(countValue, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function transformAndInsertTriples(insertQueryFn, total) {
  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const insertQuery = insertQueryFn(BATCH_SIZE, offset);

    const progress = Math.min(((offset + BATCH_SIZE) / total) * 100, 100);
    console.info(
      `Executing transformation (limit=${BATCH_SIZE}, offset=${offset}, total=${total}, progress=${progress.toFixed(
        2,
      )}%).`,
    );

    try {
      await update(insertQuery, {}, defaultConnectionOptions);
    } catch (e) {
      throw new Error(`${e.message}\n\nQuery that caused error:\n${insertQuery}`);
    }
    await sleep();
  }
}

async function dropGraph(graph) {
  try {
    await update(
      `DROP SILENT GRAPH ${sparqlEscapeUri(graph)}`,
      {},
      { sparqlEndpoint: DIRECT_SPARQL_ENDPOINT },
    );
    await sleep();
  } catch (e) {
    console.warn(`Failed to drop task's temporary input graph ${graph}`, e);
  }
}

async function sleep() {
  if (SLEEP_BETWEEN_BATCHES > 0) {
    console.info(`Sleeping for ${SLEEP_BETWEEN_BATCHES} ms.`);
    return new Promise((resolve) => setTimeout(resolve, SLEEP_BETWEEN_BATCHES));
  }
}
