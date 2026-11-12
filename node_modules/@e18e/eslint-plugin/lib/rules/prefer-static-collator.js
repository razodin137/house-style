const COMPARATOR_METHODS = new Set(['sort', 'toSorted']);
function findEnclosingCallback(node) {
    let cur = node.parent;
    while (cur) {
        if (cur.type === 'ArrowFunctionExpression' ||
            cur.type === 'FunctionExpression') {
            return cur;
        }
        if (cur.type === 'FunctionDeclaration') {
            return null;
        }
        cur = cur.parent;
    }
    return null;
}
function isComparatorCallback(fn) {
    const parent = fn.parent;
    if (!parent || parent.type !== 'CallExpression')
        return false;
    const callee = parent.callee;
    if (callee.type !== 'MemberExpression' || callee.computed)
        return false;
    if (callee.property.type !== 'Identifier')
        return false;
    if (!COMPARATOR_METHODS.has(callee.property.name))
        return false;
    return parent.arguments.includes(fn);
}
export const preferStaticCollator = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Prefer hoisting an `Intl.Collator` instance over calling localeCompare in a sort callback',
            recommended: false
        },
        schema: [],
        messages: {
            preferStaticCollator: '`localeCompare` constructs an `Intl.Collator` on every call. Hoist `const collator = new Intl.Collator(...)` outside the callback and use `collator.compare(a, b)`.'
        }
    },
    create(context) {
        return {
            CallExpression(node) {
                if (node.callee.type !== 'MemberExpression')
                    return;
                if (node.callee.computed)
                    return;
                if (node.callee.property.type !== 'Identifier' ||
                    node.callee.property.name !== 'localeCompare')
                    return;
                const fn = findEnclosingCallback(node);
                if (!fn)
                    return;
                if (!isComparatorCallback(fn))
                    return;
                context.report({ node, messageId: 'preferStaticCollator' });
            }
        };
    }
};
