const easyflow = require('../index.js')
const assert = require('assert')
const delay = (ms, data) => new Promise(resolve => setTimeout(()=>resolve(data), ms))
const AsyncFlag = require('../async-flag.js')

const flag = new AsyncFlag('ready flag of task3')

function task1() {}
function task2() {}
async function task3() { await delay(2000);	flag.set() }
async function task4() {}
async function task5() {}
function task6() {}
async function task7() {
	this.msg('Waiting for sub1.task3...')
	await flag.get(3000)
	this.msg('Condition met. Continue.')
}
function task8() {}
function task9() {}
function task10() {}
function task11() {}
function task12() {}
function task13() {}
function task14() {}
function task15() {}
function task16() {}
function task17() {}

function _name() {
    return _name.caller.name
}

function subflow3() {
    return easyflow('sub3', task12, task13, task14)
}

(async function() {
    let flow = easyflow('flow1',
        task1,
        easyflow.parallel('parallel part', 
			task2,
            easyflow('sub 1',
				task3,
				task4
			),
			easyflow('sub 2',
				task5,
				task6
			),
			easyflow('sub 3',
				task7,
				task8
			),
			task9,
		),
        task10,
    )
	.on('running',  t => console.log('>>>', t.title))
	.on('message',  t => console.log('[i]', t.title, '> message=' + t.message))
	.on('complete', t => console.log('<<<', t.title))
	.on('error',    t => console.log('[x]', t.title, '> error=' + t.error))

	let start = Date.now()
	
	await flow.run()
	
	let cost = Date.now() - start
	assert(cost < 3000, 'Parallel testing failed')
	
    //return JSON.stringify(flow, null, 4)
})().then(console.log).catch(console.error)
