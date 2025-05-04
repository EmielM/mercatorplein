import HueTapDial from './HueTapDial';
import {haSend} from './main';

const devHome = {
	dimmer: new HueTapDial('00:17:88:01:0e:91:fa:cd'),
};

function updateVolume(entityId: string, type: 'up' | 'down') {
	console.log('!!', type);
	haSend({
		type: 'call_service',
		domain: 'media_player',
		service: type === 'up' ? 'volume_up' : 'volume_down',
		service_data: {
			entity_id: entityId,
		},
	});
}

devHome.dimmer.onSceneSelect((scene) => {
	console.log('scene!', scene);
});

devHome.dimmer.onRotate((step) => {
	const absoluteStep = step < 0 ? -step : step;
	const type = step < 0 ? 'down' : 'up';

	if (absoluteStep > 0) {
		updateVolume('media_player.living_room_kitchen_music', type);
		if (absoluteStep > 25) {
			updateVolume('media_player.living_room_kitchen_music', type);
			if (absoluteStep > 50) {
				updateVolume('media_player.living_room_kitchen_music', type);
			}
		}
	}
});

export default devHome;
