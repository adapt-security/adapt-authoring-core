const fs = require('fs-extra');
const path = require('path');

class Configuration {
  constructor(app, config, outputDir) {
    let content = ``;
    Object.entries(app.dependencies).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([name, config]) => {
      const { version, description, homepage } = config;
      content += `| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${description} |\n`;
    });
    const input = fs.readFileSync(path.join(__dirname, 'coreplugins.md')).toString();
    const outputPath = `${outputDir}/coreplugins.md`;
    const output = input
      .replace('{{{VERSION}}}', app.pkg.version)
      .replace('{{{REPLACE_ME}}}', content);

    fs.writeFileSync(outputPath, output);
    this.customFiles = [outputPath];
  }
}

module.exports = Configuration;
