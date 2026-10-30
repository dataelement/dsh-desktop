import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const unwrap = node => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node
// Detect runtime feature guards, including minifier spellings typeof x < "u".
// This permits an optional global only on the branch where it is defined.
function definedBy(condition, name, truthy) {
  const node = unwrap(condition)
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) return definedBy(node.operand, name, !truthy)
  if (!ts.isBinaryExpression(node)) return false
  const op = node.operatorToken.kind
  if (op === ts.SyntaxKind.AmpersandAmpersandToken && truthy || op === ts.SyntaxKind.BarBarToken && !truthy) {
    return definedBy(node.left, name, truthy) || definedBy(node.right, name, truthy)
  }
  const left = unwrap(node.left), right = unwrap(node.right)
  if (!ts.isTypeOfExpression(left) || !ts.isIdentifier(left.expression) || left.expression.text !== name || !ts.isStringLiteral(right)) return false
  if (right.text === 'undefined') {
    if ([ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)) return truthy
    if ([ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken].includes(op)) return !truthy
  }
  if (right.text === 'u') {
    if (op === ts.SyntaxKind.LessThanToken) return truthy
    if (op === ts.SyntaxKind.GreaterThanToken) return !truthy
  }
  return false
}
function guardedOptionalGlobal(node) {
  if (ts.isTypeOfExpression(node.parent)) return true
  let child = node
  for (let parent = node.parent; parent; child = parent, parent = parent.parent) {
    if (ts.isConditionalExpression(parent)) {
      if (child === parent.whenTrue && definedBy(parent.condition, node.text, true)) return true
      if (child === parent.whenFalse && definedBy(parent.condition, node.text, false)) return true
    }
    if (ts.isIfStatement(parent)) {
      if (child === parent.thenStatement && definedBy(parent.expression, node.text, true)) return true
      if (child === parent.elseStatement && definedBy(parent.expression, node.text, false)) return true
    }
    if (ts.isBinaryExpression(parent) && child === parent.right) {
      if (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && definedBy(parent.left, node.text, true)) return true
      if (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && definedBy(parent.left, node.text, false)) return true
    }
  }
  return false
}

export function unresolvedPatchedIdentifiers(files) {
  const options = { allowJs: true, noEmit: true, types: ['node'], typeRoots: [fileURLToPath(new URL('../node_modules/@types', import.meta.url))], target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, skipLibCheck: true }
  const host = ts.createCompilerHost(options)
  // Bind imports as aliases without following third-party implementation trees.
  // Standard lib and Node type references still load to describe host globals.
  host.resolveModuleNames = names => names.map(() => undefined)
  const program = ts.createProgram(files, options, host)
  const syntax = program.getSyntacticDiagnostics()
  if (syntax.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(syntax, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: name => name, getNewLine: () => '\n'
  }))
  const checker = program.getTypeChecker()
  const failures = []
  for (const file of files) {
    const source = program.getSourceFile(file)
    if (!source) throw new Error(`Missing patched JavaScript: ${file}`)
    function visit(node) {
      if (ts.isIdentifier(node)) {
        const parent = node.parent
        const shorthand = ts.isShorthandPropertyAssignment(parent) && parent.name === node
        const exported = ts.isExportSpecifier(parent) && (parent.propertyName || parent.name) === node && !parent.parent.parent.moduleSpecifier
        const property = ts.isPropertyAccessExpression(parent) && parent.name === node
        if (!property && !ts.isMetaProperty(parent) && (!ts.isExportSpecifier(parent) || exported) && (shorthand || exported || ts.isInExpressionContext(node))
          && !checker.resolveName(node.text, node, ts.SymbolFlags.Value, false) && !guardedOptionalGlobal(node)) {
          const position = source.getLineAndCharacterOfPosition(node.getStart(source))
          failures.push({ file, line: position.line + 1, column: position.character + 1, name: node.text })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return failures
}
