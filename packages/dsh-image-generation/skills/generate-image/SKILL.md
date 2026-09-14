---
name: generate-image
description: Generate reusable photos, illustrations and backgrounds for presentations, documents and other image requests.
---

Use `image_generate` whenever a task needs a generated raster visual. The user configures OpenAI or ByteDance once in Settings → Plugins → Image generation. The tool selects that provider. Credentials remain on the host.

1. Identify the image's purpose and placement. For PPT/Word, inspect the relevant document or template first. Carry its palette, art direction and whitespace needs into `style_context`, and reuse that style across the document.
2. Write a complete prompt: subject, composition, setting, lighting, palette and required details. Specify room for titles or captions where the document needs it. Keep readable document text as native text; use native editable objects for charts, tables, flowcharts and simple diagrams.
3. Choose the target `aspect_ratio` and `purpose`. A 16:9 slide does not require a 16:9 image when the illustration occupies only part of the slide. The tool returns actual dimensions; use proportional scaling or an intentional crop, preserving the main subject.
4. Call `image_generate` directly once per needed visual using the saved provider configuration. The Host applies workspace and deployment policy. The conversation displays the resulting PNG with click-to-enlarge preview. If an image-viewing tool is available, inspect the PNG before placing it; report visual findings only after viewing it. Correct specific visible defects if another generation is needed. Reuse an existing suitable image instead of generating duplicates.
5. Insert the returned `workspace_path` into the PPT/Word workflow, then inspect the rendered document page. Keep visual assets linked to their purpose and reuse their paths across later edits. Return the document and any requested standalone image.

If the tool reports missing configuration, direct the user to Settings → Plugins → Image generation. Never request an API key in conversation or place one in a document, prompt, sandbox command or source file. Respect tool approval, cancellation and workspace policy. Surface provider errors accurately; use a placeholder only when the user accepts one. Configuration validation checks the connection without submitting an image generation job; successful generation is established by an actual generated image.

For a provider rejection, report the returned HTTP status, error code, parameter and request ID when present. A rejected adapter-owned parameter requires a plugin correction; preserve those diagnostics for the developer. Change a prompt or aspect ratio only when the reported cause points to that input. Describe account access or quota issues when the tool explicitly reports that category. The settings card validates automatically on Save.
