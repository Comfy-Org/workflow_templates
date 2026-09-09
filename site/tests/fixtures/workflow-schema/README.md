# Recommended workflow `@graph` fixtures

One file per curated workflow detail page, named by hub share id. Each is the
JSON-LD `@graph` from the client's schema recommendation, transcribed verbatim
— the document `buildWorkflowGraphJsonLd` and `WORKFLOW_ENTITY_GRAPHS` were
built to reproduce (#1205).

`workflow-schema-recommendation.test.ts` rebuilds each graph from the repo's own
curated data and asserts it still matches. Page-level values the hub owns —
title, image, short description, FAQ — are fed to the builder from the fixture,
so the test pins what this repo controls: the entity nodes, their categories and
cross-references, and node order. Hub copy drifting is a content question, not a
build regression, and is deliberately out of scope here.

The one permitted difference is `Organization.logo`, which the site adds
site-wide in `src/lib/site-entities.ts` and the recommendation omits.

Do not edit these by hand to make a test pass. They change only when the client
issues a new recommendation.
