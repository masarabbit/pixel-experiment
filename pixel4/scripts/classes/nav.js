import PageObject from './pageObject.js'
import { Button } from './input.js'
import { px, roundedClient, convertCameCase, mouse } from '../utils.js'
import { elements } from '../elements.js'

class NavWindow extends PageObject {
  constructor(props) {
    super({
      window: Object.assign(document.createElement('div'), {
        className: `nav-window ${props.className || ''}`,
        innerHTML: `
          <div class="handle">
            ${`<p>${convertCameCase(props.name)}</p>` || '<span></span>'}
            <div>
              ${props.selectAction
                ? '<button class="select-btn"></button>'
                : ''
              }
              <button class="arrow"></button>
            </div>
          </div>
          <div class="content-wrapper ${props.isVertical ? 'column' : '' }"></div>
        `
      }),
      canMove: true,
      // zOffset: 1,
      ...props
    })
    this.container.appendChild(this.window)
    this.el = this.window.querySelector('.handle')
    this.contentWrapper = this.window.querySelector('.content-wrapper')
    this.window.querySelector('.arrow').addEventListener('click', this.toggleState)

    if (this.content) this.content(this)
    if (this.selectAction) this.window.querySelector('.select-btn').addEventListener('click', ()=> this.selectAction(this))

    this.setStyles()
    this.addDragEvent()

    mouse.up(document, 'add', ()=> elements.saveData())
  }
  toggleState = () => {
    this.isOpen = !this.isOpen
    this.window.classList[this.isOpen ? 'remove' : 'add']('close')
    elements.saveData()
  }
  touchPos(e) {
    return {
      x: roundedClient(e, 'X'),
      y: roundedClient(e, 'Y'),
    }
  }
  setStyles() {
    Object.assign(this.window.style, {
      left: px(this.x || 0),
      top: px(this.y || 0),
      width: px(this.w),
      height: px(this.h || this.w),
      zIndex: 1 + this.y
    })
  }
  setUp() {
    this.window.classList[this.isOpen ? 'remove' : 'add']('close')
    this.setStyles()
  }
  addButtons(arr) {
    arr.forEach(b => {
      new Button({
        ...b,
        container: this.contentWrapper,
        className: `${b.className} icon`
      })
    }) 
  }
}

export {
  NavWindow
}