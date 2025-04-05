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

process.env.TZ = 'Europe/Amsterdam';

function isWeekDay() {
	// 0 is Sunday
	const day = new Date().getDay();
	return day >= 1 && day <= 5;
}
function isBetweenHours(min: number, max: number) {
	const hours = new Date().getHours();
	return hours >= min && hours < max;
}

const livingRoom = {
	curvedWallButton: new MarmitekButton('5c:02:72:ff:fe:05:0c:27'),
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
	curtain: new Cover('cover.192_168_178_225'),
	antiMusquito: new Outlet('34:10:f4:ff:fe:8b:23:05'),
	buttonEmiel: new MarmitekButton('5c:02:72:ff:fe:0a:5f:e5'),
	buttonGhis: new MarmitekButton('5c:02:72:ff:fe:0a:5f:ef'),
};
const office = {
	button: new IkeaButton('84:2e:14:ff:fe:8c:3d:c1'),
	deskPower: new Outlet('28:db:a7:ff:fe:5f:d9:d7'),
};

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
livingRoom.curvedWallButton.leftButton.onPress(livingRoomScenes.nextScene);

const kitchenScenes = new SceneController({
	name: 'kitchen',
	lights: [kitchen.counterStrip, kitchen.tableLights],
	targets: {
		off: [0, 0], // off
		dimmed: [{brightness: 0.26, rgb: [255, 180, 90]}, 0.3], // dimmed / eating
		bright: [{brightness: 0.75, rgb: [255, 193, 141]}, 0.5], // bright / cooking
	},
});
livingRoom.curvedWallButton.rightButton.onPress(kitchenScenes.nextScene);
kitchen.counterButton.onPressOn(kitchenScenes.nextScene);
kitchen.counterButton.onPressOff(() => kitchenScenes.toScene('off'));

const hallLights = lights(hall);

// Someone enters (or leaves) the front door
// - TODO: somehow find a way to not trigger this when we're leaving
hall.entrySensor.onMotion(function (motion) {
	if (!motion) {
		hallLights.off();
		return;
	}

	if (!bedRoom.curtain.isOpen()) {
		// Someone sleeping, do nothing (not even dim)
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

export default {livingRoom, kitchen, rockyHatch, hall, bedRoom, office};
