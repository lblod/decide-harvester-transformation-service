import { uuid } from "mu";
import {
  STATUS_BUSY,
  STATUS_SUCCESS,
  STATUS_FAILED,
  TARGET_GRAPH,
  HIGH_LOAD_DATABASE_ENDPOINT,
} from "../constant";
import { loadTask, updateTaskStatus, appendTaskResultGraph, appendTaskError } from "./task";

export async function run(deltaEntry) {
  const task = await loadTask(deltaEntry);
  if (!task) return;
  try {
    await updateTaskStatus(task, STATUS_BUSY);
    const graphContainer = { id: uuid() };
    graphContainer.uri = `http://redpencil.data.gift/id/dataContainers/${graphContainer.id}`;

    // Custom logic

    await appendTaskResultGraph(task, graphContainer, TARGET_GRAPH);
    await updateTaskStatus(task, STATUS_SUCCESS);
  } catch (e) {
    console.error(e);
    if (task) {
      await appendTaskError(task, e.message);
      await updateTaskStatus(task, STATUS_FAILED);
    }
  }
}
