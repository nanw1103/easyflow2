const easyflow = require('../index.js')

function task1() {  this.msg(_name())   }
function task2() {  this.msg(_name())	}
function task3() {  this.msg(_name())   }
function task4() {  this.msg(_name());   throw new Error('x')   }
function task5() {  this.msg(_name())   }
function task6() {  this.msg(_name())   }
function task7() {  this.msg(_name())   }
function task8() {  this.msg(_name())   }
function task9() {  this.msg(_name())   }
function task10() {  this.msg(_name())   }
function task11() {  this.msg(_name())   }
function task12() {  this.msg(_name())   }
function task13() {  this.msg(_name())   }
function task14(data) {  this.msg(_name()); console.log('data', data)   }
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
	let errFlow = easyflow('err-path',
		task14,
		task15
	)
    
	let flow = easyflow('flow1',
        task1,
        task2,
        easyflow('sub1', 
            task3, 
            task4,
            task5).error(errFlow),
        easyflow('sub2', 
            task6, 
            easyflow('sub2.1', 
                task7, 
                task8,
                task9),
            task10),
        task11,
        subflow3(),
        task15
    ).error(errFlow)
	.on('running',  t => console.log('>>>', t.title))
	.on('message',  t => console.log('[i]', t.title, '  message=' + t.message))
	.on('complete', t => console.log('<<<', t.title))
	.on('error',    t => console.log('[x]', t.title, '  error=' + t.error))

	await flow.run({data:1})
})().then(console.log).catch(console.error)
