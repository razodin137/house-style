import nativeRaw from '../manifests/native.json' with { type: 'json' };
import microUtilsRaw from '../manifests/micro-utilities.json' with { type: 'json' };
import preferredRaw from '../manifests/preferred.json' with { type: 'json' };
const nativeReplacements = nativeRaw;
const microUtilsReplacements = microUtilsRaw;
const preferredReplacements = preferredRaw;
export * from './types.js';
export * from './util.js';
export { nativeReplacements, microUtilsReplacements, preferredReplacements };
export const all = {
    replacements: {
        ...nativeReplacements.replacements,
        ...microUtilsReplacements.replacements,
        ...preferredReplacements.replacements
    },
    mappings: {
        ...nativeReplacements.mappings,
        ...microUtilsReplacements.mappings,
        ...preferredReplacements.mappings
    }
};
