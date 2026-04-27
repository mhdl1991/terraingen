const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')

const WIDTH = 800
const HEIGHT = 800
const TILE_WIDTH = 4
const TILE_HEIGHT = 4

const MAP_WIDTH = WIDTH / TILE_WIDTH
const MAP_HEIGHT = HEIGHT / TILE_HEIGHT
const _CONSTRAINED = false // make this a parameter of the function later


ctx.canvas.width = WIDTH
ctx.canvas.height = HEIGHT

let map = []

// utility
const clamp = (num, min, max) => Math.min( Math.max(num, min), max)
const choice = (_arr) => _arr[Math.floor(Math.random() * _arr.length)]

const LAND_TYPES = {
	LAND : {id: 0, color: 'rgb(32, 212, 64)', isLand: true},
	SHORE : {id: 1, color: 'rgb(220, 200, 96)',isLand: true},
	
	// forest
	FOREST : {id: 2, color: 'rgb(0, 176, 64)',isLand: true},
	
	WATER : {id: 3, color: 'rgb(32,120,250)',isLand: false},
	DEEP_WATER : {id: 4, color: 'rgb(8,64,240)',isLand: false},
	DEEPER_WATER: {id: 5, color: 'rgb(0,32,200)',isLand: false},
	
	
}

const isLand = (t) => {return t.isLand === true }
const isWater = (t) => {return t.isLand === false }
const isForest = (t) => {return t === LAND_TYPES.FOREST}
const isShore = (t) => {return t === LAND_TYPES.SHORE}

const randomizeMap = (width, height, bias) => { 
	arr = []
	let x, y
	for (y = 0; y < height; y++) {
		arr[y] = []
		for (x = 0; x < width; x++) {
			if (Math.random() >= bias) { arr[y][x] = LAND_TYPES.LAND } else { arr[y][x] = LAND_TYPES.WATER }
		}
	}
	return arr
}

// get neighbors in surrounding cells
const getNeighbors = (map, x, y, width, height, radius) => {
		let land_count = 0, water_count = 0, forest_count = 0, current, dx, dy, new_x, new_y
		
		n = Math.max( 1, Math.abs(radius) )
		
		for (dy = -n; dy < n + 1; dy++) {
			for (dx = -n; dx < n + 1; dx++) {
				// if within bounds
				if (dx == 0 && dy == 0) {continue}
				
				if (_CONSTRAINED) {
					if (Math.abs(dx) + Math.abs(dy) > radius) {continue}
				}
				
				new_x = (x + dx + width) % width
				new_y = (y + dy + height) % height
				current = map[new_y][new_x]
				if (isLand(current)) {
					land_count++
					if (isForest(current)) {forest_count++}
				}
				if (isWater(current)) {water_count++}
			}
		}
		return {land: land_count, water: water_count, forest: forest_count}
}
	
// update map according to rules
const updateMap = (oldmap, width, height, radius) => {

	let newmap = Array(height).fill(0).map( () => ( Array(width).fill(0) ) )
					
	let x, y, neighbors, current
	for (y = 0; y < height; y++) {
		for (x = 0; x < width; x++) {
			current = oldmap[y][x]
			newmap[y][x] = current
			
			// check the surrounding tiles in the neighborhood
			// update the map according to those rules
			neighbors = getNeighbors(oldmap,x,y,width,height,radius)

			if (isWater(current)) {
				if (neighbors.land > neighbors.water) {newmap[y][x] = LAND_TYPES.LAND}
			}
			
			if (isLand(current)) {
				if (neighbors.water > neighbors.land) {newmap[y][x] = LAND_TYPES.WATER}
			}
			
		}
	}
	
	return newmap
}

// refine map according to rules
const refineMap = (oldmap, width, height) => {

	let newmap = Array(height).fill(0).map( () => ( Array(width).fill(0) ) )
					
	let x, y, neighbors, current
	for (y = 0; y < height; y++) {
		for (x = 0; x < width; x++) {
			current = oldmap[y][x]
			newmap[y][x] = current //oldmap[y][x]
			
			// check the surrounding tiles
			neighbors = getNeighbors(oldmap,x,y,width,height,5)

			if (isWater(current)) {
				if (neighbors.land > neighbors.water/2) {newmap[y][x] = LAND_TYPES.WATER}
				else if (neighbors.land < neighbors.water/10) {newmap[y][x] = LAND_TYPES.DEEPER_WATER}
				else {newmap[y][x] = LAND_TYPES.DEEP_WATER}
			}
			
			if (isLand(current)) { 
				if (neighbors.water > neighbors.land/2) {newmap[y][x] = LAND_TYPES.SHORE}
			}
		}
	}
	
	return newmap
}

