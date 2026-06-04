import { convertCamelCase } from '../utils.js'
import { editor, elements } from '../elements.js'

const renderInput = (props, type) => {
  return `<input 
            id="${props.inputName}" 
            class="${props?.className || ''} ${props.inputName}" 
            type="${type}" 
            placeholder="${convertCamelCase(props.inputName)}"
          ></input>`
}

// TODO separate out normal input and colorinput, and possibly other inputs
export class Input {
  constructor(props) {
    Object.assign(this, {
      el: Object.assign(document.createElement('div'), {
        className: 'input-wrap',
        innerHTML: `
          <label for="${props.inputName}">
            ${convertCamelCase(props.inputName)}
          </label>
         ${renderInput(props, 'text')}
        `,
      }),
      ...props,
    })
    props.container.appendChild(this.el)
    this.input = this.el.querySelector('input')
    this.addChangeListener()
    if (this.default) editor[this.inputName] = this.default
    this.input.value = editor[props.inputName]
  }
  get key() {
    return this.inputName
  }
  get value() {
    return this.isNum ? +this.input.value : this.input.value
  }
  set value(val) {
    const v = this.isNum ? +val : val
    this.input.value = v
    editor[this.inputName] = v
  }
  updateColor() {
    const label = editor.inputs[this.inputName.replace('hex', 'color')].label
    label.style.backgroundColor = editor[this.key]
    if (editor?.inputs[this.key])
      editor.inputs[this.key].value = editor[this.key]
  }
  addChangeListener() {
    this.input.addEventListener('change', e => {
      editor[this.key] = e.target.value
      if (this.inputName.includes('hex')) this.updateColor()
      if (this.update) this.update(this.input)
    })
  }
}

export class ColorInput {
  constructor(props) {
    Object.assign(this, {
      el: Object.assign(document.createElement('div'), {
        className: 'color-input-wrap',
        innerHTML: `
          <label class="color-label" for="${props.inputName}">
          </label>
          ${renderInput(props, 'color')}
        `,
      }),
      ...props,
    })
    props.container.appendChild(this.el)
    this.input = this.el.querySelector('input')
    this.label = this.el.querySelector('label')
    this.addChangeListener()
    if (this.default) editor[this.inputName] = this.default
    this.updateColor()
  }
  get key() {
    return this.inputName.replace('color', 'hex')
  }
  get value() {
    return this.input.value
  }
  set value(val) {
    this.input.value = val
    editor[this.inputName] = val
  }
  updateColor() {
    this.label.style.backgroundColor = editor[this.key]
    if (editor?.inputs[this.key])
      editor.inputs[this.key].value = editor[this.key]
  }
  addChangeListener() {
    this.input.addEventListener('change', e => {
      editor[this.key] = e.target.value
      this.updateColor()
    })
  }
}

export class SizeInput extends Input {
  addChangeListener() {
    this.input.addEventListener('change', e => {
      this.resizeColors()
      editor[this.key] = +e.target.value
      ;['resize', 'paintCanvas'].forEach(action => elements.artboard[action]())
    })
  }
  resizeColors = () => {
    const newArr = editor.spriteColors
    newArr.length = editor.inputs.row.value
    editor.inputs.colors.value = newArr
      .map(arr => {
        const arrCopy = arr
        arrCopy.length = editor.inputs.column.value
        arrCopy.fill('transparent', editor.column)
        return arrCopy
      })
      .flat(1)
    editor.colors = editor.inputs.colors.value
  }
}

export class TextArea {
  constructor(props) {
    Object.assign(this, {
      el: Object.assign(document.createElement('div'), {
        innerHTML: `<textarea className="${
          props.className || ''
        }" spellcheck="false" />`,
      }),
      inputName: props.inputName || props.className,
      ...props,
    })
    this.container.append(this.el)
    this.input = this.el.querySelector('textarea')
    this.input.addEventListener('change', this.action)
    const buttonWrapper = Object.assign(document.createElement('div'), {
      className: 'mini-wrap',
    })
    this.el.append(buttonWrapper)
    this.buttons.forEach(b => {
      new Button({
        ...b,
        container: buttonWrapper,
        action: () => b.action(this),
      })
    })
    editor.inputs[this.inputName] = this
  }
  get value() {
    return this.input.value.split(',')
  }
  set value(val) {
    this.input.value = val
    editor[this.inputName] = Array.isArray(val) ? val : val.split(',')
  }
  async copyText() {
    try {
      this.input.select()
      await navigator.clipboard.writeText(this.input.value)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}

export class Upload {
  constructor(props) {
    Object.assign(this, {
      el: Object.assign(document.createElement('div'), {
        className: 'upload-wrapper',
        innerHTML: `
          <input id="upload" type="file" single/>
          <label for="upload" class="upload icon"></label>
          <div></div>
        `,
      }),
      ...props,
    })
    this.container.appendChild(this.el)
    ;['input', 'label', 'display'].forEach(
      key =>
        (this[key] = this.el.querySelector(
          `${key === 'display' ? 'div' : key}`
        ))
    )

    this.pixeliseBtn = new Button({
      container: this.container,
      className: 'pixelise icon d-none',
      action: () => elements.artboard.outputFromImage(),
    })
    this.el.addEventListener('change', () => {
      elements.artboard.uploadedFile = this.input.files[0]
      this.display.innerHTML = elements.artboard.uploadedFile.name
      this.pixeliseBtn.el.classList.remove('d-none')
    })
  }
}

export class Button {
  constructor(props) {
    Object.assign(this, {
      el: Object.assign(document.createElement('button'), {
        className: `btn ${props?.className || ''}`,
        innerHTML: props?.btnText || '',
      }),
      ...props,
    })
    this.el.action = props.action
    props.container.appendChild(this.el)
    if (this.shortCut) this.el.setAttribute('data-short-cut', this.shortCut)
    // this.el.addEventListener('click', () => this.action(this))
  }
}
