var Core = {  }

Core.engine = {  }
Core.projects = {  }

Core.init = function(fromLoad){
	document.title = 'devLife'
	Core.initRecruitingSection()
	Core.initRentingSection()
	Core.jobFinder()
	if(!fromLoad){
		Core.takeJob()
		Core.startMonthTimer()
		Core.addListeners()
	}else{
		Core.checkAchievements(true)
	}
	Core.base.nextComputerVersionCost = Core.base.computerMultiplierCost * (Stats.computerVersion + 1)
	Core._('#PCCost').innerText = Core.numberFormat(Core.base.nextComputerVersionCost)
	if(Notification.permission !== "granted" && !Core.base.notificationsRequested){
		Notification.requestPermission()
		Core.base.notificationsRequested = true
	}
	Core.updateHUD()
}

Core.start = function(projectID, button){
	Core.controlPulseDuration()
	Core.projects[projectID].engine = setTimeout(function(){
		Core.pulse(projectID, button)
	}, Core.base.pulseDuration)	
}

Core.stop = function(projectID){
	clearTimeout(Core.projects[projectID].engine)
	Core.projects[projectID].engine = null
	Stats.money += Core.projects[projectID].profit
	Core.updateHUD()
	if(Core.hasImprovement('autoSaveOnProjectComplete')){
		Core.save()
	}
	if(Stats.projects > 4 && !Core.hasImprovement('addProject') && !Core._('.startImprovement[data-type=addProject]')){
		Core.showImprovementButton('addProject')
	}
}

Core.pulse = function(projectID, button){
	Core.projects[projectID].profit += Core.base.moneyIncPerPulse + Core.projects[projectID].moneyPlus
	var profitText = button.getAttribute('data-profit')
	if(profitText){
		profitText = profitText.replace(/Profit: ([0-9]+\.*.*)¢/, 'Profit: ' + Core.numberFormat(Core.projects[projectID].profit))
		button.setAttribute('data-profit', profitText)
	}
	Core.isRunning = false
	Core.controlPulseDuration()
	Core.updateHUD()
	Core.projects[projectID].engine = setTimeout(function(){
		Core.pulse(projectID, button)
	}, Core.base.pulseDuration)
}

Core.startMonthTimer = function(secondsLeft){
	var sbar = Core._('.salaries-timer-bar')
	var rbar = Core._('.rents-timer-bar')
	var percent = 100
	Stats.monthTimeLeft = 60
	if(secondsLeft){
		Stats.monthTimeLeft = secondsLeft
		percent = (Stats.monthTimeLeft / 60) * 100
	}
	window.monthInterval = setInterval(function(){
		if(Stats.monthTimeLeft <= 0){
			clearInterval(window.monthInterval)
			Stats.money -= (Core.calcSalariesCost() + Core.calcRentCost())
			Core.startMonthTimer()
		}else{
			Stats.monthTimeLeft--
			percent = (Stats.monthTimeLeft / 60) * 100
			if(sbar){ sbar.style.width = percent + '%' }
			if(rbar){ rbar.style.width = percent + '%' }
		}
	}, 1000)
}

Core.controlPulseDuration = function(){
	if(Core.base.pulseDuration < Core.base.minPulseDuration){
		Core.base.pulseDuration = Core.base.minPulseDuration
	}else if(Core.base.pulseDuration > Core.base.maxPulseDuration){
		Core.base.pulseDuration = Core.base.maxPulseDuration
	}
}

