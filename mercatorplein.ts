import MarmitekButton from './MarmitekButton';
import Cover from './Cover';
import Light, {lights} from './Light';
import MotionSensor from './MotionSensor';
import Outlet from './Outlet';
import SceneController from './SceneController';
import {IkeaButton} from './IkeaButton';
import {haSend} from './main';
import Observable from './Observable';
import Entity from './Entity';
import HueTapDial from './HueTapDial';

process.env.TZ = 'Europe/Amsterdam';

const livingRoom = {
	curvedWallButton: new HueTapDial('00:17:88:01:0e:91:fa:cd'),
	boekenkastLights: new Light('58:8e:81:ff:fe:ad:f3:14'),
	tvSpot: new Light('68:0a:e2:ff:fe:c3:f5:45'),
	artSpot: new Light('58:8e:81:ff:fe:41:12:2a'),
	deskLamp: new Light('ec:1b:bd:ff:fe:31:74:04'),
};
const kitchen = {
	counterButton: new IkeaButton('bc:33:ac:ff:fe:0d:28:f6'),
	counterStrip: new Light('00:17:88:01:0b:4a:33:42'),
	tableLights: new Light('ec:1b:bd:ff:fe:ad:19:65'),
};
const hall = {
	entrySensor: new MotionSensor('8c:65:a3:ff:fe:3e:34:18'),
	bulb1: new Light('04:87:27:ff:fe:8f:dd:fb'),
	bulb2: new Light('04:87:27:ff:fe:8f:d8:d6'),
};
const bedRoom = {
	curtain: new Cover('cover.slide_bedroom'),
	antiMusquito: new Outlet('34:10:f4:ff:fe:8b:23:05'),
	buttonEmiel: new MarmitekButton('5c:02:72:ff:fe:0a:5f:e5'),
	buttonGhis: new MarmitekButton('5c:02:72:ff:fe:0a:5f:ef'),
};
const office = {
	button: new IkeaButton('84:2e:14:ff:fe:8c:3d:c1'),
	deskPower: new Outlet('28:db:a7:ff:fe:5f:d9:d7'),
};
const bathroom = {
	musicController: new HueTapDial('00:17:88:01:0e:91:9f:19'),
	// 5 minutes native, 10 minutes grace
	motionSensor: new MotionSensor('ec:f6:4c:ff:fe:29:cf:49', 600),
	spots: [
		new Light('00:17:88:01:0e:65:b3:46'),
		new Light('00:17:88:01:0e:65:a8:b7'),
		new Light('00:17:88:01:0e:65:a9:9f'),
		new Light('00:17:88:01:0d:e6:25:b9'),
	],
};

// Unused
// - new MarmitekButton('5c:02:72:ff:fe:05:0c:27'),

// Not part of kitchen, so we are not included with lights(all)
const rockyHatch = new Light('00:12:4b:00:24:6f:37:60');
const rockyRunning = new Entity('sensor.roborock_s8_maxv_ultra_status', (value) => {
	console.log('rocky status=', value);
	if (!value) {
		return false;
	}
	return !['charging', 'emptying_the_bin', 'unavailable'].includes(value);
});

const homePresence = {
	emiel: new Entity('device_tracker.emiels_iphone', (value) => (value === 'unknown' ? undefined : value === 'home')),
	ghislaine: new Entity('device_tracker.iphone_ghislaine', (value) =>
		value === 'unknown' ? undefined : value === 'home'
	),
};

const brightness = new Entity('sensor.ikea_of_sweden_vallhorn_wireless_motion_sensor_illuminance', (haState) =>
	parseFloat(haState)
);

function isDark() {
	return brightness.value !== undefined && brightness.value < 500;
}

const allLights = lights({kitchen, livingRoom, bedRoom, hall, office});

// Called everybodyAway (and not someoneHome), because if we don't know due to missing sensor data,
// we assume at home
const everybodyAway = new Observable<boolean>();
function onPresenceChange() {
	everybodyAway.set(homePresence.emiel.value === false && homePresence.ghislaine.value === false);
}

homePresence.emiel.observe(onPresenceChange);
homePresence.ghislaine.observe(onPresenceChange);

// These track the iOS focus mode
// - https://github.com/home-assistant/iOS/issues/1899
// const asleep = {
// 	emiel: new Entity('binary_sensor.emiels_iphone_focus', (value) => value === 'on'),
// 	ghislaine: new Entity('binary_sensor.iphone_ghislaine_focus', (value) => value === 'on'),
// };

