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

const homePresence = {
	emiel: new Entity('device_tracker.emiels_iphone', (value) => value === 'home'),
	ghislaine: new Entity('device_tracker.iphone_ghislaine', (value) => value === 'home'),
};

// When it is super light (>= 800 lux) in our living room, don't (auto) enable lights
const isVeryLight = new Entity(
	'sensor.ikea_of_sweden_vallhorn_wireless_motion_sensor_illuminance',
	(haState) => parseFloat(haState) >= 800
);

const allLights = lights({kitchen, livingRoom, bedRoom, hall, office});

// Called nobodyHome (and not someoneHome), because if we don't know due to missing sensor data, we assume false
const nobodyHome = new Observable<boolean>();
function onPresenceChange() {
	nobodyHome.set(homePresence.emiel.value === false && homePresence.ghislaine.value === false);
}

homePresence.emiel.observe(onPresenceChange);
homePresence.ghislaine.observe(onPresenceChange);

// These track the iOS focus mode
// - https://github.com/home-assistant/iOS/issues/1899
const asleep = {
	emiel: new Entity('binary_sensor.emiels_iphone_focus', (value) => value === 'on'),
	ghislaine: new Entity('binary_sensor.iphone_ghislaine_focus', (value) => value === 'on'),
};

function isWeekDay() {
	// 0 is Sunday
	const day = new Date().getDay();
	return day >= 1 && day <= 5;
}
function isBetweenHours(min: number, max: number) {
	const hours = new Date().getHours();
	return hours >= min && hours < max;
}

const livingRoomScenes = new SceneController({
	lights: [livingRoom.boekenkastLights, livingRoom.tvSpot, livingRoom.artSpot, livingRoom.deskLamp],
	scenes: [
		[0, 0, 0, 0], // off
		[0.8, {brightness: 0.8, temperature: 2500}, {brightness: 0.8, temperature: 2500}, 0.5], // on
		[0.4, {brightness: 0.4, temperature: 2500}, {brightness: 0.4, temperature: 2500}, 0.25], // movie
	],
});
livingRoom.curvedWallButton.leftButton.onPress(livingRoomScenes.nextScene);

const kitchenScenes = new SceneController({
	lights: [kitchen.counterStrip, kitchen.tableLights],
	scenes: [
		[0, 0], // off
		[{brightness: 0.75, rgb: [255, 193, 141]}, 0.5], // cooking
		[{brightness: 0.26, rgb: [255, 180, 90]}, 0.3], // eating
	],
});
livingRoom.curvedWallButton.rightButton.onPress(kitchenScenes.nextScene);
kitchen.counterButton.onPressOn(kitchenScenes.nextOnScene);
kitchen.counterButton.onPressOff(kitchenScenes.off);

const hallLights = lights(hall);

// Someone enters (or leaves) the front door
// - TODO: somehow find a way to not trigger this when we're leaving
hall.entrySensor.onMotion(function () {
	if (!hallLights.isOn()) {
		hallLights.to({brightness: 0.4, temperature: 2500});

		if (!isVeryLight.value && isBetweenHours(16, 21) && livingRoomScenes.currentSceneIndex === 0) {
			// Dimmed lights when we arrive end of day
			livingRoomScenes.toScene(2);
		}
		if (!isVeryLight.value && isWeekDay() && isBetweenHours(17, 19) && kitchenScenes.currentSceneIndex === 0) {
			// Assume we want to cook
			kitchenScenes.toScene(1);
		}
	}
});

const tvIsOn = new Entity('media_player.lg_webos_tv_oled55c25lb', (haState) => haState === 'on');
tvIsOn.observe((isOn) => {
	if (isOn && !isVeryLight.value) {
		// When TV is turned on, go into
		// TODO: this maybe a bit aggressive
		livingRoomScenes.toScene(2);
		if (kitchenScenes.currentSceneIndex === 1) {
			// If kitchen lights are bright, make less bright
			kitchenScenes.toScene(2);
		}
		hallLights.off();
	}
});

// Local state (consider: move to HA entity?)
let curtainsOpen = false;

function toggleCurtain() {
	curtainsOpen = !curtainsOpen;
	if (curtainsOpen) {
		bedRoom.curtain.open();
		bedRoom.antiMusquito.off();
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

function asleepChanged(isAsleep: boolean | undefined) {
	// Whenever a transition from asleep to awake between 6:00 and 10:00, enable morning lights
	if (isAsleep === false && isBetweenHours(6, 10) && !isVeryLight.value) {
		livingRoomScenes.toScene(2);
		kitchenScenes.toScene(2);
	}
}
asleep.emiel.observe(asleepChanged);
asleep.ghislaine.observe(asleepChanged);

nobodyHome.observe((noBodyHome) => {
	console.log(noBodyHome ? 'no body home' : 'someone home');
	if (noBodyHome) {
		allLights.off();
	}

	haSend({
		type: 'call_service',
		domain: 'switch',
		service: noBodyHome ? 'turn_off' : 'turn_on',
		service_data: {
			entity_id: 'switch.roborock_s8_maxv_ultra_do_not_disturb',
		},
	});
});

export default {livingRoom, kitchen, hall, bedRoom, office};