Core.updateHUD = function(){
	Core.checkAchievements()
	Core._('#money').innerHTML = Core.numberFormat(Stats.money)
	Core._('#incPerPulse').innerHTML = Core.numberFormat(Core.base.moneyIncPerPulse) + '/pulse'
	Core._('#computerVersion').innerHTML = 'v' + Stats.computerVersion
	Core._('#jobs').innerHTML = Stats.jobs.length
	Core._('#employees').innerHTML = Stats.employees.length
	Core._('#pulseSpeed').innerHTML = parseFloat(Core.base.pulseDuration || 0).toFixed(3) + ' ms'
	Core._('#projects').innerText = Stats.projects
	// Core._('#PCCost').innerText = Core.numberFormat(Core.base.nextComputerVersionCost)
	// Edificios
	Core._('#availableSpaces').innerText = Stats.availableSpaces
	Core._('#rooms').innerText = Stats.rooms
	Core._('#floors').innerText = Stats.floors
	Core._('#buildings').innerText = Stats.buildings
	Core._('#warehouses').innerText = Stats.warehouses
	Core._('#rentsCost').innerText = Core.numberFormat(Core.calcRentCost())
	// Empleados
	// Controlar botones
	Core._('#salariesCost').innerText = Core.numberFormat(Core.calcSalariesCost())
	for(var type in employees){
		if(employees.hasOwnProperty(type)){
			Core._('#' + employees[type].id + 'Counter').innerText = Stats[type] || 0
			if(employees[type].salary < Stats.money){
				Core._('.hireEmployee[data-type=' + type + ']').removeAttribute('disabled')
			}else{
				Core._('.hireEmployee[data-type=' + type + ']').setAttribute('disabled', true)
			}
			if(Stats[type] > 0){
				Core._('.fireEmployee[data-type=' + type + ']').removeAttribute('disabled')
			}
		}
	}
	if(Stats.money > Core.base.coffeePrice && Stats.isCoffeePowered === false){
		Core._('#buyCoffee').removeAttribute('disabled')
	}else{
		Core._('#buyCoffee').setAttribute('disabled', true)
	}
	if(Stats.money > Core.base.energyDrinkPrice && Stats.isEnergyDrinkPowered === false){
		Core._('#buyEnergyDrink').removeAttribute('disabled')
	}else{
		Core._('#buyEnergyDrink').setAttribute('disabled', true)
	}
	if(Core.base.maxComputerVersion > Stats.computerVersion){
		if(Stats.money >= Core.base.nextComputerVersionCost){
			Core._('#upgradePC').removeAttribute('disabled')
		}else{
			Core._('#upgradePC').setAttribute('disabled', true)
		}
	}else{
		Core._('#upgradePC').setAttribute('disabled', true)
		Core._('#upgradePC').innerText = 'Computer version maxed (' + Core.base.maxComputerVersion + ')'
	}	
	var rooms = Core._('.rentRoom', true)
	for(var i = 0, len = rooms.length; i < len; i++){
		var el = rooms[i]
		if(el.className.indexOf('owned') !== -1) continue
		if(el.getAttribute('data-cost') < Stats.money){
			el.removeAttribute('disabled')
		}else{
			el.setAttribute('disabled', true)
		}
	}
	var imprvs = Core._('.startImprovement', true)
	for(var i = 0, len = imprvs.length; i < len; i++){
		if(imprvs[i].getAttribute('data-cost') < Stats.money && improvements[imprvs[i].getAttribute('data-type')].inProgress === false){
			imprvs[i].removeAttribute('disabled')
		}else{
			imprvs[i].setAttribute('disabled', true)
		}
	}
	if(Stats.money >= Core.base.lotteryTicketCost && Stats.raffleRunning === false){
		Core._('#buyTicket').removeAttribute('disabled')
	}else{
		Core._('#buyTicket').setAttribute('disabled', true)
	}
}

Core.upgradeComputer = function(){
	var cost = Core.base.nextComputerVersionCost
	if(Stats.money >= cost && Stats.computerVersion < Core.base.maxComputerVersion){
		Stats.money -= cost
		Stats.computerVersion++
		if(Stats.computerVersion === 1){
			Core.showImprovementButton('intranetCommandPrompt')
		}
		Core.base.moneyIncPerPulse += Core.base.moneyIncPerPulse * (Stats.computerVersion / 100)
		Core.base.pulseDuration -= 10
		if(Core.base.maxComputerVersion >= Stats.computerVersion + 1){
			Core.base.nextComputerVersionCost = cost + (Core.base.computerMultiplierCost * (Stats.computerVersion + 1))
			Core._('#PCCost').innerText = Core.numberFormat(Core.base.nextComputerVersionCost)
			Core._('#upgradePC').setAttribute('disabled', true)
		}else{
			Core._('#upgradePC').setAttribute('disabled', true)
			Core._('#PCCost').innerText = 'Computer version maxed (' + Core.base.maxComputerVersion + ')'
			if(!Core.hasImprovement('computacionalTech')){
				Core.showImprovementButton('computacionalTech')
			}
		}
		Core.updateHUD()
	}
}

Core.calcSalariesCost = function(){
	var qty = 0
	for(var key in employees){
		if(employees.hasOwnProperty(key)){
			qty += employees[key].salary * Stats[key]
		}
	}
	return qty <= 0 || isNaN(qty) ? 0 : qty
}

Core.calcEmployeesMoneyInc = function(){
	var qty = 0
		qty += employees['programmer-junior'].increment * Stats['programmer-junior']
		qty += employees['programmer-senior'].increment * Stats['programmer-senior']
		qty += employees['designer-web'].increment * Stats['designer-web']
		qty += employees['friend'].increment * Stats['friend']
	return qty <= 0 || isNaN(qty) ? 0 : qty
}

