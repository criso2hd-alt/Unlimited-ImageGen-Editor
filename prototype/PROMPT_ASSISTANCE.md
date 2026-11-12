# Local prompt assistance direction

The “Refine with AI” control belongs next to the user's idea field in Freeform and each guided creation flow. The current button demonstrates its placement and intended review behavior; no prompt model is connected.

## Interaction

1. The user can generate directly from their own words and chosen options.
2. “Refine with AI” takes a snapshot of the current idea, mode, selected options, exact text, numbered reference roles, canvas choice, and optional Avoid text.
3. A local assistant proposes one clearer prompt. The app shows the original and suggestion together, with the changes explained briefly.
4. The user can edit, accept, or discard the suggestion. Accepting creates a new draft version; the original remains recoverable.

The helper should preserve exact poster wording, numbered reference relationships, user exclusions, and transparency instructions. It should not silently alter the requested subject, print format, or aspect ratio. The image generator receives the accepted prompt, and the library stores the prompt recipe used for each output.

## Implementation boundary

The guided flows now use `choice-logic.js` to filter later choices and clear incompatible selections when an earlier step changes. `prompt-language.js` turns chosen options into a concrete prompt while keeping the user's subject and exact text. These are deterministic rules; they do not add a second model or guarantee that every generated image follows every detail. Add an optional local prompt assistant behind a separate interface once its model size, latency, license, and cross-platform runtime have been tested. The helper should be a separate download and should not require a PyTorch installation in the desktop app.

[Qwen's official Qwen-Image-2.1 documentation](https://github.com/QwenLM/Qwen-Image-2.1#prompt-rewriting) recommends two task-specific Qwen3.5-VL 9B prompt-rewriting checkpoints for generation and editing. Their size and documented PyTorch/vLLM paths do not fit the lightweight default installation goal without further runtime validation. They are useful quality references, not a committed dependency.

[Qwen's published text-to-image prompt guide](https://huggingface.co/Qwen/Qwen-Image-2.1-PE-T2I/blob/main/system_prompt.txt) informed the deterministic wording: state the medium and subject, describe spatial placement, name the light source and quality, and preserve literal text. The local runtime's style adherence still needs visual comparison across weights and seeds before we can claim reliability.

Before shipping the AI helper, compare accepted suggestions against the user's original prompt across Photos, Posters & text, Transparent assets, references, and comics. Measure latency and memory use while the image model is loaded.
