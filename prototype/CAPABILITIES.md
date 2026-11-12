# Qwen-Image-2.1 capability map

The model is a unified generator and editor. The sections in this prototype organize user intent; they are not separate Qwen models or guaranteed native modes. This map is based on [Qwen's official documentation](https://github.com/QwenLM/Qwen-Image-2.1) and should be checked against real outputs before writing product promises.

| Studio section | Qwen capability being presented | Scope of this design pass |
| --- | --- | --- |
| Freeform | Text-to-image generation in several aspect ratios | Blank prompt with ratio choices. |
| Photos | General image generation, portrait and product fidelity | Subject, photo type, capture style, light, framing. |
| Art & illustration | General image generation across visual styles | Medium, visual character, palette. |
| Graphics | General image generation | Asset type, visual language, palette. Graphic results are raster images; editable SVG paths would need a separate process. |
| Posters & text | Qwen's improved text rendering and visual composition | Poster purpose, layout, print character, exact wording field. Text accuracy must be tested. |
| Transparent assets | Native RGBA generation and subject extraction | Dedicated transparent-output section. Alpha quality and edge cases must be tested. |
| Multiple references | Up to 10 condition images; people and product preservation | Numbered reference slots, composition goal and rules. Local file previews work in the current browser session; inference is not connected. |
| Panoramas & storyboards | Qwen's panorama and storyboard examples | Structured prompts for wide or multi-frame work. Continuity needs validation. |
| Comics & panels | General generation plus the documented storyboard capability | Panel and art direction for sequential images. Qwen does not document a distinct comic mode; panel consistency and text accuracy need validation. |
| Image editor | Single-image edits, multi-image edits, local edits guided by circles, annotations, or masks | Navigation and future capability map only. No editing controls yet. |
| Library | App feature, not a model capability | Searchable local generations, ratings and recipes are planned. |

Qwen documents native 2K recommended sizes, but this does not imply every hardware setup will produce every size comfortably. The model has a 7B visual generation component plus a Qwen3-VL 8B text and image encoder, so model files remain large even if the inference binary is compact.

The Canvas step offers Qwen's documented aspect ratios and common print formats such as US Letter and A4. Physical print dimensions are layout targets in this prototype. Final resolution and print sharpness depend on generated pixels and export handling.

The Review step offers an optional Avoid field. Qwen's model card does not document a negative-prompt parameter in its basic pipeline examples. The candidate `stable-diffusion.cpp` runner [exposes a `--negative-prompt` argument](https://github.com/leejet/stable-diffusion.cpp/blob/master/examples/common/common.cpp) and [describes separate positive and negative condition caches](https://github.com/leejet/stable-diffusion.cpp/blob/master/docs/qwen_image_2.1.md) for Qwen-Image-2.1. Its actual effect needs image-level testing before it becomes a product promise.

For a native runtime, [`stable-diffusion.cpp` documents Qwen-Image-2.1](https://github.com/leejet/stable-diffusion.cpp/blob/master/docs/qwen_image_2.1.md) and offers [Vulkan and Metal backends](https://github.com/leejet/stable-diffusion.cpp/blob/master/docs/build.md). This is a candidate for Windows cross-GPU support and a later Mac version without requiring users to install PyTorch or CUDA. Performance, memory use, transparency, multiple references, and Mac behavior still need machine-level tests. Its build documentation currently warns about inefficient large-matrix operations on Metal.