Core.calcRentCost = function(){
	var qty = 0
		qty += Rents.room.price * Stats.rooms
		qty += Rents.floor.price * Stats.floors
		qty += Rents.building.price * Stats.buildings
		qty += Rents.warehouse.price * Stats.warehouses
	return qty <= 0 || isNaN(qty) ? 0 : qty
}

Core.jobFinder = function(){
	var time = Math.floor(Math.random() * 60) + 25
		time *= 1000
	setTimeout(function(){
		Core._('#takeJob').removeAttribute('disabled')
		document.title = 'JOB OPORTUNITY! | devLife'
		setTimeout(function(){
			Core._('#takeJob').setAttribute('disabled', true)
			document.title = 'devLife'
			if(Stats.jobs.length < Core.base.maxJobs){
				Core.jobFinder()
			}
		}, 5000)
	}, time)
}

Core.takeJob = function(button){
	if(button) button.setAttribute('disabled', true)
	if(Stats.jobs.length >= Core.base.maxJobs) return false
	var job = jobs[(Math.floor(Math.random() * (jobs.length - 1)))]
		job.id = 'job-' + new Date().getTime()
	Core.base.moneyIncPerPulse += job.increment
	document.title = 'devLife'
	Stats.jobs.push(job)
	Core.addJobToList(job)
}

Core.addJobToList = function(job){
	var li = document.createElement('li')
	var text = document.createTextNode(job.name + ' (+' + Core.numberFormat(job.increment) + '/pulse)')
	var qjbutton = document.createElement('button')
		qjbutton.innerText = 'Quit job'
		qjbutton.setAttribute('id', job.id)
		qjbutton.addEventListener('click', Core.quitJob)
		li.appendChild(text)
		li.appendChild(qjbutton)
	Core._('ul.job-list').appendChild(li)
}

Core.rentRoom = function(ty, button){
	var room = Rents[ty] || false
	if(room === false) return false
	if(Stats.money < room.price) return false
	switch(ty){
		case 'room':
			if(Core.base.maxRooms <= Stats.rooms) return false
			break
		case 'floor':
			if(Core.base.maxFloors <= Stats.floors || Stats.rooms < 2) return false
			break
		case 'building':
			if(Core.base.maxBuildings <= Stats.buildings || Stats.floors < 2) return false
			break
		case 'warehouse':
			if(Core.base.maxWarehouses <= Stats.warehouses || Stats.buildings < 2) return false
			break
	}
	Stats[ty + 's']++
	Stats.money -= room.price
	Stats.availableSpaces += room.spaces
	button.removeAttribute('data-cost')
	button.removeAttribute('data-type')
	button.className += ' owned'
	Core.updateHUD()
}

Core.quitJob = function(button){
	button = button.srcElement
	var jobID = button.getAttribute('id')
	if(!jobID) return false
	var j = null
	for(var i = 0, len = Stats.jobs.length; i < len; i++){
		if(Stats.jobs[i].id === jobID){
			j = i
			break
		}
	}
	if(j === null) return false
	Core.base.moneyIncPerPulse -= Stats.jobs[i].increment
	Stats.jobs.splice(j, 1)
	button.parentNode.parentNode.removeChild(button.parentNode)
	if(Stats.jobs === Core.base.maxJobs - 1){
		Core.jobFinder()
	}
}

Core._ = function(selector, multiple){
	return multiple ? document.querySelectorAll(selector) : document.querySelector(selector)
}

Core.addEmployeeToList = function(type, helpText){
	var name = Core.employeeNames[(Math.floor(Math.random() * (Core.employeeNames.length - 1)))]
	var li = document.createElement('li')
	if(helpText){
		li.className = 'help'
		li.setAttribute('data-title', helpText)
	}
	var text = document.createTextNode(type + ': ' + name)
	var qjbutton = document.createElement('button')
		qjbutton.innerText = 'Fire'
		qjbutton.addEventListener('click', function(){
			Core.fireEmployee(type, this)
		})
		li.appendChild(text)
		li.appendChild(qjbutton)
	Core._('ul.employee-list').appendChild(li)
}

