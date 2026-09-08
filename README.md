# Decide harvester transformation service

## About
This service transforms OSLO besluiten into ELI and writes the results to a graph resolved per input container. It reacts to `task:Task` deltas: when a task becomes `adms:status = scheduled`, the service loads the task and its input containers (via `task:inputContainer`), and for each container resolves the output graph for its bestuurseenheid (via `task:hasResource` and `config/output-graph-mapping.js`), runs the configured transformation queries, and stores the resulting ELI triples in that container's output graph.

## How it works
- A delta notification marks a task as `scheduled`.
- The service loads the task and all of its `task:inputContainer`s. A task can bundle work for multiple bestuurseenheden at once, each via its own input container.
- Each input container must carry both `task:hasGraph` (the graph of resources to transform) and `task:hasResource` (the bestuurseenheid it belongs to). The task fails (an `oslc:Error` is recorded via `task:error`) if it has no input containers, or if any container is missing either property.
- For each input container, the bestuurseenheid is looked up in `config/output-graph-mapping.js` to resolve that container's output graph; the task fails if the bestuurseenheid isn't present in the map.
- For each transformation "factory" in `config/queries.js`, it executes count + insert queries in batches, writing into the container's resolved output graph.
- On success, the task status is set to `success`, one result container (linked via `task:resultsContainer`) is recorded per input container pointing at its resolved output graph, and all input graphs are dropped.

## Usage
Add the service to your docker-compose and point it at your triplestore. Example:

```yml
harvester-transformation-service:
  image: lblod/decide-harvester-transformation-service
  environment:
    INPUT_GRAPH: http://mu.semte.ch/graphs/oslo-decisions
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
| Environment variable        | Description                                                                                                        | Default                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `MU_SPARQL_ENDPOINT`        | SPARQL endpoint used for tasks and tranformation-related reads/writes.                                             | `http://database:8890/sparql`                                         |
| `DIRECT_SPARQL_ENDPOINT `   | SPARQL endpoint used for dropping temporary graphs.                                                                | `http://virtuoso:8890/sparql`                                         |
| `BYPASS_MU_SPARQL_ENDPOINT` | If `true`, direct transformation-related reads/writes to `DIRECT_SPARQL_ENDPOINT` instead of `MU_SPARQL_ENDPOINT`. | `false`                                                               |
| `INPUT_GRAPH`               | Graph containing data to be transformed.                                                                           | `http://mu.semte.ch/graphs/public`                                    |
| `ORGANIZATIONS_GRAPH`       | Graph containing organizational data for the transformation process to rely upon.                                  | `http://mu.semte.ch/graphs/public`                                    |
| `DCR_BATCH_SIZE`            | Batch size (`LIMIT`) for SPARQL queries.                                                                           | `100`                                                                 |
| `SLEEP_BETWEEN_BATCHES`     | Delay between SPARQL queries/inserts, in milliseconds.                                                             | `1000`                                                                |
| `OPERATION_URI`             | Only tasks with `task:operation` set to this URI are handled.                                                      | `http://lblod.data.gift/id/jobs/concept/TaskOperation/decide-publish` | 

## Notes
- A task can have multiple `task:inputContainer`s, one per bestuurseenheid it bundles work for.
- Every input container must carry both `task:hasGraph` (the resources graph) and `task:hasResource`, pointing at the bestuurseenheid (administrative unit) that container's data belongs to.
- The output graph is resolved per input container from `config/output-graph-mapping.js`, a static map from bestuurseenheid URI to output graph URI. Adding support for a new bestuurseenheid requires adding an entry to that file and redeploying the service.
- If you need additional transformations, add a factory in `config/` and export it from `config/queries.js`. New factories must accept `(resourceGraph, outputGraph)`.
