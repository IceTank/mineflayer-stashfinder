const vec3 = require('vec3')
const fs = require('fs')

function inject(bot) {
	bot.stashFinder = {}
	bot.stashFinder.isActive = true
	bot.stashFinder.chestThreshold = 6
	bot.stashFinder.logToFile = true

	let currentFileName = bot.username ? bot.username : 'bot' + '_' + new Date().getTime() + '.txt'
	let mcData = require('minecraft-data')(bot.version)

	const storageBlocks = [
		mcData.blocksByName["chest"].id,
		mcData.blocksByName["trapped_chest"].id,
		mcData.blocksByName["dispenser"].id,
		mcData.blocksByName["dropper"].id,
		mcData.blocksByName["hopper"].id,
	]

	bot.stashFinder._search = (data) => {
		if (bot.stashFinder.isActive) {
			sleep().then(_ => {
				bot.stashFinder.searchChunkForStorageBlocks(data)
			})
		}
	}

	bot.on('chunkColumnLoad', bot.stashFinder._search)

	bot.stashFinder._isStorage = function(paletteId) {
		let id = paletteId >> 4
		return storageBlocks.includes(id)
	}

	bot.stashFinder._paletteIncludesOtherStorage = function(palette) {
		for (let i = 0; i < palette.length; i++) {
			if (bot.stashFinder._isStorage(palette[i])) return true
		}
		return false
	}

	bot.stashFinder._paletteIncludesShulker = function(palette) {
		for (let i = 0; i < palette.length; i++) {
			let id = palette[i] >> 4
			if (id >= mcData.blocksByName['white_shulker_box'].id && id <= mcData.blocksByName['black_shulker_box'].id) {
				return true
			}
		}
		return false
	}

	bot.stashFinder.toggle = () => {
		bot.stashFinder.isActive = !bot.stashFinder.isActive
	}

	bot.stashFinder.searchChunkForStorageBlocks = function(columnCorner) {
		//Look through loaded newly loaded chunks to find Shulkers and Chests
		//Get Chunk Column at x y pos
		if (!bot.stashFinder.isActive) return
		const storageThreshold = bot.stashFinder.chestThreshold // we don't want to find every dungeon chest out there
		let chunk
		try {
			chunk = bot.world.getColumnAt(columnCorner)
		} catch (e) {
			console.log('Error: Chunks checking failed', JSON.stringify(columnCorner))
			console.log(e)
			return
		}
		let foundBlocks = 0
		let foundShulker = false
		let foundStorage = false
		if (chunk && !chunk.sections) {
			console.log('Warning: Chunk has no sections ' + JSON.stringify(columnCorner))
			return
		}
		chunkSearch:
		for (let i = 0; i < chunk.sections.length; i++) {
			//Chunk section will be sky most of the time so dont check it
			if ((chunk.sections[i] === null) || chunk.sections[i].isEmpty()) continue
			//Some chunk section dont have a pallet(?)
			if (!chunk.sections[i].palette) {
				console.log(`Warning: Chunk ${columnCorner.x} ${columnCorner.z} does not have a palette`)
				continue
			}
			//Search for Shulker boxes
			if (bot.stashFinder._paletteIncludesShulker(chunk.sections[i].palette)) {
				foundShulker = true
				break
			}
			//search for other Storage
			if (bot.stashFinder._paletteIncludesOtherStorage(chunk.sections[i].palette)) {
				//Skip this part if we already found enough storage blocks
				if (foundStorage) continue
				//Go through all blocks and sum up all found storage blocks .
				//We dont want to trigger a find for every dungeon chest out there.
				for (let y = 0; y < 16; y++) {
					for (let z = 0; z < 16; z++) {
						for (let x = 0; x < 16; x++) {
							const blockId = chunk.sections[i].getBlock(vec3(x, y, z));
							if (bot.stashFinder._isStorage(blockId)) {
								foundBlocks++
								if (foundBlocks > storageThreshold) {
									foundStorage = true
									break chunkSearch
								}
							}
						}
					}
				}
			}
		}
		if (foundShulker) {
			let text = `Found Chunk with Shulker Box at x:${columnCorner.x} z:${columnCorner.z}`
			console.log(text)
			if (bot.stashFinder.logToFile) {
				logToFile(currentFileName, text)
			}
		} else if (foundStorage) {
			let text = `Found more then ${storageThreshold} Storage Blocks at x:${columnCorner.x} z:${columnCorner.z}`
			console.log(text)
			if (bot.stashFinder.logToFile) {
				logToFile(currentFileName, text)
			}
		}
	}
}

function logToFile(file, data) {
	const logFolder = __dirname + '/stashLog'
	fs.access(logFolder, (err) => {
		if (err) {
			try {
				fs.mkdirSync(logFolder)
			} catch (e) {
				// return console.error(e)
			}
		}
		fs.appendFile(logFolder + '/' + file, data, (err) => {
			if (err) console.error('Error writing file', file, err)
		})
	})
}

function sleep(ms) {
	return new Promise(r => {setTimeout(r, ms ? ms : 0)})
}

module.exports = {
	stashFinder: inject
}