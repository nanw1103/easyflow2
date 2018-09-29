const easyflow = require('../index.js')

function task1() {
	
	//write context
	return {
		data: 'Hello, mortal',
		data2: '...'
	}
}

(async function() {
    let flow = easyflow('flow1',
        task1,
    ).out('data', 'data2')	//specifies the value that should be write back from subflow to parent context
	.on('running',  t => console.log('>>>', t.title))
	.on('message',  t => console.log('[i]', t.title, '> message=' + t.message))
	.on('complete', t => console.log('<<<', t.title))
	.on('error',    t => console.log('[x]', t.title, '> error=' + t.error))

	let ret = await flow.run()
	console.log('Returned context from flow is:', ret)
	
	if (ret.data !== 'Hello, mortal')
		throw 'FAIL'
	return 'SUCCESS'	
})().then(console.log).catch(console.error)