Core.hireEmployee = function(button){
	var type = button.getAttribute('data-type')
	if(!employees[type]) return false
	if(Stats.availableSpaces <= 0) return false
	if(employees[type].salary > Stats.money) return false
	if(type === 'friend' && Stats.friend >= Core.base.maxFriendHiring) return false
	Stats.money -= employees[type].salary
	Core.base.pulseDuration -= Core.base.pulseDuration * employees[type].increment
	Stats[type]++
	Stats.availableSpaces--
	Stats.employees.push({
		'type': type,
		'salary': employees[type].salary,
		'increment': employees[type].increment
	})
	if(typeof employees[type].unlocks === 'function'){
		employees[type].unlocks()
	}
	Core._('.fireEmployee[data-type=' + type + ']').removeAttribute('disabled')
	Core.updateHUD()
}

Core.fireEmployee = function(button){
	var type = button.getAttribute('data-type')
	if(!employees[type]) return false
	// Eliminar del array de empleados
	var index = -1
	for(var i = 0, len = Stats.employees.length; i < len; i++){
		if(Stats.employees[i].type === type){
			index = i
			break
		}
	}
	if(index === -1){
		button.setAttribute('disabled', true)
		return false
	}
	Stats[type]--
	Core.base.pulseDuration += Core.base.pulseDuration * employees[type].increment
	Stats.availableSpaces++
	Stats.employees.splice(index, 1)
	Core.updateHUD()
	if(Stats[type] === 0){
		Core._('.fireEmployee[data-type=' + type + ']').setAttribute('disabled', true)
	}
}

Core.startProject = function(button){
	var max = 30
	var min = 10
	var projectTime = Math.floor(Math.random() * max) + min
		projectTime += projectTime * Math.round(Stats.projects / 10)
	button.setAttribute('disabled', true)
	// Botón con relleno de cuenta atrás
	button.style.position = 'relative'
	var bar = document.createElement('div')
		bar.className = 'projectProgress'
		button.appendChild(bar)
	var percent = 100
	var projectID = 'project-' + new Date().getTime()
	Core.projects[projectID] = {  }
	// Plus de ganancia por trabajador
	Core.projects[projectID].moneyPlus = Core.base.moneyIncPerPulse * Core.calcEmployeesMoneyInc()
	Core.projects[projectID].profit = 0
	Core.projects[projectID].secondsLeft = projectTime
	button.setAttribute('data-profit', '(Time left: '+ Core.timeFormat(projectTime * 1000) +') (Profit: 0' + Core.base.moneyChar + ')')
	Core.start(projectID, button)
	Core.projects[projectID].timer = setInterval(function(){
		Core.projects[projectID].secondsLeft--
		bar.setAttribute('data-percent', percent)
		var profitSecondsText = button.getAttribute('data-profit')
			profitSecondsText = profitSecondsText.replace(/Time left: \s*([0-9]+[h|m|s])*\s*([0-9]+[h|m|s])*\s*([0-9]+[h|m|s])*/g, 'Time left: ' + Core.timeFormat(Core.projects[projectID].secondsLeft * 1000))
			button.setAttribute('data-profit', profitSecondsText)
		if(Core.projects[projectID].secondsLeft <= 0){
			clearInterval(Core.projects[projectID].timer)
			Core.stop(projectID)
			button.removeAttribute('disabled')
			button.innerText = 'Start project'
			button.setAttribute('data-profit', '')
			Stats.projects++
			Core.updateHUD()
			Core.notification('Project finished', 'Profit: ' + Core.numberFormat(Core.projects[projectID].profit))
		}else{
			percent = (Core.projects[projectID].secondsLeft / projectTime) * 100
			bar.style.width = percent + '%'
		}
	}, 1000)
}

Core.showImprovementButton = function(id){
	var button = document.createElement('button')
		button.className = 'startImprovement'
		if(improvements[id].help){
			button.className += ' help'
			button.setAttribute('data-title', improvements[id].help)
		}
		button.setAttribute('data-type', id)
		button.setAttribute('data-cost', improvements[id].cost)
		button.innerText = improvements[id].label + ' (' + Core.numberFormat(improvements[id].cost) + ') (Development time: ' + Core.timeFormat(improvements[id].investigationTime) + ')'
		button.addEventListener('click', function(){
			Core.startImprovement(id, this)
		})
	Core._('#improvements-section').appendChild(button)
}

