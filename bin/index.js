#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const meow = require('meow')
const fetch = require('node-fetch')
const xmlJs = require('xml-js');


const cli = meow(`
    Usage
      $ gallica --ark btv1b530231437 --save ./image.jpg
 
    Options
      --ark,    -a, the ARK ID of the document
      --save,   -s, the local path to save the image
`, {
  flags: {
    ark: {
        type: 'string',
        alias: 'a',
        isMultiple: false,
        isRequired: true
    },
    save: {
      type: 'string',
      alias: 's',
      default: 'image.jpg',
      isMultiple: false,
      isRequired: true
    },
  }
})



async function main() {
  const ark = cli.flags.ark
  const outputPath = cli.flags.save

  // fetching pagination info
  const paginationRes = await fetch(`https://gallica.bnf.fr/services/Pagination?ark=${ark}`)
  const paginationXml = await paginationRes.text()
  const pagination = JSON.parse(xmlJs.xml2json(paginationXml, {compact: true, spaces: 2}))

  const pagesInfo = pagination.livre.pages.page.map((p) => {
    return {
      id: p.ordre._text,
      width: parseInt(p.image_width._text),
      height: parseInt(p.image_height._text),
    }
  })
    
  // fetching metadata
  const metadataRes = await fetch(`https://gallica.bnf.fr/services/OAIRecord?ark=${ark}`)
  const metadataXml = await metadataRes.text()
  const metadata = JSON.parse(xmlJs.xml2json(metadataXml, {compact: true, spaces: 2}))
  
  const mapMetadata = {
    title: metadata.results.notice.record.metadata['oai_dc:dc']['dc:title']._text,
    date: metadata.results.notice.record.metadata['oai_dc:dc']['dc:date']._text,
    description: metadata.results.notice.record.metadata['oai_dc:dc']['dc:description']._text,
    authors: metadata.results.notice.record.metadata['oai_dc:dc']['dc:creator'].map((c) => c._text)
  }

  // writing meta on disk as a json file
  let metaFilepathEl = outputPath.split('.')
  metaFilepathEl[metaFilepathEl.length - 1] = 'json'
  let metaFilepath = metaFilepathEl.join('.')
  fs.writeFileSync(metaFilepath, JSON.stringify(mapMetadata, null, 2))

  // fetching map images
  for (let i = 0; i < pagesInfo.length; i += 1) {
    const pos = outputPath.lastIndexOf('.');
    const iThFile = `${outputPath.substring(0,pos)}.${i}.${outputPath.substring(pos+1)}`
    const url = `https://gallica.bnf.fr/downloadIIIF/ark:/12148/${ark}/f${pagesInfo[i].id}/0,0,${pagesInfo[i].width - 1},${pagesInfo[i].height - 1}/${pagesInfo[i].width},${pagesInfo[i].height}/0/native.jpg?download=1`
    
    console.log('Fetching file ', i+1, '/', pagesInfo.length, ' ...')
    console.log('as', iThFile)
    fetch(url)
      .then( (res) => {
        const dest = fs.createWriteStream(iThFile)
        res.body.pipe(dest)
      }) 
  }
  
}

main()