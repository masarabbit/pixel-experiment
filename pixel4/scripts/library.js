import { SAVE_DATA_NAME, sample } from '../../config.js'

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.wrapper')

  const savedData = localStorage.getItem(SAVE_DATA_NAME)
  const parsedData = savedData ? JSON.parse(savedData) : []

  ;[...sample, ...parsedData].forEach(config => {
    const box = Object.assign(document.createElement('div'), {
      className: 'box',
      innerHTML: `<img draggable="false" src="${config.dataUrl}" />`,
    })
    wrapper.appendChild(box)
    box.dataset.size = `${config.column} x ${config.row}`
    box.addEventListener('click', () => {
      window.location = `./?img=${config.name}`
    })
  })
})