Core.startImprovement = function(ty, button){
	if(!improvements[ty]) return false
	improvements[ty].inProgress = true
	if(Stats.money < improvements[ty].cost) return false
	Stats.money -= improvements[ty].cost
	button.setAttribute('disabled', true)
	button.innerText = button.innerText.replace(/\(.*\)/g, '') + ' (Investigation in progress) (Time left: ' + Core.timeFormat(improvements[ty].investigationTime) + ')'
	Stats['imp' + ty + 'timeleft'] = improvements[ty].investigationTime / 1000
	window['interval' + ty] = setInterval(function(){
		if(Stats['imp' + ty + 'timeleft'] <= 0){
			Stats.improvements.push(ty)
			improvements[ty].effect(button)
			improvements[ty].inProgress = false
			clearInterval(window['interval' + ty])
		}else{
			Stats['imp' + ty + 'timeleft']--
			button.innerText = button.innerText.replace(/\(.*\)/g, '') + ' (Investigation in progress) (Time left: ' + Core.timeFormat(Stats['imp' + ty + 'timeleft'] * 1000) + ')'
		}
	}, 1000)
}

Core.numberFormat = function(number){
	return parseFloat(number || 0).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+\,)/g, '$1.') + ' ' + Core.base.moneyChar
}

Core.timeFormat = function(s){
	function addZ(n) {
		return (n<10? '0':'') + n
	}

	var ms = s % 1000
	s = (s - ms) / 1000
	var secs = s % 60
	s = (s - secs) / 60
	var mins = s % 60
	var hrs = (s - mins) / 60

	var result = ''
	if(hrs)
		result += addZ(hrs) + 'h'
	if(hrs || mins)
		result += ' ' + addZ(mins) + 'm'
	if(mins || secs)
		result += ' ' + addZ(secs) + 's'
	return result
}

Core.buyTicket = function(button){
	if(Stats.money < Core.base.lotteryTicketCost) return false
	Stats.money -= Core.base.lotteryTicketCost
	Core._('#lottery #winner').innerText = '-'
	Core._('#lottery #owned').innerText = '-'
	Core._('#lottery #info').innerText = '-'
	Core._('#lottery #info').className = ''
	Stats.numTicket = Core.pad(Math.floor((Math.random() * Core.base.numbersTickets) + 1))
	Core._('#lottery #owned').innerText = Stats.numTicket
	button.setAttribute('disabled', true)
	Stats.ticketsBought++
	Core.startRaffle(button)
	Core.updateHUD()
}

Core.startRaffle = function(button){
	Stats.raffleRunning = true
	window.raffleInterval = setInterval(function(){
		Core._('#lottery #winner').innerText = Math.floor((Math.random() * Core.base.numbersTickets) + 1)
	}, 1)
	setTimeout(function(){
		clearInterval(window.raffleInterval)
		Stats.raffleRunning = false
		// Generate winner
		Stats.winnerTicket = Core.pad(Math.floor((Math.random() * Core.base.numbersTickets) + 1))
		Core._('#lottery #winner').innerText = Stats.winnerTicket
		var state = 'lose'
		var prize = 0
		var partial = false
		var full = false
		if(Stats.numTicket === Stats.winnerTicket){
			prize += Core.base.lotteryPrize
			full = true
		}
		Stats.numTicket    = Stats.numTicket.substring(1, Stats.numTicket.length)
		Stats.winnerTicket = Stats.winnerTicket.substring(1, Stats.winnerTicket.length)
		if(Stats.numTicket === Stats.winnerTicket){
			prize += Core.base.lotteryTicketCost * 10000
			partial = true
		}
		Stats.numTicket    = Stats.numTicket.substring(1, Stats.numTicket.length)
		Stats.winnerTicket = Stats.winnerTicket.substring(1, Stats.winnerTicket.length)
		if(Stats.numTicket === Stats.winnerTicket){
			prize += Core.base.lotteryTicketCost * 1000
			partial = true
		}
		Stats.numTicket    = Stats.numTicket.substring(1, Stats.numTicket.length)
		Stats.winnerTicket = Stats.winnerTicket.substring(1, Stats.winnerTicket.length)
		if(Stats.numTicket === Stats.winnerTicket){
			prize += Core.base.lotteryTicketCost * 100
			partial = true
		}
		Stats.numTicket    = Stats.numTicket.substring(1, Stats.numTicket.length)
		Stats.winnerTicket = Stats.winnerTicket.substring(1, Stats.winnerTicket.length)
		if(Stats.numTicket === Stats.winnerTicket){
			prize += Core.base.lotteryTicketCost * 10
			partial = true
		}
		Stats.numTicket    = Stats.numTicket.substring(1, Stats.numTicket.length)
		Stats.winnerTicket = Stats.winnerTicket.substring(1, Stats.winnerTicket.length)
		if(Stats.numTicket === Stats.winnerTicket){
			prize += Core.base.lotteryTicketCost
			partial = true
		}
		if(full){
			Stats.lotteryWon = true
			state = 'win: ' + Core.numberFormat(prize)
		}else if(partial){
			Stats.partialWon = true
			state = 'partial win: ' + Core.numberFormat(prize)
		}
		Stats.money += prize
		Core._('#lottery #info').className += ' ' + state
		Core._('#lottery #info').innerText = state
		button.removeAttribute('disabled')
	}, Core.base.timeRaffle)
}

