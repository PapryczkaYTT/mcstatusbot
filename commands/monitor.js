const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const updateChannels = require('../functions/updateChannels');
const sendMessage = require('../functions/sendMessage');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('monitor')
		.setDescription('Create a channel category and 2 voice channels that display the status of a Minecraft server')
		.addStringOption((option) => option.setName('ip').setDescription('IP address').setRequired(true))
		.addStringOption((option) => option.setName('nickname').setDescription('Server nickname').setRequired(false)),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		// Check if the member has the administrator permission
		if (!interaction.memberPermissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
			await sendMessage.newBasicMessage(interaction, 'You must have the administrator permission to use this command!');
			return;
		}

		// Check if the bot has the manage roles permission
		if (!interaction.guild.roles.botRoleFor(interaction.client.user).permissions.has(Discord.PermissionsBitField.Flags.ManageRoles)) {
			await sendMessage.newBasicMessage(interaction, 'This bot needs the "manage roles" permission in order to create channels!');
			return;
		}

		// Check if the server is already being monitored
		let monitoredServers = (await serverDB.get(interaction.guildId)) || [];
		let serverIndex = await monitoredServers.findIndex((server) => server.ip == interaction.options.getString('ip'));
		if (serverIndex != -1) {
			await sendMessage.newBasicMessage(interaction, 'This server is already being monitored!');
			return;
		}

		// Check if the nickname is already being used
		nicknameIndex = await monitoredServers.findIndex((server) => server.nickname == interaction.options.getString('nickname'));
		if (interaction.options.getString('nickname') && nicknameIndex != -1) {
			await sendMessage.newBasicMessage(interaction, 'This nickname is already being used!');
			return;
		}

		// Create the server object
		let newServer = {
			ip: interaction.options.getString('ip'),
			nickname: interaction.options.getString('nickname') || null
		};

		// Create the server category
		await interaction.guild.channels
			.create({
				name: interaction.options.getString('nickname') || interaction.options.getString('ip'),
				type: Discord.ChannelType.GuildCategory,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.botRoleFor(interaction.client.user),
						allow: [Discord.PermissionsBitField.Flags.ViewChannel, Discord.PermissionsBitField.Flags.ManageChannels, Discord.PermissionsBitField.Flags.Connect]
					},
					{
						id: interaction.guild.roles.everyone,
						deny: [Discord.PermissionsBitField.Flags.Connect]
					}
				]
			})
			.then((channel) => {
				newServer.categoryId = channel.id;
			});

		// Create the channels and add to category
		await interaction.guild.channels
			.create({
				name: 'Status: Updating...',
				type: Discord.ChannelType.GuildVoice
			})
			.then(async function (channel) {
				await channel.setParent(newServer.categoryId);
				newServer.statusId = channel.id;
			});

		await interaction.guild.channels
			.create({
				name: 'Players: Updating...',
				type: Discord.ChannelType.GuildVoice
			})
			.then(async function (channel) {
				await channel.setParent(newServer.categoryId);
				newServer.playersId = channel.id;
			});

		await monitoredServers.push(newServer);
		await serverDB.set(interaction.guildId, monitoredServers);

		await updateChannels.execute(newServer);

		await sendMessage.newBasicMessage(interaction, 'The channels have been created successfully.');
	}
};
