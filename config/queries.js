import { getTransformationQueries as besluit } from "./besluit.js";

export const transformationQueriesByTypeFn = (resourceGraph, outputGraph) => ({
  besluit: besluit(resourceGraph, outputGraph),
});