Core.pad = function(number){
	var str = '' + number
	var pad = '000000'
	return pad.substring(0, pad.length - str.length) + str
}

Core.save = function(){
	if(!localStorage || !JSON || typeof JSON.stringify !== 'function') return false
	localStorage.setItem('savedDate', new Date())
	// Core.base
	for(var k in Core.base){
		localStorage.setItem('core.base.' + k, Core.base[k])
	}
	// Stats
	for(var k in Stats){
		if(k === 'employees'){
			for(var i = 0, len = Stats.employees.length; i < len; i++){
				localStorage.setItem('stats.employees.' + i, JSON.stringify(Stats.employees[i]))
			}
		}else if(k === 'improvements' || k === 'commandPrompt' || k === 'jobs'){
			localStorage.setItem('stats.' + k, JSON.stringify(Stats[k]))
		}else{
			localStorage.setItem('stats.' + k, Stats[k])
		}
	}
	localStorage.setItem('css', Core._('#css').getAttribute('href'))
	// Timers
	// - Coffee (Saved in Stats.coffeeTimeLeft)
	// - Energy Drink (Saved in Stats.energyDrinkTimeLeft)
	// - Improvements (Saved in Stats['imp' + ty + 'timeleft'])
	Core.showPopUp({
		'title': 'Success!',
		'description': 'Your game is saved in this browser!'
	})
	return true
}

Core.load = function(){
	if(!localStorage || !JSON || typeof JSON.parse !== 'function') return false
	// Listar todo el localStorage
	for (var i = 0; i < localStorage.length; i++){
		var key = localStorage.key(i)
		var value = localStorage.getItem(localStorage.key(i))
		if(key.indexOf('core.base.') === 0){
			key = key.replace('core.base.', '')
			if(['true', 'false'].indexOf(value) !== -1){
					Core.base[key] = value === 'true'
				}else{
					Core.base[key] = !isNaN(value) ? parseFloat(value) : value
				}	
		}else if(key.indexOf('stats.') === 0){
			key = key.replace('stats.', '')
			if(key.indexOf('employees.') === 0){
				var index = parseInt(key.replace('employees.', ''), 10)
				Stats.employees[index] = JSON.parse(value)
			}else if(key === 'jobs' || key === 'improvements'){
				Stats[key] = JSON.parse(value)
			}else if(key === 'commandPrompt'){
				Stats[key] = JSON.parse(value)
			}else{
				if(['true', 'false'].indexOf(value) !== -1){
					Stats[key] = value === 'true'
				}else{
					Stats[key] = !isNaN(value) ? parseFloat(value) : value
				}	
			}
		}else if(key === 'css'){
			Core._('#css').setAttribute('href', value)
		}else if(key === 'savedDate'){

		}
	}

	Core._('ul.job-list').innerHTML = ''
	for(var i = 0, len = Stats.jobs.length; i < len; i++){
		Core.addJobToList(Stats.jobs[i])
	}
	// Añadir las mejoras
	for(var i = 0, len = Stats.improvements.length; i < len; i++){
		improvements[Stats.improvements[i]].effect()
		Core._('.startImprovement[data-type=' + Stats.improvements[i] + ']')
	}

	// Limpieza de intervals/timeouts
	clearInterval(window.monthInterval)
	clearInterval(window.coffeeInterval)
	clearInterval(window.energyDrinkInterval)
	window.monthInterval       = null
	window.coffeeInterval      = null
	window.energyDrinkInterval = null
	if(Core.projects){
		for(var projectID in Core.projects){
			if(Core.projects.hasOwnProperty(projectID) && Core.projects[projectID].engine){
				clearTimeout(Core.projects[projectID].engine)
			}
		}
	}
	// Creación de nuevos timers
	if(Stats.monthTimeLeft){
		Core.startMonthTimer(Stats.monthTimeLeft)
	}
	if(Stats.coffeeTimeLeft){
		Shop.startCoffeeEffect(Core._('#buyCoffee'), Stats.coffeeIncrement, Stats.coffeeTimeLeft)
	}
	if(Stats.energyDrinkTimeLeft){
		Shop.startEnergyDrinkEffect(Core._('#buyEnergyDrink'), Core.base.energyDrinkInc, Stats.energyDrinkTimeLeft)
	}
	// Alquileres. Reinicializar la sección
	Core.initRentingSection()

	Core.init(true) // Evitamos algunas líneas necesarias sólo al principio (Sin cargar)
	// Core.showPopUp({
	// 	'title': 'Success!',
	// 	'description': 'Your game is loaded!'
	// })
	return true
}

