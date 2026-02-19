import { getTransformationQueries as besluit } from "./besluit.js";

export const transformationQueriesByTypeFn = (resourceGraph) => ({
  besluit: besluit(resourceGraph),
});
