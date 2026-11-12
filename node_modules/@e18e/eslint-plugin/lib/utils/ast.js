const arrayReturningMethods = new Set([
    'concat',
    'copyWithin',
    'fill',
    'filter',
    'flat',
    'flatMap',
    'map',
    'reverse',
    'slice',
    'sort',
    'splice',
    'split',
    'toReversed',
    'toSorted',
    'toSpliced',
    'with'
]);
/**
 * Checks if an expression is syntactically known to produce an array.
 * e.g. array literals, Array.from/of, Object.keys/values/entries, and
 * calls to array-returning methods.
 */
export function isSyntacticallyKnownArray(node) {
    if (node.type === 'ArrayExpression')
        return true;
    if (node.type !== 'CallExpression')
        return false;
    const callee = node.callee;
    if (callee.type !== 'MemberExpression' ||
        callee.property.type !== 'Identifier') {
        return false;
    }
    if (callee.object.type === 'Identifier' &&
        callee.object.name === 'Array' &&
        (callee.property.name === 'from' || callee.property.name === 'of')) {
        return true;
    }
    if (callee.object.type === 'Identifier' &&
        callee.object.name === 'Object' &&
        (callee.property.name === 'keys' ||
            callee.property.name === 'values' ||
            callee.property.name === 'entries')) {
        return true;
    }
    return arrayReturningMethods.has(callee.property.name);
}
/**
 * Checks if a node is in a boolean context (where the result is only used as truthy/falsy).
 * e.g. if conditions, while loops, ternary tests, logical operators
 */
export function isInBooleanContext(node) {
    const parent = node.parent;
    if (!parent) {
        return false;
    }
    // if/while/for/do-while test
    if ((parent.type === 'IfStatement' && parent.test === node) ||
        (parent.type === 'WhileStatement' && parent.test === node) ||
        (parent.type === 'ForStatement' && parent.test === node) ||
        (parent.type === 'DoWhileStatement' && parent.test === node)) {
        return true;
    }
    // ternaries
    if (parent.type === 'ConditionalExpression' && parent.test === node) {
        return true;
    }
    // check the parent recursively for unary ! and logical operators
    if ((parent.type === 'UnaryExpression' && parent.operator === '!') ||
        (parent.type === 'LogicalExpression' &&
            (parent.operator === '&&' || parent.operator === '||'))) {
        return isInBooleanContext(parent);
    }
    return false;
}
/**
 * Checks if a node is undefined, null, or void 0.
 * Returns the type of nullish value or false if not nullish.
 */
export function isNullish(node) {
    if (node.type === 'Identifier' && node.name === 'undefined') {
        return 'undefined';
    }
    if (node.type === 'Literal' && node.value === null) {
        return 'null';
    }
    // void 0
    if (node.type === 'UnaryExpression' &&
        node.operator === 'void' &&
        node.argument.type === 'Literal' &&
        node.argument.value === 0) {
        return 'undefined';
    }
    return false;
}
/**
 * Checks if a CallExpression is a copy operation that creates a shallow copy of an array.
 * e.g. concat(), slice(), slice(0)
 */
export function isCopyCall(node) {
    if (node.callee.type !== 'MemberExpression' ||
        node.callee.property.type !== 'Identifier') {
        return false;
    }
    const methodName = node.callee.property.name;
    if ((methodName === 'concat' || methodName === 'slice') &&
        node.arguments.length === 0) {
        return true;
    }
    if (methodName === 'slice' &&
        node.arguments.length === 1 &&
        node.arguments[0]?.type === 'Literal' &&
        node.arguments[0].value === 0) {
        return true;
    }
    return false;
}
export function getArrayFromCopyPattern(node) {
    if (node.type === 'CallExpression' &&
        isCopyCall(node) &&
        node.callee.type === 'MemberExpression') {
        return node.callee.object;
    }
    if (node.type === 'ArrayExpression' &&
        node.elements.length === 1 &&
        node.elements[0]?.type === 'SpreadElement') {
        return node.elements[0].argument;
    }
    return null;
}
/**
 * Checks if a node needs to be wrapped in parentheses when used as the
 * object of a property access (e.g. `expr.foo()`).
 */
export function needsParensForPropertyAccess(node) {
    switch (node.type) {
        case 'Identifier':
        case 'MemberExpression':
        case 'CallExpression':
        case 'Literal':
        case 'ArrayExpression':
        case 'ObjectExpression':
        case 'TemplateLiteral':
        case 'TaggedTemplateExpression':
        case 'ThisExpression':
        case 'NewExpression':
        case 'ChainExpression':
        case 'MetaProperty':
            return false;
        default:
            return true;
    }
}
/**
 * Checks if a copy pattern (node passed to getArrayFromCopyPattern) uses
 * optional chaining on the copy method call, e.g. `arr?.slice()`.
 */
export function isCopyPatternOptional(node) {
    return (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.optional === true);
}
export function formatArguments(args, sourceCode) {
    if (args.length === 0) {
        return '';
    }
    return args
        .map((arg) => {
        const text = sourceCode.getText(arg);
        return arg.type === 'SequenceExpression' ? `(${text})` : text;
    })
        .join(', ');
}
