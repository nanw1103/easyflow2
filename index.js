const EventEmitter = require('events')

const util = require('util')

function getArgs(func) {
	// First match everything inside the function argument parens.
	let matcher = func.toString().match(/function\s.*?\(([^)]*)\)/)
	if (!matcher)
		return []
	
	let args = matcher[1]
   
	// Split the arguments string into an array comma delimited.
	return args.split(',')
		.map(arg => arg.replace(/\/\*.*\*\//, '').trim())	// Ensure no inline comments are parsed and trim the whitespace.
		.filter(arg => arg)	// Ensure no undefined values are added.
}

class TaskBase {
	constructor(flow) {
		
		Object.defineProperty(this, 'flow', {value: flow})
		//status: 'running|error|complete'
		//message: '',
		//error: error object if any
		//context: context object before execution of this task
		//result: context object after execution of this task
		//executionId: -1,
		//skip: <bool>
		
		//[func]: available only in FuncTask
		//[children]: [], available only in FlowTask
	}
	
	reset(resetSkip) {
		delete this.status
		delete this.message
		delete this.context
		delete this.result
		//delete this.executionId	//need this for "redo from"
		delete this.error
		if (resetSkip)
			delete this.skip
		if (this.children)
			this.children.forEach(t => t.reset(resetSkip))
	}
	
	async run(context, runtime) {
		
		if (!context)
			context = {}

		if (!runtime)
			runtime = {executionId: 1}
		else if (!runtime.executionId)
			runtime.executionId = 1
		
		this.reset(false)

		this.executionId = runtime.executionId++
		if (this.skip)
			return context
		if (this._isCanceled()) {
			this.error = 'canceled'
			return Promise.reject(this)
		}
		
		this._updateState('running')
		
		try {
			await this._runImpl(context, runtime)
		} catch (e) {
			//Let the flow eventually reject a specific step, so as to get full context of the error.
			//Hence if we catch an error, then it's something wrong with "this step". Store it in this
			//step and reject this step. If we catch a TaskBase object, it's an already handled error
			//and we just mark error on this step and reject out
			let err
			if (e instanceof TaskBase) {
				err = e
			} else {
				this.error = e
				err = this
			}			
			this._updateState('error')
			return Promise.reject(err)
		}
		
		this._updateState('complete')
		return context
	}
	
	_updateState(state) {
		this.status = state
		
		if (state === 'error' && this.flow.emitter.listeners('error').length === 0)
			console.error(state)
		else
			this.flow.emitter.emit(state, this)
	}
	
	_isCanceled() {
		if (this.flow.canceled)
			return true
		if (this.parent)
			return this.parent._isCanceled()
	}
}

class FlowTask extends TaskBase {
	constructor(flow, items) {
		super(flow)
		this.title = flow.options.title
		
		this.children = []
		for (let i = 0; i < items.length; i++) {
			let t = items[i]
			let sub
			if (t instanceof Easyflow) {
				sub = t.task
				
				t.on('running', t => flow.emitter.emit('running', t))
				t.on('message', t => flow.emitter.emit('message', t))
				t.on('complete', t => flow.emitter.emit('complete', t))
				t.on('error', t => flow.emitter.emit('error', t))
			} else if (typeof t === 'function') {
				sub = new FuncTask(flow, t)
			} else {
				throw new Error(`Unknown easyflow task type. title=${this.title}, index=${i}, type=${typeof t}, object=${t}`)
			}

			Object.defineProperty(sub, 'parent', { value: this })
			this.children.push(sub)
		}
	}
	
	id() {
		let id = this.flow.options.id
		return id ? id : this.title
	}
	
	async _runImpl(parentContext, runtime) {
		
		let reducedOriginalContext
		let actualContext
		let mapping_in = this.flow.mapping_in
		
		//reduce parent context
		if (mapping_in) {
			reducedOriginalContext = {}
			actualContext = {}
			for (let k in mapping_in) {
				if (!(k in parentContext))
					throw 'Context property not found: ' + k + '. FlowTask.id=' + this.id()
				let v = parentContext[k]				
				reducedOriginalContext[k] = v
				actualContext[mapping_in[k]] = v
			}			
		} else {
			reducedOriginalContext = Object.assign({}, parentContext)
			actualContext = Object.assign({}, parentContext)
		}
		this.context = reducedOriginalContext
		
		Object.defineProperty(reducedOriginalContext, '_parent', { value: parentContext })
		Object.defineProperty(actualContext, '_parent', { value: parentContext })
		
		//run it
		for (let t of this.children)
			await t.run(actualContext, runtime)
		
		//write back to parent context
		let mapping_out = this.flow.mapping_out
		if (mapping_out) {
			for (let k in mapping_out)
				parentContext[k] = actualContext[mapping_out[k]]
		}
	}
}

class FuncTask extends TaskBase {
	constructor(flow, func) {
		super(flow)
		this.func = func
		this.title = func.title ? func.title : '<' + func.name + '>'
	}
	
	id() {
		return this.func.name
	}
	
	async _runImpl(parentContext, runtime) {
		
		if (runtime.startFrom) {
			if (this.executionId < runtime.startFrom) {
				console.log('Fast skip', this.executionId, this.title)
				return
			}
		}
		
		//reduce context
		let args = getArgs(this.func)
		let params = []
		let ctx = {}
		for (let name of args) {
			
			if (!(name in parentContext))
				throw 'Context property not found: ' + name + '. FuncTask.id=' + this.id()
			
			let v = parentContext[name]
			params.push(v)
			ctx[name] = v
		}
		this.context = ctx

		let _task_this = {
			msg: (...args) => {
				this.message = util.format.apply(null, args)
				this.flow.emitter.emit('message', this)
			},
			skip: (...ids) => this.flow.skip(ids)
		}
		
		this.result = await this.func.apply(_task_this, params)		//let it throw out, if any exception
		Object.assign(parentContext, this.result)
	}
}

class Easyflow {

	constructor(options, items) {
		
		this.emitter = new EventEmitter
		
		if (typeof options === 'string')
			options = {title: options}
		this.options = options
		
		this.task = new FlowTask(this, items)
	}

	run(context, runtime) {		
		return this.task.run(context, runtime)
	}

	skip(ids) {
		this.task.children.forEach(t => {
			let id = t.id()
			if (ids.indexOf(id) >= 0)
				t.skip = true
		})
	}
	
	in(...mapping) {
		if (mapping.length === 1 && typeof mapping[0] === 'object') {
			this.mapping_in = mapping[0]
			return this
		}
		this.mapping_in = {}
		for (let k of mapping)
			this.mapping_in[k] = k
		return this
	}
	
	out(...mapping) {
		if (mapping.length === 1 && typeof mapping[0] === 'object') {
			this.mapping_out = mapping[0]
			return this
		}
		this.mapping_out = {}
		for (let k of mapping)
			this.mapping_out[k] = k
		return this
	}
	
	on(event, handler) {
		this.emitter.on(event, handler)
		return this
	}
	
	cancel() {
		this.canceled = true
	}
	
	status() {
		return this.task
	}
}

function easyflow(option, ...tasks) {
    return new Easyflow(option, tasks)
}

module.exports = easyflow