Core.notification = function(title, text){
	if(!Notification) return false
	if(!title) title = 'DevLife'

	if(Notification.permission !== 'granted' && !Core.base.notificationsRequested){
		Notification.requestPermission()
	}else{
		var notification = new Notification(title, {
			'icon': 'img/code-icon.png',
			'body': text
		})
	}
}

Core.hasImprovement = function(ID){
	return Stats.improvements.indexOf(ID) !== -1
}

Core.initRentingSection = function(){
	var section = Core._('#renting-list')
		section.innerHTML = ''
	var rents = ['house', 'room', 'floor', 'building', 'warehouse']
	for(var r = 0, len = rents.length; r < len; r++){
		for(var n = 0; n < Rents[rents[r]].max; n++){
			var button = document.createElement('BUTTON')
				button.className = 'rentRoom'
				if(Stats[rents[r] + 's'] > n){
					button.className += ' owned'
					button.innerText = 'Rent ' + rents[r] + ': ' + Rents[rents[r]].spaces + ' seats. ' + Core.numberFormat(Rents[rents[r]].price) + '/m'
				}else{
					button.setAttribute('disabled', true)
					button.setAttribute('data-cost', Rents[rents[r]].price)
					button.setAttribute('data-type', rents[r])
					button.innerText = 'Rent ' + rents[r] + ' (+' + Rents[rents[r]].spaces + ' seats)(' + Core.numberFormat(Rents[rents[r]].price) + '/m)'
				}
			section.appendChild(button)
		}
	}
	// Listeners
	var rents = Core._('.rentRoom', true)
	for(var i = 0, len = rents.length; i < len; i++){
		rents[i].addEventListener('click', function(){
			var ty = this.getAttribute('data-type')
			Core.rentRoom(ty, this)
		})
	}
}

Core.initRecruitingSection = function(){
	if(!employees) return false
	var HTMLTemplate = [
		'<div>',
			'<span class="help label stat" data-title="Increase the pulse speed ::increment::%. ::help::">::label::</span>',
			'<span class="hireContainer">',
				'<button class="fireEmployee" disabled="disabled" data-type="::type::">-</button>',
				'<span class="employeeCounter" id="::id::Counter">0</span>',
				'<button class="hireEmployee help" data-title="Hiring cost: ::cost::' + Core.base.moneyChar + ' per minute" data-type="::type::">+</button>',
			'</span>',
		'</div>'
	].join('')
	var HTML = ''
	for(var type in employees){
		if(employees.hasOwnProperty(type)){
			HTML += HTMLTemplate
						.replace('::label::', employees[type].label)
						.replace('::id::', employees[type].id)
						.replace(/::type::/g, type)
						.replace('::cost::', employees[type].salary)
						.replace('::increment::', employees[type].increment)
						.replace('::help::', employees[type].help || '')
		}
	}
	Core._('#employee-types').innerHTML = HTML
	// Listeners
	var hires = Core._('.hireEmployee', true)
	for(var i = 0, len = hires.length; i < len; i++){
		hires[i].addEventListener('click', function(){ Core.hireEmployee(this) })
	}
	var fires = Core._('.fireEmployee', true)
	for(var i = 0, len = fires.length; i < len; i++){
		fires[i].addEventListener('click', function(){ Core.fireEmployee(this) })
	}
}

