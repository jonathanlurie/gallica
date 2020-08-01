
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const xmlJs = require('xml-js')


async function fetchDocument(ark, outputPath) {
  // fetching pagination info
  const paginationRes = await fetch(`https://gallica.bnf.fr/services/Pagination?ark=${ark}`)
  const paginationXml = await paginationRes.text()
  const pagination = JSON.parse(xmlJs.xml2json(paginationXml, {compact: true, spaces: 2}))

  // fixing json-ld playing smart with Objects/Array
  if (!Array.isArray(pagination.livre.pages.page)) {
    pagination.livre.pages.page = [pagination.livre.pages.page]
  }

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
  
  
  const docMetadata = {pagesInfo}

  if (metadata.results.notice.record.metadata['oai_dc:dc']['dc:title']._text) {
    docMetadata.title = metadata.results.notice.record.metadata['oai_dc:dc']['dc:title']._text
  }

  if (metadata.results.notice.record.metadata['oai_dc:dc']['dc:date']._text) {
    docMetadata.date = metadata.results.notice.record.metadata['oai_dc:dc']['dc:date']._text
  }

  if (metadata.results.notice.record.metadata['oai_dc:dc']['dc:description']._text) {
    docMetadata.description = metadata.results.notice.record.metadata['oai_dc:dc']['dc:description']._text
  }
  
  if (metadata.results.notice.record.metadata['oai_dc:dc']['dc:creator']) {
    // fixing json-ld playing smart with Objects/Array
    if (! Array.isArray(metadata.results.notice.record.metadata['oai_dc:dc']['dc:creator'])) {
      metadata.results.notice.record.metadata['oai_dc:dc']['dc:creator'] = [metadata.results.notice.record.metadata['oai_dc:dc']['dc:creator']]
    }
    
    docMetadata.author = metadata.results.notice.record.metadata['oai_dc:dc']['dc:creator'].map((c) => c._text)
  }

  

  let downloadsDone = 0

  // fetching doc images
  for (let i = 0; i < pagesInfo.length; i += 1) {
    const pos = outputPath.lastIndexOf('.');
    const iThFile = `${outputPath.substring(0,pos)}.${i}.${outputPath.substring(pos+1)}`
    const url = `https://gallica.bnf.fr/downloadIIIF/ark:/12148/${ark}/f${pagesInfo[i].id}/0,0,${pagesInfo[i].width - 1},${pagesInfo[i].height - 1}/${pagesInfo[i].width},${pagesInfo[i].height}/0/native.jpg?download=1`
    
    try {
      const res = await fetch(url)
      const byteLength = parseInt(res.headers.get('content-length'))      
      const sizeMB = Math.round((byteLength / 2**20) * 100) / 100
      pagesInfo[i].byteLength = byteLength

      console.log(`Fetching file ${i+1}/${pagesInfo.length} ... (${sizeMB}MB, ${pagesInfo[i].width}x${pagesInfo[i].height}px )`)
      console.log('as', iThFile)

      // pipe version
      const writeStream = fs.createWriteStream(iThFile)
      res.body.pipe(writeStream)
      writeStream.on('finish', (evt) => {
        downloadsDone += 1
        console.log(`✅ ${downloadsDone}/${pagesInfo.length} downloads done.`)
      })
    } catch(err) {
      console.log('❌ ', err.message)
    }
  }

  // writing meta on disk as a json file
  let metaFilepathEl = outputPath.split('.')
  metaFilepathEl[metaFilepathEl.length - 1] = 'json'
  let metaFilepath = metaFilepathEl.join('.')
  fs.writeFileSync(metaFilepath, JSON.stringify(docMetadata, null, 2)) 
}

module.exports = fetchDocument