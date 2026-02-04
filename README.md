# Decide harvester transformation service

## About
This service transforms OSLO besluiten into ELI and writes the results to a target graph. It reacts to `task:Task` deltas: when a task becomes `adms:status = scheduled`, the service loads the task, reads its input grap (via `task:inputContainer / task:hasGraph`), runs the configured transformation queries, and stores the resulting ELI triples in the output graph.

## How it works
- A delta notification marks a task as `scheduled`.
- The service loads the task and determines the `resourceGraph` from its input container.
- For each transformation "factory" in `config/queries.js`, it executes count + insert queries in batches.
- On success, the task status is set to `success` and the output graph is recorded on the task.

## Usage
Add the service to your docker-compose and point it at your triplestore. Example:

```yml
harvester-transformation-service:
  image: lblod/decide-harvester-transformation-service
  environment:
    INPUT_GRAPH: http://mu.semte.ch/graphs/oslo-decisions
    OUTPUT_GRAPH: http://mu.semte.ch/graphs/eli-decisions
    OPERATION_URI: http://lblod.data.gift/id/jobs/concept/TaskOperation/oslo-eli/transform
```

Add a delta rule so scheduled tasks are sent to the service:

```json
{
  "match": {
    "predicate": {
      "type": "uri",
      "value": "http://www.w3.org/ns/adms#status"
    },
    "object": {
      "type": "uri",
      "value": "http://redpencil.data.gift/id/concept/JobStatus/scheduled"
    }
  },
  "callback": {
    "method": "POST",
    "url": "http://harvester-transformation-service/delta"
  },
  "options": {
    "resourceFormat": "v0.0.1",
    "gracePeriod": 1000,
    "ignoreFromSelf": true,
    "foldEffectiveChanges": true
  }
}
```

## Configuration

| Environment variable          | Description                                                                          | Default                                                               |
| ----------------------------- | -----------------------------------------------------------------------------------  | --------------------------------------------------------------------- |
| `HIGH_LOAD_DATABASE_ENDPOINT` | SPARQL endpoint used for reads/writes of input and output data (i.e. non-task data). | `http://database:8890/sparql`                                         |
| `INPUT_GRAPH`                 | Graph containing data to be transformed (used by data queries).                      | `http://mu.semte.ch/graphs/public`                                    |
| `OUTPUT_GRAPH`                | Target graph for transformed data                                                    | `http://mu.semte.ch/graphs/public`                                    |
| `DCR_BATCH_SIZE`              | Batch size (`LIMIT`) for SPARQL queries.                                             | `100`                                                                 |
| `SLEEP_BETWEEN_BATCHES`       | Delay between SPARQL queries/inserts, in milliseconds.                               | `1000`                                                                |
| `OPERATION_URI`               | Only tasks with `task:operation` set to this URI are handled.                        | `http://lblod.data.gift/id/jobs/concept/TaskOperation/decide-publish` | 

## Notes
- The input resources graph is provided per task via `task:inputContainer / task:hasGraph`.
- If you need additional transformations, add a factory in `config/` and export it from `config/queries.js`.