Core.addListeners = function(){
	Core._('#toggle-achievement-list').addEventListener('click', function(){ Core.toggleAchievementList() })
	Core._('#upgradePC').addEventListener('click', function(){ Core.upgradeComputer() })
	Core._('#buyCoffee').addEventListener('click', function(){ Shop.buyCoffee(this) })
	Core._('#buyEnergyDrink').addEventListener('click', function(){ Shop.buyEnergyDrink(this) })
	Core._('#takeJob').addEventListener('click', function(){ Core.takeJob(this) })
	Core._('.startProject').addEventListener('click', function(){ Core.startProject(this) })
	Core._('#buyTicket').addEventListener('click', function(){ Core.buyTicket(this) })
	var improvs = Core._('.startImprovement', true)
	for(var i = 0, len = improvs.length; i < len; i++){
		improvs[i].addEventListener('click', function(){
			var ty = this.getAttribute('data-type')
			Core.startImprovement(ty, this)
		})
	}
	Core._('#shareTwitter').addEventListener('click', function(){
		var text = 'I have ' + Core._('#money').innerText + ' and ' + Core._('#incPerPulse').innerText + ' of money rate in my DevLife. How much do you have?'
		var url = 'https://twitter.com/intent/tweet?text=:text&url=:url&hashtags=:hashtags'
			url = url.replace(':text', text)
			url = url.replace(':url', document.URL)
			url = url.replace(':hashtags', 'DevLife')
		window.open(url, "Title", "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=800, height=500, top="+((screen.height/2)-250)+", left="+((screen.width/2)-400))
	})
	var sections = Core._('.button-section > .header', true)
	for(var i = 0, len = sections.length; i < len; i++){
		sections[i].addEventListener('click', function(){
			if(this.parentNode.className.indexOf('compact') === -1){
				Core.addClass(this.parentNode, 'compact')
			}else{
				Core.removeClass(this.parentNode, 'compact')
			}
		})
	}
}

Core.addClass = function(element, cssClass){
	if(!Core.hasClass(element, cssClass)){
		element.className += ' ' + cssClass
	}
}

Core.hasClass = function(element, cssClass){
	var rgx = new RegExp('\b*' + cssClass + '\b*')
	return rgx.test(element.className)
}

Core.removeClass = function(element, cssClass){
	var rgx = new RegExp('\b*' + cssClass + '\b*', 'g')
	element.className = element.className.replace(rgx, '').replace(/^\s+|\s+$/g, '')
}

Core.checkAchievements = function(silent){
	if(achievements && achievements.length){
		for(var i = 0, len = achievements.length; i < len; i++){
			if(!achievements[i].done){
				achievements[i].done = achievements[i].check()
				if(achievements[i].done && !silent){
					Core.showPopUp({
						'title': 'Achievement unlocked!',
						'description': achievements[i].title
					})
				}
			}
		}
	}
}

Core.showPopUp = function(data){
	var bg = document.createElement('DIV')
		bg.className = 'popup'
	var container = document.createElement('DIV')
		container.className = 'container'
	var title = document.createElement('P')
		title.className = 'title'
		title.innerText = data.title
	var description = document.createElement('P')
		description.className = 'description'
		description.innerText = data.description
	var close = document.createElement('BUTTON')
		close.className = 'closeBtn'
		close.innerText = 'Close'
		close.onclick = function(){
			Core._('.popup').remove()
		}
	container.appendChild(title)
	container.appendChild(description)
	container.appendChild(close)
	Core._('body')
		.appendChild(bg)
		.appendChild(container)
	// Core.notification(data.title, data.description)
}

Core.refreshAchievementList = function(){
	if(!achievements || !achievements.length) return false
	var table = document.createElement('TABLE')
	for(var i = 0, len = achievements.length; i < len; i++){
		var tr = document.createElement('TR')
		var tdTitle = document.createElement('TD')
		var tdStatus = document.createElement('TD')
		var statusText = achievements[i].done ? 'Unlocked' : 'Locked'
		tdTitle.innerText = achievements[i].title
		if(achievements[i].progress && typeof achievements[i].progress === 'function'){
			tdTitle.innerHTML += ' <span class="achievement-progress-text">(' + achievements[i].progress() + ')</span>'
		}
		tdStatus.innerText = statusText
		tr.className = statusText.toLowerCase()
		tr.appendChild(tdTitle)
		tr.appendChild(tdStatus)
		table.appendChild(tr)
	}
	var closeBtn = document.createElement('BUTTON')
		closeBtn.className = 'close'
		closeBtn.innerText = 'Close'
		closeBtn.onclick = function(){
			Core.toggleAchievementList()
		}
	var lastTr = document.createElement('TR')
	var lastTd = document.createElement('TD')
		lastTd.setAttribute('colspan', 2)
		lastTd.appendChild(closeBtn)
	lastTr.appendChild(lastTd)
	table.appendChild(lastTr)
	Core._('#achievement-list').innerHTML =''
	Core._('#achievement-list').appendChild(table)
}

Core.toggleAchievementList = function(){
	var _list = Core._('#achievement-list')
	if(Core.hasClass(_list, 'open')){
		_list.style.display = 'none'
		Core.removeClass(_list, 'open')
	}else{
		Core.refreshAchievementList()
		_list.style.display = 'block'
		Core.addClass(_list, 'open')
	}
}
