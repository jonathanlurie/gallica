#!/usr/bin/env node

const meow = require('meow')
const fetchDocument = require('..')

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




fetchDocument(cli.flags.ark, cli.flags.save)