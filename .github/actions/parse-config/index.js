const fs = require("fs");
const yaml = require("js-yaml");

const configYamlText = fs.readFileSync(process.argv[2], "utf-8");

/**
 * @typedef Options
 * @prop {boolean} x86_64
 * @prop {boolean} arm
 * @prop {boolean} archlinux
 * @prop {boolean} manjaro
 * @prop {boolean} debian
 * @prop {boolean} ubuntu
 */

/**
 * @typedef ConfigInput
 * @prop {{
 *  os: Record<string, { 
 *    name: string;
 *    versions: string[];
 *    "package-type": string;
 *    "docker-image": string;
 *  }>;
 *  arch: string[];
 * }} definitions
 * @prop {Options} baseOptions
 * @prop {Record<string, null | (Options & { ref: string; })>} packages
 */

/**
 * @typedef ConfigOutputItem
 * @prop {string} target
 * @prop {string} target-ref
 * @prop {string} arch
 * @prop {object} os
 */

/**
 * @type {ConfigInput}
 */
const config = yaml.load(configYamlText);
/**
 * @type {ConfigOutputItem[]}
 */
const configOutput = [];

/**
 * 
 * @param {string} target
 * @param {string} targetRef
 * @param {string} arch
 * @param {string} os
 */
function pushItem(target, targetRef, arch, os) {
  osDefinition = config.definitions.os[os];
  for (const version of osDefinition.versions || [""]) {
    configOutput.push({
      target,
      "target-ref": targetRef,
      arch,
      os: {
        ...osDefinition,
        name: osDefinition.name + (version ? " " + version : ""),
        "docker-image": osDefinition["docker-image"] + version,
        id: os + version,
        versions: undefined,
        baseName: osDefinition.name,
        version
      }
    });
  }
}

const packageTypes = Array.from(new Set(Object.values(config.definitions.os).map(os => os["package-type"])));
packageTypes.map(packageType => 
  Object.entries(config[`packages-${packageType}`]).forEach(([target, options]) => {
    const mergedOptions = { ...config.baseOptions, ...options };

    const osList = Object.keys(config.definitions.os);
    const archList = config.definitions.arch;

    for (const os of osList) {
      if (mergedOptions[os] && config.definitions.os[os]["package-type"] === packageType) {
        for (const arch of archList) {
          if (mergedOptions[arch]) {
            pushItem(target, mergedOptions.ref || target, arch, os);
          }
        }
      }
    }
  })
);

configOutput.sort((a, b) => {
  if (a.arch !== b.arch) return a.arch < b.arch ? -1 : 1;
  if (a.os !== b.os) return a.os < b.os ? -1 : 1;
  return a.target < b.target ? -1 : 1;
});
console.log(JSON.stringify(configOutput));
