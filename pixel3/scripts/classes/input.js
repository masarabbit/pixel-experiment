import { convertCameCase } from '../utils.js'
import { settings, elements } from '../elements.js'

class Input {
  constructor(props) {
    const label = convertCameCase(props.inputName)
    const isColorInput = props.inputName.includes('color')
    Object.assign(this, {
      el: Object.assign(document.createElement('div'), {
        className: isColorInput ? 'color-input-wrap' : 'input-wrap',
        innerHTML: `
          <label class="${isColorInput ? 'color-label' : ''}" for="${
            props.inputName
          }">
            ${isColorInput ? '' : label}
          </label>
          <input 
            id="${props.inputName}" 
            class="${props?.className || ''} ${props.inputName}" 
            type="${isColorInput ? 'color' : 'text'}" 
            placeholder="${label}"
          >
        `,
      }),
      ...props,
    })
    props.container.appendChild(this.el)
    this.input = this.el.querySelector('input')
    this.addChangeListener()
    if (this.default) settings[this.inputName] = this.default
    if (isColorInput) {
      this.label = this.el.querySelector('label')
      this.updateColor()
    } else {
      this.input.value = settings[props.inputName]
    }
  }
  get key() {
    return this.inputName.replace('color', 'hex')
  }
  get value() {
    return this.isNum ? +this.input.value : this.input.value
  }
  set value(val) {
    const v = this.isNum ? +val : val
    this.input.value = v
    settings[this.inputName] = v
  }
  updateColor() {
    const label =
      this.label ||
      settings.inputs[this.inputName.replace('hex', 'color')].label
    label.style.backgroundColor = settings[this.key]
    if (settings?.inputs[this.key])
      settings.inputs[this.key].value = settings[this.key]
  }
  updateColorInputs(color) {
    settings.color = color
    settings.inputs.hex.value = color
    settings.inputs.color.value = color
    settings.inputs.color.label.style.backgroundColor = color
  }
  addChangeListener() {
    this.input.addEventListener('change', e => {
      settings[this.key] = e.target.value
      if (['color', 'color2', 'hex', 'hex2'].includes(this.inputName))
        this.updateColor()
      if (this.update) this.update()
    })
  }
}

class SizeInput extends Input {
  addChangeListener() {
    this.input.addEventListener('change', e => {
      this.resizeColors()
      settings[this.key] = +e.target.value
      if (this.update) this.update()
    })
  }
  resizeColors = () => {
    const newArr = settings.spriteColors
    newArr.length = settings.inputs.row.value
    settings.inputs.colors.value = newArr
      .map(arr => {
        const arrCopy = arr
        arrCopy.length = settings.inputs.column.value
        arrCopy.fill('transparent', settings.column)
        return arrCopy
      })
      .flat(1)
    settings.colors = settings.inputs.colors.value
  }
}

class TextArea {
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
    settings.inputs[this.inputName] = this
  }
  get value() {
    return this.input.value.split(',')
  }
  set value(val) {
    this.input.value = val
    settings[this.inputName] = Array.isArray(val) ? val : val.split(',')
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

class Upload {
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

class Button {
  constructor(props) {
    Object.assign(this, {
      el: Object.assign(document.createElement('button'), {
        className: `btn ${props?.className || ''}`,
        innerHTML: props?.btnText || '',
      }),
      ...props,
    })
    props.container.appendChild(this.el)
    if (this.shortCut) this.el.setAttribute('data-short-cut', this.shortCut)
    this.el.addEventListener('click', () => this.action(this))
  }
}

export { Input, SizeInput, TextArea, Button, Upload }
