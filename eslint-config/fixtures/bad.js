/*
 * One violation per rule enforced by @razodin137/eslint-config.
 *
 * The rules this file cannot violate are listed with their reasons in
 * ../test/verify.mjs: the TypeScript stylistic rules, and the ones whose
 * violations are parse-time errors in strict module code.
 */

import { parse } from "acorn"
import dual from "./dual.js"
import { first, missing } from "./dual.js"
import { default as dualNamed } from "./dual.js"
import "./missing.js"
import "./nested/../dual.js"
import "./dual"
import "./dual.js"
import "/dual.js"
import "loader!./dual.js"
import path from "path"
import * as namespace from "./dual.js"
import "./cycle-a.js"
import selfImport from "./bad.js"
import "../../stylelint-config-css/index.js"

globalThis.first = dual
globalThis.dualMember = dual.first

import "./dual.js"
globalThis.afterImport = 1

const badFixtureSource = { name: "fixture" }

const unexpectedMultiline = function () {}
(globalThis)

const multiStr = "first \
second"

const irregular = 1 // irregular space

{
  class Child extends Array {
    constructor() {
      globalThis.value = 1
    }
  }
  globalThis.Child = Child

  class BeforeSuper extends Array {
    constructor() {
      this.value = 1
      super()
    }
  }
  globalThis.BeforeSuper = BeforeSuper
}

for (let index = 0; index > 10; index++) {}

const getterObject = {
  get value() {}
}

globalThis.getterObject = getterObject

new Promise(async () => {})

switch (1) {
  case 1:
    const caseValue = 1
    break
}

class ReassignedClass {}
ReassignedClass = 1

if (globalThis === -0) {}

if (globalThis.undefinedValue = 1) {}

const constantBinary = !globalThis === null

globalThis.constantBinary = constantBinary

if (true) {}

const controlRegex = /\x1f/

globalThis.controlRegex = controlRegex

debugger

class DuplicateMembers {
  value() {}
  value() {}
}

if (globalThis) {} else if (globalThis) {}

const duplicateKeys = { key: 1, key: 2 }

globalThis.duplicateKeys = duplicateKeys

switch (1) {
  case 1:
    break
  case 1:
    break
}

if (globalThis) {}

const emptyClass = /[]/

globalThis.emptyClass = emptyClass

const {} = globalThis

class EmptyStatic {
  static {}
}

globalThis.EmptyStatic = EmptyStatic

try {
  globalThis.value = 1
} catch (error) {
  error = 1
}

if (!!globalThis) {}

switch (1) {
  case 1:
    globalThis.value = 1
  case 2:
    globalThis.value = 2
}

function reassignedFunction() {}
reassignedFunction = 1

Infinity = 1

namespace.value = 1

const invalidRegexp = new RegExp("[")

globalThis.invalidRegexp = invalidRegexp

const lossOfPrecision = 9007199254740993

globalThis.lossOfPrecision = lossOfPrecision

const misleadingClass = /[👍]/

globalThis.misleadingClass = misleadingClass

const nativeNonconstructor = new Symbol()

globalThis.nativeNonconstructor = nativeNonconstructor

const objectCall = Math()

globalThis.objectCall = objectCall

const prototypeBuiltin = ({}).hasOwnProperty("key")

globalThis.prototypeBuiltin = prototypeBuiltin

var redeclared = 1
var redeclared = 2

{
  const fixed = 1
  fixed = 2
  globalThis.fixed = fixed
}

{
  const undefined = 1
  globalThis.shadowRestricted = undefined
}

const regexSpaces = /a  b/

globalThis.regexSpaces = regexSpaces

let selfAssign = 1
selfAssign = selfAssign

const setterObject = {
  set value(next) {
    return next
  }
}

globalThis.setterObject = setterObject

const sparse = [ 1,, 2 ]

globalThis.sparse = sparse

let unassigned

globalThis.unassigned = unassigned

unknownGlobal()

function unreachable() {
  return 1
  globalThis.value = 1
}

globalThis.unreachable = unreachable

function unsafeFinally() {
  try {
    return 1
  } finally {
    return 2
  }
}

globalThis.unsafeFinally = unsafeFinally

if (!"key" in globalThis) {}

const unsafeChaining = (globalThis?.value).toString()

globalThis.unsafeChaining = unsafeChaining

unusedLabel: globalThis.value = 1

class UnusedPrivate {
  #hidden = 1
}

globalThis.UnusedPrivate = UnusedPrivate

let uselessAssignment = 1
uselessAssignment = 2
globalThis.uselessAssignment = uselessAssignment

const uselessBackreference = /\1(a)/

