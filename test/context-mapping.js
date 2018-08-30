const easyflow = require('../index.js')
const assert = require('assert')

describe('context mapping', function() {
	
	let name = 'function - map context value to function param'
	it(name, () => {
		let conf = {
			anObj: {s:'asdf'},
			aNumber: 3
		}
		function f1(anObj, aNumber) {
			assert(anObj === conf.anObj)
			assert(aNumber === conf.aNumber)
		}
		function f2(aNumber) {
			assert(aNumber === conf.aNumber)
		}
		
		return easyflow(name,
			f1,
			f2
		).run(conf)
	})
	
	name = 'function - write returned value back to context'
	it(name, async () => {
		let conf = {}
		function f1() {
			return {
				anObj: 'something'
			}
		}
		function f2(anObj) {
			assert(anObj === 'something')
		}
		
		return easyflow(name,
			f1,
			f2
		).run(conf)
	})
	
	name = 'flow - context in'
	it(name, async () => {
		let conf = {obj1: '1', obj2: '2', obj3: '3'}
		function f1(obj1, obj2) {
			assert(obj1 === conf.obj1)
			assert(obj2 === conf.obj2)
		}
		
		return easyflow(name,
			f1
		).in('obj1', 'obj2').run(conf)
	})
	
	name = 'flow - context in, renamed'
	it(name, async () => {
		let conf = {obj1: '1', obj2: '2', obj3: '3'}
		function f1(newK) {
			assert(newK === conf.obj1)
		}
		
		return easyflow(name,
			f1
		).in({
			obj1: 'newK'
		}).run(conf)
	})
	
	name = 'flow - context out protection'
	it(name, async () => {
		let conf = {}
		function f1() {
			return {
				obj1: 'something'
			}
		}
		
		await easyflow(name,
			f1
		).run(conf)
		assert(conf.anObj === undefined)
	})
	
	name = 'flow - context out'
	it(name, async () => {
		let conf = {}
		function f1() {
			return {
				obj1: 'something',
				obj2: 2,
				obj3: 3
			}
		}
		
		await easyflow(name,
			f1
		).out('obj1', 'obj2').run(conf)
		assert(conf.obj1 === 'something')
		assert(conf.obj2 === 2)
		assert(conf.obj3 === undefined)
	})
	
	name = 'flow - context out, renamed'
	it(name, async () => {
		let conf = {}
		function f1() {
			return {
				anObj: 'something'
			}
		}
		
		await easyflow(name,
			f1
		).out('anObj').run(conf)
		assert(conf.anObj === 'something')
	})
	
	name = 'nested flow'
	it(name, async () => {
		let conf = {
			n: 0
		}
		function f1(n) {
			return {
				n: n+1
			}
		}
		let subflow = easyflow('sub1',
			f1,
			f1
		).in('n').out('n')
		
		await easyflow(name,
			f1,
			subflow
		).out('n').run(conf)
		assert(conf.n === 3)
	})
})