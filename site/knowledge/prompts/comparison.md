# Comparison Content Template

You are generating a **comparison-style** page for a ComfyUI workflow template. This format positions the workflow against alternatives and helps users make informed decisions.

## Purpose

Help users understand why they should choose this workflow over alternatives, when to use it, and what tradeoffs exist.

## Audience

- Researchers evaluating options
- Professionals comparing tools
- Users searching "best [task] workflow" or "[model] vs [alternative]"
- People trying to decide between local and cloud options

## Tone

- Objective and balanced
- Informative, not salesy
- Honest about tradeoffs
- Helpful in decision-making

## Required Output Structure

### extendedDescription (2-3 paragraphs, 200-300 words)

**Paragraph 1 (Problem + keyword)**: Start with "[Model name] solves/addresses [problem]" in the first sentence. Clearly state the problem this workflow addresses.

- Example: "Flux inpainting solves the challenge of seamless object removal in ComfyUI."

**Paragraph 2 (Comparison)**: How it compares to common alternatives. Be specific and balanced.

- Reference manual methods, other models, cloud services
- Include at least one honest tradeoff

**Paragraph 3 (Decision guidance)**: When this is the best choice and when it might not be. Help users self-select.

**Comparison phrases to use**:

- "Faster than [alternative] but requires more VRAM"
- "More consistent than [manual approach] with less effort"
- "Better for [use case A], while [alternative] excels at [use case B]"

### howToUse (4-6 steps)

Frame steps in terms of efficiency vs alternatives:

1. [Step] - Unlike [alternative], this only requires...
2. [Step] - Automatically handles [task] that usually requires...

### metaDescription (exactly 150-160 characters)

**Requirements**:

- Lead with primary keyword (model + task)
- Include "ComfyUI" and comparison framing
- Mention the decision/choice aspect
- Appeal to users researching options

**Template**: "[Model] vs alternatives for [task] in ComfyUI. [Key differentiator]. [Decision help]."
**Example**: "Flux vs SDXL for inpainting in ComfyUI. Compare quality, speed, and VRAM requirements. Find the best workflow for your needs." (128 chars)

### suggestedUseCases (4-6 items)

Frame as "best for" scenarios:

- "Best for high-volume batch processing"
- "Ideal when consistency matters more than speed"
- "Perfect for users with limited VRAM"
- "Great alternative to expensive cloud services"

### faqItems (4-5 questions)

**Structure each FAQ as an object with `question` and `answer` keys.**

**Question requirements**:

- Focus on comparison and decision-making
- Include model name in at least 2 questions
- Target "[model] vs [alternative]" search patterns

**Answer requirements**:

- 2-4 sentences, balanced and objective
- Acknowledge both strengths AND limitations
- Provide clear decision criteria
- Never dismiss alternatives unfairly

**Good examples**:

- Q: "Is [model] better than [common alternative]?"
  A: "[Model] and [alternative] excel in different areas. [Model] offers better [advantage], while [alternative] is stronger for [other use case]. Choose [model] if [criteria]; choose [alternative] if [other criteria]."
- Q: "Should I use [workflow] or [other approach] for [task]?"
  A: "Use this workflow when you need [specific benefit] and have [requirements]. The [other approach] may be better if you need [other benefit] or have [different constraints]. For most users doing [common task], this workflow is the more efficient choice."
- Q: "When should I NOT use this workflow?"
  A: "This workflow may not be ideal if you [limitation 1] or need [capability it lacks]. In those cases, consider [alternative 1] for [reason] or [alternative 2] for [other reason]. It's also not optimized for [edge case]."

## Comparison Dimensions

When comparing, consider:

- **Speed**: Generation time, iteration speed
- **Quality**: Output fidelity, consistency
- **Resources**: VRAM, disk space, cost
- **Ease of use**: Setup complexity, learning curve
- **Flexibility**: Customization options

## What NOT to Do

- Don't make unfair comparisons
- Don't claim superiority without basis
- Don't ignore legitimate alternatives
- Don't hide significant tradeoffs
- Don't compare to straw man alternatives
