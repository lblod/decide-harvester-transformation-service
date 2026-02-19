import { sparqlEscapeUri } from "mu";
import { INPUT_GRAPH, OUTPUT_GRAPH, ORGANIZATIONS_GRAPH } from "./../constant";

const prefixes = `
  PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX mu:      <http://mu.semte.ch/vocabularies/core/>
  PREFIX eli:     <http://data.europa.eu/eli/ontology#>
  PREFIX dcterms: <http://purl.org/dc/terms/>
  PREFIX prov:    <http://www.w3.org/ns/prov#>
  PREFIX epvoc:   <https://data.europarl.europa.eu/def/epvoc#>
  PREFIX xsd:     <http://www.w3.org/2001/XMLSchema#>
  PREFIX ext:     <http://mu.semte.ch/vocabularies/ext/>
  PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>`;

export const getTransformationQueries = (resourcesGraph) => {
  const inputResourcesGraph = sparqlEscapeUri(resourcesGraph);
  const inputDataGraph = sparqlEscapeUri(INPUT_GRAPH);
  const outputGraph = sparqlEscapeUri(OUTPUT_GRAPH);
  const organizationsGraph = sparqlEscapeUri(ORGANIZATIONS_GRAPH);

  const resourceQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit mu:uuid ?uuid .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
          ?besluit a eli:Expression, eli:LegalExpression ;
                   mu:uuid ?expressionUuid ;
                   dcterms:created ?now ;
                   dcterms:modified ?now .
          ?besluit_work a eli:Work, eli:LegalResource ;
                        mu:uuid ?workUuid ;
                        eli:is_realized_by ?besluit ;
                        dcterms:created ?now ;
                        dcterms:modified ?now .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit mu:uuid ?expressionUuid .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(URI(CONCAT(STR(?besluit), '/work')) AS ?besluit_work)
        BIND(STRUUID() AS ?workUuid)
        BIND(NOW() AS ?now)
      }`,
  };

  const titleQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit eli:title ?title .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
          ?besluit eli:title ?title_nl .
          ?besluit_work dcterms:title ?title_nl .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit eli:title ?title .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(URI(CONCAT(STR(?besluit), '/work')) AS ?besluit_work)
        BIND(STRLANG(STR(?title), "nl") AS ?title_nl)
      }`,
  };

  const descriptionQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit eli:description ?description .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
          ?besluit eli:description ?description_nl ;
                   dcterms:description ?description_nl .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit eli:description ?description .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(STRLANG(STR(?description), "nl") AS ?description_nl)
      }`,
  };

  const dateQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit eli:date_publication ?date .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
          ?besluit_work eli:date_document ?date_parsed .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit eli:date_publication ?date .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(URI(CONCAT(STR(?besluit), '/work')) AS ?besluit_work)
        BIND(xsd:date(?date) AS ?date_parsed)
      }`,
  };

  const languageQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit eli:language ?language .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
          ?besluit eli:language ?language_parsed .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit eli:language ?language .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(
          IF(
            !BOUND(?language) || !STRSTARTS(STR(?language), "http://publications.europa.eu/resource/authority/language/"),
            <http://publications.europa.eu/resource/authority/language/NLD>,
            ?language
          ) AS ?language_parsed
        )
      }`,
  };

  const contentQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit prov:value ?content .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
            ?besluit epvoc:expressionContent ?content_nl .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit prov:value ?content .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(STRLANG(STR(?content), "nl") AS ?content_nl)
      }`,
  };

  const creatorQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit ^prov:generated / dcterms:subject / ^besluit:behandelt / besluit:isGehoudenDoor ?bestuursorgaan .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
            ?besluit_work eli:passed_by ?bestuursorgaan_basis ;
                          dcterms:creator ?bestuursorgaan_basis .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit ^prov:generated / dcterms:subject / ^besluit:behandelt / besluit:isGehoudenDoor ?bestuursorgaan .
            }
            BIND(
              IF(
                STRSTARTS(STR(?bestuursorgaan), "https://"),
                URI(REPLACE(STR(?bestuursorgaan), "^https://", "http://")),
                ?bestuursorgaan
              ) AS ?bestuursorgaan_normalized
            )
            OPTIONAL {
              GRAPH ${organizationsGraph} {
                ?bestuursorgaan_normalized mandaat:isTijdspecialisatieVan ?bestuursorgaan_parent .
              }
            }
            BIND(COALESCE(?bestuursorgaan_parent, ?bestuursorgaan_normalized) AS ?bestuursorgaan_basis)
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(URI(CONCAT(STR(?besluit), '/work')) AS ?besluit_work)
      }`,
  };

  const aanwezigeQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit ^prov:generated / besluit:heeftAanwezige ?aanwezige .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
            ?besluit_work dcterms:contributor ?aanwezige .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit ^prov:generated / besluit:heeftAanwezige ?aanwezige .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(URI(CONCAT(STR(?besluit), '/work')) AS ?besluit_work)
      }`,
  };

  const secretarisQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit ^prov:generated / besluit:heeftSecretaris ?secretaris .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
            ?besluit_work dcterms:contributor ?secretaris .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit ^prov:generated / besluit:heeftSecretaris ?secretaris .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(URI(CONCAT(STR(?besluit), '/work')) AS ?besluit_work)
      }`,
  };

  const voorzitterQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit ^prov:generated / besluit:heeftVoorzitter ?voorzitter .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
            ?besluit_work dcterms:contributor ?voorzitter .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit ^prov:generated / besluit:heeftVoorzitter ?voorzitter .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(URI(CONCAT(STR(?besluit), '/work')) AS ?besluit_work)
      }`,
  };

  const motivationQueries = {
    count: `${prefixes}
      SELECT (COUNT(*) AS ?count) WHERE {
        GRAPH ${inputResourcesGraph} {
          ?besluit a besluit:Besluit .
        }
        GRAPH ${inputDataGraph} {
          ?besluit besluit:motivering ?motivation .
        }
      }`,

    insert: (limit, offset) => `${prefixes}
      INSERT {
        GRAPH ${outputGraph} {
            ?besluit besluit:motivering ?motivation_nl .
        }
      } WHERE {
        {
          SELECT * WHERE {
            GRAPH ${inputResourcesGraph} {
              ?besluit a besluit:Besluit .
            }
            GRAPH ${inputDataGraph} {
              ?besluit besluit:motivering ?motivation .
            }
          } LIMIT ${limit} OFFSET ${offset}
        }
        BIND(STRLANG(STR(?motivation), "nl") AS ?motivation_nl)
      }`,
  };

  return {
    resource: resourceQueries,
    title: titleQueries,
    description: descriptionQueries,
    date: dateQueries,
    language: languageQueries,
    content: contentQueries,
    creator: creatorQueries,
    aanwezige: aanwezigeQueries,
    secretaris: secretarisQueries,
    voorzitter: voorzitterQueries,
    motivation: motivationQueries,
  };
};
