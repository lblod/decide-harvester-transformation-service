import { getTransformationQueries as besluit } from "./besluit.js";

export const transformationQueryFactories = (resourceGraph) => ({
  besluit: besluit(resourceGraph),
});
