import { ShaderChunk } from 'three';

/**
 * Workaround for super-three 0.185 on Quest. Multiview renders both eyes in one
 * pass by adding `#define viewMatrix viewMatrices[VIEW_ID]` to shaders. three r185
 * added helpers to the shared `common` chunk (and transmission already had one)
 * that take a *parameter* named `viewMatrix`; the macro turns those parameters
 * into invalid array declarations, so every built-in material failed to compile
 * on the headset. Renaming the parameter inside each function fixes it without
 * changing results. Remove once super-three ships a fix (checked by
 * multiview-fix.test.ts).
 */
const BLOCKS: Partial<Record<keyof typeof ShaderChunk, RegExp>> = {
  // Top-level functions: they end at a closing brace in column 0.
  common: /vec3 transform(?:Normal|Direction)ByInverseViewMatrix\([\s\S]*?\n\}/g,
  // Nested in #ifdef USE_TRANSMISSION: it ends at a brace indented by one tab.
  transmission_pars_fragment: /vec4 getIBLVolumeRefraction\([\s\S]*?\n\t\}/g,
};

export function patchMultiviewChunks(): void {
  const chunks = ShaderChunk as unknown as Record<string, string>;
  for (const [name, block] of Object.entries(BLOCKS)) {
    chunks[name] = chunks[name]!.replace(block!, (fn) => fn.replace(/\bviewMatrix\b/g, 'viewMat'));
  }
}

patchMultiviewChunks();
