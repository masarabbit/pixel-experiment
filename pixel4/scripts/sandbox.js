import { getData } from '../../config.js'

window.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('menu')

  const settings = {
    activeElement: null,
    elements: [],
    blocks: [],
    artboard: null,
  }
  class PageObject {
    constructor() {
      this.pos = { x: 0, y: 0 }
      this.grabSize = { w: 0, h: 0 }
      this.pointerPos = { x: 0, y: 0 }
    }
    setPos(pos) {
      this.pos = pos
      this.el.style.transform = `translate(${pos.x}px, ${pos.y}px)`
    }
    setSize(size) {
      this.size = size
      Object.assign(this.el.style, {
        width: `${size.w}px`,
        height: `${size.h}px`,
      })
    }
  }

  class Window extends PageObject {
    constructor() {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'window',
        innerHTML:
          '<div class="window-handle" data-id="window" >artboard</div>' +
          '<div class="artboard"></div>' +
          '<div class="size-handle" data-id="window" ></div>',
      })
      this.id = 'window'

      document.body.appendChild(this.el)
      settings.artboard = this.el.querySelector('.artboard')
      settings.elements.push(this)

      this.setSize({ w: 200, h: 100 })
    }
  }

  class Parameter extends PageObject {
    constructor() {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'window',
        innerHTML:
          '<div class="window-handle" data-id="parameter" >parameter</div>' +
          '<div class="content"></div>',
      })
      this.id = 'parameter'

      document.body.appendChild(this.el)
      this.content = this.el.querySelector('.artboard')
      settings.elements.push(this)

      this.setSize({ w: 200, h: 100 })
    }
  }

  window.addEventListener('pointerdown', e => {
    console.log(e.target.dataset.id)
    const el = settings.elements.find(
      element => element.id === e.target.dataset.id
    )
    if (el) {
      settings.activeElement = el
      el.pointerPos = { x: e.pageX - el.pos.x, y: e.pageY - el.pos.y }
      el.grabSize = {
        w: el.size.w - el.pos.x,
        h: el.size.h - el.pos.y,
      }
    }
  })
  ;['pointerup', 'pointercancel'].forEach(action => {
    window.addEventListener(action, () => {
      settings.activeElement = null
    })
  })

  window.addEventListener('pointermove', e => {
    e.target.setPointerCapture(e.pointerId)
    const el = settings.activeElement
    if (el) {
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
    }
  })

  new Window()
  new Parameter()

  class Block extends PageObject {
    constructor({ dataUrl, column, row, name }) {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'block',
        innerHTML: `<img src="${dataUrl}" />`,
      })
      settings.elements.push(this)
      settings.blocks.push(this)
      this.name = name
      this.id = `${name}-${settings.blocks.filter(b => b.name === name).length}`
      this.el.dataset.id = this.id
      settings.artboard.appendChild(this.el)

      this.setSize({ w: column, h: row })
    }
  }

  getData().forEach(d => {
    const box = Object.assign(document.createElement('div'), {
      className: 'box',
      innerHTML: `<img draggable="false" src="${d.dataUrl}" />`,
    })
    menu.appendChild(box)
    box.dataset.size = `${d.column} x ${d.row}`
    box.addEventListener('click', () => {
      menu.hidePopover()
      new Block(d)
    })
  })
})
