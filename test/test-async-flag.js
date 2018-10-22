const assert = require('assert')
const AsyncFlag = require('../async-flag.js')

async function main() {
	await testSuccessPath()
	await testFailurePath()
	await testTimeout()
}
main().catch(console.error)

async function testSuccessPath() {
	let flag = new AsyncFlag()
	setTimeout(() => flag.set('yes'), 1000)
	
	let d1 = await flag.get()
	let d2 = await flag.get()
	
	assert(d1 === 'yes')
	assert(d2 === 'yes')
}

async function testFailurePath() {
	let flag = new AsyncFlag()
	setTimeout(() => flag.error('no'), 1000)
	
	try {
		await flag.get()
		assert(false)
	} catch (e) {
		assert(e === 'no')
	}
	
	try {
		await flag.get()
		assert(false)
	} catch (e) {
		assert(e === 'no')
	}
}

async function testTimeout() {
	let flag = new AsyncFlag('myFlag')
	setTimeout(() => flag.set('hello'), 1000)
	
	try {
		await flag.get(100)
		assert(false)
	} catch (e) {
		console.log('If you see this, it means the timeout works. Reported error:', e)
	}
	
	try {
		await flag.get(200)
		assert(false)
	} catch (e) {
		console.log('If you see this, it means the timeout works. Reported error:', e)
	}
	
	let data = await flag.get(2 * 1000)
	assert(data === 'hello')
	
	data = await flag.get(3 * 1000)
	assert(data === 'hello')
}
