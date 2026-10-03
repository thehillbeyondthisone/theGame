import { ShaderChunk } from 'three';
import { describe, expect, it } from 'vitest';
import './multiview-fix';

// The names super-three turns into per-eye array lookups under multiview.
const MACROS = ['viewMatrix', 'projectionMatrix', 'modelViewMatrix', 'normalMatrix'];

describe('multiview shader fix', () => {
  it('leaves no shader chunk declaring a multiview-macro name as a parameter or variable', () => {
    // Uniform declarations are fine: super-three rewrites or leaves those itself.
    const offenders: string[] = [];
    for (const [name, src] of Object.entries(ShaderChunk as unknown as Record<string, string>)) {
      if (typeof src !== 'string') continue;
      for (const macro of MACROS) {
        if (new RegExp(`(?<!uniform\\s+)\\b(mat3|mat4)\\s+${macro}\\b`).test(src)) offenders.push(`${name}: ${macro}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the helpers themselves', () => {
    expect(ShaderChunk.common).toContain('vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMat )');
    expect(ShaderChunk.common).toContain('( vec4( normal, 0.0 ) * viewMat )');
  });
});
