import { getData } from '../../config.js'

const SANDBOX_SAVE_DATA = 'sandbox-save-data'

window.addEventListener('DOMContentLoaded', () => {
  const stampMenu = document.getElementById('stamp-menu')
  const configMenu = document.getElementById('config-menu')
  const stamp = document.querySelector('.stamp')
  const configTextarea = document.querySelector('textarea')

  const nearestN = (x, n = 2) =>
    x === 0 ? 0 : x - 1 + Math.abs(((x - 1) % n) - n)

  const settings = {
    activeElement: null,
    elements: [],
    blocks: [],
    artboardWindow: null,
    parameterWindow: null,
    stampImg: null,
    deleteMode: false,
  }
  class PageObject {
    constructor() {
      this.pos = { x: 0, y: 0 }
      this.grabSize = { w: 0, h: 0 }
      this.pointerPos = { x: 0, y: 0 }
      this._size = { w: 0, h: 0 }
      this.scale = 1
      this['default-scale'] = 1
    }
    setPos(pos) {
      if (pos) this.pos = { x: nearestN(pos.x), y: nearestN(pos.y) }
      this.el.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px)`
    }
    setSize(size) {
      if (size) this._size = size
      Object.assign(this.el.style, {
        width: `${this.size.w}px`,
        height: !isNaN(this.size.h) ? `${this.size.h}px` : 'auto',
      })
    }
    get size() {
      return {
        w: this._size.w * this.scale,
        h: !isNaN(this._size.h) ? this._size.h * this.scale : 'auto',
      }
    }
  }

  class Artboard extends PageObject {
    constructor(
      { _size, pos } = { _size: { w: 200, h: 100 }, pos: { x: 40, y: 40 } }
    ) {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'window',
        innerHTML:
          '<div class="window-handle" data-id="window">artboard</div>' +
          '<div class="artboard stampable"></div>' +
          '<div class="size-handle" data-id="window"></div>',
      })
      this.id = 'window'

      document.body.appendChild(this.el)
      settings.artboardWindow = this
      this.artboard = this.el.querySelector('.artboard')
      settings.elements.push(this)

      this.setSize(_size)
      this.setPos(pos)

      this.artboard.addEventListener('click', e => {
        if (settings.stampImg) {
          const { column, row, scale } = settings.stampImg
          const { x, y } = settings.artboardWindow.pos
          new Block({
            ...settings.stampImg,
            pos: {
              x: e.pageX - (column * scale) / 2 - x,
              y: e.pageY - (row * scale) / 2 - y - 20,
            },
          })
          saveConfig()
        }
      })
    }
  }

  class ParameterMenu extends PageObject {
    constructor(pos = { x: 300, y: 40 }, defaultScale = 2, color = '#fff') {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'window',
        innerHTML:
          '<div class="window-handle" data-id="parameter">parameter</div>' +
          '<div class="content"></div>',
      })
      this.id = 'parameter'

      document.body.appendChild(this.el)
      this.content = this.el.querySelector('.content')
      settings.elements.push(this)
      settings.parameterWindow = this
      this.colorInput = Object.assign(document.createElement('div'), {
        className: 'input-wrapper',
        innerHTML:
          '<label>bg color</label><label class="color" for="color"></label><input id="color" type="color" data-type="color" />',
      })
      this.content.appendChild(this.colorInput)
      this.colorInput.querySelector('input').addEventListener('change', e => {
        this.updateColor(e.target.value)
        saveConfig()
      })
      ;['hex', 'default-scale', 'x', 'y', 'z', 'scale'].forEach(param => {
        const input = Object.assign(document.createElement('div'), {
          className: 'input-wrapper',
          innerHTML:
            `<label>${param.replace('-', ' ')}</label>` +
            `<input type="${param === 'hex' ? 'text' : 'number'}" data-type="${param}" />`,
        })
        this.content.appendChild(input)

        input.querySelector('input').addEventListener('change', e => {
          this[param] = +e.target.value
          if (param === 'hex') this.updateColor(e.target.value)
          if (settings.focusElement) {
            settings.focusElement[param] = +e.target.value
            settings.focusElement.setPos()
            settings.focusElement.setSize()
          }
          saveConfig()
        })
      })
      this.updateColor(color)
      this.setParam('default-scale', defaultScale)
      this.setSize({ w: 200, h: 'auto' })
      this.setPos(pos)
    }
    updateColor(color, updateHex = true) {
      this.color = color
      this.colorInput.querySelector('.color').style.backgroundColor = color
      settings.artboardWindow.artboard.style.backgroundColor = color
      if (updateHex) this.setParam('hex', color)
    }
    setParam(param, value) {
      if (param === 'hex') this.updateColor(value, false)
      this[param] = value
      this.content.querySelector(`[data-type=${param}]`).value = value
    }
  }

  window.addEventListener('pointerdown', e => {
    const el = settings.elements.find(
      element => element.id === e.target.dataset.id
    )
    if (el) {
      if (settings.deleteMode) {
        el.el.remove()
        settings.elements = settings.elements.filter(element => element !== el)
        settings.blocks = settings.blocks.filter(block => block !== el)
      } else {
        settings.activeElement = el
        el.pointerPos = { x: e.pageX - el.pos.x, y: e.pageY - el.pos.y }
        el.grabSize = {
          w: el.size.w - el.pos.x,
          h: el.size.h - el.pos.y,
        }
      }
    }
  })

  const saveConfig = () => {
    const data = {
      artboard: settings.artboardWindow,
      parameter: settings.parameterWindow,
      blocks: settings.blocks.sort((a, b) => a.z - b.z),
    }
    localStorage.setItem(SANDBOX_SAVE_DATA, JSON.stringify(data))
    configTextarea.value = JSON.stringify(data, null, 2)
    configTextarea.style.height = (configTextarea.scrollHeight || 500) + 'px'
  }

  ;['pointerup', 'pointercancel'].forEach(action => {
    window.addEventListener(action, () => {
      if (settings.activeElement instanceof Block) {
        settings.focusElement = settings.activeElement
        settings.parameterWindow.setParam('x', settings.activeElement.pos.x)
        settings.parameterWindow.setParam('y', settings.activeElement.pos.y)
        settings.parameterWindow.setParam(
          'z',
          settings.blocks.indexOf(settings.activeElement)
        )
        settings.parameterWindow.setParam('scale', settings.activeElement.scale)
      }

      // update stamp
      if (settings.stampImg)
        settings.stampImg = {
          ...settings.stampImg,
          scale: settings.parameterWindow['default-scale'],
        }

      settings.activeElement = null

      if (!configMenu.matches(':popover-open')) saveConfig()
    })
  })

  window.addEventListener('pointermove', e => {
    stamp.classList[
      e.target.classList.contains('stampable') ? 'remove' : 'add'
    ]('d-none')

    e.target.setPointerCapture(e.pointerId)
    const el = settings.activeElement
    if (el && !settings.stampImg) {
      if (e.target.classList.contains('size-handle')) {
        el.setSize({
          w: el.grabSize.w + (e.pageX - el.pointerPos.x),
          h: el.grabSize.h + (e.pageY - el.pointerPos.y),
        })
      } else {
        el.setPos({
          x: e.pageX - el.pointerPos.x,
          y: e.pageY - el.pointerPos.y,
        })
      }
    } else {
      stamp.style.transform = `translate(${e.pageX}px, ${e.pageY}px) scale(${settings.parameterWindow['default-scale']}) `
    }
  })
  class Block extends PageObject {
    constructor({ dataUrl, column, row, name, pos, _size: size, scale }) {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'block stampable',
        innerHTML: `<img src="${dataUrl}" />`,
      })
      settings.elements.push(this)
      settings.blocks.push(this)
      this.dataUrl = dataUrl
      this.name = name
      this.id = `${name}-${settings.blocks.filter(b => b.name === name).length}`
      this.el.dataset.id = this.id
      settings.artboardWindow.artboard.appendChild(this.el)
      this.scale = scale || 1
      this.setSize(size || { w: column, h: row })
      if (pos) this.setPos(pos)
      this.z = settings.blocks.indexOf(this)
    }
    set x(value) {
      this.pos.x = value
    }
    set y(value) {
      this.pos.y = value
    }
    set z(value) {
      this._z = value
      this.el.style.zIndex = value
    }
    get z() {
      return this._z
    }
  }

  const savedData = localStorage.getItem(SANDBOX_SAVE_DATA)

  if (savedData) {
    const data = JSON.parse(savedData)
    new Artboard(data.artboard)
    new ParameterMenu(
      data.parameter.pos,
      data.parameter['default-scale'],
      data.parameter.color
    )

    data.blocks.forEach(b => new Block(b))
  } else {
    new Artboard()
    new ParameterMenu()
  }

  getData().forEach(d => {
    const box = Object.assign(document.createElement('div'), {
      className: 'box',
      innerHTML: `<img draggable="false" src="${d.dataUrl}" />`,
    })
    stampMenu.appendChild(box)
    box.dataset.size = `${d.column} x ${d.row}`

    box.addEventListener('click', () => {
      stamp.innerHTML = `<img src="${d.dataUrl}" />`
      settings.stampImg = {
        ...d,
        scale: settings.parameterWindow['default-scale'],
      }
      stampMenu.hidePopover()
    })
  })

  document.querySelector('.clear-stamp').addEventListener('click', () => {
    stamp.innerHTML = ''
    settings.stampImg = null
  })

  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'd') settings.deleteMode = true
  })
  window.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'd') settings.deleteMode = false
  })

  const downloadImage = canvas => {
    const link = document.createElement('a')
    link.download = `sandbox_${new Date().getTime()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  document.querySelector('.save').addEventListener('click', () => {
    const canvas = document.createElement('canvas')
    const { w, h } = settings.artboardWindow.size
    canvas.setAttribute('width', w)
    canvas.setAttribute('height', h)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = settings.parameterWindow.color
    ctx.fillRect(0, 0, w, h)
    ctx.imageSmoothingEnabled = false
    settings.blocks.forEach(b => {
      ctx.drawImage(
        b.el.querySelector('img'),
        b.pos.x,
        b.pos.y,
        b.size.w,
        b.size.h
      )
    })
    downloadImage(canvas)
  })

  document.querySelector('.download').addEventListener('click', () => {
    const url = window.URL.createObjectURL(
      new Blob([configTextarea.value], {
        type: 'text/plain',
      })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `sandbox_${new Date().getTime()}.txt`
    link.click()
  })

  document.querySelector('.config-save').addEventListener('click', () => {
    if (window.confirm('Are you sure you want to overwrite existing data?')) {
      if (!configTextarea.value) {
        localStorage.removeItem(SANDBOX_SAVE_DATA)
      } else {
        const data = JSON.parse(configTextarea.value)
        const newData = JSON.stringify(data, null, 1)
        localStorage.setItem(SANDBOX_SAVE_DATA, newData)
      }

      location.reload()
    }
  })
})