const livingRoomScenes = new SceneController({
	name: 'living',
	lights: [livingRoom.boekenkastLights, livingRoom.tvSpot, livingRoom.artSpot, livingRoom.deskLamp],
	targets: {
		off: [0, 0, 0, 0],
		dimmed: [0.4, {brightness: 0.4, temperature: 2500}, {brightness: 0.4, temperature: 2500}, 0.25],
		bright: [0.8, {brightness: 0.8, temperature: 2500}, {brightness: 0.8, temperature: 2500}, 0.5],
	},
});

const kitchenScenes = new SceneController({
	name: 'kitchen',
	lights: [kitchen.counterStrip, kitchen.tableLights],
	targets: {
		off: [0, 0], // off
		dimmed: [{brightness: 0.26, rgb: [255, 180, 90]}, 0.3], // dimmed / eating
		bright: [{brightness: 0.75, rgb: [255, 193, 141]}, 0.5], // bright / cooking
	},
});

livingRoom.curvedWallButton.onSceneSelect((button, isCurrentScene) => {
	if (button === 1 || button === 2) {
		if (isCurrentScene) {
			livingRoomScenes.toScene('off');
		} else {
			livingRoomScenes.toScene(button === 1 ? 'dimmed' : 'bright');
		}
	} else {
		if (isCurrentScene) {
			kitchenScenes.toScene('off');
		} else {
			kitchenScenes.toScene(button === 3 ? 'dimmed' : 'bright');
		}
	}
});

function updateVolume(entityId: string, type: 'up' | 'down') {
	haSend({
		type: 'call_service',
		domain: 'media_player',
		service: type === 'up' ? 'volume_up' : 'volume_down',
		service_data: {
			entity_id: entityId,
		},
	});
}

livingRoom.curvedWallButton.onRotate((step) => {
	const absoluteStep = step < 0 ? -step : step;
	const type = step < 0 ? 'down' : 'up';

	if (absoluteStep > 0) {
		updateVolume('media_player.living_room_kitchen_all', type);
		if (absoluteStep > 25) {
			updateVolume('media_player.living_room_kitchen_all', type);
			if (absoluteStep > 50) {
				updateVolume('media_player.living_room_kitchen_all', type);
			}
		}
	}
});

kitchen.counterButton.onPressOn(kitchenScenes.nextScene);
kitchen.counterButton.onPressOff(() => kitchenScenes.toScene('off'));

const hallLights = lights(hall);

// Curtain closed is a great proxy for someone asleep
function someoneSleeping() {
	return !bedRoom.curtain.isOpen();
}

// Someone enters (or leaves) the front door
// - TODO: somehow find a way to not trigger this when we're leaving
hall.entrySensor.onMotion(function (motion) {
	if (!motion) {
		hallLights.off();
		return;
	}

	if (someoneSleeping()) {
		// Someone sleeping: do nothing (not even dim)
		return;
	}

	hallLights.to({brightness: 0.3, temperature: 2500});

	console.debug('onMotion', isDark(), livingRoomScenes.getCurrentScene(), kitchenScenes.getCurrentScene);
	if (isDark() && livingRoomScenes.getCurrentScene() === 'off') {
		// Dimmed lights when we arrive
		livingRoomScenes.toScene('dimmed');
		kitchenScenes.toScene('dimmed');
	}
});

const tvIsOn = new Entity('media_player.lg_webos_tv_oled55c25lb', (haState) => haState === 'on');
tvIsOn.observe((isOn) => {
	if (isOn && isDark()) {
		// When TV is turned on, go into
		livingRoomScenes.toScene('dimmed');
		if (kitchenScenes.getCurrentScene() === 'bright') {
			// If kitchen lights are bright, make less bright
			kitchenScenes.toScene('dimmed');
		}
		hallLights.off();
	}
});

function toggleCurtain() {
	const isOpen = bedRoom.curtain.isOpen();
	console.log('toggleCurtain; wasOpen=', isOpen);
	if (!isOpen) {
		bedRoom.curtain.open();
		bedRoom.antiMusquito.off();
		if (isDark()) {
			livingRoomScenes.toScene('dimmed');
			kitchenScenes.toScene('dimmed');
		}
	} else {
		bedRoom.curtain.close();
		bedRoom.antiMusquito.on();
	}
}

function allAsleep() {
	bedRoom.curtain.close();
	bedRoom.antiMusquito.on();
	allLights.off();
}

