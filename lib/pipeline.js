import { uuid } from "mu";
import { querySudo, updateSudo } from "@lblod/mu-auth-sudo";
import {
  STATUS_BUSY,
  STATUS_SUCCESS,
  STATUS_FAILED,
  OUTPUT_GRAPH,
  BATCH_SIZE,
  SLEEP_BETWEEN_BATCHES,
} from "../constant";
import { transformationQueriesByTypeFn } from "../config/queries.js";
import { loadTask, updateTaskStatus, appendTaskResultGraph, appendTaskError } from "./task";

export async function run(deltaEntry) {
  const task = await loadTask(deltaEntry);
  if (!task) return;
  try {
    await updateTaskStatus(task, STATUS_BUSY);
    const graphContainer = { id: uuid() };
    graphContainer.uri = `http://redpencil.data.gift/id/dataContainers/${graphContainer.id}`;

    const resourceGraph = task.inputGraph;
    if (!resourceGraph) {
      throw new Error("Task does not define an input graph to use as resourceGraph.");
    }

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
  const response = await querySudo(countQuery);
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

    await updateSudo(insertQuery);
    await sleep();
  }
}

async function sleep() {
  if (SLEEP_BETWEEN_BATCHES > 0) {
    console.info(`Sleeping for ${SLEEP_BETWEEN_BATCHES} ms.`);
    return new Promise((resolve) => setTimeout(resolve, SLEEP_BETWEEN_BATCHES));
  }
}
