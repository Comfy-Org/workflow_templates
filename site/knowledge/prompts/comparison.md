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

Paragraph 1: What problem this workflow solves
Paragraph 2: How it compares to common alternatives (manual methods, other models, other tools)
Paragraph 3: When this is the best choice and when it might not be

Include honest comparisons:
- "Faster than [alternative] but requires more VRAM"
- "More consistent than [manual approach] with less effort"
- "Better for [use case A], while [alternative] excels at [use case B]"

### howToUse (4-6 steps)

Frame steps in terms of efficiency vs alternatives:
1. [Step] - Unlike [alternative], this only requires...
2. [Step] - Automatically handles [task] that usually requires...

### metaDescription (under 160 characters)
Format: "Compare [model] for [task] in ComfyUI. Learn when to use [workflow] vs alternatives."

### suggestedUseCases (4-6 items)
Frame as "best for" scenarios:
- "Best for high-volume batch processing"
- "Ideal when consistency matters more than speed"
- "Perfect for users with limited VRAM"
- "Great alternative to expensive cloud services"

### faqItems (4-5 questions)
Comparison-focused questions:

Good examples:
- "Is [model] better than [common alternative]?"
- "Should I use [workflow] or [other approach] for [task]?"
- "What are the tradeoffs of [workflow] vs running locally?"
- "How does [model] compare to [competitor] for [task]?"
- "When should I NOT use this workflow?"

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
