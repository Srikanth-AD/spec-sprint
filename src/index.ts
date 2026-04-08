import { Command } from 'commander'
import { registerGenerate } from './commands/generate.js'
import { VERSION } from './lib/config.js'

const program = new Command()

program
  .name('spec-sprint')
  .description(
    'Turn a product spec into sprint-ready engineering tickets with capacity planning.'
  )
  .version(VERSION)

registerGenerate(program)

program.parseAsync(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
