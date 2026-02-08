import { artData } from '../state.js'
import { input } from '../elements.js'

const isNum = x => x * 0 === 0

const styleTarget = ({ target, w, h, x, y }) =>{
  const t = target.style
  if (isNum(w)) t.width = `${w}px`
  if (isNum(w) && !isNum(h)) t.height = `${w}px`
  if (isNum(h)) t.height = `${h}px`
  if (isNum(x)) t.left = `${x}px`
  if (isNum(y)) t.top = `${y}px`
}

const update = (key, value) => {
  input[key].value = value
  artData[key] = key === 'colors' ? value.split(',') : value
}

const calcX = cell => cell % artData.column
const calcY = cell => Math.floor(cell / artData.column)

const resizeCanvas = ({ canvas, w, h }) =>{
  canvas.setAttribute('width', w)
  canvas.setAttribute('height', h || w)
}

const addEvents = (target, event, action, array) =>{
  array.forEach(a => event === 'remove' ? target.removeEventListener(a, action) : target.addEventListener(a, action))
}

const mouse = {
  up: (t, e, a) => addEvents(t, e, a, ['mouseup', 'touchend']),
  move: (t, e, a) => addEvents(t, e, a, ['mousemove', 'touchmove']),
  down: (t, e, a) => addEvents(t, e, a, ['mousedown', 'touchstart']),
  enter: (t, e, a) => addEvents(t, e, a, ['mouseenter', 'touchstart']),
  leave: (t, e, a) => addEvents(t, e, a, ['mouseleave', 'touchmove'])
}

const nearestN = (x, n) => x === 0 ? 0 : (x - 1) + Math.abs(((x - 1) % n) - n)

const blankRemoved = arr => arr.filter(dot => dot)

const sortByFreqRemoveBlankAndDuplicates = arr =>{  
  const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)
  const orderedByFrequency = blankRemoved(arr).map(ele =>[ele, countOccurrences(blankRemoved(arr), ele)]).sort((a, b) => b[1] - a[1])  
  return [...new Set(orderedByFrequency.map(ele => ele[0]))]
}

// const copyText = box =>{
//   box.select()
//   box.setSelectionRange(0, 999999) // For mobile devices 
//   document.execCommand('copy')
// }

const copyText = async (box) => {
  try {
    await navigator.clipboard.writeText(box.value)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

export {
  styleTarget,
  resizeCanvas,
  mouse,
  nearestN,
  calcX,
  calcY,
  sortByFreqRemoveBlankAndDuplicates,
  copyText,
  update
}