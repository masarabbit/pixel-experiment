import { nearestN, rgbToHex, hex, mouse, roundedClient } from '../utils.js'
import PageObject from './pageObject.js'
import { elements, settings } from '../elements.js'

class Canvas extends PageObject {
  constructor(props) {
    super({
      el: Object.assign(document.createElement('canvas'), {
        className: props.className,
      }),
      ...props,
    })
    if (props?.container) this.addToPage()
    this.ctx = this.el.getContext('2d', { willReadFrequently: true })
    // this.ctx.imageSmoothingEnabled = false
    this.resizeCanvas()
  }
  resizeCanvas({ w, h } = {}) {
    if (w) this.w = w
    if (h) this.h = h
    this.setStyles()
    this.el.setAttribute('width', this.w)
    this.el.setAttribute('height', this.h || this.w)
  }
  drawGrid() {
    const { ctx } = this
    const { column, row, d, gridWidth } = settings
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
    const dataToUpdate = data || settings.colors
    dataToUpdate.length = 0
    const { d } = settings
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
    settings.inputs.colors.value = settings.colors
  }
  crop() {
    this.copy()
    settings.inputs.column.value = this.column
    settings.inputs.row.value = this.h / settings.d
    settings.inputs.colors.value = this.copyData
    ;['resize', 'paintCanvas', 'toggleSelectState'].forEach(action =>
      elements.artboard[action]()
    )
  }
  paste() {
    const img = new Image()
    img.onload = () => {
      elements.artboard.drawboard.ctx.drawImage(img, this.x, this.y)
      elements.artboard.drawboard.extractColors()
      settings.inputs.colors.value = settings.colors
    }
    img.src = this.el.toDataURL()
  }
  get splitColors() {
    return this.copyData.reduce((acc, _, i) => {
      if (i % this.column === 0)
        acc.push(this.copyData.slice(i, i + this.column))
      return acc
    }, [])
  }
  paintFromColors() {
    const { d } = settings
    this.copyData.forEach((c, i) => {
      this.ctx.fillStyle = c || 'transparent'
      this.ctx.fillRect(this.calcX(i) * d, this.calcY(i) * d, d, d)
    })
  }
  paintCanvas() {
    const { column, row, d } = settings
    this.ctx.clearRect(0, 0, column * d, row * d)
    this.paintFromColors()
    // populatePalette(artData.colors)
  }
  flipHorizontal() {
    this.copyData = this.splitColors.map(a => a.reverse()).flat(1)
    this.paintCanvas()
  }
  flipVertical() {
    this.copyData = this.splitColors.reverse().flat(1)
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
      ...props,
    })
    elements.artboard = this
    elements.artboardWindows.forEach(w => w.window.classList.remove('current'))
    this.container.appendChild(this.el)

    this.setStyles()
    const { w, h, d } = this
    ;['drawboard', 'overlay'].forEach(className => {
      this[className] = new Canvas({
        artboard: this,
        container: this.el,
        className,
        w,
        h,
        d,
      })
    })
    this.overlay.drawGrid()
    this.overlay.el.addEventListener('click', e => this.createSelectBox(e))

    this.drawboard.el.addEventListener('click', this.colorCell)
    mouse.down(this.drawboard.el, 'add', () => (this.draw = true))
    mouse.up(this.drawboard.el, 'add', () => (this.draw = false))
    mouse.move(this.drawboard.el, 'add', e => this.continuousDraw(e))
    mouse.leave(this.drawboard.el, 'add', () => {
      this.draw = false
      // artData.cursor = null
    })
    // mouse.enter(artboard, 'add', ()=> artData.cursor = 'artboard')
    this.refresh()
  }
  remove() {
    this.elements.artboardWindows = this.elements.artboardWindows.filter(
      b => b !== this
    )
    this.el.remove()
  }
  createSelectBox(e) {
    if (this.selectBox) this.selectBox.el.remove()
    const { d } = settings
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
    if (this.selectBox) {
      this.overlay.el.classList.remove('freeze')
      this.selectBox.el.remove()
      this.selectBox = null
      this.overlay.el.classList.remove('select')
      this.el.classList.remove('freeze')
    } else {
      this.overlay.el.classList.add('select')
      this.el.classList.add('freeze')
    }
  }
  drawPos = e => {
    const { top, left } = elements.artboard.el.getBoundingClientRect()
    return {
      x: nearestN(e.pageX - left - window.scrollX, settings.d),
      y: nearestN(e.pageY - top - window.scrollY, settings.d),
    }
  }
  colorCell = e => {
    const { x, y } = this.drawPos(e)
    const { column, d, colorPick } = settings
    const index = (y / d - 1) * column + x / d - 1

    if (colorPick) {
      settings.inputs.color.updateColorInputs(settings.colors[index])
    } else {
      this.drawboard.ctx.fillStyle = settings.hex
      this.drawboard.ctx[settings.erase ? 'clearRect' : 'fillRect'](
        x - d,
        y - d,
        d,
        d
      )

      const value =
        settings.erase || settings.hex === 'transparent'
          ? 'transparent'
          : settings.hex // transparent replaced with ''

      settings.fill ? this.fillBucket(index) : (settings.colors[index] = value)
      settings.inputs.colors.value = settings.colors

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
    ;(this.w = settings.column * settings.d),
      (this.h = settings.row * settings.d),
      (this.d = settings.d)
    this.setStyles()
    this.drawboard.resizeCanvas(this.size)
    this.overlay.resizeCanvas(this.size)
    this.overlay.drawGrid()
  }
  resizeAndPaintCanvas() {
    ;['resize', 'paintCanvas'].forEach(action => this[action]())
  }
  paintFromColors() {
    const { d } = settings
    settings.colors.forEach((c, i) => {
      this.drawboard.ctx.fillStyle = c || 'transparent'
      this.drawboard.ctx.fillRect(
        settings.calcX(i) * d,
        settings.calcY(i) * d,
        d,
        d
      )
    })
  }
  paintCanvas() {
    const { column, row, d } = settings
    this.drawboard.ctx.clearRect(0, 0, column * d, row * d)
    this.paintFromColors()
    // populatePalette(artData.colors)
  }
  outputFromImage = () => {
    if (!this.uploadedFile) return
    this.dataUrl = window.URL.createObjectURL(this.uploadedFile)
    this.output()
  }
  output() {
    const { column, row, d } = settings
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
      settings.inputs.colors.value = settings.colors
      // populateCompletePalette(artData.colors)
    }
    img.src = this.dataUrl
  }
  downloadImage = () => {
    const link = document.createElement('a')
    link.download = `${
      settings.inputs.filename.value || 'art'
    }_${new Date().getTime()}.png`
    link.href = this.drawboard.el.toDataURL()
    link.click()
  }
  fillArea = ({ i, valueToCheck, colors }) => {
    const fillArea = []
    const fillStack = []
    const { column: w } = settings
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
    if (index < 0 || index >= settings.colors.length) return
    const fillValue = settings.erase ? 'transparent' : settings.hex //! '' instead of transparent
    const valueToSwap = settings.colors[index]
    const fillAreaBucket = this.fillArea({
      i: +index,
      valueToCheck: valueToSwap,
      colors: settings.colors,
    })
    settings.inputs.colors.value = settings.inputs.colors.value
      .map((c, i) => {
        if (!fillAreaBucket.includes(i)) return c
        return c === valueToSwap ? fillValue : c
      })
      .join(',')
    this.paintCanvas()
  }
  refresh() {
    settings.inputs.colors.value = Array(settings.row * settings.column).fill(
      'transparent'
    )
  }
  flipHorizontal() {
    settings.inputs.colors.value = settings.splitColors
      .map(a => a.reverse())
      .flat(1)
    this.paintCanvas()
  }
  flipVertical() {
    settings.inputs.colors.value = settings.splitColors.reverse().flat(1)
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
    elements.artboard = this
    elements.artboardWindows.forEach(w => {
      w.window.classList[w.artboard === this ? 'add' : 'remove']('current')
    })
    elements.artboard.drawboard.extractColors()
    settings.inputs.colors.value = settings.colors
    ;['column', 'row'].forEach(prop => {
      settings.inputs[prop].value = elements.artboard[prop]
    })
  }
}

export { Artboard, SelectBox }
