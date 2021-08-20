# Writing custom documentation plugins

In addition to the standard static markdown files, you can also generate dynamic content by writing your own documentation plugin.

To do this, you need to do the following:

## 1. Write your plugin
The first step involves writing the Javascript to do what you need. Here are a few tips on writing your own documentation plugin:
- Write any new `.md` files to the `outputDir` directory (any files not in this folder will not be included in the final output!)
- Include any new files in the `customFiles` array (forgetting this step will mean your files aren't included in the documentation side nav bar)
- You can access any App properties using the instance passed to your plugin's constructor
- To keep things neat, we recommend putting all plugin files in a separate `plugins/` folder in the `docs/` folder of your module (e.g. `mymodule/docs/plugins/MyDocPlugin.js`)

You can use the following code as a starting-point:
```js
class MyDocPlugin {
  /**
   * @param {App} app Reference to the main App instance
   * @param {Object} config Parsed adapt-authoring.json file for this module
   * @param {String} outputDir The docs output path (write any custom .md files here)
   */
  constructor(app, config, outputDir) {
    // include the FULL paths to any new .md files in this array. 
    this.customFiles = [];
  }
}
module.exports = MyDocPlugin;
```

## 2. Add your plugin to adapt-authoring.json
In order for your plugin to be executed by the documentation generator, you must add it to the list of `manualPlugins` in the `adapt-authoring.json` for your module (this path should be relative to the root folder of your plugin).

```json
{
  "documentation": {
    // ...other options
    "manualPlugins": ["docs/plugins/MyDocPlugin.js"]
  }
}

```