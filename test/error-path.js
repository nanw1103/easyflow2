const easyflow = require('../index.js')

function assert(b, name) {
	if (!b)
		throw new Error(name)
}

let errorPathExecuted
function task1() {  this.msg(_name())   }
function task2() {  this.msg(_name())	}
function task3() {	this.msg(_name())	}
function task4() {  this.msg(_name())   }
function task5() {  this.msg(_name())   }
function task6() {  this.msg(_name())   }
function task7() {  this.msg(_name())   }
function task8() {  this.msg(_name())   }
function task9() {  this.msg(_name())   }
function task10() {  this.msg(_name())   }
function task11() {  this.msg(_name())   }
function task12() {  this.msg(_name())   }
function task13() {  this.msg(_name())   }
function task14() {  this.msg(_name())   }
function task15() {  this.msg(_name())   }
function task16() {  this.msg(_name())   }
function task17() {  this.msg(_name())   }

function neverRun(name) {
	assert(false, 'neverRun - ' + name)
}

function stepGenerateError() {
	throw 'demo-error'
}

function stepErrorHandler(data) {
	console.log('ErrorHandler - data:', data)
	errorPathExecuted = true
}

function _name() {
    return _name.caller.name
}

function consoleLogFlow(flow) {
	
	flow
		.on('running',  t => console.log('>>>', t.title))
		.on('message',  t => console.log('[i]', t.title, '  message=' + t.message))
		.on('complete', t => console.log('<<<', t.title))
		.on('error',    t => console.log('[x]', t.title, '  error=' + t.error))
}

async function testBasicErrorFlow() {
	console.log('--------------------', _name())
	errorPathExecuted = false
	let errFlow = easyflow('err-path',
		stepErrorHandler,
		task15
	)
    
	let flow = easyflow('flow1',
        task1,
		stepGenerateError,
		neverRun
	).error(errFlow)
	
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}

async function testBasicErrorFunc() {
	console.log('--------------------', _name())
	errorPathExecuted = false
	let flow = easyflow('flow1',
        task1,
		stepGenerateError,
		neverRun
	).error(stepErrorHandler)
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}
async function testNestedErrorFlow() {
	console.log('--------------------', _name())
	errorPathExecuted = false
	let errFlow = easyflow('err-path',
		stepErrorHandler,
		task15
	)
    
	let flow = easyflow('flow1',
        task1,
		easyflow('nested flow',
			task2,
			stepGenerateError,
			neverRun
		).error(errFlow),
		task4,
		neverRun
	)
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}
async function testNestedErrorFunc() {
	console.log('--------------------', _name())
	errorPathExecuted = false
    
	let flow = easyflow('flow1',
        task1,
		easyflow('nested flow',
			task2,
			stepGenerateError,
			neverRun
		).error(stepErrorHandler),
		neverRun
	)
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}
async function testNestedErrorFlow2() {
	console.log('--------------------', _name())
	errorPathExecuted = false
	let errFlow = easyflow('err-path',
		stepErrorHandler,
		task15
	)
    
	let flow = easyflow('flow1',
        task1,
		easyflow('nested flow',
			task2,
			stepGenerateError,
			neverRun
		),
		task4,
		neverRun
	).error(errFlow)
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}
async function testNestedErrorFunc2() {
	console.log('--------------------', _name())
	errorPathExecuted = false
    
	let flow = easyflow('flow1',
        task1,
		easyflow('nested flow',
			task2,
			stepGenerateError,
			neverRun
		),
		neverRun
	).error(stepErrorHandler)
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}
async function testNestedErrorFlow3() {
	console.log('--------------------', _name())
	errorPathExecuted = false
	let errFlow = easyflow('err-path',
		stepErrorHandler,
		task15
	)
    
	let flow = easyflow('flow1',
        task1,
		easyflow('nested flow',
			task2,
			task3
		).error(neverRun),
		stepGenerateError,
		neverRun
	).error(errFlow)
	
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}
async function testNestedErrorFunc3() {
	console.log('--------------------', _name())
	errorPathExecuted = false
    
	let flow = easyflow('flow1',
        task1,
		easyflow('nested flow',
			task2,
			task3
		).error(neverRun),
		stepGenerateError,
		neverRun
	).error(stepErrorHandler)
	
	consoleLogFlow(flow)

	try {
		await flow.run({data:1})
		neverRun()
	} catch (e) {
		console.log(e)
		assert(e.error === 'demo-error')
	}
	assert(errorPathExecuted)
}
async function main() {
	await testBasicErrorFlow()
	await testBasicErrorFunc()
	await testNestedErrorFlow()
	await testNestedErrorFunc()
	await testNestedErrorFlow2()
	await testNestedErrorFunc2()
	console.log('SUCCESS')
}

main().catch(console.error)
