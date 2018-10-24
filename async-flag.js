
class AsyncFlag {
	constructor(name) {
		this.name = name
		this.reset()		
	}
	
	reset() {
		this.promise = new Promise((resolve, reject) => {
			this._resolve = resolve
			this._reject = reject
		})
	}
	
	set(data) {
		this._resolve(data)
	}
	
	error(err) {
		this._reject(err)
	}
	
	async get(timeout) {
		if (!timeout)
			return this.promise
		
		return new Promise((resolve, reject) => {
			let timer = setTimeout(() => {
				let msg = 'AsyncFlag timed out: ' + (this.name ? this.name : '(no name)')
				reject(msg)
			}, timeout)
			
			this.promise
				.then(resolve)
				.catch(reject)
				.then(() => clearTimeout(timer))
		})
	}
}

module.exports = AsyncFlag
