#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const meow = require('meow')
const fetch = require('node-fetch')



const cli = meow(`
    Usage
      $ gallica --url "https://gallica.bnf.fr/downloadIIIF/ark:/.../native.jpg" --save ./image.jpg
 
    Options
      --url,    -u, the URL of the BNF Gallica image selection
      --save,   -s, the local path to save the image
      --factor, -f, the scaling factor (default: 1)
`, {
  flags: {
    url: {
        type: 'string',
        alias: 'u',
        isMultiple: false,
        isRequired: true
    },
    save: {
      type: 'string',
      alias: 's',
      default: 'image.jpg',
      isMultiple: false,
      isRequired: false
    },
    
    factor: {
      type: 'number',
      alias: 'f',
      default: 1,
      isMultiple: false,
      isRequired: false
    },
  }
})



async function main() {
  const url = cli.flags.url
  const outputPath = cli.flags.save
  const scalingFactor = cli.flags.factor

  const UrlElem = url.split('/')
  const boundingBoxParamStr = UrlElem[8]
  const sizeParamStr = UrlElem[9]

  // https://gallica.bnf.fr/downloadIIIF/ark:/12148/btv1b53027777x/f1/4349.686821359518,21078.158853617173,373.31317864048196,480.841146382827/374,481/0/native.jpg?download=1

  const boundingBox = boundingBoxParamStr.split(',').map((val) => parseFloat(val))
  const width = Math.round(boundingBox[0] + boundingBox[2])
  const height = Math.round(boundingBox[1] + boundingBox[3])

  const newBoundingBoxParamStr = `0,0,${width - 1},${height - 1}`
  const newSizeParamStr = `${width * scalingFactor},${height * scalingFactor}`

  UrlElem[8] = newBoundingBoxParamStr
  UrlElem[9] = newSizeParamStr

  const finalUrl = UrlElem.join('/')

  console.log('Download in progress...')

  fetch(finalUrl)
    .then( (res) => {
      const dest = fs.createWriteStream(outputPath)
      res.body.pipe(dest)
    })
  
}

main()