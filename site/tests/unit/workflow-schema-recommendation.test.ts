import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWorkflowGraphJsonLd } from '../../src/lib/structured-data';
import { getWorkflowEntityGraph } from '../../src/data/workflow-entity-graphs';
import { ORGANIZATION_ID } from '../../src/lib/site-entities';

/**
 * The four pages that carry a client-approved `@graph`. Their recommended
 * output is committed under tests/fixtures/workflow-schema/ (see the README
 * there); this rebuilds each one from the repo's curated data and asserts the
 * builder still reproduces it, node for node and in order.
 */
const SHARE_IDS = ['b37902cee452', 'cd0c4f9f61a4', 'a781503cf508', '9394f9968da3'] as const;

type Node = Record<string, unknown>;

function loadFixture(shareId: string): Node[] {
  const file = path.join(__dirname, '..', 'fixtures', 'workflow-schema', `${shareId}.json`);
  return (JSON.parse(readFileSync(file, 'utf-8')) as { '@graph': Node[] })['@graph'];
}

const nodeWithId = (graph: Node[], suffix: string) =>
  graph.find((node) => typeof node['@id'] === 'string' && (node['@id'] as string).endsWith(suffix));

/**
 * Rebuild a page's graph using the repo's entity data, with every hub-owned
 * value (title, image, short description, FAQ, breadcrumb) taken from the
 * fixture. What is under test is the assembly, not the hub's copy.
 */
function rebuild(shareId: string, fixture: Node[]) {
  const webpage = nodeWithId(fixture, '#webpage')!;
  const workflow = nodeWithId(fixture, '#workflow')!;
  const breadcrumb = nodeWithId(fixture, '#breadcrumb') as
    | { itemListElement: { name: string; item: string }[] }
    | undefined;
  const faq = nodeWithId(fixture, '#faq') as
    | { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    | undefined;

  const entityGraph = getWorkflowEntityGraph(shareId);
  expect(entityGraph, `${shareId} has no curated entity graph`).toBeDefined();

  return buildWorkflowGraphJsonLd({
    canonicalUrl: webpage.url as string,
    title: workflow.name as string,
    pageHeadline: webpage.headline as string,
    description: workflow.description as string,
    image: workflow.image as string | undefined,
    datePublished: webpage.datePublished as string | undefined,
    inLanguage: webpage.inLanguage as string,
    breadcrumbItems: (breadcrumb?.itemListElement ?? []).map((item) => ({
      name: item.name,
      item: item.item,
    })),
    faqItems: (faq?.mainEntity ?? []).map((question) => ({
      question: question.name,
      answer: question.acceptedAnswer.text,
    })),
    entityGraph: entityGraph!,
  });
}

describe.each(SHARE_IDS)('recommended @graph for %s', (shareId) => {
  const fixture = loadFixture(shareId);
  const built = rebuild(shareId, fixture)['@graph'] as Node[];

  it('emits the recommended nodes, in the recommended order', () => {
    expect(built.map((node) => node['@id'])).toEqual(fixture.map((node) => node['@id']));
  });

  it('matches the recommendation node for node', () => {
    for (const [index, expected] of fixture.entries()) {
      const actual = built[index];
      if (expected['@id'] === ORGANIZATION_ID) {
        // The site adds a `logo` the recommendation omits; everything else on
        // the Organization node must still match exactly.
        expect(actual, ORGANIZATION_ID).toMatchObject(expected);
        continue;
      }
      expect(actual, String(expected['@id'])).toEqual(expected);
    }
  });
});

/**
 * The hub's generated copy sometimes ends in blank lines. HTML swallows them;
 * JSON-LD does not, and today the Seedance 2.5 page ships a `description`
 * ending in "\n\n" inside its `@graph`.
 */
describe('hub whitespace does not reach the emitted graph', () => {
  const fixture = loadFixture('cd0c4f9f61a4');
  const workflow = nodeWithId(fixture, '#workflow')!;
  const webpage = nodeWithId(fixture, '#webpage')!;

  it('trims the workflow description and every FAQ string', () => {
    const graph = buildWorkflowGraphJsonLd({
      canonicalUrl: webpage.url as string,
      title: workflow.name as string,
      description: `${workflow.description as string}\n\n`,
      inLanguage: 'en',
      breadcrumbItems: [],
      faqItems: [{ question: '  Padded question?  ', answer: 'Padded answer.\n\n' }],
      entityGraph: getWorkflowEntityGraph('cd0c4f9f61a4')!,
    })['@graph'] as Node[];

    expect(nodeWithId(graph, '#workflow')!.description).toBe(workflow.description);
    const faq = nodeWithId(graph, '#faq') as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity[0].name).toBe('Padded question?');
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Padded answer.');
  });
});
