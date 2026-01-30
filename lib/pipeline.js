import { uuid } from "mu";
import {
  STATUS_BUSY,
  STATUS_SUCCESS,
  STATUS_FAILED,
  TARGET_GRAPH,
  HIGH_LOAD_DATABASE_ENDPOINT,
} from "../constant";
import {
  loadTask,
  updateTaskStatus,
  appendTaskResultGraph,
  appendTaskError,
  getAllFiles,
} from "./task";
import { insertFromTripleFileIntoGraph } from "./super-utils";

export async function run(deltaEntry) {
  const task = await loadTask(deltaEntry);
  if (!task) return;
  try {
    await updateTaskStatus(task, STATUS_BUSY);
    const graphContainer = { id: uuid() };
    graphContainer.uri = `http://redpencil.data.gift/id/dataContainers/${graphContainer.id}`;
    const fileContainer = { id: uuid() };
    fileContainer.uri = `http://redpencil.data.gift/id/dataContainers/${fileContainer.id}`;

    let files = await getAllFiles(task);
    for (const f of files) {
      const p = f.path.replace("share://", "/share/");
      // save file content to pub graph
      await insertFromTripleFileIntoGraph(p, HIGH_LOAD_DATABASE_ENDPOINT, TARGET_GRAPH);
    }
    await appendTaskResultGraph(task, graphContainer, TARGET_GRAPH); // the result is the published graph
    await updateTaskStatus(task, STATUS_SUCCESS);
  } catch (e) {
    console.error(e);
    if (task) {
      await appendTaskError(task, e.message);
      await updateTaskStatus(task, STATUS_FAILED);
    }
  }
}
