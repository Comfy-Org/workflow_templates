Here are some changes I suggest and some question I would like you to answer:

1. Do we also include oss model names in the current source data? Those are heavily searched too
2. Should we explore having additional highly searched terms like just adding "How to do" before the template title -- since that is something taht people search? Can you have multiple titles or does it downrank you? Maybe using H2 or something? Think the SEO aspect on search terms is a bit underexplored here
3. Can we add more details on telemetry and how to set it up and exactly what we need to be tracking. Obviously, page performance, conversion, and SEO performance are all big topics that have well established processes, playbooks, tooling and so on. We have mixpanel, sentry, posthog, vercel analytics, cloudflare, datadog, clickhouse, deepnote, etc. all instrumeted across our various projects alredy that you could reference. Mixpanel might be the easiest but not sure. In particular, I would really need a detailed plan for exaclty how to research, test, validate, adjust, monitor for SEO stuff with exact steps as the person doing this might not even know the first thing
4. Can we deploy to vercel in the first milestone then later move to cloudflare? will it introduce a ton of overhead and tech debt if we do that? The reason to start with vercel is just that our org already has an account so i can just do it in <10 minutes.
5. Should we add anything about how to add automated CI testing and tests? for content validity and health of the pages but also for business logic like the human overrides system
6. for the knowledge base, you shuold include where to find all that info as well. You can probably rely heavily on blog.comfy.org, docs.comfy.org, huggingface, github, and other knowledge sources available publicly on the internet
7. For system prompt, explain how it would integrated in the AI pipeline more specifically, showing the snippets for the entire technial setup
8. To start, we can make the github workflows for building the sites be manual dispatch while i debug and test eveything. i dont want to be rebuilding before release until everything is confirmed working. maybe can just comment out the part that is automated on release in the github workflow to start. adding a manual dispatch path int he workflow will probably be useful longterm anyway
9. Similar to point 8, will need a good way to do local dev on the static sites -- a process for setting things up, adding the openapi key to .env file, adding a .env.example, some very terse and concise instructions in the readme or maybe in a nested readme or contributing doc, and make sure all the tooling and stuff and astro works for local dev server type of setup. afterall, once we build the initial PoC, we will need to test and verify everything locally, so plan for that
10. For the node.js canvas rendering, shold we cache the saved workflow images and only rebuild on change? not sure if even worth if doing change check is going to add a lot of technical overhead and risk
11. For the open graph, should we also include how to get the image? what are our plans? would it be like a stitchd image of the workflow image and the input and output or something? curious what the most converting thing is for this
12. for initial scope (milestone 1 or 2), lets just do the 50 most popular templates (you can see that there is popularity or usage fields on workflows in the repo that you can use for that). The milestones system in the doc should scale in
13. We can actually scale up the knowledge bas econcisderably. we already have other projects going on that works to get context on all workflows that exist, all custom nodes on the registry, etc. there's so many ongoing projects that invovle getting ComfyUI domain knowledge into the hands of agents -- just ask/suggest what we might need.
14. Don't includ the prd/static-template-site-plan.md or prd folder in the git commits or in the "File Structure Summary" section.
15. Do some research on openart.ai as they are donig something very similar to this project and have done a ton of research and leg work on SEO and other things. You can simply download one of their webpages or use whatever tool to study it, e.g., for this workflow: https://openart.ai/workflows/nothing_here/flux-fill-guff-and-object-removal-lora-workflow/Os7P0eAy9QKCkmFfmyGn. Notice all the little things they do and what things they have on a webpage for that workflow and use it to suggest new features or adjust our current features -- mainly for their SEO optimizations but also for anythign you think is nice/good on the way they structure that static page.

So the steps forward are:

1. Followup on any of the above things that are questions, wait until you and I have answered or solved everything
2. add all the above changes to the doc (including the answered questions and then the plain change requests above), next split the doc into two separate docs:
   - PRD
   - Design Doc (implementation plan type of thing)

The PRD should follow this exact template:

## Press Release (PR)

This should be a headline, written as if the feature launched today.

**_ComfyUI Announces Nodes 2.0_**

_Today, ComfyUI introduces Nodes 2.0 - a brand new node system built entirely with VueJS in the DOM. Widgets with complex behavior are much easier to build now. eg. ComfyUI has its first color picker widget, which we built in 2 hours. However, performance has not suffered at all. Unlike other DOM based node based canvases, ComfyUI maintains extremely high FPS with thousands of nodes rendering images and videos on its canvas. Nodes 2.0 is built for performance._

## Customer FAQs

_How is this different from the previous node system?_

_If I develop custom nodes, how can I transition over to Nodes 2.0?_

_What will happen to my current custom node pack?_

## Internal FAQs

_Other DOM based libraries like ReactFlow have bad performance and significantly degraded FPS. Are we sure performance won’t suffer?_

## Launch Alignment

_Is this a feature launch and how would OSS version and cloud version get aligned on shipping time. E.g. For side queue panel, what additional cloud API and progress reporting is involved and how are we resolving them._

## Specific Requirements

_P0: Our frontend team can write new widgets and nodes in a modern JS framework and 10x faster than before_

_P1: Custom nodes can write extensions in a modern JS framework_

## Success Metrics

How do these impact our goals in [Long-Term Direction](https://www.notion.so/Long-Term-Direction-43734e36a336479792da1d18524e1267?pvs=21) ?

1. _FPS does not degrade below 30 FPS until there are 1k+ nodes on the canvas_
2. _Frontend developer productivity sky rockets and we can ship new widgets and v3 features twice as fast now_
3. _Vibe based evaluation post launch that users love this_

## Milestones

_Target Deadline: Set when the PRD is written. This helps everyone weigh the opportunity vs cost._

_Committed Deadline: TBD, fill out after UX and technical design are fleshed out._

---

The PRD is mainly for broadcasting the idea to entire org and being justa PRD to outline high level goals and answer FAQs. The design doc should include EVERYTHING else we have covered. Don't remove any info when making this split.
