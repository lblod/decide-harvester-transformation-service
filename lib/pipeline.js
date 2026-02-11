import { sparqlEscapeUri, uuid } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import {
  STATUS_BUSY,
  STATUS_SUCCESS,
  STATUS_FAILED,
  OUTPUT_GRAPH,
  BATCH_SIZE,
  SLEEP_BETWEEN_BATCHES,
  HIGH_LOAD_DATABASE_ENDPOINT,
} from "../constant";
import { transformationQueriesByTypeFn } from "../config/queries.js";
import { loadTask, updateTaskStatus, appendTaskResultGraph, appendTaskError } from "./task";

export async function run(deltaEntry) {
  const task = await loadTask(deltaEntry);
  if (!task) return;

  const resourceGraph = task.inputGraph;
  if (!resourceGraph) {
    throw new Error("Task does not have input graph, defining the resources to be transformed.");
  }

  try {
    await updateTaskStatus(task, STATUS_BUSY);
    const graphContainer = { id: uuid() };
    graphContainer.uri = `http://redpencil.data.gift/id/dataContainers/${graphContainer.id}`;

    await transformResources(resourceGraph);

    await appendTaskResultGraph(task, graphContainer, OUTPUT_GRAPH);
    await updateTaskStatus(task, STATUS_SUCCESS);
  } catch (e) {
    console.error(e);
    if (task) {
      await appendTaskError(task, e.message);
      await updateTaskStatus(task, STATUS_FAILED);
    }
  }

  if (resourceGraph) {
    try {
      await update(`DROP SILENT GRAPH ${sparqlEscapeUri(resourceGraph)}`);
    } catch (e) {
      console.warn(`Failed to drop task's temporary input graph ${resourceGraph}`, e);
    }
  }
}

async function transformResources(resourceGraph) {
  const transformationQueriesByType = transformationQueriesByTypeFn(resourceGraph);

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
  const response = await query(
    countQuery,
    {},
    { sparqlEndpoint: HIGH_LOAD_DATABASE_ENDPOINT, mayRetry: true },
  );
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
      `Executing transformation (limit=${BATCH_SIZE}, offset=${offset}, progress=${progress.toFixed(
        2,
      )}%).`,
    );

    await update(insertQuery, {}, { sparqlEndpoint: HIGH_LOAD_DATABASE_ENDPOINT, mayRetry: true });
    await sleep();
  }
}

async function sleep() {
  if (SLEEP_BETWEEN_BATCHES > 0) {
    console.info(`Sleeping for ${SLEEP_BETWEEN_BATCHES} ms.`);
    return new Promise((resolve) => setTimeout(resolve, SLEEP_BETWEEN_BATCHES));
  }
}
