const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { embedColor, sendMessage } = require('../functions/sendMessage');
const { getServerStatus } = require('../functions/getServerStatus');
const { findServer, findDefaultServer } = require('../functions/findServer');
const { noMonitoredServers, isValidServer } = require('../functions/inputValidation');
const { logWarning } = require('../functions/consoleLogging');

const data = new SlashCommandBuilder()
	.setName('status')
	.setDescription('Displays the current status and active players for any server')
	.addStringOption((option) => option.setName('server').setDescription('Server IP address or nickname').setRequired(false));

async function execute(interaction) {
	let serverIp;

	if (interaction.options.getString('server')) {
		let server = await findServer(interaction.options.getString('server'), ['nickname'], interaction.guildId);
		serverIp = server ? server.ip : interaction.options.getString('server');
	} else {
		if (await noMonitoredServers(interaction.guildId, interaction, true)) return;
		let server = await findDefaultServer(interaction.guildId);
		serverIp = server.ip;
	}

	// Validate the server IP
	if (!(await isValidServer(serverIp, interaction))) return;

	//Get the server status
	let serverStatus;
	try {
		serverStatus = await getServerStatus(serverIp);
	} catch (error) {
		logWarning('Error pinging Minecraft server while running status command', {
			'Guild ID': interaction.guildId,
			'Server IP': serverIp,
			Error: serverStatus.error || error
		});
		await sendMessage(interaction, 'The server could not be pinged!');
		return;
	}

	// Message if server is offline
	if (!serverStatus.online) {
		await sendMessage(interaction, `*The server is offline!*`, `Status for ${serverIp}:`);
		return;
	}

	// Message if server is online
	message = `**${serverStatus.players.online}/${serverStatus.players.max}** players online.`;

	const responseEmbed = new EmbedBuilder()
		.setTitle(`Status for ${serverIp}:`)
		.setColor(embedColor)
		.setDescription(message)
		.addFields({ name: 'MOTD:', value: serverStatus.motd.clean }, { name: 'Server version:', value: serverStatus.version.name_clean })
		.setThumbnail(`https://api.mcsrvstat.us/icon/${serverIp}`)
		.setTimestamp();

	await interaction.editReply({ embeds: [responseEmbed], ephemeral: true });
}

module.exports = { data, execute };
