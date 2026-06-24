/**
 * Strips the `adapt-authoring-` prefix from a module name to give its short, display form (e.g. 'adapt-authoring-server' becomes 'server'). Inverse of the canonicalisation in {@link DependencyLoader#resolveModuleName}.
 * @param {string} name - The module name
 * @returns {string} The name without the prefix
 */
export function toShortName (name) {
  if (typeof name !== 'string') return name
  return name.replace(/^adapt-authoring-/, '')
}
