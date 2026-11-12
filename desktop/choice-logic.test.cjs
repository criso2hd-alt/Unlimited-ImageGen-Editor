const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const logic = require('../prototype/choice-logic.js');
const promptLanguage = require('../prototype/prompt-language.js');
const inspirationRecipes = require('../prototype/inspiration-recipes.js');
const visualAssets = require('../prototype/visual-assets.js');

const source = fs.readFileSync(path.join(__dirname, '../prototype/script.js'), 'utf8');
const catalog = vm.runInNewContext(source.slice(source.indexOf('const catalog ='), source.indexOf('const sheet =')) + '\ncatalog');
const inspiration = vm.runInNewContext(source.slice(source.indexOf('const inspiration ='), source.indexOf('const photoTypes =')) + '\ninspiration');
const titles = (mode, section, choices) => logic.available(catalog, mode, section, choices).map(([title]) => title);

test('every rule points to a real choice and leaves a useful next step', () => {
  for (const [mode, sections] of Object.entries(logic.rules)) {
    for (const [sectionId, filters] of Object.entries(sections)) {
      const section = catalog[mode].sections.find(item => item.id === sectionId);
      assert.ok(section, `${mode}:${sectionId}`);
      for (const [parentId, branches] of Object.entries(filters)) {
        const parent = catalog[mode].sections.find(item => item.id === parentId);
        assert.ok(parent, `${mode}:${parentId}`);
        assert.ok(catalog[mode].sections.indexOf(parent) < catalog[mode].sections.indexOf(section));
        for (const [choice, allowed] of Object.entries(branches)) {
          assert.ok(parent.options.some(([title]) => title === choice), `${mode}:${parentId}:${choice}`);
          assert.ok(allowed.length, `${mode}:${sectionId}:${choice}`);
          for (const value of allowed) assert.ok(section.options.some(([title]) => title === value), `${mode}:${sectionId}:${value}`);
          assert.ok(titles(mode, sectionId, { [parentId]: choice }).length);
        }
      }
    }
  }
});

test('landscape excludes portrait lighting, and changing direction clears it', () => {
  assert.ok(!titles('photos', 'light', { type: 'Landscape' }).includes('Rembrandt light'));
  assert.ok(titles('photos', 'light', { type: 'Portrait' }).includes('Rembrandt light'));
  const choices = { type: 'Portrait', look: 'Fashion', light: 'Rembrandt light', framing: 'Close-up' };
  choices.type = 'Landscape';
  assert.deepEqual(Array.from(logic.reconcile(catalog, 'photos', choices)), ['Fashion', 'Rembrandt light', 'Close-up']);
  assert.equal(choices.type, 'Landscape');
});

test('rule choices remain navigable across every guided mode', () => {
  for (const [mode, conf] of Object.entries(catalog)) {
    const choices = {};
    for (const section of conf.sections) {
      const options = titles(mode, section.id, choices);
      assert.ok(options.length, `${mode}:${section.id}`);
      choices[section.id] = options[0];
    }
    assert.deepEqual(Array.from(logic.reconcile(catalog, mode, choices)), []);
  }
});

test('guided prompt uses concrete terms and preserves the user subject', () => {
  const prompt = promptLanguage.build(catalog, 'photos', { idea: 'A lighthouse beside the sea', choices: { type: 'Landscape', look: '35mm color film', process: 'Kodachrome', light: 'Golden hour', framing: 'Panorama' } });
  assert.match(prompt, /lighthouse beside the sea/);
  assert.match(prompt, /35mm color-film photograph/);
  assert.match(prompt, /Kodachrome-inspired slide color/);
  assert.match(prompt, /Warm low sunlight/);
  assert.match(prompt, /wide horizontal frame/);
  assert.doesNotMatch(prompt, /Rembrandt/);
});

test('prompt vocabulary maps only to real guided options', () => {
  for (const [mode, sections] of Object.entries(promptLanguage.words)) {
    for (const [sectionId, entries] of Object.entries(sections)) {
      const section = catalog[mode].sections.find(item => item.id === sectionId);
      assert.ok(section, `${mode}:${sectionId}`);
      for (const [title, phrase] of Object.entries(entries)) {
        assert.ok(section.options.some(([option]) => option === title), `${mode}:${sectionId}:${title}`);
        assert.ok(phrase.length > 12);
      }
    }
  }
});

test('every inspiration image opens with a complete compatible recipe', () => {
  const ratios=new Set(['1:1','4:3','3:4','3:2','2:3','16:9','9:16']);
  assert.equal(inspiration.length,Object.keys(inspirationRecipes).length);
  for(const item of inspiration){
    const recipe=inspirationRecipes[item.title];
    assert.ok(recipe,`Missing recipe for ${item.title}`);
    assert.ok(ratios.has(recipe.ratio),`${item.title} ratio`);
    for(const section of catalog[item.mode].sections){
      assert.ok(recipe.choices[section.id],`${item.title} missing ${section.id}`);
      assert.ok(titles(item.mode,section.id,recipe.choices).includes(recipe.choices[section.id]),`${item.title} incompatible ${section.id}: ${recipe.choices[section.id]}`);
    }
    const selected={...recipe.choices};
    assert.deepEqual(Array.from(logic.reconcile(catalog,item.mode,selected)),[],item.title);
    assert.match(promptLanguage.build(catalog,item.mode,{idea:'A new subject',choices:selected}),/A new subject/);
  }
});

test('bundled visual assets cover every inspiration and guided choice', () => {
  assert.equal(inspiration.length,40);
  assert.equal(Object.keys(visualAssets.inspiration).length,40);
  for(const item of inspiration){
    const file=visualAssets.inspiration[item.title];
    assert.ok(file,`${item.title} missing visual`);
    assert.ok(fs.existsSync(path.join(__dirname,'../prototype',file)),file);
  }
  assert.equal(Object.keys(visualAssets.options).length,234);
  const missing=[];
  for(const [mode,conf] of Object.entries(catalog))for(const section of conf.sections)for(const [name] of section.options){
    const key=`${mode}:${section.id}:${name}`,file=visualAssets.options[key];
    if(file)assert.ok(fs.existsSync(path.join(__dirname,'../prototype',file)),file);
    else missing.push(key);
  }
  assert.deepEqual(missing,[]);
});
