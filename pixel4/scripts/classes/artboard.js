import { nearestN, rgbToHex, hex } from '../utils.js'
import PageObject from './pageObject.js'
import { elements, editor } from '../elements.js'
import { LayerNode } from './layer.js'

class Canvas extends PageObject {
  constructor(props) {
    super({
      el: Object.assign(document.createElement('canvas'), {
        className: props.className,
      }),
      ...props,
    })
    if (props?.container) this.addToPage()
    if (props?.before) this.before.after(this.el)
    this.ctx = this.el.getContext('2d', { willReadFrequently: true })
    // this.ctx.imageSmoothingEnabled = false
    this.resizeCanvas()
  }
  resizeCanvas({ w, h } = {}) {
    if (w) this.w = w
    if (h) this.h = h
    this.d = editor.d
    this.setStyles()
    this.el.setAttribute('width', this.w)
    this.el.setAttribute('height', this.h || this.w)
  }
  drawGrid() {
    const { ctx } = this
    const { column, row, d, gridWidth } = editor
    ctx.strokeStyle = this.artboard.gridColor
    ctx.beginPath()
    const pos = (n, max) => n * d + (n === max ? -gridWidth : gridWidth)

    for (let x = 0; x <= column; x++) {
      ctx.moveTo(pos(x, column), gridWidth)
      ctx.lineTo(pos(x, column), this.h - gridWidth)
    }
    for (let y = 0; y <= row; y++) {
      ctx.moveTo(gridWidth, pos(y, row))
      ctx.lineTo(this.w - gridWidth, pos(y, row))
    }
    ctx.stroke()
  }
  clearGrid() {
    this.ctx.clearRect(0, 0, this.w, this.h)
  }
  extractColors(data) {
    const dataToUpdate = data || editor.colors
    dataToUpdate.length = 0
    const { d } = this
    const w = this.w / d
    const h = this.h / d
    const offset = Math.floor(d / 2)
    for (let i = 0; i < w * h; i++) {
      const x = (i % w) * d
      const y = Math.floor(i / w) * d
      const c = this.ctx.getImageData(x + offset, y + offset, 1, 1).data //offset
      // this thing included here to prevent rendering black instead of transparent
      c[3] === 0
        ? dataToUpdate.push('transparent')
        : dataToUpdate.push(hex(rgbToHex(c[0], c[1], c[2])))
    }
  }
  calcX(cell) {
    return cell % this.column
  }
  calcY(cell) {
    return Math.floor(cell / this.column)
  }
}

class SelectBox extends Canvas {
  constructor(props) {
    super({
      className: 'select-box',
      defPos: { x: props.x, y: props.y },
      canMove: false,
      copyData: [],
      ...props,
    })
    this.addDragEvent()
  }
  resizeBox = e => {
    const { defPos } = this
    const { x, y } = elements.artboard.drawPos(e)
    this.x = x > defPos.x ? defPos.x : x
    this.y = y > defPos.y ? defPos.y : y
    this.resizeCanvas({
      w: Math.abs(defPos.x - x),
      h: Math.abs(defPos.y - y),
    })
  }
  copy() {
    const { ctx, x, y, w, h } = this
    ctx.putImageData(
      elements.artboard.drawboard.ctx.getImageData(x, y, w, h),
      0,
      0
    )
    this.extractColors(this.copyData)
    this.canMove = true
  }
  cut() {
    this.copy()
    const { x, y, w, h } = this
    elements.artboard.drawboard.ctx.clearRect(x, y, w, h)
    elements.artboard.drawboard.extractColors()
    editor.inputs.colors.value = editor.colors
  }
  crop() {
    this.copy()
    editor.inputs.column.value = this.column
    editor.inputs.row.value = this.h / editor.d
    editor.inputs.colors.value = this.copyData
    ;['resize', 'paintCanvas', 'toggleSelectState'].forEach(action =>
      elements.artboard[action]()
    )
  }
  paste() {
    const img = new Image()
    img.onload = () => {
      elements.artboard.drawboard.ctx.drawImage(img, this.x, this.y)
      elements.artboard.drawboard.extractColors()
      editor.inputs.colors.value = editor.colors
    }
    img.src = this.el.toDataURL()
  }
  get spriteColors() {
    return this.copyData.reduce((acc, _, i) => {
      if (i % this.column === 0)
        acc.push(this.copyData.slice(i, i + this.column))
      return acc
    }, [])
  }
  paintFromColors() {
    const { d } = editor
    this.copyData.forEach((c, i) => {
      this.ctx.fillStyle = c || 'transparent'
      this.ctx.fillRect(this.calcX(i) * d, this.calcY(i) * d, d, d)
    })
  }
  paintCanvas() {
    const { column, row, d } = editor
    this.ctx.clearRect(0, 0, column * d, row * d)
    this.paintFromColors()
    // populatePalette(artData.colors)
  }
  flipHorizontal() {
    this.copyData = this.spriteColors.map(a => a.reverse()).flat(1)
    this.paintCanvas()
  }
  flipVertical() {
    this.copyData = this.spriteColors.reverse().flat(1)
    this.paintCanvas()
  }
}

