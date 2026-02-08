import { Artboard } from './classes/artboard.js'
import { NavWindow } from './classes/nav.js'

const elements = {
  body: document.querySelector('body'),
  artboard: null,
  artboardWindows: [],
  windows: {},
  saveDataName: 'window-pos',
  saveData() {
    const obj = {}
    Object.keys(this.windows).forEach(key => {
      const { x, y, isOpen } = this.windows[key]
      obj[key] = { x, y, isOpen }
    })
    const { column, row, cellSize } = settings
    localStorage.setItem(
      this.saveDataName,
      JSON.stringify({ ...obj, column, row, cellSize })
    )
  },
  readData() {
    const saveData = localStorage.getItem(this.saveDataName)
    if (saveData) {
      const data = JSON.parse(saveData)

      Object.keys(data).forEach(key => {
        if (['column', 'row', 'cellSize'].includes(key)) {
          settings.inputs[key].value = data[key]
        } else {
          ;['x', 'y', 'isOpen'].forEach(prop => {
            this.windows[key][prop] = data[key][prop]
          })
          this.windows[key].setUp()
        }
      })
      settings.inputs.colors.value = new Array(
        settings.column * settings.row
      ).fill('transparent')
      this.artboard.resize()
    }
  },
}

const settings = {
  column: 16,
  row: 16,
  cellSize: 20,
  hex: '#000000',
  hex2: null,
  filename: 'pixel',
  shouldShowGrid: true,
  gridWidth: 0.5,
  colors: [],
  // dataUrl: null,
  inputs: {},
  prev: [],
  erase: false,
  fill: false,
  colorPick: false,
  saveDataName: 'save-data',
  calcX(cell) {
    return cell % this.column
  },
  calcY(cell) {
    return Math.floor(cell / this.column)
  },
  get d() {
    return this.cellSize
  },
  set d(val) {
    this.cellSize = val
  },
  get splitColors() {
    return this.colors.reduce((acc, _, i) => {
      if (i % this.column === 0) acc.push(this.colors.slice(i, i + this.column))
      return acc
    }, [])
  },
  get lastPrev() {
    return this.prev.length && this.prev[this.prev.length - 1]
  },
  recordState() {
    const { row, column, d, colors, lastPrev } = this

    if (
      lastPrev &&
      lastPrev.colors === colors.join(',') &&
      lastPrev.row === row &&
      lastPrev.column === column
    )
      return
    this.prev.push({ colors: colors.join(','), column, row, cellSize: d })

    // keep artData.prev under 5 steps
    if (this.prev.length > 5)
      this.prev = this.prev.filter((d, i) => {
        if (i) return d
      })
  },
  undo() {
    this.prev.pop()
    if (this.lastPrev) {
      ;['colors', 'row', 'column', 'cellSize'].forEach(key => {
        this.inputs[key].value = this.lastPrev[key]
      })
      elements.artboard.resize()
      elements.artboard.paintCanvas()
    }
  },
  createNewArtboard() {
    return new NavWindow({
      name: 'artboard' + (elements.artboardWindows.length + 1),
      container: elements.body,
      className: 'current',
      isOpen: true,
      x: 20,
      y: 20,
      // zOffset: 999,
      content: nav => {
        nav.artboard = new Artboard({
          container: nav.contentWrapper,
          w: settings.column * settings.d,
          h: settings.row * settings.d,
          d: settings.d,
        })
        elements.artboardWindows.push(nav)
      },
      selectAction: nav => nav.artboard.switchArtboard(),
    })
  },
  combineArtboards() {
    const offsets = []
    this.inputs.column.value = elements.artboardWindows.reduce((acc, w) => {
      offsets.push(acc + w.artboard.column)
      return (acc += w.artboard.column)
    }, 0)

    this.createNewArtboard()

    elements.artboardWindows.forEach((w, i) => {
      const { column, row, drawboard } = w.artboard
      elements.artboard.drawboard.ctx.putImageData(
        drawboard.ctx.getImageData(0, 0, column * this.d, row * this.d),
        (offsets?.[i - 1] || 0) * this.d,
        0
      )
    })
    elements.artboard.drawboard.extractColors()
    this.inputs.colors.value = this.colors
  },
}

export { elements, settings }
