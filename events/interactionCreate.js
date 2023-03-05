module.exports = {
	name: 'interactionCreate',
	once: false,
	async execute(interaction, client) {
		if (!interaction.isChatInputCommand()) return;

		const command = await client.commands.get(interaction.commandName);

		if (!command) return;

        try {
    		await interaction.deferReply({ ephemeral: true });
			try {
				await command.execute(interaction);
			} catch (error) {
                let commandOptions = [];
                for (option of interaction.options.data) {
                    const filteredData = ['name', 'value'];
                    let filteredOption = Object.keys(option)
                    .filter(data => filteredData.includes(data))
                    .reduce((obj, key) => {
                        obj[key] = option[key];
                        return obj;
                    }, {});
                    commandOptions.push(filteredOption);
                }
                console.warn(
                    `Error executing command
                        Guild ID: ${interaction.guildId}
                        Command: /${interaction.commandName}
                        Command Options: ${JSON.stringify(commandOptions) || 'None'}`
                );

				await interaction.editReply({
					content: 'There was an error while executing this command!',
					ephemeral: true
				});
			}
		} catch {
            console.warn(
                `Error deferring reply to command
                    Guild ID: ${interaction.guildId}
                    Command: /${interaction.commandName}`
            );

			await interaction.reply({
				content: 'There was an error while executing this command!',
				ephemeral: true
			});
		}
	}
};
