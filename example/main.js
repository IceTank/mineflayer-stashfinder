const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalFollow } = require('mineflayer-pathfinder').goals
const { stashFinder } = require('../index')

bot = mineflayer.createBot({ username: 'Player' })

bot.loadPlugins([pathfinder, stashFinder])

bot.once('spawn', () => {
  const mcData = require('minecraft-data')(bot.version)

  const defaultMove = new Movements(bot, mcData)
  bot.pathfinder.setMovements(defaultMove)

  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    let target = bot.players[username] ? bot.players[username].entity : null
    if (!target) return bot.chat("I can't see you")
    if (message === 'follow') {
      bot.pathfinder.setGoal(new GoalFollow(target, 2), true)
    } else if (message === 'stop') {
      bot.pathfinder.setGoal(null)
    }
  })

  console.log('Bot spawned!')
})
