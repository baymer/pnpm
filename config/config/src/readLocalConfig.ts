import path from 'path'
import util from 'util'
import camelcaseKeys from 'camelcase-keys'
import { envReplace } from '@pnpm/config.env-replace'
import { readIniFile } from 'read-ini-file'

export type LocalConfig = Record<string, string> & { hoist?: boolean }

export async function readLocalConfig (prefix: string): Promise<LocalConfig> {
  try {
    const ini = await readIniFile(path.join(prefix, '.npmrc')) as Record<string, string>
    const config = camelcaseKeys(ini) as LocalConfig
    if (config.shamefullyFlatten) {
      config.hoistPattern = '*'
      // TODO: print a warning
    }
    if (config.hoist === false) {
      config.hoistPattern = ''
    }
    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string') {
        try {
          config[envReplace(key, process.env)] = transformIfNum(envReplace(val, process.env))
        } catch {}
      }
    }
    return config
  } catch (err: unknown) {
    if (util.types.isNativeError(err) && 'code' in err && err.code === 'ENOENT') return {}
    throw err
  }
}

// childConcurrency & workspaceConcurrency is integers
// https://github.com/pnpm/pnpm/issues/5075
const intMask = /^[\d]+$/;
const floatMask = /^[\d.]+$/;
function transformIfNum(val: string): string | number {
  if (intMask.test(val)) {
    return parseInt(val, 10)
  } else if (floatMask.test(val)) {
    return parseFloat(val)
  }

  return val
}