globalThis.uselessBackreference = uselessBackreference

try {
  globalThis.value = 1
} catch (error) {
  throw error
}

const uselessEscape = "\d"

globalThis.uselessEscape = uselessEscape

try {
  globalThis.value = 1
} catch (error) {
  throw new Error("failed")
}

function* noYield() {
  return 1
}

globalThis.noYield = noYield

const invalidTypeof = typeof globalThis === "strng"

globalThis.invalidTypeof = invalidTypeof

if (globalThis === NaN) {}

{
  const accessors = {
    set value(next) {}
  }
  globalThis.accessors = accessors
}

[ 1 ].map(() => {})

if (globalThis) {
  var blockVar = 1
}
globalThis.blockVar = blockVar

const snake_case = 1
globalThis.snake_case = snake_case

class NoThis {
  method() {
    return 1
  }
}

globalThis.NoThis = NoThis

function inconsistentReturn(flag) {
  if (flag) {
    return 1
  }
}

globalThis.inconsistentReturn = inconsistentReturn

if (globalThis)
  globalThis.curly = 1

switch (1) {
  default:
    break
  case 1:
    break
}

function defaultParamLast(value = 1, next) {
  return next
}

globalThis.defaultParamLast = defaultParamLast

const dotNotation = globalThis["name"]

globalThis.dotNotation = dotNotation

if (globalThis == 1) {}

{
  const groupedAccessors = {
    get value() {
      return 1
    },
    other: 1,
    set value(next) {}
  }
  globalThis.groupedAccessors = groupedAccessors
}

for (const key in globalThis) {
  globalThis.guardForIn = key
}

class FirstClass {}
class SecondClass {}

globalThis.FirstClass = FirstClass
globalThis.SecondClass = SecondClass

alert("hello")

const arrayConstructor = new Array()

globalThis.arrayConstructor = arrayConstructor

const bitwise = 1 & 2

globalThis.bitwise = bitwise

function caller() {
  return arguments.callee
}

globalThis.caller = caller

class ConstructorReturn {
  constructor() {
    return {}
  }
}

globalThis.ConstructorReturn = ConstructorReturn

for (const key of []) {
  continue
}

function elseReturn(flag) {
  if (flag) {
    return 1
  } else {
    return 2
  }
}

globalThis.elseReturn = elseReturn

eval("1")

Array.prototype.value = 1

const extraBind = (function () {
  return 1
}).bind(globalThis)

globalThis.extraBind = extraBind

unusedOuter: for (const key of []) {
  break unusedOuter
}

setTimeout("globalThis.value = 1", 10)

if (globalThis) {
  function innerDeclaration() {}
}

const labelName = 1
labelName: globalThis.value = labelName

label: globalThis.value = 1

{
  globalThis.loneBlock = 1
}

for (var loopIndex = 0; loopIndex < 1; loopIndex++) {
  globalThis.loopFunction = () => loopIndex
}

const nestedTernary = globalThis ? 1 : globalThis ? 2 : 3

globalThis.nestedTernary = nestedTernary

new Date()

function lowercaseConstructor() {}

const lowercaseInstance = new lowercaseConstructor()
globalThis.lowercaseInstance = lowercaseInstance

const dynamicFunction = new Function("return 1")

globalThis.dynamicFunction = dynamicFunction

const objectConstructor = new Object()

globalThis.objectConstructor = objectConstructor

const wrapper = new String("value")

globalThis.wrapper = wrapper

function paramReassign(value) {
  value = 1
  return value
}

globalThis.paramReassign = paramReassign

let incremented = 0
incremented++
globalThis.incremented = incremented

new Promise(() => {
  return 1
})

const proto = ({}).__proto__

globalThis.proto = proto

isNaN("1")

({}).__defineGetter__("key", () => 1)

function returnAssign() {
  return returnAssignValue = 1
}

globalThis.returnAssign = returnAssign

const scriptUrl = "javascript:void(0)"

globalThis.scriptUrl = scriptUrl

if (globalThis === globalThis) {}

globalThis.sequence = 1, globalThis.sequenceOther = 2

globalThis.sequence = sequence

const shadowed = 1

function shadow() {
  const shadowed = 2
  return shadowed
}

globalThis.shadow = shadow

const templateInString = "${value}"

globalThis.templateInString = templateInString

throw "failed"

let undefInit = undefined
globalThis.undefInit = undefInit

const underscore = globalThis._private

globalThis.underscore = underscore

let unmodifiedCount = 0
while (unmodifiedCount < 1) {
  globalThis.unmodifiedCount = unmodifiedCount
}

const unneededTernary = globalThis ? true : false

