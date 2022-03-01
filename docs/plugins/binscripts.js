import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { parse } from 'comment-parser';

export default class BinScripts {
  constructor(app, config, outputDir) {
    this.app = app;
    this.outputDir = outputDir;
  }
  async run() {
    const data = await this.getScriptData();
    const contents = this.dataToMd(data);
    this.writeFile(contents);
  }
  async getScriptData() {
    const allData = await Promise.all(Object.values(this.app.dependencies).map(this.processDep));
    return allData
      .reduce((m, d) => d ? m.concat(d) : m, [])
      .sort((a,b) => a.name.localeCompare(b.name));
  }
  async processDep({ name, bin, rootDir }) {
    if(!bin) {
      return;
    }
    return await Promise.all(Object.entries(bin).map(async ([scriptName, filePath]) => {
      const data = { name: scriptName, description: 'No description provided.', moduleName: name };
      const contents = (await fs.readFile(`${rootDir}/${filePath}`)).toString();
      const match = contents.match(/^#!\/usr\/bin\/env node(\s*)?\/\*\*([\s\S]+?)\*\//);
      if(match) {
        const [{ description, tags }] = parse(match[0]);
        const params = tags.reduce((m,t) => {
          if(t.tag === 'param') m.push({ name: t.name, description: t.description });
          return m;
        }, []);
        data.description = description;
        if(params.length) data.params = params;
      }
      return data;
    }));
  }
  dataToMd(data) {
    let content = '';
    data.forEach(({ name, description, moduleName, params }) => {
      content += `<h2 class="script" id="${name}">${name} <span class="module">from ${moduleName}</span></h2>\n\n`;
      content += `<div class="details">\n`;
      content += `<p class="description">${description}</p>\n`;
      if(params) {
        content += `<b>Params</b>\n`;
        content += `<ul>\n`;
        params.forEach(p => content += `<li><code>${p.name}</code> ${p.description}</li>\n`);
        content += `</ul>\n`;
      }
      content += `</div>\n\n`;
    });
    return content;
  }
  async writeFile(content) {
    const input = fs.readFileSync(fileURLToPath(new URL('binscripts.md', import.meta.url))).toString();
    const outputPath = `${this.outputDir}/binscripts.md`;
    fs.writeFileSync(outputPath, input.replace('{{{REPLACE_ME}}}', content));
    this.customFiles = [outputPath];
  }
}