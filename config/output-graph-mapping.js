// TODO: build graph dynamically based on bestuurseenheid: http://data.lblod.info/id/bestuurseenheden/<uuid> --> http://mu.semte.ch/graphs/organizations/<uuid>

export const OUTPUT_GRAPH_BY_BESTUURSEENHEID = new Map([
  // Gent
  [
    "http://data.lblod.info/id/bestuurseenheden/353234a365664e581db5c2f7cc07add2534b47b8e1ab87c821fc6e6365e6bef5",
    "http://mu.semte.ch/graphs/public/gent",
  ],
  // Wingene
  [
    "http://data.lblod.info/id/bestuurseenheden/99ed6eee81a7aca47517cbffb46eaba38f3987eeb4ad32c020898644769eb615",
    "http://mu.semte.ch/graphs/public/wingene",
  ],
]);