globalThis.unneededTernary = unneededTernary

for (const key of []) {
  break
}

1 + 1

globalThis.useBeforeDefine = later

const later = 1

const computed = { ["key"]: 1 }

globalThis.computed = computed

const uselessConcat = "a" + "b"

globalThis.uselessConcat = uselessConcat

class UselessConstructor {
  constructor() {}
}

globalThis.UselessConstructor = UselessConstructor

const destructuredSource = { key: 1 }
const { key: key } = destructuredSource
globalThis.key = key

function uselessReturn() {
  return
}

globalThis.uselessReturn = uselessReturn

var oldStyle = 1

globalThis.oldStyle = oldStyle

const voidValue = void 0

globalThis.voidValue = voidValue

const shorthandKey = 1
const shorthand = { shorthandKey: shorthandKey }

globalThis.shorthand = shorthand

const firstVar = 1, secondVar = 2

globalThis.firstVar = firstVar
globalThis.secondVar = secondVar

[ 1 ].map(function (value) {
  return value
})

let preferConst = 1
globalThis.preferConst = preferConst

const name = badFixtureSource.name

globalThis.destructureMe = name

const exponent = Math.pow(2, 3)

globalThis.exponent = exponent

const numericLiteral = parseInt("101", 2)

globalThis.numericLiteral = numericLiteral

const hasOwn = Object.prototype.hasOwnProperty.call(globalThis, "name")

globalThis.hasOwn = hasOwn

const objectSpread = Object.assign({}, badFixtureSource)

globalThis.objectSpread = objectSpread

Promise.reject("failed")

const regexLiteral = new RegExp("abc")

globalThis.regexLiteral = regexLiteral

function restParams() {
  return arguments[ 0 ]
}

globalThis.restParams = restParams

const spreadArguments = [ 1, 2 ]
const spread = Math.max.apply(Math, spreadArguments)

globalThis.spread = spread

function uselessCallTarget(value) {
  return value
}

const uselessCall = uselessCallTarget.call(null, 1)

globalThis.uselessCall = uselessCall

const template = "a" + globalThis.name

globalThis.template = template

const parsed = parseInt("10")

globalThis.parsed = parsed

const symbolValue = Symbol()

globalThis.symbolValue = symbolValue

function varsOnTop() {
  globalThis.varsOnTop = 1
  var lateVar = 1
  return lateVar
}

globalThis.varsOnTop = varsOnTop

if (1 === globalThis) {}

const spreadEmpty = [ ...(globalThis.flag ? [] : "text") ]

globalThis.spreadEmpty = spreadEmpty

throw new Error()

const escapeCase = "\x0a"

globalThis.escapeCase = escapeCase

const booleanWrapper = new Boolean(true)

globalThis.booleanWrapper = booleanWrapper

if (globalThis instanceof Array) {}

const newArray = new Array(1)

globalThis.newArray = newArray

const newBuffer = new Buffer(1)

globalThis.newBuffer = newBuffer

const hexCase = 0XFF

globalThis.hexCase = hexCase

const textContent = document.querySelector("p").innerText

globalThis.textContent = textContent

const includes = [ 1 ].indexOf(1) !== -1

globalThis.includes = includes

const numberProperty = isNaN("1")

globalThis.numberProperty = numberProperty

const startsWith = "abc".indexOf("a") === 0

globalThis.startsWith = startsWith

function typeError(value) {
  if (typeof value !== "string") {
    throw new Error("bad value")
  }
  return value
}

globalThis.typeError = typeError

throw Error("failed")

function useEffect(callback) {
  callback()
}

function Component({ value }) {
  useEffect(() => {
    console.log(value)
  }, [])
}

globalThis.Component = Component

function useConditional(flag) {
  if (flag) {
    useEffect(() => 1)
  }
}

globalThis.useConditional = useConditional

define([ "x" ], () => 1)

require(globalThis.name)

module.exports = { first }

export let mutableExport = 1

const neverUsed = 1

{
  const list = [1, 2]
  globalThis.list = list
}

{
  const arrow = value => value
  globalThis.arrow = arrow
}

{
  const arrowSpacing = (value)=>value
  globalThis.arrowSpacing = arrowSpacing
}

if (globalThis) {globalThis.blockSpacing = 1}

if (globalThis)
{
  globalThis.braceStyle = 1
}

const trailingComma = {
  key: 1,
}

globalThis.trailingComma = trailingComma

const commaSpacing = [ 1,2 ]

globalThis.commaSpacing = commaSpacing

const commaStyle = {
  key: 1
  , other: 2
}

globalThis.commaStyle = commaStyle

