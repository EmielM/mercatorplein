import Entity from './Entity';
import {haSend} from './main';

export default class MusicController {
	entityId: string;
	player: Entity<{isPlaying: boolean; volumeLevel: number}>;
	playlists: string[];

	currentPlaylistIndex: undefined | number;

	// If not passing playlists, only to change volume
	constructor(entityId: string, playlists: string[] = []) {
		this.entityId = entityId;
		this.player = new Entity(entityId, (playingState, attrs) => ({
			isPlaying: playingState === 'playing',
			volumeLevel: parseFloat(attrs.volume_level) || 0.0,
		}));
		this.playlists = playlists;
	}

	isOn() {
		const playerState = this.player.value;
		if (!playerState) {
			return false;
		}
		return playerState.isPlaying && playerState.volumeLevel > 0;
	}

	on() {
		if (this.playlists.length > 0) {
			this.currentPlaylistIndex = 0;
			playMusic(this.entityId, this.playlists[0]);
		}
	}

	off() {
		haSend({
			type: 'call_service',
			domain: 'media_player',
			service: 'media_pause',
			service_data: {
				entity_id: this.entityId,
			},
		});
	}

	nextScene() {
		if (this.playlists.length > 0) {
			this.currentPlaylistIndex = ((this.currentPlaylistIndex ?? -1) + 1) % this.playlists.length;
			playMusic(this.entityId, this.playlists[this.currentPlaylistIndex]);
		}
	}

	dim(step: number) {
		const currentVolumeLevel = this.player.value?.volumeLevel;
		if (currentVolumeLevel === undefined) {
			console.log(`${this.entityId} current volume unknown`);
			return;
		}
		const newVolumeLevel = Math.max(0, Math.min(1, currentVolumeLevel + step));
		console.log(`${this.entityId} dim volume ${currentVolumeLevel} > ${newVolumeLevel}`);
		haSend({
			type: 'call_service',
			domain: 'media_player',
			service: 'volume_set',
			service_data: {
				entity_id: this.entityId,
				volume_level: newVolumeLevel,
			},
		});
	}
}

async function playMusic(entityId: string, mediaContentId: string) {
	let mediaContentType = 'audio/acc';
	if (mediaContentId.startsWith('spotify://')) {
		mediaContentType = 'spotify://playlist';
	}
	await haSend({
		type: 'call_service',
		domain: 'media_player',
		service: 'play_media',
		service_data: {
			entity_id: entityId,
			media_content_id: mediaContentId,
			media_content_type: mediaContentType,
		},
	});
}
