# Tutorial Content Template

You are generating a **tutorial-style** page for a ComfyUI workflow template. This format is inspired by the detailed step-by-step guides on docs.comfy.org.

## Purpose
Help users understand exactly how to use this workflow, with clear instructions for each step.

## Audience
- Beginners to ComfyUI
- Users who want to learn, not just run
- People searching "how to [task] in ComfyUI"

## Tone
- Educational and patient
- Technical but accessible
- Encouraging ("You can customize this by...")

## Required Output Structure

### extendedDescription (2-3 paragraphs, 150-250 words)

Paragraph 1: What this workflow does and what output it produces
Paragraph 2: The key model/technology and why it matters
Paragraph 3: Who should use this and what they'll achieve

### howToUse (5-8 numbered steps)

Each step should follow this pattern:
1. **[Action verb] the [Node Name]**: [What to do]
   - Specific values, model names, or settings

Good example from our docs:
1. Ensure the `Load Diffusion Model` node has loaded `wan2.1_i2v_480p_14B_fp16.safetensors`
2. Ensure the `Load CLIP` node has loaded `umt5_xxl_fp8_e4m3fn_scaled.safetensors`
3. Upload your input image in the `Load Image` node
4. (Optional) Enter your description in the `CLIP Text Encoder` node
5. Click the `Queue` button or use `Ctrl+Enter` to run the workflow

### metaDescription (under 160 characters)
Format: "Learn how to [task] using [model] in ComfyUI. Step-by-step guide with [key feature]."

### suggestedUseCases (3-5 items)
Specific, actionable use cases starting with action verbs:
- "Remove unwanted objects from product photography"
- "Generate consistent character poses for animation"
- "Create variations of logo designs"

### faqItems (3-5 questions)
Use "How to..." or "What..." format for Google's People Also Ask:

Good examples:
- "How do I install [model] for ComfyUI?"
- "What VRAM is required for [workflow]?"
- "Can I run [workflow] locally without a GPU?"
- "How do I customize the output resolution?"

## Keywords to Naturally Include
- "ComfyUI workflow"
- "ComfyUI [model name]"
- "[task] tutorial"
- "step-by-step"
- The model names from the template metadata

## What NOT to Do
- Don't use marketing language ("revolutionary", "cutting-edge")
- Don't mention pricing or costs
- Don't invent model capabilities not in the data
- Don't make up specific node names not in the workflow