const computedSpacing = { [ "key" ]: 1 }

globalThis.computedSpacing = computedSpacing

const dotLocation = globalThis.
  name

globalThis.dotLocation = dotLocation

function*generatorStar() {}

globalThis.generatorStar = generatorStar

if (globalThis) {
    globalThis.indent = 1
}

const indentBinary = 1 +
1

globalThis.indentBinary = indentBinary

const keySpacing = { key:1 }

globalThis.keySpacing = keySpacing

const objectPropertyNewline = {
  first: 1, second: 2,
  third: 3
}

globalThis.objectPropertyNewline = objectPropertyNewline

if(globalThis) {}

class ClassMembers {
  first() {
    return 1
  }
  second() {
    return 2
  }
}

globalThis.ClassMembers = ClassMembers

if (globalThis) globalThis.statementsPerLine = 1

const multilineTernary = globalThis ?
  1 : 2

globalThis.multilineTernary = multilineTernary

const newParens = new Date

globalThis.newParens = newParens

const extraParens = (function () {
  return 1
})

globalThis.extraParens = extraParens

const floatingDecimal = .5

globalThis.floatingDecimal = floatingDecimal

const mixedOperators = globalThis && 1 || 2

globalThis.mixedOperators = mixedOperators

	  const mixedSpaces = 1

globalThis.mixedSpaces = mixedSpaces

const multiSpaces  = 1

globalThis.multiSpaces = multiSpaces

const multipleEmptyLines = 1



globalThis.multipleEmptyLines = multipleEmptyLines

const trailingSpaces = 1   

globalThis.trailingSpaces = trailingSpaces

const whitespaceBeforeProperty = globalThis .name

globalThis.whitespaceBeforeProperty = whitespaceBeforeProperty

const objectCurlySpacing = {key: 1}

globalThis.objectCurlySpacing = objectCurlySpacing

const operatorLinebreak = 1
  + 2

globalThis.operatorLinebreak = operatorLinebreak

function paddedBlocks() {

  return 1
}

globalThis.paddedBlocks = paddedBlocks

const singleQuotes = 'single'

globalThis.singleQuotes = singleQuotes

const restSpread = (... args) => args

globalThis.restSpread = restSpread

const semi = 1;

globalThis.semi = semi

const semiSpacing = 1 ;

globalThis.semiSpacing = semiSpacing

if (globalThis){ globalThis.spaceBeforeBlocks = 1 }

function spaceBeforeFunctionParen () {
  return 1
}

globalThis.spaceBeforeFunctionParen = spaceBeforeFunctionParen

spaceInParens( 1 )

function spaceInParens(value) {
  return value
}

const callSpacing = spaceInParens (1)

globalThis.callSpacing = callSpacing

const infixOps = 1+2

globalThis.infixOps = infixOps

const unaryOps = - 1

globalThis.unaryOps = unaryOps

//comment

const templateCurlySpacing = `value: ${ globalThis.name }`

globalThis.templateCurlySpacing = templateCurlySpacing

const templateTagSpacing = String.raw `text`

globalThis.templateTagSpacing = templateTagSpacing

function* yieldStar() {
  yield*[ 1 ]
}

globalThis.yieldStar = yieldStar

const jsxClosingBracket = (
  <div
    id="closing-bracket"></div>
)

const jsxClosingTag = (
  <div>
    text
    </div>
)

const jsxCurlyBracePresence = <div id={"value"} />

const jsxCurlyNewline = (
  <div>
    { "text"
    }
  </div>
)

const jsxCurlySpacing = <div id={ "value" } />

const jsxEqualsSpacing = <div id = "value" />

const jsxFirstPropNewLine = <div id="first"
  className="second" />

const jsxFunctionCallNewline = foo(<div>
  text
</div>)

function foo(node) {
  return node
}

const jsxIndentProps = (
  <div
      id="indent-props"
  />
)

const jsxMaxPropsPerLine = (
  <div
    id="one" className="two"
  />
)

const jsxOneExpressionPerLine = (
  <div>text<span /></div>
)

const jsxQuotes = <div id='jsx-quotes' />

const jsxTagSpacing = <div/>

const jsxWrapMultilines = <div>
  text
</div>

globalThis.jsx = [
  jsxClosingBracket, jsxClosingTag, jsxCurlyBracePresence, jsxCurlyNewline,
  jsxCurlySpacing, jsxEqualsSpacing, jsxFirstPropNewLine, jsxFunctionCallNewline,
  jsxIndentProps, jsxMaxPropsPerLine, jsxOneExpressionPerLine, jsxQuotes,
  jsxTagSpacing, jsxWrapMultilines
]