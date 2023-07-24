const axios = require('axios')
const fs = require('fs')
const path = require('path')

const brainDir = process.env.BRAIN_DIR || '../../Brain/B02'
const brainJsonDir = process.env.BRAIN_JSON_DIR ? process.env.BRAIN_JSON_DIR : path.join(brainDir, '../db') // ex '../Brain/db'

let nodes = require(path.join(brainJsonDir, 'thoughts.json'))

nodes = nodes.filter(node => node.ForgottenDateTime === null)
nodes = nodes.filter(node => node.Kind === 1) // Kind.Normal == 1
nodes = nodes.filter(node => node.ACType === 0) // Public == 0

let names = nodes.map(node => node.Name) // we only need names
names = [...new Set(names)] // remove dupes
// sort by name
names = names.sort((a, b) => a.toUpperCase() < b.toUpperCase() ? -1 : 1)

let wikiLinks = {} // read old .tsv if exists
if (fs.existsSync('wiki-links.tsv')) {
  fs.readFileSync('wiki-links.tsv', 'utf8').split('\n').forEach(line => {
    const [name, link] = line.split('\t')
    wikiLinks[name] = link
  })
}

names.forEach(name => { wikiLinks[name] = wikiLinks[name] || '' }) // add missing names
// remove names that are not in nodes anymore?
// Object.keys(wikiLinks).forEach(name => { if (!names.includes(name)) delete wikiLinks[name] })

// search wiki api, example: https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=marc+Twain&limit=1 for link
function getWikiLink (name) {
  const wikiApi = 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search='
  const wikiLimit = '&limit=1'
  return new Promise((resolve, reject) => {
    axios.get(wikiApi + name + wikiLimit)
      .then(response => {
        const link = response.data[3][0] || ''
        resolve(link)
      })
      .catch(error => {
        console.log(error)
        reject(error)
      })
  })
}

async function fetchWikiLinks () {
  let fetched = 0
  //iterate over wikiLinks  
  for (const name in wikiLinks) {
    if (wikiLinks[name] === '') {
      const link = await getWikiLink(name)
      wikiLinks[name] = link
      fetched++
      console.log(fetched, name, link)
    }
    if (fetched > 3) break // limit to 3 for now (to avoid getting blocked
  }

  fs.writeFileSync('wiki-links.tsv', wikiLinks.map(name => [name, wikiLinks[name]].join('\t')).join('\n'))
}

fetchWikiLinks()