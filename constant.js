export const OPERATION_URI =
  process.env.OPERATION_URI ||
  "http://lblod.data.gift/id/jobs/concept/TaskOperation/decide-publish";

export const STATUS_BUSY = "http://redpencil.data.gift/id/concept/JobStatus/busy";
export const STATUS_SCHEDULED = "http://redpencil.data.gift/id/concept/JobStatus/scheduled";
export const STATUS_SUCCESS = "http://redpencil.data.gift/id/concept/JobStatus/success";
export const STATUS_FAILED = "http://redpencil.data.gift/id/concept/JobStatus/failed";

export const JOB_TYPE = "http://vocab.deri.ie/cogs#Job";
export const TASK_TYPE = "http://redpencil.data.gift/vocabularies/tasks/Task";
export const ERROR_TYPE = "http://open-services.net/ns/core#Error";
export const ERROR_URI_PREFIX = "http://redpencil.data.gift/id/jobs/error/";
export const connectionOptions = {
  // scope: "http://services.redpencil.io/decide-consumer-service"
};
export const PREFIXES = `
  PREFIX harvesting: <http://lblod.data.gift/vocabularies/harvesting/>
  PREFIX terms: <http://purl.org/dc/terms/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
  PREFIX dbpedia: <http://dbpedia.org/resource/>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX oslc: <http://open-services.net/ns/core#>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
  PREFIX adms: <http://www.w3.org/ns/adms#>
`;

export const DIRECT_SPARQL_ENDPOINT =
  process.env.DIRECT_SPARQL_ENDPOINT || "http://virtuoso:8890/sparql";

export const BYPASS_MU_SPARQL_ENDPOINT = /^(true|1|yes|on)$/i.test(
  process.env.BYPASS_MU_SPARQL_ENDPOINT?.trim(),
);

export const INPUT_GRAPH = process.env.INPUT_GRAPH || "http://mu.semte.ch/graphs/public";
export const OUTPUT_GRAPH = process.env.OUTPUT_GRAPH || "http://mu.semte.ch/graphs/public";
export const ORGANIZATIONS_GRAPH = (process.env.ORGANIZATIONS_GRAPH =
  "http://mu.semte.ch/graphs/public");

export const PUBLISHER_URI =
  process.env.PUBLISHER_URI ||
  "http://data.lblod.info/services/decide-harvester-transformation-service";

export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 100;
export const SLEEP_BETWEEN_BATCHES = parseInt(process.env.SLEEP_BETWEEN_BATCHES) || 1000;
