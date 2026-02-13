/**
 * Test package to validate rollup TypeScript plugin behavior.
 *
 * This file exercises:
 * 1. ES2022 Error.cause feature
 * 2. External package with conditional exports (js-yaml)
 */

import yaml from 'js-yaml'

export interface Config {
  name: string
  value: number
}

/**
 * Parse YAML config - uses js-yaml which has conditional exports
 */
export function parseConfig(yamlString: string): Config {
  try {
    const result = yaml.load(yamlString)
    if (typeof result !== 'object' || result === null) {
      throw new Error('Invalid config format')
    }
    return result as Config
  } catch (error) {
    // ES2022 Error.cause - requires lib.es2022.error.d.ts
    throw new Error('Failed to parse config', { cause: error })
  }
}

/**
 * Stringify config to YAML
 */
export function stringifyConfig(config: Config): string {
  return yaml.dump(config)
}
