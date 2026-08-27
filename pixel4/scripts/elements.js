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
    const obj = Object.keys(this.windows).reduce((acc, key) => {
      const { x, y, isOpen } = this.windows[key]
      acc[key] = { x, y, isOpen }
      return acc
    }, {})
    const { column, row, cellSize, spriteCol, spriteRow } = editor
    localStorage.setItem(
      this.saveDataName,
      JSON.stringify({ ...obj, column, row, cellSize, spriteCol, spriteRow })
    )
  },
  readData() {
    const saveData = localStorage.getItem(this.saveDataName)
    if (saveData) {
      const data = JSON.parse(saveData)

      Object.keys(data).forEach(key => {
        if (
          ['column', 'row', 'cellSize', 'spriteRow', 'spriteCol'].includes(key)
        ) {
          editor.inputs[key].value = data[key]
        } else {
          ;['x', 'y', 'isOpen'].forEach(prop => {
            this.windows[key][prop] = data[key][prop]
          })
          this.windows[key].setUp()
        }
      })
      editor.inputs.colors.value = new Array(editor.column * editor.row).fill(
        'transparent'
      )
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

const editor = {
  column: 16,
  row: 16,
  cellSize: 20,
  hex: '#000000',
  hex2: null,
  spriteRow: 0,
  spriteCol: 0,
  spriteOffset: 0,
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
  get spriteColors() {
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
          w: editor.column * editor.d,
          h: editor.row * editor.d,
          d: editor.d,
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
  // TODO this is broken now, but maybe isn't required since we now have createSprite
  // combineArtboards() {
  //   const { offsets, column } = this.getLayerOffsets(
  //     elements.artboardWindows
  //   )
  //   this.inputs.column.value = column

  //   this.createNewArtboard()

  //   elements.artboardWindows.forEach((w, i) => {
  //     const { column, row, drawboard } = w.artboard
  //     elements.artboard.drawboard.ctx.putImageData(
  //       drawboard.ctx.getImageData(0, 0, column * this.d, row * this.d),
  //       (offsets?.[i - 1] || 0) * this.d,
  //       0
  //     )
  //   })
  //   elements.artboard.drawboard.extractColors()
  //   this.inputs.colors.value = this.colors
  // },
  createSpriteSheet() {
    //* We need to remember current artboard because creating a new one switches it.
    const currentArtboard = elements.artboard
    this.inputs.column.value = elements.artboard.column * editor.spriteCol
    this.inputs.row.value = elements.artboard.row * editor.spriteRow

    this.createNewArtboard()
    const { column, row } = currentArtboard.activeLayers[0]
    currentArtboard.activeLayerNodes
      .filter(w => w?.el.querySelector('input[type="checkbox"]').checked)
      .sort((a, b) => a.y - b.y)
      .forEach((w, i) => {
        elements.artboard.drawboard.ctx.putImageData(
          currentArtboard.layers[w.id].ctx.getImageData(
            0,
            0,
            column * this.d,
            row * this.d
          ),
          (i % editor.spriteCol) * currentArtboard.column * this.d,
          Math.floor(i / editor.spriteCol) * currentArtboard.row * this.d
        )
      })
    elements.artboard.drawboard.extractColors()
    this.inputs.colors.value = this.colors

    elements.windows.preview.img.style.backgroundImage = `url(${elements.artboard.drawboard.el.toDataURL()})`
    setProperties(elements.windows.preview.img, {
      w: column + 'px',
      h: row + 'px',
      m: this.d,
      'frame-col': editor.spriteCol,
      'frame-row': editor.spriteRow,
    })
  },
  splitSpriteSheet() {
    const { spriteRow: row, spriteCol: col, d } = editor
    if (row * col <= 0) {
      window.alert('spriteRow and/or spriteCol needs to more than 0')
      return
    }
    if (elements.artboard.uploadedFile) {
      elements.artboard.output(
        window.URL.createObjectURL(elements.artboard.uploadedFile),
        ({ canvas, calcWidth, calcHeight }) => {
          const w = calcWidth / col
          const h = calcHeight / row
          this.inputs.column.value = w / d
          this.inputs.row.value = h / d
          this.createNewArtboard()

          const frameNo = col * row - 1

          new Array(col * row).fill('').forEach((frame, i) => {
            const x = ((frameNo - i) % col) * w
            const y = Math.floor((frameNo - i) / col) * h
            elements.artboard.drawboard.ctx.drawImage(
              canvas,
              x,
              y,
              w,
              h,
              0,
              0,
              w,
              h
            )
            if (i < frameNo) {
              elements.artboard.addLayer()
            } else {
              elements.artboard.drawboard.extractColors()
              editor.inputs.colors.value = editor.colors
            }
          })
        }
      )
      // elements.artboard.layerNodes[0].selectLayer()
    }
  },
  updateColorInputs(color) {
    // this.color = color
    this.inputs.hex.value = color
    this.inputs.color.value = color
    this.inputs.color.label.style.backgroundColor = color
  },
  outputDataWithOnePixelCell() {
    const currentCellSize = this.cellSize
    this.inputs.cellSize.value = 1
    elements.artboard.resizeAndExtractColors()

    elements.artboard.dataUrl = elements.artboard.drawboard.el.toDataURL()
    this.inputs.dataUrl.value = elements.artboard.dataUrl

    setTimeout(() => {
      this.inputs.cellSize.value = currentCellSize
      elements.artboard.resizeAndExtractColors()
    }, 500)
  },
}

export { elements, editor }