// grow plants?
const addForests = (oldmap, width, height) => {
	
	let newmap = Array(height).fill(0).map( () => ( Array(width).fill(0) ) )			
	let x, y, neighbors, current
	for (y = 0; y < height; y++) {
		for (x = 0; x < width; x++) {
			current = oldmap[y][x]
			newmap[y][x] = current

			if (isLand(current) && !isShore(current) ) {
				if (Math.random() > 0.5) { newmap[y][x] = LAND_TYPES.FOREST} else { newmap[y][x] = LAND_TYPES.LAND }
			}
		}
	}
	
	return newmap
}

// forests use a cellular automata
const stepForests = (oldmap, width, height) => {
	let newmap = Array(height).fill(0).map( () => ( Array(width).fill(0) ) )
	let x, y, neighbors, current
	for (y = 0; y < height; y++) {
		for (x = 0; x < width; x++) {
			current = oldmap[y][x]
			newmap[y][x] = current //oldmap[y][x]
			
			// check the surrounding tiles
			neighbors = getNeighbors(oldmap,x,y,width,height,1)
			if (isLand(current) && !isShore(current)) {
				
				if (neighbors.forest in [0, 1, 2, 3, 7])  {	// too many 
					newmap[y][x] = LAND_TYPES.LAND
				}
				
				if (neighbors.forest in [4, 5, 8])  { // just right for growth
					newmap[y][x] = LAND_TYPES.FOREST
				}	
			}
		}
	}
	return newmap
}

// draw the map on the screen
const drawMap = (map) => {
	// Clear screen
	ctx.clearRect(0, 0, WIDTH, HEIGHT);
	ctx.fillStyle = "rgb(0 0 0 / 100%)";
	ctx.fillRect(0, 0, WIDTH, HEIGHT);		
	
	// draw each tile
	let i, j, tile
	for (j = 0; j < MAP_HEIGHT; j++) {
		for (i = 0; i < MAP_WIDTH; i++) {
			tile = map[j][i];
			ctx.fillStyle = map[j][i].color
			
			ctx.fillRect(i * TILE_WIDTH, j * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT)
		} 
	}
}

// initialize
const init = () => {
	map = Array(MAP_HEIGHT).fill(0).map( () => ( Array(MAP_WIDTH).fill(LAND_TYPES.WATER) ) )
	drawMap(map)
}

// Control panel
const randomizeButton = document.getElementById('randomFill')
const cellAutoButton = document.getElementById('cellAuto')
const refineButton = document.getElementById('refineTerrain_coasts')
const addForestButton = document.getElementById('addForests')
const growForestButton = document.getElementById('refineTerrain_forests')
const neighborhoodSizeSelect = document.getElementById('neighborhoodSize')
const BiasInput = document.getElementById('biasAmount')
const doEverything = document.getElementById('randomEverything')

const randomizeBtnFunc = () => {
	let bias = clamp( Math.abs( parseInt( BiasInput.value )  ), 0, 100 ) / 100
	map = randomizeMap(MAP_WIDTH, MAP_HEIGHT, bias)
	drawMap(map)
}

const cellAutoBtnFunc = () => {
	let getRadius = neighborhoodSizeSelect.value
	for (let k = 0; k < 4; k++) { map = updateMap(map, MAP_WIDTH, MAP_HEIGHT, getRadius) }
	drawMap(map)
}

const refineBtnFunc = () => {
	map = refineMap(map, MAP_WIDTH, MAP_HEIGHT)
	drawMap(map)
}

const forestAddBtnFunc = () => {
	map = addForests(map, MAP_WIDTH, MAP_HEIGHT)
	drawMap(map)
}

const forestStepBtnFunc = () => {
	map = stepForests(map, MAP_WIDTH, MAP_HEIGHT)
	drawMap(map)
}

const doAll = () => {
	let bias = 0.5 //clamp( 45 + (Math.random() * 30) , 0, 100 ) / 100
	map = randomizeMap(MAP_WIDTH, MAP_HEIGHT, bias)
	
	let possible_radii = [1,2,3,4]
	let num_iterations = [3,4,5]
	let k = 0
	for (k = 0; k < choice(num_iterations); k++) { map = updateMap(map, MAP_WIDTH, MAP_HEIGHT, choice(possible_radii) ) }
	for (k = 0; k < 1; k++) { map = refineMap(map, MAP_WIDTH, MAP_HEIGHT) }
	map = addForests(map, MAP_WIDTH, MAP_HEIGHT)
	for (k = 0; k < 10; k++) { map = stepForests(map, MAP_WIDTH, MAP_HEIGHT) }
	
	drawMap(map)
}




randomizeButton.addEventListener('click', randomizeBtnFunc)
cellAutoButton.addEventListener('click', cellAutoBtnFunc)
refineButton.addEventListener('click', refineBtnFunc)
growForestButton.addEventListener('click', forestStepBtnFunc)
addForestButton.addEventListener('click', forestAddBtnFunc)
doEverything.addEventListener('click', doAll)

init()