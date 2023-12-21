'use strict';
import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { logWarning } from '../functions/consoleLogging.js';
import { findDefaultServer, findServer } from '../functions/findServer.js';
import { getServerStatus } from '../functions/getServerStatus.js';
import { isValidServer, noMonitoredServers } from '../functions/inputValidation.js';
import { embedColor, sendMessage } from '../functions/sendMessage.js';

// prettier-ignore
export const data = new SlashCommandBuilder()
	.setName('status')
	.setDescription('Displays the current status and active players for any server')
	.addStringOption((option) => option
		.setName('server')
		.setDescription('Server IP address or nickname')
		.setRequired(false))
	.addStringOption((option) => option
		.setName('platform')
		.setDescription('Server platform')
		.setRequired(false)
		.setChoices({ name: 'Java', value: 'java' }, { name: 'Bedrock', value: 'bedrock' }));

export async function execute(interaction) {
	let server;

	if (interaction.options.getString('server')) {
		server = await findServer(interaction.options.getString('server'), ['nickname', 'ip'], interaction.guildId);
		if (!server) {
			server = {
				ip: interaction.options.getString('server'),
				platform: interaction.options.getString('platform') || 'java'
			};
		}
	} else {
		if (await noMonitoredServers(interaction.guildId, interaction, true)) return;
		server = await findDefaultServer(interaction.guildId);
	}

	// Validate the server IP
	if (!(await isValidServer(server.ip, interaction))) return;

	//Get the server status
	let serverStatus;
	try {
		serverStatus = await getServerStatus(server);
	} catch (error) {
		logWarning('Error pinging Minecraft server while running status command', {
			'Guild ID': interaction.guildId,
			'Server IP': server.ip,
			Error: serverStatus.error || error
		});
		await sendMessage(interaction, 'There was an error pinging the server. Please try again in a few seconds!');
		return;
	}

	// Message if server is offline
	if (!serverStatus.online) {
		await sendMessage(interaction, `*The server is offline!*`, `Status for ${server.ip}:`);
		return;
	}

	// Message if server is online
	let message;
	if (!serverStatus.players.online) {
		message = `*No one is playing!*`;
	} else {
		let playerList = serverStatus.players.list?.map((player) => player.name_clean) || [];

		message = `**${serverStatus.players.online || 0}/${serverStatus.players.max}** player(s) online.`;
		if (playerList.length) message += `\n\n ${playerList.sort().join(', ')}`;
	}

	const responseEmbed = new EmbedBuilder()
		.setTitle(`Status for ${server.ip}:`)
		.setColor(embedColor)
		.setDescription(message)
		.addFields(
			{ name: 'MOTD:', value: serverStatus.motd.clean || 'None' },
			{ name: 'Server version:', value: serverStatus.version.name || 'Not specified', inline: true },
			{ name: 'Latency:', value: serverStatus.latency, inline: true }
		);

	// Set thumbnail to server icon
	let files = [];
	if (serverStatus.icon) {
		let iconBuffer = new Buffer.from(serverStatus.icon.split(',')[1], 'base64');
		files.push(new AttachmentBuilder(iconBuffer, { name: 'icon.jpg' }));
		responseEmbed.setThumbnail('attachment://icon.jpg');
	}

	await interaction.editReply({ embeds: [responseEmbed], files, ephemeral: true });
}
