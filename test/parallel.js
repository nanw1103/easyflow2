const easyflow = require('../index.js')
const assert = require('assert')
const delay = (ms, data) => new Promise(resolve => setTimeout(()=>resolve(data), ms))

function task1() {  this.msg(_name())   }
function task2() {  this.msg(_name())   }
async function task3() {  this.msg(_name()); await delay(1000) }
async function task4() {  this.msg(_name()); await delay(1000) }
async function task5() {  this.msg(_name()); await delay(1000) }
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

function _name() {
    return _name.caller.name
}

function subflow3() {
    return easyflow('sub3', task12, task13, task14)
}

(async function() {
    let flow = easyflow('flow1',
        task1,
        task2,
        easyflow.parallel('parallel sub1', 
            task3, 
            task4,
			task5
		),        
        task6,
    )
	.on('running',  t => console.log('>>>', t.title))
	//.on('message',  t => console.log('[i]', t.title, '> message=' + t.message))
	.on('complete', t => console.log('<<<', t.title))
	.on('error',    t => console.log('[x]', t.title, '> error=' + t.error))

	let start = Date.now()
	
	await flow.run()
	
	let cost = Date.now() - start
	assert(cost < 3000, 'Parallel testing failed')
	
    //return JSON.stringify(flow, null, 4)
})().then(console.log).catch(console.error)