class Artboard extends PageObject {
  constructor(props) {
    super({
      el: Object.assign(document.createElement('div'), {
        className: 'canvas-wrapper',
      }),
      draw: false,
      dataUrl: null,
      // gridColor: '#fbcda2',
      gridColor: '#78ddf7',
      layers: [],
      layerNodes: [],
      layerIndex: 0,
      ...props,
    })
    elements.artboard = this
    elements.artboardWindows.forEach(w => w.window.classList.remove('current'))
    this.container.appendChild(this.el)

    this.setStyles()
    this.layers.push(
      new Canvas({
        artboard: this,
        container: this.el,
        className: 'drawboard',
        w: this.w,
        h: this.h,
        d: this.d,
      })
    )
    new LayerNode({ i: 0, artboard: this })

    this.overlay = new Canvas({
      artboard: this,
      container: this.el,
      className: 'overlay',
      w: this.w,
      h: this.h,
      d: this.d,
    })

    this.overlay.drawGrid()
    this.refresh()
  }
  get drawboard() {
    return this.layers[this.layerIndex]
  }
  get activeLayers() {
    return this.layers.filter(l => l)
  }
  get activeLayerNodes() {
    return this.layerNodes.filter(l => l)
  }
  addLayer() {
    this.layers.push(
      new Canvas({
        artboard: this,
        // before: this.layers[this.layers.length - 1].el,
        container: this.el,
        className: 'drawboard',
        w: this.w,
        h: this.h,
        d: this.d,
      })
    )
    this.layerIndex = this.layers.length - 1

    new LayerNode({ i: this.layerIndex, artboard: this })
    this.refresh()
    // this.layers[0].re
  }
  remove() {
    this.elements.artboardWindows = this.elements.artboardWindows.filter(
      b => b !== this
    )
    this.el.remove()
  }
  createSelectBox(e) {
    if (this.selectBox) this.selectBox.el.remove()
    const { d } = editor
    const { x, y } = this.drawPos(e)
    this.selectBox = new SelectBox({
      container: this.el,
      w: d,
      d,
      x: x - d,
      y: y - d,
    })
    this.overlay.el.classList.add('freeze')
  }
  toggleSelectState() {
    if (this.overlay.el.classList.contains('select')) {
      this.overlay.el.className = 'overlay'
      this.el.classList.remove('freeze')
      if (this.selectBox) {
        this.selectBox.el.remove()
        this.selectBox = null
      }
    } else {
      this.overlay.el.classList.add('select')
      this.el.classList.add('freeze')
    }
  }
  drawPos = e => {
    const { top, left } = elements.artboard.el.getBoundingClientRect()
    return {
      x: nearestN(e.pageX - left - window.scrollX, editor.d),
      y: nearestN(e.pageY - top - window.scrollY, editor.d),
    }
  }
  colorCell = e => {
    const { x, y } = this.drawPos(e)
    const { column, d, colorPick } = editor
    const index = (y / d - 1) * column + x / d - 1

    if (colorPick) {
      editor.updateColorInputs(editor.colors[index])
    } else {
      this.drawboard.ctx.fillStyle = editor.hex
      this.drawboard.ctx[editor.erase ? 'clearRect' : 'fillRect'](
        x - d,
        y - d,
        d,
        d
      )

      const value =
        editor.erase || editor.hex === 'transparent'
          ? 'transparent'
          : editor.hex // transparent replaced with ''

      editor.fill ? this.fillBucket(index) : (editor.colors[index] = value)
      editor.inputs.colors.value = editor.colors

      // if (!artData.palette.includes(value)) {
      //   artData.palette.push(value)
      //   populatePalette(artData.palette)
      // }
    }
  }
  continuousDraw = e => {
    if (this.draw) this.colorCell(e)
  }
  resize() {
    this.w = editor.column * editor.d
    this.h = editor.row * editor.d
    this.d = editor.d
    this.setStyles()
    this.activeLayers.forEach((layer, i) => {
      const img = this.activeLayerNodes.find(n => n.id === i).img
      const colors = []
      layer.extractColors(colors)
      layer.resizeCanvas(this.size)
      this.paintFromColors(colors, layer)
    })
    this.overlay.resizeCanvas(this.size)
    this.overlay.drawGrid()
  }
  resizeAndExtractColors() {
    // ;['resize', 'paintCanvas'].forEach(action => this[action]())
    this.resize()
    this.drawboard.extractColors()
    editor.inputs.colors.value = editor.colors
  }
  paintFromColors(colors = editor.colors, canvas = this.drawboard) {
    const { d } = editor
    colors.forEach((c, i) => {
      canvas.ctx.fillStyle = c || 'transparent'
      canvas.ctx.fillRect(editor.calcX(i) * d, editor.calcY(i) * d, d, d)
    })
  }
  paintCanvas() {
    const { column, row, d } = editor
    this.drawboard.ctx.clearRect(0, 0, column * d, row * d)
    this.paintFromColors()
    // populatePalette(artData.colors)

    elements.updateLayersUi()
  }
  outputFromImage = () => {
    if (!this.uploadedFile) return
    this.dataUrl = window.URL.createObjectURL(this.uploadedFile)
    this.output(this.dataUrl)
  }
  output(dataUrl, chainedAction) {
    const { column, row, d } = editor
    const img = new Image()
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img
      const calcHeight = column * d * (h / w)
      const calcWidth = calcHeight * (w / h)

      // draw image with original dimension
      this.drawboard.resizeCanvas({ w: calcWidth, h: calcHeight })
      this.drawboard.ctx.drawImage(img, 0, 0, calcWidth, calcHeight)
      this.drawboard.extractColors()
      // revert canvas size before painting
      this.drawboard.resizeCanvas({ w: column * d, h: row * d })
      this.paintCanvas()
      this.drawboard.extractColors()
      editor.inputs.colors.value = editor.colors
      if (chainedAction)
        chainedAction({
          canvas: this.drawboard.el,
          calcWidth,
          calcHeight,
        })
      // populateCompletePalette(artData.colors)
    }
    img.src = dataUrl
  }
  downloadImage = () => {
    const link = document.createElement('a')
    link.download = `${
      editor.inputs.filename.value || 'art'
    }_${new Date().getTime()}.png`
    link.href = this.drawboard.el.toDataURL()
    link.click()
  }
  fillArea = ({ i, valueToCheck, colors }) => {
    const fillArea = []
    const fillStack = []
    const { column: w } = editor
    fillStack.push(i) // first cell to fill

    while (fillStack.length > 0) {
      const checkCell = fillStack.pop() // removes from area to check
      if (colors[checkCell] !== valueToCheck) continue // cell value already valueToCheck?
      if (fillArea.some(d => d === checkCell)) continue // in fillArea already?
      fillArea.push(checkCell) // if passed above check, include in fillArea
      if (checkCell % w !== 0) fillStack.push(checkCell - 1) // check left
      if (checkCell % w !== w - 1) fillStack.push(checkCell + 1) // check right
      fillStack.push(checkCell + w) // check up
      fillStack.push(checkCell - w) // check down
    }
    return fillArea
  }
  fillBucket = index => {
    if (index < 0 || index >= editor.colors.length) return
    const fillValue = editor.erase ? 'transparent' : editor.hex //! '' instead of transparent
    const valueToSwap = editor.colors[index]
    const fillAreaBucket = this.fillArea({
      i: +index,
      valueToCheck: valueToSwap,
      colors: editor.colors,
    })
    editor.inputs.colors.value = editor.inputs.colors.value
      .map((c, i) => {
        if (!fillAreaBucket.includes(i)) return c
        return c === valueToSwap ? fillValue : c
      })
      .join(',')
    this.paintCanvas()
  }
  refresh() {
    editor.inputs.colors.value = Array(editor.row * editor.column).fill(
      'transparent'
    )
  }
  flipHorizontal() {
    this.drawboard.extractColors()
    editor.inputs.colors.value = editor.spriteColors
      .map(a => a.reverse())
      .flat(1)
    this.paintCanvas()
  }
  flipVertical() {
    this.drawboard.extractColors()
    editor.inputs.colors.value = editor.spriteColors.reverse().flat(1)
    this.paintCanvas()
  }
  switchArtboard = () => {
    if (elements.artboard === this) return
    if (elements.artboard.selectBox) {
      this.toggleSelectState()
      const {
        selectBox: { w, h, x, y, copyData },
      } = elements.artboard
      this.selectBox = new SelectBox({
        container: this.el,
        w,
        h,
        x,
        y,
        copyData,
        canMove: true,
      })
      this.selectBox.paintFromColors()
      elements.artboard.toggleSelectState()
    }
    elements.removeLayerNodes()
    elements.artboard = this
    // add layerNode from new layer
    if (this.layerNodes.length) {
      this.layerNodes.forEach(
        node => node && elements.layersUi.el.append(node.el)
      )
    }
    elements.artboardWindows.forEach(w => {
      w.window.classList[w.artboard === this ? 'add' : 'remove']('current')
    })
    elements.artboard.drawboard.extractColors()
    editor.inputs.colors.value = editor.colors
    ;['column', 'row'].forEach(prop => {
      editor.inputs[prop].value = elements.artboard[prop]
    })
  }
  deleteLayerNode(i) {
    // TODO this could have a bug, may need to refactor to decouple id and index, or reassign index when node is deleted
    if (this.layers.length <= 1) return

    const layerNode = this.activeLayerNodes.find(n => n.id === i)

    this.layers[layerNode.id].el.remove()
    this.layers = this.layers.map((l, i) => (i === layerNode?.id ? null : l))
    layerNode.el.remove()

    this.layerNodes = this.layerNodes.map(n => (n?.id === i ? null : n))
    this.layerIndex = this.layerNodes.findIndex(n => n)
    this.layerNodes[this.layerIndex].releaseAction()
  }
}

export { Artboard, SelectBox }