bedRoom.buttonEmiel.onPress(toggleCurtain);
bedRoom.buttonGhis.onPress(toggleCurtain);
bedRoom.buttonEmiel.onDoublePress(allAsleep);
bedRoom.buttonGhis.onDoublePress(allAsleep);

office.button.onPressOn(() => office.deskPower.on());
office.button.onPressOff(() => office.deskPower.off());

// function asleepChanged(isAsleep: boolean | undefined) {
// 	// Whenever a transition from asleep to awake between 6:00 and 10:00, enable morning lights
// 	console.debug('asleepChanged', isAsleep, isBetweenHours(6, 10), isVeryLight.value);
// 	if (isAsleep === false && isBetweenHours(6, 10) && !isVeryLight.value) {
// 		livingRoomScenes.toScene(2);
// 		kitchenScenes.toScene(2);
// 	}
// }
//asleep.emiel.observe(asleepChanged);
//asleep.ghislaine.observe(asleepChanged);

everybodyAway.observe((everybodyAway) => {
	console.log(everybodyAway ? 'everybody away' : 'someone home');
	if (everybodyAway) {
		allLights.off();
	}

	haSend({
		type: 'call_service',
		domain: 'switch',
		service: everybodyAway ? 'turn_off' : 'turn_on',
		service_data: {
			entity_id: 'switch.roborock_s8_maxv_ultra_do_not_disturb',
		},
	});
});

rockyRunning.observe((isRunning) => {
	console.log('rockyRunning=', isRunning);
	// TODO: rockyHatch is reversed, update wiring
	if (isRunning) {
		rockyHatch.off();
	} else {
		rockyHatch.on();
	}
});

bathroom.motionSensor.onMotion((motion) => {
	console.log('bathroom motion? ', motion);
	if (motion) {
		// When someone sleeping, dim a little more
		lights(bathroom.spots).to({brightness: someoneSleeping() ? 0.14 : 0.28, rgb: [255, 193, 132]});
	} else {
		lights(bathroom.spots).off();
	}
});

bathroom.musicController.onRotate((step) => {
	const absoluteStep = step < 0 ? -step : step;
	const type = step < 0 ? 'down' : 'up';

	if (absoluteStep > 0) {
		updateVolume('media_player.bathroom_one', type);
		if (absoluteStep > 25) {
			updateVolume('media_player.bathroom_one', type);
			if (absoluteStep > 50) {
				updateVolume('media_player.bathroom_one', type);
			}
		}
	}
});

let radioIdAt = -1;
bathroom.musicController.onSceneSelect((scene, isCurrentScene) => {
	const entityId = 'media_player.bathroom_one';
	if (scene === 1 || scene === 2) {
		if (isCurrentScene) {
			// If pressing the button again: next random song
			haSend({
				type: 'call_service',
				domain: 'media_player',
				service: 'shuffle_set',
				service_data: {
					entity_id: entityId,
					shuffle: true,
				},
			});
			haSend({
				type: 'call_service',
				domain: 'media_player',
				service: 'media_next_track',
				service_data: {
					entity_id: entityId,
				},
			});
			return;
		}

		// https://open.spotify.com/playlist/2QgnqL3g2n0CzJkaN0Y6t4?si=20415211e99b433d&pt=f377350da00fd46a048d7dd0fbbb1da0
		let spotifyPlaylistId = '2QgnqL3g2n0CzJkaN0Y6t4';
		if (scene === 2) {
			spotifyPlaylistId = '749lznwIW4yq56a8R9Actw';
		}

		haSend({
			type: 'call_service',
			domain: 'media_player',
			service: 'play_media',
			service_data: {
				entity_id: entityId,
				media_content_id: `spotify://01jr8k98yxj1yfpdazev137n59/spotify:playlist:${spotifyPlaylistId}`,
				media_content_type: 'spotify://playlist',
			},
		});
	} else if (scene === 4) {
		const radioIds = [
			'07eb6945-5023-461e-9064-234075472cff', // Joe
			'02fab93b-c8a8-4536-bba2-3d1349318f33', // SkyRadio non-stop
		];
		radioIdAt = (radioIdAt + 1) % radioIds.length;

		const radioId = radioIds[radioIdAt];
		haSend({
			type: 'call_service',
			domain: 'media_player',
			service: 'play_media',
			service_data: {
				entity_id: entityId,
				media_content_id: `media-source://radio_browser/${radioId}`,
				media_content_type: 'audio/aac',
			},
		});
	}
});

export default {livingRoom, bedRoom, bathroom, kitchen, hall, office, rockyHatch};
