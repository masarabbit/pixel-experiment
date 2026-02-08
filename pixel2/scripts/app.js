import { artboard, elements, input, aCtx, overlay }  from './elements.js'
import { styleTarget, mouse, resizeCanvas, copyText, update } from './actions/utils.js'
import { artData } from './state.js'
import { continuousDraw, colorCell, paintCanvas, flipImage, drawPos, copyColors, downloadImage, recordState, updateColorsAndPaint } from './actions/draw.js'
import { resize, grid, updateColors } from './actions/grid.js'
import { updateColor, populateCompletePalette } from './actions/colors.js'
import { createSelectBox, copySelection, paste, select } from './actions/select.js'
import traceSvg from '../scripts/actions/traceSvg.js'


// TODO undo - logic added, recordState needs to be added.
// TODO add cursor icon edit
// TODO represent transparent as t?
// TODO break new Array(width * (h / cellD)).fill('') this out to function?

// TODO when moving select box outside the edge, image needs to be cropped properly
// TODO when select box is inverted, selection is not copied / pasted properly
// TODO add delete button?


function init() {

  const resetCodes = () =>{
    artData.colors = Array(artData.row * artData.column).fill('transparent')
    input.colors.value = artData.colors
  }

  Object.keys(input).forEach(key =>{
    if (!input[key][0]) {
      input[key].addEventListener('change', e =>{  
        if (['color', 'hex'].includes(key)) {
          updateColor(input[key].value)
        } else if (['color2', 'hex2'].includes(key)) {
          updateColor(input[key].value, 2)
        } else if (key === 'upload') {
          artData.uploadedFile = input.upload.files[0]
          document.querySelector('.upload_file_name').innerHTML = artData.uploadedFile.name
          document.querySelector('.pixelise').classList.remove('display_none')
        } else if (key === 'colors') {
          artData.colors = e.target.value.split(',')
        } else {
          if (artData[key] !== null) {
            // column, row and cellD
            updateColors[key] && updateColors[key]()
            artData[key] = +e.target.value
            resize()
            paintCanvas()
          }
        }
      })
    }
  })


  // TODO move this to draw?
  const output = () =>{
    const { cellD, row, column, uploadedFile } = artData 
    if (!uploadedFile) return
    const blobURL = window.URL.createObjectURL(uploadedFile)
    const imageTarget = new Image()
    
    imageTarget.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = imageTarget
      artData.calcHeight = (column * cellD) * (h / w)
      artData.calcWidth = artData.calcHeight * (w / h)
      const { calcWidth, calcHeight } = artData 
      resizeCanvas({
        canvas: artboard, 
        w: calcWidth, h: calcHeight - (calcHeight % cellD)
      })   
      aCtx.drawImage(imageTarget, 0, 0, calcWidth, calcHeight)
      copyColors({
        w: column, h: row, 
        ctx: aCtx, 
        data: artData.colors
      })
      // revert canvas size before painting
      resizeCanvas({
        canvas: artboard, 
        w: column * cellD, h: row * cellD
      })
      paintCanvas()
      copyColors({
        w: column, h: row, 
        ctx: aCtx, 
        data: artData.colors
      })
      input.colors.value = artData.colors
      populateCompletePalette(artData.colors)
    }
    imageTarget.src = blobURL
    artData.blobURL = blobURL
    recordState()
  }
  
  const triggerFill = e =>{
    e.target.classList.toggle('active')
    artData.fill = !artData.fill
    // artData.cursorType = artData.fill 
    //   ? 'bucket_cursor' 
    //   : drawData.moveState 
    //     ? 'motion_cursor' 
    //     : 'pen_cursor'
  }

  
  const undo = () =>{
    if (artData.prev[artData.prev.length - 1]) {
      const { colors, row, column,  cellD } = artData.prev[artData.prev.length - 1]
      update('column', column)
      update('row', row)
      update('colors', colors)
      update('cellD', cellD)
      resize()
      paintCanvas()
      artData.prev = artData.prev.filter((_data, i)=> i !== artData.prev.length - 1)
      if (!artData.prev.length) recordState()
    }
  }

  elements.buttons.forEach(b =>{
    const addClickEvent = (className, event) => b.classList.contains(className) && b.addEventListener('click', event)
    addClickEvent('create_grid', ()=>{
      resize()
      paintCanvas()
      resetCodes()
    })
    addClickEvent('pixelise', output)
    addClickEvent('copy', e => copyText(input[e.target.dataset.code]))
    addClickEvent('generate', paintCanvas)
    addClickEvent('flip', e => flipImage(e.target.dataset.dir))
    addClickEvent('fill', e => triggerFill(e))
    addClickEvent('clear', e => {
      e.target.classList.toggle('active')
      artData.erase = !artData.erase 
    })
    addClickEvent('select_state', select)
    addClickEvent('copy_selection', copySelection)
    addClickEvent('cut_selection', ()=> copySelection({ cut: true }))
    addClickEvent('paste_selection', paste)
    addClickEvent('grid_display', ()=> {
      grid[!artData.grid ? 'draw' : 'clear']()
      overlay.classList.toggle('hide')
      artData.grid = !artData.grid
    })
    addClickEvent('crop_selection', ()=> copySelection({ crop: true }))
    addClickEvent('download', ()=>{
      paintCanvas()
      downloadImage()
    })
    addClickEvent('trace_svg', traceSvg)
    addClickEvent('undo', undo)
    addClickEvent('data_url', ()=> {
      input.svg.value = artboard.toDataURL()
    })
    addClickEvent('onion', ()=> {
      if (artData.blobURL) {
        const bg = new Image()
        elements.onionBg.innerHTML = ''
        bg.src = artData.blobURL
        elements.onionBg.appendChild(bg)
      }
    })
    addClickEvent('swap_color', ()=> {
      input.colors.value = artData.colors.map(c => c === artData.hex ? artData.hex2 : c)
      updateColorsAndPaint()
    })
    addClickEvent('output_from_data_url', ()=> {
      // TODO could update this to reuse logic from output
      if (input.svg.value?.[0] === 'd') {
        const img = new Image()
        img.onload = () => {
          const { cellD, column, row } = artData 
          const { naturalWidth: w, naturalHeight: h } = img
          artData.calcHeight = (column * cellD) * (h / w)
          artData.calcWidth = artData.calcHeight * (w / h)
          const { calcWidth, calcHeight } = artData 
          resizeCanvas({
            canvas: artboard, 
            w: calcWidth, h: calcHeight - (calcHeight % cellD)
          })   
          aCtx.drawImage(img, 0, 0, calcWidth, calcHeight)
          copyColors({
            w: column, h: row, 
            ctx: aCtx, 
            data: artData.colors
          })
          // revert canvas size before painting
          resizeCanvas({
            canvas: artboard, 
            w: column * cellD, h: row * cellD
          })
          paintCanvas()
          copyColors({
            w: column, h: row, 
            ctx: aCtx, 
            data: artData.colors
          })
        }
        img.src = input.svg.value
      }
    })
  })

  artboard.addEventListener('click', colorCell)
  mouse.down(artboard, 'add', ()=> artData.draw = true)
  mouse.up(artboard, 'add', ()=> artData.draw = false)
  mouse.move(artboard, 'add', e => continuousDraw(e, colorCell))
  mouse.leave(artboard, 'add', ()=> {
    artData.draw = false
    artData.cursor = null
  })
  mouse.enter(artboard, 'add', ()=> artData.cursor = 'artboard')

  overlay.addEventListener('click', e => createSelectBox(e))


  window.addEventListener('mousemove', e =>{
    const { cellD, gridWidth } = artData
    const { left, top } = artboard.getBoundingClientRect()
    const isArtboard = artData.cursor === 'artboard' 
    const pos = isArtboard
      ? { 
          x: drawPos(e, cellD).x - cellD + left, 
          y: drawPos(e, cellD).y - cellD + top 
        }
      : { x: e.pageX, y: e.pageY }
    elements.cursor.classList[isArtboard ? 'add' : 'remove']('highlight')
    styleTarget({
      target: elements.cursor,
      x: pos.x + (2 * gridWidth),
      y: pos.y + (2 * gridWidth) + window.scrollY,
      w: cellD - gridWidth,
      h: cellD - gridWidth,
    })
  })

  const query = window.location.hash
  if (query){
    const queryArray = query.split('#')
    input.column.value = queryArray[1] || 10
    input.row.value = queryArray[2] || 10
    input.cellD.value = queryArray[3] || 20

    Object.assign(artData, {
      column: +input.column.value, row: +input.row.value, cellD: +input.cellD.value
    })
  }
  
  resetCodes()
  resize()
  paintCanvas()
  recordState()
  
  // window.addEventListener('mousemove', e =>{
  //   const { cellD, column } = artData
  //   const { x, y } = drawPos(e, cellD)
  //   const index = ((y / cellD - 1) * column) + x / cellD - 1
  //   input.svg.value = `index:${index} / x:${(x - cellD) / cellD + 1} / y:${(y - cellD) / cellD + 1} / ${x} | ${y} `
  // })
  elements.alts.forEach(button=>{
    mouse.enter(button, 'add', e => {
      elements.cursor.childNodes[0].innerHTML = e.target.dataset.alt
    })
    mouse.leave(button, 'add', () => {
      elements.cursor.childNodes[0].innerHTML = ''
    })
  })

  window.addEventListener('keydown', e=> {
    if (e.key === 'e') {
      console.log(artData)
    }
  })
}

window.addEventListener('DOMContentLoaded', init)
