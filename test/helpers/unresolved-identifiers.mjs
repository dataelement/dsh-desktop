import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import ts from 'typescript'

const traverse = traverseModule.default ?? traverseModule

// Only ask TypeScript for ambient host names. Type inference on minified vendor
// bundles can crash TS; Babel's lexical binding table does not infer their types.
const host = ts.createCompilerHost({})
const filename = '__desktop_host_globals__.ts'
const originalGetSourceFile = host.getSourceFile.bind(host)
host.getSourceFile = (name, ...args) => name === filename
  ? ts.createSourceFile(name, '', ts.ScriptTarget.Latest, true)
  : originalGetSourceFile(name, ...args)
const program = ts.createProgram([filename], { types: ['node'], target: ts.ScriptTarget.ESNext }, host)
const globals = new Set(program.getTypeChecker()
  .getSymbolsInScope(program.getSourceFile(filename), ts.SymbolFlags.Value).map(symbol => symbol.name))

export function unresolvedIdentifiers(source, filename, runtimeGlobals = []) {
  const ast = parse(source, { sourceType: 'unambiguous', sourceFilename: filename })
  const failures = []
  traverse(ast, {
    Identifier(path) {
      if (!path.isReferencedIdentifier() && (!path.isBindingIdentifier() || path.parentPath.isExportSpecifier())) return
      const name = path.node.name
      if (path.scope.hasBinding(name) || globals.has(name) || runtimeGlobals.includes(name)) return
      failures.push(`${filename}:${path.node.loc.start.line}: Cannot find name '${name}'`)
    }
  })
  return failures
}
