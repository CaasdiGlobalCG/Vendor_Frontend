import { describe, it, expect, beforeEach } from 'vitest';
import { rememberCanvas, forgetCanvases, rememberedCanvases } from '../src/pages/WorkspacePage/utils/WorkspaceProgressContext.js';

describe('canvases remembered for this visit', () => {
  beforeEach(() => forgetCanvases());

  it('remembers what a canvas held, replacing it as it changes', () => {
    rememberCanvas('s1', [{ id: 'a' }]);
    rememberCanvas('s1', [{ id: 'a' }, { id: 'b' }]);
    expect(rememberedCanvases().get('s1')).toHaveLength(2);
  });

  it('ignores a missing id or something that is not a list of nodes', () => {
    rememberCanvas(undefined, [{ id: 'a' }]);
    rememberCanvas('s2', null);
    rememberCanvas('s3', 'nodes');
    expect(rememberedCanvases().size).toBe(0);
  });

  it('when the tasks reload from the server, everything is forgotten except the open canvas', () => {
    rememberCanvas('open', [{ id: 'x' }]);
    rememberCanvas('closed', [{ id: 'y' }]);
    forgetCanvases('open');
    expect([...rememberedCanvases().keys()]).toEqual(['open']);
    forgetCanvases();
    expect(rememberedCanvases().size).toBe(0);
  });
});
