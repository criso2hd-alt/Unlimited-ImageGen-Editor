# Unlimited studio direction · fourth pass

This is a local visual and interaction prototype for the desktop app. The name, copy, previews, and section labels are working material for review.

## Preview

From the project root, run `python -m http.server 8765 --directory prototype` and open `http://127.0.0.1:8765/`.

The app uses a compact side rail and a neutral gray image workspace. Inspiration is a dense image wall without headings or banners. Freeform keeps a blank prompt. Photos, Art & illustration, Graphics, Posters & text, Transparent assets, Multiple references, Panoramas & storyboards, and Comics & panels each have a guided flow that shows one decision at a time. The Image editor appears in navigation as a later phase. Library and Settings are separate workspaces.

An Inspiration image opens its matching creation workspace with a starting brief. The step circles allow direct navigation, and every step can be skipped. Photos starts with a searchable visual carousel. Multiple references begins with image 01 and adds numbered slots up to 10. The Canvas step includes screen ratios and print layout targets. Review includes an optional Avoid field for future runtime validation. A “Refine with AI” button beside the idea field explains the planned local suggestion flow. Inputs and choices are saved locally in the browser per workspace, so switching sections does not erase them. Reference image previews remain in memory for the current page session only. The support prompt is permanently dismissible in the side rail, while the Settings link remains available.

The work canvas now defaults to a darker neutral gray (`#606060`), and the guided step panel matches the side menu (`#242424`). Settings can adjust the canvas gray and select a restrained accent color; these preferences persist locally. The sidebar shows Version 0.0.1.

The browser preview has no generation or editing runtime. The portable desktop build connects Generate to the local Qwen-Image-2.1 runtime and saves PNG originals and prompt details in its Library. Reference selection shows local image previews, but reference-image generation and the editor remain later phases. The two 4×3 inspiration sheets were created with the built-in image generation tool using calm photo, art, graphic and comic prompts with no neon; they are saved as `assets/inspiration-contact-sheet-v3.png` and `assets/inspiration-contact-sheet-v3b.png`. DM Sans and Manrope are bundled under the included OFL licenses so the preview does not need an internet font request.

See [CAPABILITIES.md](CAPABILITIES.md) for the mapping from Qwen-Image-2.1 capabilities to the navigation sections and for limits that still need validation.
See [PROMPT_ASSISTANCE.md](PROMPT_ASSISTANCE.md) for the planned local AI prompt workflow.

## Generated asset prompts

The two contact sheets were made with the built-in image generation tool.

First sheet: “Use case: stylized-concept. Asset type: contact sheet of twelve visual inspiration thumbnails for a neutral desktop AI image studio. Create a single seamless 4-column by 3-row grid of twelve DISTINCT images, each cell exactly equal size with straight grid boundaries, no gutters, no borders, no labels, no text, no UI. Row 1: natural window light portrait photograph of woman; restrained ceramic product still life photograph; misty coastal film landscape photograph; architectural interior photograph. Row 2: food photography with rustic bread and fruit; candid street photograph; refined botanical watercolor illustration on paper; expressive storybook fox illustration. Row 3: minimal abstract art print; typographic poster-like graphic with NO ACTUAL LETTERS; colorful fruit sticker illustration; sequential comic panel style character illustration. Overall calm, sophisticated visual range, real photographic textures where specified, no neon, no cyberpunk, no logos, no watermark. The cells must read as independent artwork and must be aligned to an exact 4x3 grid for CSS cropping.”

Second sheet: “Use case: stylized-concept. Asset type: second contact sheet of twelve visual inspiration thumbnails for a desktop AI image studio. One single image with an EXACT 4-column by 3-row grid, equal square cells, straight boundaries, no gutters, no borders, no captions, no text, no UI. Each cell must be a distinct independent image. Row 1: dramatic black and white portrait photograph; fine-art macro photograph of a leaf with water drops; quiet editorial fashion photograph; vintage car product photograph. Row 2: mountain landscape photograph in cool natural light; night cafe interior photograph with warm tungsten light but NO NEON; textured oil painting of wildflowers; delicate ink drawing of a bird. Row 3: playful geometric pattern graphic; sophisticated editorial book-cover-style abstract composition with NO LETTERS; clay-like 3D character mascot on neutral ground; colorful comic-book scene with two characters in two panels. Calm, sophisticated variety, no neon, no cyberpunk, no logo, no watermark. Strictly preserve 4x3 contact-sheet geometry to allow CSS tile cropping.”
