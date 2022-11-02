export default class CoreModules {
  async run() {
    this.manualFile = 'coremodules.md';
    this.replace = {
      VERSION: this.app.pkg.version,
      REPLACE_ME: this.generateMd()
    };
  }
  generateMd() {
    return Object.entries(this.app.dependencies).sort((a,b) => {
      if(a[0] < b[0]) return -1;
      if(a[0] > b[0]) return 1;
      return 0;
    }).reduce((s, [name, config]) => {
      const { version, description, homepage } = config;
      return s += `| ${homepage ? `[${name}](${homepage})` : name} | ${version} | ${description} |\n`;
    }, '');
  }
}