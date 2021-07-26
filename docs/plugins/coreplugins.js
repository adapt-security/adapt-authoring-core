const fs = require('fs-extra');
const path = require('path');
const { App } = require('adapt-authoring-core');

class Plugin {
  onHandleConfig() {
    let content = ``;
    Object.entries(App.instance.dependencies).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).forEach(([name, config]) => {
      const { version, description, homepage } = config;
      content += `| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${description} |\n`;
    });
    const input = fs.readFileSync(path.join(__dirname, 'coreplugins.md')).toString();
    const output = input
      .replace('{{{VERSION}}}', App.instance.pkg.version)
      .replace('{{{REPLACE_ME}}}', content);
    fs.writeFileSync(path.join(__dirname, '..', 'temp-coreplugins.md'), output);
  }
}

module.exports = new Plugin();
