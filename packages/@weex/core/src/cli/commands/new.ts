export default {
  name: 'new',
  alias: ['n'],
  description: 'Creates a new cli',
  hidden: false,
  run: async toolbox => {
    const {
      parameters,
      template: { generate },
      filesystem,
      logger,
      strings,
      system,
    } = toolbox
    const { kebabCase } = strings

    const props = {
      name: parameters.first,
      typescript: parameters.options.typescript,
      extension: parameters.options.typescript ? 'ts' : 'js',
    }

    if (!props.name || props.name.length === 0) {
      logger.error('You must provide a valid CLI name.')
      logger.error('Example: weex new foo')
      return undefined
    } else if (!/^[a-z0-9-]+$/.test(props.name)) {
      const validName = kebabCase(props.name)
      logger.error(`${props.name} is not a valid name. Use lower-case and dashes only.`)
      logger.error(`Suggested: gluegun new ${validName}`)
      return undefined
    }

    await filesystem.dir(props.name)

    let active = []

    // executable is treated specially
    active.push(
      generate({
        template: `cli/bin/cli-executable.ejs`,
        target: `./${props.name}/bin/${props.name}`,
        props,
      }),
    )

    const files = [
      'docs/commands.md.ejs',
      'docs/plugins.md.ejs',
      'src/commands/generate.js.ejs',
      'src/commands/default.js.ejs',
      'src/extensions/cli-extension.js.ejs',
      'src/templates/model.js.ejs.ejs',
      'src/cli.js.ejs',
      'LICENSE.ejs',
      '.prettierrc.ejs',
      'package.json.ejs',
      'readme.md.ejs',
      '.gitignore.ejs',
    ]

    if (props.typescript) {
      files.push('tsconfig.json.ejs')
    }

    active = files.reduce((prev, file) => {
      const template = `cli/${file}`

      const target =
        `${props.name}/` +
        (props.typescript && file.includes('.js.ejs') ? file.replace('.js.ejs', '.ts') : file.replace('.ejs', ''))

      const gen = generate({ template, target, props })
      return prev.concat([gen])
    }, active)

    // let all generator calls run in parallel
    await Promise.all(active)

    // make bin executable
    filesystem.chmodSync(`${props.name}/bin/${props.name}`, '755')

    // rename default.js to project name
    const ext = props.typescript ? 'ts' : 'js'
    filesystem.rename(`${props.name}/src/commands/default.${ext}`, `${props.name}.${ext}`)

    await system.spawn(`cd ${props.name} && npm install --quiet && npm run --quiet format`, {
      shell: true,
      stdio: 'inherit',
      stderr: 'inherit',
    })

    logger.info(`Generated ${props.name} CLI.`)
    logger.info(``)
    logger.info(`Next:`)
    logger.info(`  $ cd ${props.name}`)
    logger.info(`  $ npm link`)
    logger.info(`  $ ${props.name}`)
    logger.info(``)

    // for tests
    return `new ${toolbox.parameters.first}`
  },
}