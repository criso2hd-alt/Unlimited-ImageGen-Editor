(function (root) {
  'use strict';

  // A rule narrows a later step only when its earlier choice has a useful constraint.
  // Choices without a rule remain available because they work across subjects.
  const rules = {
    photos: {
      look: { type: {
        Portrait: ['Contemporary digital','35mm color film','Black & white','Editorial','Instant film','Medium format','Lifestyle','Documentary','Fashion','Fine art','Cinematic still','High key','Low key'],
        Product: ['Contemporary digital','35mm color film','Black & white','Editorial','Medium format','Fine art','Cinematic still','Macro','High key','Low key'],
        Landscape: ['Contemporary digital','35mm color film','Black & white','Medium format','Documentary','Fine art','Cinematic still','Long exposure','High key','Low key'],
        Nature: ['Contemporary digital','35mm color film','Black & white','Medium format','Documentary','Fine art','Macro','Long exposure','High key','Low key'],
        Food: ['Contemporary digital','35mm color film','Editorial','Medium format','Lifestyle','Documentary','Fine art','Macro','High key','Low key'],
        Architecture: ['Contemporary digital','35mm color film','Black & white','Editorial','Medium format','Documentary','Fine art','Cinematic still','Long exposure','High key','Low key'],
        Interior: ['Contemporary digital','35mm color film','Black & white','Editorial','Medium format','Lifestyle','Documentary','Fine art','Cinematic still','High key','Low key'],
        Street: ['Contemporary digital','35mm color film','Black & white','Editorial','Instant film','Documentary','Lifestyle','Cinematic still','Long exposure','Low key']
      } },
      process: { look: {
        'Contemporary digital': ['Contemporary','1990s editorial','1970s color','Color negative'],
        '35mm color film': ['1970s color','1990s editorial','Kodachrome','Ektachrome','Portra-inspired','Slide film','Color negative','Cross processed'],
        'Black & white': ['Silver gelatin','Tri-X-inspired','Cyanotype','Wet plate','Contemporary'],
        Editorial: ['Contemporary','1990s editorial','1970s color','Portra-inspired','Color negative','Silver gelatin'],
        'Instant film': ['Polaroid-style'],
        'Medium format': ['Silver gelatin','Portra-inspired','Ektachrome','Slide film','Color negative','Contemporary'],
        Lifestyle: ['Contemporary','Portra-inspired','Color negative','1970s color','1990s editorial','Polaroid-style'],
        Documentary: ['Contemporary','Silver gelatin','Tri-X-inspired','Color negative','1970s color','1990s editorial'],
        Fashion: ['Contemporary','1990s editorial','Portra-inspired','Ektachrome','Color negative','Silver gelatin'],
        'Fine art': ['Contemporary','Silver gelatin','Cyanotype','Wet plate','Color negative','Ektachrome'],
        'Cinematic still': ['Contemporary','Kodachrome','Ektachrome','Portra-inspired','Color negative','Silver gelatin'],
        Macro: ['Contemporary','Ektachrome','Slide film','Color negative','Silver gelatin'],
        'Long exposure': ['Silver gelatin','Color negative','Slide film','Contemporary'],
        'High key': ['Portra-inspired','Color negative','Silver gelatin','Contemporary'],
        'Low key': ['Tri-X-inspired','Silver gelatin','Color negative','Contemporary']
      } },
      light: { type: {
        Portrait: ['Window light','Golden hour','Overcast','Studio softbox','Hard sunlight','Candlelight','Rembrandt light','Butterfly light','Loop light','Split light','Rim light','Backlit','Top light','Clamshell light','Direct flash','Blue hour'],
        Product: ['Window light','Golden hour','Overcast','Studio softbox','Hard sunlight','Candlelight','Rim light','Backlit','Top light','Direct flash'],
        Landscape: ['Golden hour','Overcast','Hard sunlight','Backlit','Blue hour'],
        Nature: ['Window light','Golden hour','Overcast','Hard sunlight','Backlit','Top light','Blue hour'],
        Food: ['Window light','Golden hour','Overcast','Studio softbox','Hard sunlight','Candlelight','Backlit','Top light'],
        Architecture: ['Window light','Golden hour','Overcast','Hard sunlight','Warm practical light','Backlit','Top light','Blue hour'],
        Interior: ['Window light','Golden hour','Overcast','Candlelight','Warm practical light','Backlit','Top light','Blue hour'],
        Street: ['Golden hour','Overcast','Hard sunlight','Candlelight','Backlit','Direct flash','Blue hour']
      } },
      framing: { type: {
        Portrait: ['Close-up','Waist-up','Wide scene','Low angle','Symmetrical','Environmental portrait','Extreme close-up','Eye level','Negative space','Rule of thirds','Dutch angle','Through foreground'],
        Product: ['Close-up','Wide scene','Top-down','Low angle','Symmetrical','Extreme close-up','Eye level','Negative space','Rule of thirds','Through foreground'],
        Landscape: ['Wide scene','Low angle','Symmetrical','Negative space','Rule of thirds','Through foreground','Panorama'],
        Nature: ['Close-up','Wide scene','Top-down','Low angle','Symmetrical','Extreme close-up','Eye level','Negative space','Rule of thirds','Through foreground','Panorama'],
        Food: ['Close-up','Wide scene','Top-down','Symmetrical','Extreme close-up','Eye level','Negative space','Rule of thirds','Through foreground'],
        Architecture: ['Wide scene','Top-down','Low angle','Symmetrical','Eye level','Negative space','Rule of thirds','Through foreground','Panorama'],
        Interior: ['Close-up','Wide scene','Low angle','Symmetrical','Eye level','Negative space','Rule of thirds','Through foreground','Panorama'],
        Street: ['Close-up','Waist-up','Wide scene','Low angle','Environmental portrait','Eye level','Negative space','Rule of thirds','Dutch angle','Through foreground','Panorama']
      } }
    },
    art: {
      character: { medium: {
        Watercolor: ['Botanical study','Storybook','Editorial','Surreal','Minimal','Scientific plate','Children’s book','Fantasy','Concept art','Abstract'],
        'Oil painting': ['Botanical study','Storybook','Editorial','Surreal','Minimal','Fantasy','Concept art','Abstract'],
        'Ink drawing': ['Botanical study','Storybook','Editorial','Graphic folk','Surreal','Minimal','Scientific plate','Children’s book','Fantasy','Concept art','Retro comic','Abstract'],
        'Colored pencil': ['Botanical study','Storybook','Editorial','Minimal','Scientific plate','Children’s book','Fantasy','Concept art'],
        'Cut paper': ['Storybook','Editorial','Graphic folk','Surreal','Minimal','Children’s book','Fantasy','Abstract'],
        'Digital illustration': ['Botanical study','Storybook','Editorial','Graphic folk','Surreal','Minimal','Scientific plate','Children’s book','Fantasy','Concept art','Retro comic','Abstract'],
        Gouache: ['Botanical study','Storybook','Editorial','Graphic folk','Surreal','Minimal','Children’s book','Fantasy','Concept art','Abstract'],
        Charcoal: ['Botanical study','Editorial','Surreal','Minimal','Fantasy','Concept art','Abstract'],
        Pastel: ['Botanical study','Storybook','Editorial','Surreal','Minimal','Children’s book','Fantasy','Abstract'],
        Linocut: ['Botanical study','Storybook','Editorial','Graphic folk','Surreal','Minimal','Retro comic','Abstract'],
        Woodcut: ['Botanical study','Storybook','Editorial','Graphic folk','Surreal','Minimal','Fantasy','Retro comic','Abstract'],
        Etching: ['Botanical study','Editorial','Surreal','Minimal','Scientific plate','Fantasy','Abstract'],
        Acrylic: ['Botanical study','Storybook','Editorial','Graphic folk','Surreal','Minimal','Children’s book','Fantasy','Concept art','Abstract'],
        'Pixel art': ['Storybook','Graphic folk','Surreal','Minimal','Children’s book','Fantasy','Concept art','Retro comic','Abstract']
      } },
      palette: { medium: {
        'Ink drawing': ['Monochrome','Warm paper','Limited palette','Black & white'],
        Charcoal: ['Monochrome','Warm paper','Limited palette','Black & white'],
        Etching: ['Monochrome','Warm paper','Limited palette','Black & white'],
        Linocut: ['Earth tones','Monochrome','Warm paper','Limited palette','Complementary','Black & white'],
        Woodcut: ['Earth tones','Monochrome','Warm paper','Limited palette','Complementary','Black & white'],
        'Cut paper': ['Earth tones','Soft pastels','Rich jewel tones','Natural color','Limited palette','Complementary','Cool muted','Warm vibrant','Black & white'],
        'Pixel art': ['Soft pastels','Rich jewel tones','Natural color','Limited palette','Complementary','Cool muted','Warm vibrant','Black & white']
      } }
    },
    graphics: {
      language: { asset: {
        Sticker: ['Flat shapes','Paper cut','Line art','Soft 3D','Screen print','Hand drawn','Geometric','Organic','Duotone','Halftone','Clay-like'],
        'Icon concept': ['Flat shapes','Line art','Soft 3D','Geometric','Duotone'],
        Pattern: ['Flat shapes','Paper cut','Line art','Screen print','Hand drawn','Geometric','Organic','Duotone','Halftone','Collage'],
        Mascot: ['Flat shapes','Paper cut','Line art','Soft 3D','Hand drawn','Organic','Clay-like'],
        Background: ['Flat shapes','Paper cut','Soft 3D','Screen print','Geometric','Organic','Duotone','Halftone','Collage'],
        'Spot illustration': ['Flat shapes','Paper cut','Line art','Soft 3D','Screen print','Hand drawn','Organic','Clay-like','Collage'],
        Badge: ['Flat shapes','Line art','Screen print','Hand drawn','Geometric','Duotone','Halftone'],
        'Packaging motif': ['Flat shapes','Paper cut','Line art','Screen print','Hand drawn','Geometric','Organic','Halftone','Collage'],
        'Infographic element': ['Flat shapes','Line art','Soft 3D','Geometric','Duotone'],
        'Social graphic': ['Flat shapes','Paper cut','Line art','Soft 3D','Screen print','Hand drawn','Geometric','Organic','Duotone','Halftone','Collage'],
        'Decorative border': ['Flat shapes','Paper cut','Line art','Screen print','Hand drawn','Geometric','Organic','Duotone'],
        'Isometric scene': ['Flat shapes','Soft 3D','Geometric','Clay-like']
      } },
      palette: { language: {
        Duotone: ['Two color','Black & cream','High contrast','Custom'],
        'Screen print': ['Muted natural','Bright playful','Two color','Black & cream','Primary colors','Earthy warm','High contrast','Custom'],
        Halftone: ['Muted natural','Bright playful','Two color','Black & cream','Primary colors','High contrast','Custom'],
        'Paper cut': ['Muted natural','Bright playful','Two color','Black & cream','Pastel','Primary colors','Earthy warm','Cool modern','Custom']
      } }
    },
    posters: {
      layout: { purpose: {
        'Event poster': ['Image-led','Type-led','Editorial grid','Minimal','Collage','Centered','Split layout','Asymmetrical','Full bleed','Framed','Vertical type','Modular'],
        'Album cover': ['Image-led','Type-led','Minimal','Collage','Centered','Split layout','Asymmetrical','Full bleed','Framed'],
        'Book cover': ['Image-led','Type-led','Editorial grid','Minimal','Collage','Centered','Split layout','Asymmetrical','Full bleed','Framed'],
        Advertisement: ['Image-led','Type-led','Editorial grid','Minimal','Centered','Split layout','Asymmetrical','Full bleed','Framed','Modular'],
        Invitation: ['Image-led','Type-led','Minimal','Centered','Split layout','Framed','Vertical type'],
        Sign: ['Type-led','Minimal','Centered','Framed','Vertical type'],
        'Film poster': ['Image-led','Type-led','Minimal','Collage','Centered','Split layout','Asymmetrical','Full bleed'],
        'Magazine cover': ['Image-led','Type-led','Editorial grid','Minimal','Collage','Asymmetrical','Full bleed','Modular'],
        'Exhibition poster': ['Image-led','Type-led','Editorial grid','Minimal','Centered','Asymmetrical','Framed','Vertical type'],
        Menu: ['Type-led','Editorial grid','Minimal','Centered','Framed','Modular'],
        'Editorial spread': ['Image-led','Type-led','Editorial grid','Minimal','Collage','Asymmetrical','Full bleed','Modular'],
        'Product label': ['Type-led','Editorial grid','Minimal','Centered','Framed','Modular']
      } },
      finish: { purpose: {
        Sign: ['Modern clean','Vintage print','Bold graphic','Photographic','Screen print'],
        Menu: ['Modern clean','Vintage print','Risograph','Fine art','Photographic','Letterpress','Uncoated paper'],
        'Product label': ['Modern clean','Vintage print','Bold graphic','Photographic','Letterpress','Screen print','Foil accent','Uncoated paper'],
        'Magazine cover': ['Modern clean','Vintage print','Fine art','Bold graphic','Photographic','Foil accent','Uncoated paper'],
        'Editorial spread': ['Modern clean','Vintage print','Risograph','Fine art','Bold graphic','Photographic','Newsprint','Uncoated paper']
      } }
    },
    transparent: {
      edge: { asset: {
        'Product cutout': ['Clean cutout','Soft natural edge','Shadow included','No shadow','Feathered edge','Crisp vector-like'],
        Sticker: ['Clean cutout','Illustrated edge','Paper texture','No shadow','Die-cut border','Crisp vector-like','Hand-torn edge'],
        Character: ['Clean cutout','Soft natural edge','Illustrated edge','Paper texture','Shadow included','No shadow','Die-cut border','Feathered edge'],
        'Decorative element': ['Clean cutout','Soft natural edge','Illustrated edge','Paper texture','No shadow','Feathered edge','Crisp vector-like','Hand-torn edge'],
        Lettering: ['Clean cutout','Illustrated edge','Paper texture','No shadow','Die-cut border','Crisp vector-like','Hand-torn edge'],
        'Object collection': ['Clean cutout','Soft natural edge','Illustrated edge','Shadow included','No shadow','Die-cut border','Crisp vector-like'],
        'Food cutout': ['Clean cutout','Soft natural edge','Shadow included','No shadow','Feathered edge'],
        'Botanical cutout': ['Clean cutout','Soft natural edge','Illustrated edge','Paper texture','No shadow','Feathered edge','Hand-torn edge'],
        'Fashion item': ['Clean cutout','Soft natural edge','Shadow included','No shadow','Feathered edge'],
        'Logo concept': ['Clean cutout','Illustrated edge','No shadow','Crisp vector-like'],
        'UI ornament': ['Clean cutout','Illustrated edge','No shadow','Crisp vector-like'],
        'Emoji-style object': ['Clean cutout','Illustrated edge','Shadow included','No shadow','Die-cut border','Crisp vector-like']
      } }
    },
    references: {
      composition: { goal: {
        'Keep identity': ['Asymmetrical','Centered','Rule of thirds','Layered depth','Open space'],
        'Keep product detail': ['Asymmetrical','Centered','Rule of thirds','Layered depth','Open space'],
        'Combine subjects': ['Asymmetrical','Centered','Rule of thirds','Layered depth','Dynamic'],
        'Borrow a style': ['Asymmetrical','Centered','Rule of thirds','Open space','Dynamic'],
        'New scene': ['Asymmetrical','Centered','Rule of thirds','Layered depth','Open space','Dynamic'],
        'Reference layout': ['Asymmetrical','Centered','Rule of thirds','Layered depth','Open space']
      } },
      output: { goal: {
        'Keep identity': ['Photograph','Illustration','Poster'],
        'Keep product detail': ['Photograph','Poster','Transparent asset'],
        'Combine subjects': ['Photograph','Illustration','Poster','Transparent asset'],
        'Borrow a style': ['Photograph','Illustration','Poster'],
        'New scene': ['Photograph','Illustration','Poster'],
        'Reference layout': ['Photograph','Illustration','Poster']
      } }
    },
    storyboards: {
      continuity: { form: {
        Panorama: ['Same location','Same lighting'],
        Storyboard: ['Same location','Same character','Same product','Same lighting'],
        'Character views': ['Same character','Same lighting'],
        'Scene study': ['Same location','Same lighting','Same character']
      } }
    },
    comics: {
      art: { format: {
        'Comic strip': ['Ink and wash','Graphic novel','Clear line','Watercolor','Manga-inspired','Digital color'],
        'Comic page': ['Ink and wash','Graphic novel','Clear line','Watercolor','Manga-inspired','Digital color'],
        Storyboard: ['Ink and wash','Graphic novel','Clear line','Digital color'],
        'Single panel': ['Ink and wash','Graphic novel','Clear line','Watercolor','Manga-inspired','Digital color']
      } },
      story: { format: {
        'Comic strip': ['Character action','Conversation','Visual gag'],
        'Comic page': ['Character action','Conversation','Environment','Visual gag'],
        Storyboard: ['Character action','Conversation','Environment'],
        'Single panel': ['Character action','Conversation','Environment','Visual gag']
      } }
    }
  };

  function available(catalog, mode, sectionId, choices = {}) {
    const section = catalog[mode]?.sections.find(item => item.id === sectionId);
    if (!section) return [];
    const filters = rules[mode]?.[sectionId] || {};
    return section.options.filter(([title]) => Object.entries(filters).every(([previousId, byChoice]) => {
      const selected = choices[previousId];
      return !selected || !byChoice[selected] || byChoice[selected].includes(title);
    }));
  }

  function context(mode, sectionId, choices = {}) {
    const filters = rules[mode]?.[sectionId] || {};
    return Object.entries(filters).filter(([previousId, byChoice]) => choices[previousId] && byChoice[choices[previousId]]).map(([previousId]) => choices[previousId]);
  }

  function reconcile(catalog, mode, choices = {}) {
    const removed = [];
    for (const section of catalog[mode]?.sections || []) {
      if (choices[section.id] && !available(catalog, mode, section.id, choices).some(([title]) => title === choices[section.id])) {
        removed.push(choices[section.id]);
        delete choices[section.id];
      }
    }
    return removed;
  }

  const api = { rules, available, context, reconcile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.choiceLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
