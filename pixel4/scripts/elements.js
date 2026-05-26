import { Artboard } from './classes/artboard.js'
import { NavWindow } from './classes/nav.js'
import { setProperties } from './utils.js'

const elements = {
  body: document.querySelector('body'),
  artboard: null,
  layersUi: null,
  artboardWindows: [],
  draggableElements: [],
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
  updateLayersUi() {
    this.artboard.activeLayerNodes.forEach(node => {
      // if (this.artboard.layers[node.id]?.el)
      node.img.src = this.artboard.layers[node.id].el.toDataURL()
    })
  },
  removeLayerNodes() {
    if (this?.artboard?.activeLayerNodes.length) {
      this.artboard.activeLayerNodes.forEach(node => node.el.remove())
    }
  },
}

const settings = {
  column: 16,
  row: 16,
  cellSize: 20,
  hex: '#000000',
  hex2: null,
  filename: 'pixel-4',
  shouldShowGrid: true,
  gridWidth: 0.5,
  colors: [],
  // dataUrl: null,
  inputs: {},
  shortCuts: {},
  prev: [],
  erase: false,
  fill: false,
  colorPick: false,
  saveDataName: 'save-data-4',
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
    elements.removeLayerNodes()
    // TODO artboard name is not correct anymore since the length can change
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
      deleteAction: nav => {
        if (elements.artboardWindows.length <= 1) return
        elements.artboardWindows = elements.artboardWindows.filter(
          w => w !== nav
        )
        elements.draggableElements = elements.draggableElements.filter(
          el => el !== nav
        )
        nav.artboard.el.remove()
        nav.window.remove()
        elements.artboardWindows[0].artboard.switchArtboard()
      },
    })
  },
  calculateColumnAndOffset(boards) {
    return boards.reduce(
      (acc, w) => {
        acc.column += w.artboard.column
        acc.offsets.push(acc.column)
        return acc
      },
      {
        offsets: [],
        column: 0,
      }
    )
  },
  combineArtboards() {
    const { offsets, column } = this.calculateColumnAndOffset(
      elements.artboardWindows
    )
    this.inputs.column.value = column

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
  createSpriteSheet() {
    //* We need to remember current artboard because creating a new one switches it.
    const currentArtboard = elements.artboard
    const checkedLayers = elements.artboard.activeLayers.filter(
      (w, i) =>
        currentArtboard.activeLayerNodes
          .find(n => n.id === i)
          ?.el.querySelector('input[type="checkbox"]').checked
    )
    console.log('check', checkedLayers)
    const { offsets, column } = this.calculateColumnAndOffset(checkedLayers)
    this.inputs.column.value = column

    this.createNewArtboard()
    const { column: col, row } = currentArtboard.activeLayers[0]
    currentArtboard.activeLayerNodes
      .filter(w => w?.el.querySelector('input[type="checkbox"]').checked)
      .forEach((w, i) => {
        elements.artboard.drawboard.ctx.putImageData(
          currentArtboard.layers[w.id].ctx.getImageData(
            0,
            0,
            col * this.d,
            row * this.d
          ),
          (offsets?.[i - 1] || 0) * this.d,
          0
        )
      })
    elements.artboard.drawboard.extractColors()
    this.inputs.colors.value = this.colors

    elements.windows.preview.img.style.backgroundImage = `url(${elements.artboard.drawboard.el.toDataURL()})`
    setProperties(elements.windows.preview.img, {
      w: col + 'px',
      h: row + 'px',
      m: this.d,
      'frame-no': checkedLayers.length,
    })
  },
}

export { elements, settings }
