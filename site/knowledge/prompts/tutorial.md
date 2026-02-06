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

**Paragraph 1 (Lead with keyword)**: Start with "[Model name] [task]" in the first sentence. Describe what this workflow does and the output it produces.

- Example: "Flux inpainting enables precise object removal and background replacement in ComfyUI."

**Paragraph 2 (Technical value)**: Explain the key model/technology and why it matters. Include hardware requirements if notable.

**Paragraph 3 (User benefit)**: Who should use this and what they'll achieve. End with a clear call-to-action phrase.

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

### metaDescription (exactly 150-160 characters)

**Requirements**:

- Start with primary keyword (model + task)
- Include "ComfyUI" within first 60 characters
- End with benefit or differentiator
- Must be a complete sentence ending with a period

**Template**: "[Model] [task] in ComfyUI. [What user gets]. [Differentiator]."
**Example**: "Wan 2.1 video generation in ComfyUI. Create 480p videos from images. Step-by-step tutorial with one-click setup." (138 chars)

### suggestedUseCases (3-5 items)

Specific, actionable use cases starting with action verbs:

- "Remove unwanted objects from product photography"
- "Generate consistent character poses for animation"
- "Create variations of logo designs"

### faqItems (3-5 questions)

**Structure each FAQ as an object with `question` and `answer` keys.**

**Question requirements**:

- Start with "How", "What", "Can", "Why", or "Is"
- Include model name in at least 2 questions
- Target "People Also Ask" search intent

**Answer requirements**:

- 2-3 sentences minimum, never just "Yes" or "No"
- First sentence directly answers the question
- Include specific details (values, steps, or model names)
- End with actionable next step when appropriate

**Good examples**:

- Q: "How do I install [model] for ComfyUI?"
  A: "Download [model].safetensors from Hugging Face and place it in your ComfyUI/models/checkpoints folder. The model requires approximately X GB of disk space. Restart ComfyUI to load the new model."
- Q: "What VRAM is required for [workflow]?"
  A: "[Model] requires a minimum of X GB VRAM for standard generation. For optimal performance at higher resolutions, 12+ GB VRAM is recommended. Users with less VRAM can enable fp8 mode in the settings."
- Q: "Can I run [workflow] locally without a GPU?"
  A: "Running [model] without a GPU is not recommended due to extremely slow generation times. CPU-only inference may take 10-30x longer than GPU. Consider cloud options or smaller model variants for limited hardware."

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
