Great, your plan for everything sounds good. The only thing it seems you want my feedback on is point 13 (KNowledge Base Scaling). Here are the answers:

What would help:

Node documentation from ComfyUI_frontend (/nodes/ docs)

can find in docs.comfy.org and for node-level you can find in https://github.com/Comfy-Org/embedded-docs (would be good to clone the repo and also check how it works -- its like a pipeline to embed docs for each node and add to some of our deploedy apps and we can probably use this for a pipeline or someting or just tell the agent about it -- not sure the ebst approach there).

Model cards from HuggingFace (can scrape/cache)

good

Custom node metadata from Registry API

good, You can find info on how to get specific info on custom node packs (to be fair though, they are somewhat rare in templates and mainly only a few popular ones are used) from https://docs.comfy.org/api-reference/admin/generate-a-short-lived-jwt-admin-token or more programatically via https://api.comfy.org/openapi

docs.comfy.org tutorials (can reference or embed)

good

Community workflow examples from ComfyUI_examples

That repo is not the best for examples but is generally fine I guess for very old workflows made by the original author of ComfyUI (almost everythign is outdated now though but can be useful for fundamentals MAYBE).

What to ask for:

Access to any existing "node documentation" database

see above

Registry API endpoint for custom node metadata
Any existing model capability summaries

Can find generally online
