/**
 * A hook's dependency list is read while the component renders, so naming a value
 * that is declared further down the component throws "Cannot access 'x' before
 * initialization" and takes the whole page down. The big pages are too heavy to
 * render in a test, so this reads the source and checks the order.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../src/pages/WorkspacePage');
const FILES = ['WorkspacePage.jsx', 'components/CanvasWorkspace.jsx', 'components/WorkspaceMain.jsx', 'components/WorkspaceContextPanel.jsx'];

/** Hooks whose dependency list names something declared later in the file. */
export const findUseBeforeDeclaration = (source) => {
  const declared = new Map();
  for (const m of source.matchAll(/\b(?:const|let|var)\s+(\[[^\]]*\]|\{[^}]*\}|[A-Za-z_$][\w$]*)/g)) {
    for (const name of m[1].match(/[A-Za-z_$][\w$]*/g) || []) if (!declared.has(name)) declared.set(name, m.index);
  }
  for (const m of source.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) if (!declared.has(m[1])) declared.set(m[1], 0);

  const problems = [];
  for (const m of source.matchAll(/\n\s*\}(?:,\s*|\))\s*\[([^\]\n]*)\]\s*\);/g)) {
    // `a?.role` names `a`, not a variable called `role`
    for (const dep of m[1].match(/(?<![.\w$])[A-Za-z_$][\w$]*/g) || []) {
      const at = declared.get(dep);
      if (at !== undefined && at > m.index && !/^(true|false|null|undefined)$/.test(dep)) {
        problems.push({ dep, hookLine: source.slice(0, m.index).split('\n').length, declaredLine: source.slice(0, at).split('\n').length });
      }
    }
  }
  return problems;
};

describe('the checker itself', () => {
  it('catches a dependency declared after the hook', () => {
    const bad = `function C() {\n  useEffect(() => {\n    go(tasks);\n  }, [tasks]);\n  const [tasks, setTasks] = useState([]);\n}`;
    expect(findUseBeforeDeclaration(bad)).toEqual([{ dep: 'tasks', hookLine: 3, declaredLine: 5 }]);
  });
  it('does not mistake a property name for a variable', () => {
    const src = `function C() {\n  useEffect(() => {\n    go();\n  }, [user?.role, a.tasks]);\n  const role = 1;\n  const tasks = 2;\n}`;
    expect(findUseBeforeDeclaration(src)).toEqual([]);
  });
  it('is quiet when the order is right', () => {
    const good = `function C() {\n  const [tasks, setTasks] = useState([]);\n  useEffect(() => {\n    go(tasks);\n  }, [tasks]);\n}`;
    expect(findUseBeforeDeclaration(good)).toEqual([]);
  });
});

describe('workspace pages declare what their hooks depend on before using it', () => {
  it.each(FILES)('%s', (file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    expect(findUseBeforeDeclaration(source)).toEqual([]);
  });
});
